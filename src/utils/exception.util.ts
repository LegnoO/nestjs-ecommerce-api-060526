import { IS_PROD } from '../common/constants/env.constants';

export function buildDebugInfo(exception: unknown): Record<string, unknown> | undefined {
  if (IS_PROD) return undefined;
  if (!(exception instanceof Error)) return undefined;

  return {
    type: exception.constructor.name,
    detail: exception.message
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    trace: exception.stack
      ?.split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('at') && !l.includes('node_modules')),
  };
}
