import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly isDev = process.env.NODE_ENV === 'development';
  private readonly from = 'CreatorLink <noreply@creatorlink.app>';

  onModuleInit() {
    if (!this.isDev) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error(
          'RESEND_API_KEY is not set. Set it in your environment or run in NODE_ENV=development for dev preview mode.',
        );
      }
      this.resend = new Resend(apiKey);
    }
  }

  async sendMagicLink(to: string, link: string): Promise<void> {
    const subject = 'Tu enlace de acceso a CreatorLink';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff;">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Accede a CreatorLink</h1>
        <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
          Haz clic en el botón de abajo para iniciar sesión. Este enlace es válido por 15 minutos y solo puede usarse una vez.
        </p>
        <a href="${link}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600;">
          Iniciar sesión
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Si no solicitaste este enlace, puedes ignorar este correo.
        </p>
      </div>
    `;

    await this.send({ to, subject, html });
  }

  async sendContactNotification(
    to: string,
    orgName: string,
    message: string,
  ): Promise<void> {
    const subject = `Nuevo mensaje de contacto para ${orgName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff;">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Nuevo mensaje de contacto</h1>
        <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">
          Has recibido un nuevo mensaje de contacto para <strong>${orgName}</strong>:
        </p>
        <div style="background-color: #f9fafb; border-left: 4px solid #111827; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="color: #374151; font-size: 16px; margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
        <a href="https://app.creatorlink.app" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600;">
          Ver en CreatorLink
        </a>
      </div>
    `;

    await this.send({ to, subject, html });
  }

  async sendOrgInvite(
    to: string,
    orgName: string,
    link: string,
  ): Promise<void> {
    const subject = `Invitación para unirte a ${orgName} en CreatorLink`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff;">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Te han invitado a ${orgName}</h1>
        <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
          Has recibido una invitación para unirte a <strong>${orgName}</strong> en CreatorLink. Haz clic en el botón de abajo para aceptar la invitación.
        </p>
        <a href="${link}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600;">
          Aceptar invitación
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Si no esperabas esta invitación, puedes ignorar este correo.
        </p>
      </div>
    `;

    await this.send({ to, subject, html });
  }

  private async send(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (this.isDev) {
      this.logger.log(
        `[DEV EMAIL PREVIEW]\nTo: ${params.to}\nSubject: ${params.subject}\nHTML: ${params.html}`,
      );
      return;
    }

    if (!this.resend) {
      throw new Error(
        'RESEND_API_KEY is not set. Set it in your environment or run in NODE_ENV=development for dev preview mode.',
      );
    }

    await this.resend.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  }
}
