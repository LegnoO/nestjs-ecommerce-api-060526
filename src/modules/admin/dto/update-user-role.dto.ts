import { IsEnum } from 'class-validator';
import { UserRole } from '@/generated/prisma/enums';
import { lowerCaseTransformer } from '@/src/common/transformers/string.transformer';
import { Transform } from 'class-transformer';

export class UpdateUserRoleDto {
  @Transform(lowerCaseTransformer)
  @IsEnum(UserRole)
  role!: UserRole;
}
