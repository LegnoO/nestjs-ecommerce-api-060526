import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from './current-user.decorator';
import { UserRole } from '@/generated/prisma/enums';

export const CurrentActorRole = createParamDecorator((_data: unknown, ctx: ExecutionContext): UserRole => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const user = req.user as RequestUser;
  if (!user.role) throw new ForbiddenException('role is not defined for the current user');

  return user.role;
});
