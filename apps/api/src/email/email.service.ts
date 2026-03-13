import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly from = 'CreatorLink <noreply@creatorlink.app>';

  onModuleInit() {
    if (process.env.NODE_ENV !== 'development') {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error(
          'RESEND_API_KEY is not set. Set it in your environment or run in NODE_ENV=development for dev preview mode.',
        );
      }
      this.resend = new Resend(apiKey);
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async sendMagicLink(to: string, link: string): Promise<void> {
    const safeLink = link.startsWith('https://') ? link : '#';
    const subject = 'Tu enlace de acceso a CreatorLink';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff;">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Accede a CreatorLink</h1>
        <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
          Haz clic en el botón de abajo para iniciar sesión. Este enlace es válido por 15 minutos y solo puede usarse una vez.
        </p>
        <a href="${safeLink}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600;">
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
    const safeOrgName = this.escapeHtml(orgName);
    const safeMessage = this.escapeHtml(message);
    const subject = `Nuevo mensaje de contacto para ${safeOrgName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff;">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Nuevo mensaje de contacto</h1>
        <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">
          Has recibido un nuevo mensaje de contacto para <strong>${safeOrgName}</strong>:
        </p>
        <div style="background-color: #f9fafb; border-left: 4px solid #111827; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="color: #374151; font-size: 16px; margin: 0; white-space: pre-wrap;">${safeMessage}</p>
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
    const safeOrgName = this.escapeHtml(orgName);
    const safeLink = link.startsWith('https://') ? link : '#';
    const subject = `Invitación para unirte a ${safeOrgName} en CreatorLink`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff;">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Te han invitado a ${safeOrgName}</h1>
        <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
          Has recibido una invitación para unirte a <strong>${safeOrgName}</strong> en CreatorLink. Haz clic en el botón de abajo para aceptar la invitación.
        </p>
        <a href="${safeLink}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600;">
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
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        `[DEV EMAIL PREVIEW]\nTo: ${params.to}\nSubject: ${params.subject}\nHTML: ${params.html}`,
      );
      return;
    }

    const { error } = await this.resend!.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      this.logger.error(
        `Failed to send email to ${params.to}: [${error.name}] ${error.message}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }
}
