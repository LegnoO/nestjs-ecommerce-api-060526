import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SessionsService } from '../../sessions/sessions.service';
import { RevokeReason, UserRole } from '@/generated/prisma/enums';
import { Prisma } from '@/generated/prisma/client';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { paginate } from '@/src/common/utils/paginate.util';
import { resolveRoleFilter } from '@/src/common/utils/role-scope.util';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
  ) {}

  async listUsers(actingUser: { id: string; role: UserRole }, query: ListUsersQueryDto) {
    const { page, limit, search, role, sortBy, sortOrder } = query;
    const roleFilter = resolveRoleFilter(actingUser.role, role);

    const where: Prisma.UserWhereInput = {
      ...(roleFilter && { role: roleFilter }),
      ...(search && {
        OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }],
      }),
    };

    return paginate(
      this.prisma.user,
      {
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        page,
        limit,
      },
      { key: 'users' },
    );
  }

  async getUser(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerifiedAt: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          where: { revokedAt: null },
          select: { id: true, deviceName: true, ipAddress: true, lastUsedAt: true },
        },
      },
    });
  }

  async updateRole(actingAdminId: string, targetUserId: string, dto: UpdateUserRoleDto) {
    if (actingAdminId === targetUserId) throw new ForbiddenException('Cannot change your own role');

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: { id: true, email: true, role: true },
    });

    await this.sessions.revokeAllSessions(targetUserId, RevokeReason.ADMIN_REVOKED);

    return { message: 'User role updated successfully', user };
  }

  async deleteUser(actingAdminId: string, targetUserId: string) {
    if (actingAdminId === targetUserId) throw new ForbiddenException('Cannot delete your own account');

    const user = await this.prisma.user.delete({
      where: { id: targetUserId },
      select: { id: true, email: true },
    });
    return { message: 'User deleted successfully', user };
  }
}
