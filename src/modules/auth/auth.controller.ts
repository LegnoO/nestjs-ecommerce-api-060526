import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { CurrentDevice } from './decorators/device-meta.decorator';
import { type DeviceMeta } from '../sessions/types/device-meta.type';
import { type RequestWithUser } from './types/auth-request.type';
import { setRefreshCookies } from '@/src/common/utils/cookie.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @CurrentDevice() device: DeviceMeta,
  ) {
    const userId = req.user.id;
    const result = await this.authService.login(userId, device);
    setRefreshCookies(res, result.refreshToken, result.sessionId, result.refreshTtlSeconds);

    return { accessToken: result.accessToken, user: result.user };
  }
}
