import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface RequestUser {
  id: string;
  sessionId: string;
}

export const CurrentUser = createParamDecorator((field: keyof RequestUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user = request.user as RequestUser;

  return field ? user?.[field] : user;
});
