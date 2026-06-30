import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import { buildDebugInfo } from '@/src/utils/exception.util';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter<unknown> {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Prisma error`, exception instanceof Error ? exception.message : String(exception));
    const debug = buildDebugInfo(exception);
    const { status, message } = this.getErrorResponse(exception);
    response.status(status).json({
      statusCode: status,
      message,
      ...(debug && { debug }),
    });
  }

  private isDriverAdapterError(err: unknown): err is Error {
    return err instanceof Error && err.constructor.name === 'DriverAdapterError';
  }

  private getErrorResponse(exception: unknown): { status: number; message: string } {
    if (this.isDriverAdapterError(exception)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection failed',
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection failed',
      };
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'A critical database error occurred',
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P1001':
          return { status: HttpStatus.SERVICE_UNAVAILABLE, message: 'Database is currently unavailable' };
        case 'P2002': {
          const target = Array.isArray(exception.meta?.target)
            ? exception.meta.target.join(', ')
            : typeof exception.meta?.target === 'string'
              ? exception.meta.target
              : 'unknown field';
          return { status: HttpStatus.CONFLICT, message: `Duplicate value on: ${target}` };
        }
        case 'P2025':
          return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
        default:
          return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error' };
      }
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error' };
  }
}
