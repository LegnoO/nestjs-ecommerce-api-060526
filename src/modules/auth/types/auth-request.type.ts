import { User } from '@/generated/prisma/browser';
import { Request } from 'express';

export type TokenPayload = {
  sub: string; // userId
  jti: string;
  iat: number;
  exp: number;
};

export type AuthUser = User & TokenPayload;

export type RequestWithUser = Omit<Request, 'cookies'> & {
  user: User;
  cookies: Record<string, string>;
};
