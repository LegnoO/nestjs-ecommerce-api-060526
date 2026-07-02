// src/modules/sessions/sessions.controller.ts
import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.sessionsService.listSessions(userId);
  }

  @Delete(':id')
  revoke(@CurrentUser('id') userId: string, @Param('id') sessionId: string) {
    return this.sessionsService.revokeSession(userId, sessionId, 'USER_REVOKED_DEVICE');
  }

  @Delete()
  revokeOthers(@CurrentUser('id') userId: string, @CurrentUser('sessionId') currentSessionId: string) {
    return this.sessionsService.revokeOtherSessions(userId, currentSessionId);
  }
}
