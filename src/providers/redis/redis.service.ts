import { AUTH_TTL } from '@/src/common/constants/auth.constant';
import { IS_DEV } from '@/src/common/constants/env.constants';
import { Injectable, OnModuleDestroy, OnModuleInit, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import ms from 'ms';

type ResendCooldownType = 'verify' | 'reset';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis!: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis(this.configService.getOrThrow<string>('REDIS_URL'), {
      retryStrategy: (times) => {
        if (IS_DEV && times > 3) {
          this.logger.error('Redis connection failed after 3 attempts');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.redis.on('connect', () => this.logger.log('Redis connected'));
    this.redis.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  // ─── Execute Helper ──────────────────────────────────────
  private async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch {
      throw new ServiceUnavailableException('Redis service unavailable');
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.execute(() => (ttlSeconds ? this.redis.setex(key, ttlSeconds, value) : this.redis.set(key, value)));
  }

  async get(key: string): Promise<string | null> {
    return this.execute(() => this.redis.get(key));
  }

  async del(key: string): Promise<void> {
    await this.execute(() => this.redis.del(key));
  }

  async exists(key: string): Promise<boolean> {
    return this.execute(async () => {
      const result = await this.redis.exists(key);
      return result === 1;
    });
  }

  async ttl(key: string): Promise<number> {
    return this.execute(() => this.redis.ttl(key));
  }

  private refreshTokenKey(userId: string): string {
    return `auth:refresh:${userId}`;
  }

  async setRefreshToken(userId: string, deviceId: string, token: string, ttlSeconds: number): Promise<void> {
    const key = this.refreshTokenKey(userId);
    const value = JSON.stringify({ token, expiresAt: Date.now() + ttlSeconds * 1000 });

    await this.execute(async () => {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, deviceId, value);

      pipeline.expire(key, ttlSeconds + Math.floor(ms('1d') / 1000));

      await pipeline.exec();
    });
  }

  async getRefreshToken(userId: string, deviceId: string): Promise<string | null> {
    const raw = await this.execute(() => this.redis.hget(this.refreshTokenKey(userId), deviceId));
    if (!raw) return null;

    const { token, expiresAt } = JSON.parse(raw) as { token: string; expiresAt: number };
    if (Date.now() > expiresAt) {
      await this.execute(() => this.redis.hdel(this.refreshTokenKey(userId), deviceId));
      return null;
    }
    return token;
  }

  async deleteRefreshToken(userId: string, deviceId: string): Promise<void> {
    await this.execute(() => this.redis.hdel(this.refreshTokenKey(userId), deviceId));
  }

  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await this.execute(() => this.redis.del(this.refreshTokenKey(userId)));
  }

  async consumeResetToken(token: string): Promise<string | null> {
    return this.execute(() => this.redis.getdel(`auth:reset:${token}`));
  }

  private getEmailVerificationKey(token: string) {
    return `auth:verify-email:${token}`;
  }

  async setEmailVerificationToken(token: string, userId: string) {
    await this.set(this.getEmailVerificationKey(token), userId, AUTH_TTL.VERIFY_EMAIL);
  }

  async consumeEmailVerificationToken(token: string) {
    return this.execute(() => this.redis.getdel(this.getEmailVerificationKey(token)));
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    await this.del(this.getEmailVerificationKey(token));
  }

  // ─── Password Reset ──────────────────────────────────────
  async setResetToken(token: string, userId: string): Promise<void> {
    await this.set(`auth:reset:${token}`, userId, AUTH_TTL.RESET_PASSWORD);
  }

  async getResetToken(token: string): Promise<string | null> {
    return this.get(`auth:reset:${token}`);
  }

  async deleteResetToken(token: string): Promise<void> {
    await this.del(`auth:reset:${token}`);
  }

  // ─── JWT Blacklist ───────────────────────────────────────
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.set(`auth:blacklist:${jti}`, '1', ttlSeconds);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return this.exists(`auth:blacklist:${jti}`);
  }

  // ─── Resend Cooldown ─────────────────────────────────────
  private resendCooldownKey(userId: string, type: ResendCooldownType): string {
    return `auth:resend-cooldown:${type}:${userId}`;
  }

  async setResendCooldown(userId: string, type: ResendCooldownType, ttlSeconds = 60): Promise<void> {
    await this.set(this.resendCooldownKey(userId, type), '1', ttlSeconds);
  }

  async hasResendCooldown(userId: string, type: ResendCooldownType): Promise<boolean> {
    return this.exists(this.resendCooldownKey(userId, type));
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    return this.exists(`auth:session-revoked:${sessionId}`);
  }

  async markSessionRevoked(sessionId: string, ttlSeconds: number): Promise<void> {
    await this.set(`auth:session-revoked:${sessionId}`, '1', ttlSeconds);
  }

  private sessionTokenKey(sessionId: string): string {
    return `auth:session-token:${sessionId}`;
  }

  async setSessionTokenHash(sessionId: string, hash: string, ttlSeconds: number): Promise<void> {
    await this.set(this.sessionTokenKey(sessionId), hash, ttlSeconds);
  }

  async deleteSessionTokenHash(sessionId: string): Promise<void> {
    await this.del(this.sessionTokenKey(sessionId));
  }
}
