import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@/generated/prisma/enums';
import { lowerCaseTransformer, trimTransformer } from '@/src/common/transformers/string.transformer';
import { PaginationQueryDto } from '@/src/common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trimTransformer)
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(lowerCaseTransformer)
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsIn(['createdAt', 'email', 'name'])
  sortBy: 'createdAt' | 'email' | 'name' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
