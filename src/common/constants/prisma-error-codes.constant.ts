import { ValueOf } from '../../types/utility.types';

/**
 * Full reference: https://www.prisma.io/docs/orm/reference/error-reference
 */

export const PrismaErrorCode = {
  UniqueConstraintViolation: 'P2002',
  RecordNotFound: 'P2025',
  ForeignKeyConstraintViolation: 'P2003',
} as const;

export type PrismaErrorCode = ValueOf<typeof PrismaErrorCode>;
