import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { AUTH_TTL_LABEL } from '@/src/common/constants/auth.constant';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    await this.mailerService.sendMail({
      to,
      subject: 'Verify your email address',
      template: 'email-verification',
      context: { name, url, expiresIn: AUTH_TTL_LABEL.VERIFY_EMAIL },
    });
    this.logger.log(`Verification email sent to ${to}`);
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    await this.mailerService.sendMail({
      to,
      subject: 'Reset your password',
      template: 'password-reset',
      context: { name, url, expiresIn: AUTH_TTL_LABEL.RESET_PASSWORD },
    });
    this.logger.log(`Password reset email sent to ${to}`);
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Welcome to E-Commerce!',
      template: 'welcome',
      context: { name },
    });
  }

  private get frontendUrl() {
    return this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }
}

// async sendLinkAccountEmail(email: string, token: string) {
//   const baseUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

//   await this.mailerService.sendMail({
//     to: email,
//     subject: 'Xác nhận liên kết tài khoản Google',
//     template: 'email-verification',
//     context: {
//       email,
//       verificationUrl: `${baseUrl}/verify-link?token=${token}`,
//     },
//   });
// }
