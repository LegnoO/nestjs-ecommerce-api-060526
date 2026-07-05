import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { CurrentDevice } from './decorators/device-meta.decorator';
import { type DeviceMeta } from '../sessions/types/device-meta.type';
import { type RequestWithUser } from './types/auth-request.type';
import { setRefreshCookies } from '@/src/common/utils/cookie.util';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

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

  @Get('verify-email')
  verifyEmail(@Query() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto.email);
  }
}
