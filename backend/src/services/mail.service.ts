import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface MailService {
  sendPasswordReset(email: string, token: string): Promise<void>;
}

export class SmtpMailService implements MailService {
  private readonly transporter = nodemailer.createTransport(env.SMTP_URL);

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = `${env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await this.transporter.sendMail({
      from: 'no-reply@jachty.local',
      to: email,
      subject: 'Reset hasła',
      text: `Aby ustawić nowe hasło, otwórz: ${link}`,
    });
  }
}

export class NoopMailService implements MailService {
  async sendPasswordReset(): Promise<void> {}
}
