// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenModule } from '../token/token.module';
import { SessionsModule } from '../sessions/sessions.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { EventsModule } from '@/src/common/events/events.module';
import { SendWelcomeEmailListener } from './listeners/send-welcome-email.listener';
import { MailModule } from '@/src/providers/mail/mail.module';

@Module({
  imports: [PassportModule, TokenModule, SessionsModule, EventsModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, GoogleStrategy, SendWelcomeEmailListener],
  exports: [AuthService],
})
export class AuthModule {}
