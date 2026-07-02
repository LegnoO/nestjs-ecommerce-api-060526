import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@/generated/prisma/enums';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUserService: AdminUsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.adminUserService.listUsers(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.adminUserService.getUser(id);
  }

  @Patch(':id/role')
  updateRole(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminUserService.updateRole(adminId, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.adminUserService.deleteUser(adminId, id);
  }
}
