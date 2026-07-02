import { ConflictException } from '@nestjs/common';

export class AccountLinkRequiredException extends ConflictException {
  constructor(email: string) {
    super({
      code: 'ACCOUNT_LINK_REQUIRED',
      message:
        'An account with this email already exists. Please log in with your password and link Google from account settings.',
      email,
    });
  }
}
