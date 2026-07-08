import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { DeviceMeta } from '../sessions/types/device-meta.type';
import { RegisterDto } from './dto/register.dto';
import { isPrismaUniqueConstraint } from '@/src/utils/prisma-error.util';
import { UserRegisteredEvent } from './events/user-registered.event';
import { TypedEventEmitter } from '@/src/common/events/typed-event-emitter';
import { RedisService } from '@/src/providers/redis/redis.service';
import { randomBytes } from 'crypto';
import { MailService } from '@/src/providers/mail/mail.service';
import { bestEffort } from '@/src/common/utils/best-effort.util';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; name: string };
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly emitter: TypedEventEmitter,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, name: dto.name, password: passwordHash },
        select: { id: true, email: true, name: true },
      });

      this.emitter.emit('user.registered', new UserRegisteredEvent(user.id, user.email, user.name));

      return { message: 'Registered successfully', user };
    } catch (e) {
      if (isPrismaUniqueConstraint(e)) throw new ConflictException('Email already in use');

      throw e;
    }
  }

  // ─── Used by LocalStrategy ────────────────────────────────────────────
  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  // ─── Login ─────────────────────────────────────────────────────────────
  // Called by AuthController after LocalAuthGuard has already validated
  // credentials and attached `user` to the request.
  async login(userId: string, meta: DeviceMeta) {
    const { accessToken, refreshToken, sessionId, refreshTtlSeconds } = await this.sessions.createSession(userId, meta);

    return { accessToken, refreshToken, sessionId, refreshTtlSeconds };
  }

  async refresh(sessionId: string, presentedRefreshToken: string, meta: DeviceMeta) {
    return this.sessions.rotateSession(sessionId, presentedRefreshToken, meta);
  }

  // ─── Logout ────────────────────────────────────────────────────────────
  // Only revokes the CURRENT session — "log out other devices" is a
  // separate explicit action via SessionsController, never bundled here.
  async logout(userId: string, sessionId: string) {
    await this.sessions.revokeSession(userId, sessionId, 'USER_LOGOUT');
  }

  async verifyEmail(token: string) {
    const userId = await this.redisService.consumeEmailVerificationToken(token);
    if (!userId) throw new BadRequestException('Invalid or expired verification token');

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });

    return { message: 'Email verified successfully' };
  }

  async sendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerifiedAt)
      return { message: 'If the account exists and is unverified, a verification email has been sent' };

    const onCooldown = await this.redisService.hasResendCooldown(user.id, 'verify');
    if (onCooldown) throw new ConflictException('Please wait before requesting another verification email');

    const token = randomBytes(32).toString('hex');
    await this.redisService.setEmailVerificationToken(token, user.id);
    await this.redisService.setResendCooldown(user.id, 'verify');

    await bestEffort(this.logger, 'send verification email', () =>
      this.mailService.sendVerificationEmail(user.email, user.name, token),
    );

    return { message: 'If the account exists and is unverified, a verification email has been sent' };
  }
}
