import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';

export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayload) {
    return this.jwtService.sign(payload);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token);
  }

  generateRefreshToken() {
    return randomBytes(40).toString('hex');
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
