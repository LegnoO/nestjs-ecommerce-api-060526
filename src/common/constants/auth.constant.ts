import ms from 'ms';

export const AUTH_TTL = {
  VERIFY_EMAIL: ms('24h'),
  RESET_PASSWORD: ms('15m'),
  REFRESH_TOKEN: ms('7d'),
} as const;

export const AUTH_TTL_LABEL: Record<keyof typeof AUTH_TTL, string> = {
  VERIFY_EMAIL: '24 hours',
  RESET_PASSWORD: '15 minutes',
  REFRESH_TOKEN: '7 days',
};
