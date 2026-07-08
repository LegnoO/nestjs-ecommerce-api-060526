import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user: RequestUser }>();
    const { id } = request.user;

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { emailVerifiedAt: true },
    });

    if (!user?.emailVerifiedAt) throw new ForbiddenException('Please verify your email to perform this action');

    return true;
  }
}
