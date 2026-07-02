import { Response } from 'express';
import { IS_PROD } from '../constants/env.constants';

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const SESSION_COOKIE_NAME = 'session_id';
const COOKIE_PATH = '/auth/refresh';

export function setRefreshCookies(res: Response, refreshToken: string, sessionId: string, ttlSeconds: number) {
  const options = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict' as const,
    maxAge: ttlSeconds * 1000,
    path: COOKIE_PATH,
  };

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, options);
  res.cookie(SESSION_COOKIE_NAME, sessionId, options);
}

export function clearRefreshCookies(res: Response): void {
  const options = { path: COOKIE_PATH };
  res.clearCookie(REFRESH_COOKIE_NAME, options);
  res.clearCookie(SESSION_COOKIE_NAME, options);
}
