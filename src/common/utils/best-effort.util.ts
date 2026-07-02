import { Logger } from '@nestjs/common';

export async function bestEffort(logger: Logger, message: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    logger.error(message, e);
  }
}
