import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerCaseTransformer } from '@/src/common/transformers/string.transformer';

export class ResendVerificationDto {
  @Transform(lowerCaseTransformer)
  @IsEmail()
  email!: string;
}
