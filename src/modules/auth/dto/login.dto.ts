// src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerCaseTransformer } from '@/src/common/transformers/string.transformer';

export class LoginDto {
  @Transform(lowerCaseTransformer)
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
