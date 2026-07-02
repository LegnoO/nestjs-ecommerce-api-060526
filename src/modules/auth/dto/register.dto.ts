// src/modules/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerCaseTransformer, trimTransformer } from '@/src/common/transformers/string.transformer';

export class RegisterDto {
  @Transform(lowerCaseTransformer)
  @IsEmail()
  email!: string;

  @Transform(trimTransformer)
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
