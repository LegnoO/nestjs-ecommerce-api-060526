import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { bestEffort } from '@/src/common/utils/best-effort.util';
import { MailService } from '@/src/providers/mail/mail.service';

@Injectable()
export class SendWelcomeEmailListener {
  private readonly logger = new Logger(SendWelcomeEmailListener.name);
  constructor(private readonly mailService: MailService) {}

  @OnEvent('user.registered')
  async handle(event: UserRegisteredEvent) {
    await bestEffort(this.logger, 'send welcome email', () =>
      this.mailService.sendWelcomeEmail(event.email, event.name),
    );
  }
}
