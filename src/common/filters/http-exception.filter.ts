import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { buildDebugInfo } from '../../utils/exception.util';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    const message = this.extractMessage(exceptionResponse);

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) this.logger.error(`HTTP ${status}`, exception.stack);

    const debug = status >= Number(HttpStatus.INTERNAL_SERVER_ERROR) ? buildDebugInfo(exception) : undefined;

    response.status(status).json({
      statusCode: status,
      message,
      ...(debug && { debug }),
    });
  }

  private extractMessage(exceptionResponse: string | object): string | string[] {
    if (typeof exceptionResponse === 'string') return exceptionResponse;

    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse)
      return (exceptionResponse as { message: string | string[] }).message;

    return 'An error occurred';
  }
}
