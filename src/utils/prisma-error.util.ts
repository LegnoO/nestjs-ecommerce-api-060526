import { Prisma } from '@/generated/prisma/client';
import { PrismaErrorCode } from '../common/constants/prisma-error-codes.constant';

export function isPrismaNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === PrismaErrorCode.RecordNotFound;
}

export function isPrismaUniqueConstraint(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === PrismaErrorCode.UniqueConstraintViolation;
}
