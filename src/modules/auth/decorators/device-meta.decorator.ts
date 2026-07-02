import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { DeviceMeta } from '../../sessions/types/device-meta.type';

export const CurrentDevice = createParamDecorator((_data: unknown, ctx: ExecutionContext): DeviceMeta => {
  const req = ctx.switchToHttp().getRequest<Request>();

  const deviceId = req.headers['x-device-id'] as string | undefined;
  if (!deviceId) {
    throw new BadRequestException('Missing x-device-id header');
  }

  return {
    deviceId,
    deviceName: (req.headers['x-device-name'] as string) || undefined,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
});
