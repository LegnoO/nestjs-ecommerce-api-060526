import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { MailService } from '@/src/providers/mail/mail.service';
import { RedisService } from '@/src/providers/redis/redis.service';
import { bestEffort } from '@/src/common/utils/best-effort.util';

@Injectable()
export class SendVerificationEmailListener {
  private readonly logger = new Logger(SendVerificationEmailListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
  ) {}

  @OnEvent('user.registered', { async: true })
  async handle(event: UserRegisteredEvent) {
    const token = randomBytes(32).toString('hex');
    await this.redisService.setEmailVerificationToken(token, event.userId);

    await bestEffort(this.logger, 'Failed to send verification email', () =>
      this.mailService.sendVerificationEmail(event.email, event.name, token),
    );
  }
}
