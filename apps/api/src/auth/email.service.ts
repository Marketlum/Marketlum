import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // For development: log to console
    console.log('========================================');
    console.log('PASSWORD RESET EMAIL');
    console.log('========================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Reset your password`);
    console.log('');
    console.log('Click the link below to reset your password:');
    console.log(resetLink);
    console.log('');
    console.log('This link will expire in 60 minutes.');
    console.log('========================================');

    // TODO: For production, integrate with email provider (SES, Mailgun, Postmark, etc.)
    // Example:
    // await this.emailProvider.send({
    //   to: email,
    //   subject: 'Reset your password',
    //   html: `
    //     <h1>Reset your password</h1>
    //     <p>Click the link below to reset your password:</p>
    //     <a href="${resetLink}">${resetLink}</a>
    //     <p>This link will expire in 60 minutes.</p>
    //   `,
    // });
  }
}
