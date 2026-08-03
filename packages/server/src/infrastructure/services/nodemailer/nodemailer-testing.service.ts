import { IMailService, SendEmailInput } from 'core/services/mail-interface.service.js';
import { NodemailerConfig } from './nodemailer-testing.config.js';
import type { Transporter } from 'nodemailer'
import { createTransport } from 'nodemailer'

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

    
    async sendEmail(input: SendEmailInput): Promise<void> {
       
        try {
            await this.transporter.sendMail({
                from: 'Synergy <onboarding@resend.dev>',
                to: input.to,
                subject: input.subject,
                text: input.body
            })
        } catch (error) {
            throw new Error(`[NodemailerMailService] SMTP Failure: ${(error as Error).message}`);
        }
    }
}