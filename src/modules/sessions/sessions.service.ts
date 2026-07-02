// src/modules/sessions/sessions.service.ts
import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/src/providers/redis/redis.service';
import { TokenService } from '../token/token.service';
import { DeviceMeta } from './types/device-meta.type';
import ms from 'ms';
import { RevokeReason } from '@/generated/prisma/enums';

const REFRESH_TTL_SECONDS = ms('7d');

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokenService: TokenService,
  ) {}

  // ─── Create (login) ─────────────────────────────────────────────────
  // Upsert by (userId, deviceId): if this device already had a session
  // (e.g. user logged out without clearing local storage deviceId, or
  // browser still has the old deviceId), we REUSE the row rather than
  // creating a duplicate. This keeps "Your devices" list clean — one
  // entry per physical device, not one per login event.
  async createSession(userId: string, meta: DeviceMeta) {
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash = this.tokenService.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

    const session = await this.prisma.session.upsert({
      where: { userId_deviceId: { userId, deviceId: meta.deviceId } },
      create: {
        userId,
        deviceId: meta.deviceId,
        deviceName: meta.deviceName,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        refreshTokenHash,
        expiresAt,
      },
      update: {
        refreshTokenHash,
        deviceName: meta.deviceName,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
        lastUsedAt: new Date(),
        revokedAt: null,
        revokedReason: null,
      },
    });

    const accessToken = this.tokenService.signAccessToken({ sub: userId, sessionId: session.id });

    // Cache the hash in Redis for fast rotate-time lookup, avoiding a DB
    // round trip on every refresh. DB row remains the source of truth;
    // this is purely a read-through cache.
    await this.redis.setSessionTokenHash(session.id, refreshTokenHash, REFRESH_TTL_SECONDS);

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      refreshTtlSeconds: REFRESH_TTL_SECONDS,
    };
  }

  // ─── Rotate (refresh) ───────────────────────────────────────────────
  // This is the most security-sensitive method in the whole auth system.
  // Reuse detection logic: if the presented refresh token does NOT match
  // what we have stored, someone is replaying an old/stolen token — the
  // legitimate token was already rotated away. Treat this as a breach:
  // revoke the entire session immediately, force re-login.
  async rotateSession(sessionId: string, presentedRefreshToken: string, meta: DeviceMeta) {
    const presentedHash = this.tokenService.hashToken(presentedRefreshToken);

    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    if (session.refreshTokenHash !== presentedHash) {
      // Token mismatch on a non-revoked, non-expired session = reuse of
      // an already-rotated-away token. This is the classic signal of a
      // stolen refresh token being used after the legitimate client
      // already rotated past it.
      this.logger.warn(`Refresh token reuse detected for session ${sessionId}, userId ${session.userId}`);
      await this.revokeSession(session.userId, sessionId, RevokeReason.TOKEN_REUSE);
      throw new UnauthorizedException('Token reuse detected. Session revoked.');
    }

    // Atomic compare-and-swap at the DB level too — protects against the
    // narrow race where two requests both pass the hash check above
    // before either has written the new hash (e.g. client retries a
    // refresh call). Only one of them will match `refreshTokenHash` in
    // the WHERE clause and actually update; the loser falls through to 0
    // rows affected and we treat it the same as a stale/replayed token.
    const newRefreshToken = this.tokenService.generateRefreshToken();
    const newHash = this.tokenService.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

    const updated = await this.prisma.session.updateMany({
      where: { id: sessionId, refreshTokenHash: presentedHash },
      data: {
        refreshTokenHash: newHash,
        expiresAt: newExpiresAt,
        lastUsedAt: new Date(),
        deviceName: meta.deviceName ?? session.deviceName,
        userAgent: meta.userAgent ?? session.userAgent,
        ipAddress: meta.ipAddress ?? session.ipAddress,
      },
    });

    if (updated.count === 0) {
      this.logger.warn(`Concurrent refresh race lost for session ${sessionId}`);
      throw new UnauthorizedException('Token already rotated. Please retry.');
    }

    const accessToken = this.tokenService.signAccessToken({ sub: session.userId, sessionId });
    await this.redis.setSessionTokenHash(sessionId, newHash, REFRESH_TTL_SECONDS);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      sessionId,
      refreshTtlSeconds: REFRESH_TTL_SECONDS,
    };
  }

  /** List all active (non-revoked, non-expired) sessions for a user. */
  async listSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  // ─── Revoke one ─────────────────────────────────────────────────────
  async revokeSession(userId: string, sessionId: string, reason: RevokeReason) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new ForbiddenException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedReason: reason },
    });

    await this.redis.deleteSessionTokenHash(sessionId);

    // Also mark the access-token-level revocation flag so any still-valid
    // (unexpired) access token issued for this session gets rejected by
    // JwtStrategy immediately, not just on next refresh attempt.
    const ttl = Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await this.redis.markSessionRevoked(sessionId, ttl);
    }
  }
  // ─── Revoke all except current ──────────────────────────────────────
  async revokeOtherSessions(userId: string, currentSessionId: string) {
    const others = await this.prisma.session.findMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
    });

    await this.prisma.session.updateMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'USER_REVOKED_DEVICE' },
    });

    await Promise.all(
      others.map(async (s) => {
        await this.redis.deleteSessionTokenHash(s.id);
        const ttl = Math.ceil((s.expiresAt.getTime() - Date.now()) / 1000);
        if (ttl > 0) await this.redis.markSessionRevoked(s.id, ttl);
      }),
    );

    return { revokedCount: others.length };
  }

  // ─── Revoke all (password change, account compromise) ────────────────
  async revokeAllSessions(userId: string, reason: RevokeReason) {
    const sessions = await this.prisma.session.findMany({ where: { userId, revokedAt: null } });

    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });

    await Promise.all(
      sessions.map(async (s) => {
        await this.redis.deleteSessionTokenHash(s.id);
        const ttl = Math.ceil((s.expiresAt.getTime() - Date.now()) / 1000);
        if (ttl > 0) await this.redis.markSessionRevoked(s.id, ttl);
      }),
    );
  }
}
