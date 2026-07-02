// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/src/providers/redis/redis.service';
import { AccessTokenPayload } from '../../token/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload) {
    // Defense in depth: even if the JWT signature is valid and unexpired,
    // check the session hasn't been revoked (logout / device removed /
    // password change) since the token was issued. JWTs are stateless
    // by design, so this is the one place we reintroduce statefulness —
    // a single Redis EXISTS check, cheap enough to do on every request.
    const isRevoked = await this.redisService.isSessionRevoked(payload.sessionId);
    if (isRevoked) throw new UnauthorizedException('Session has been revoked');

    return { id: payload.sub, sessionId: payload.sessionId };
  }
}
