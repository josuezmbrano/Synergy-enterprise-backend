import { IMailService, SendEmailOptions } from 'application/ports/mail-interface.service.js';
import { NodemailerConfig } from '../../config/modules/nodemailer-testing.config.js';
import type { Transporter } from 'nodemailer'
import { createTransport } from 'nodemailer'
import { mailTemplates } from '../templates/mail-templates.js';

export class NodemailService implements IMailService {

    private readonly transporter: Transporter

    constructor(config: NodemailerConfig) {
        this.transporter = createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            tls: {
                rejectUnauthorized: config.tls.rejectUnauthorized
            }
        })
    }


    async sendEmail(options: SendEmailOptions): Promise<void> {
        const templateBuilder = mailTemplates[options.template]
        const { subject, body } = templateBuilder(options.data)

        try {
            await this.transporter.sendMail({
                from: 'Synergy <onboarding@resend.dev>',
                to: options.to,
                subject: subject,
                text: body
            })
        } catch (error) {
            throw new Error(`[NodemailerMailService] SMTP Failure: ${(error as Error).message}`);
        }
    }
}