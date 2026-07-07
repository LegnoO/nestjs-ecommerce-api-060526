import { IsEnum } from 'class-validator';
import { UserRole } from '@/generated/prisma/enums';
import { emptyToUndefinedTransformer, upperCaseTransformer } from '@/src/common/transformers/string.transformer';
import { Transform } from 'class-transformer';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  @Transform(upperCaseTransformer)
  @Transform(emptyToUndefinedTransformer)
  role!: UserRole;
}
