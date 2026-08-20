import { IMailService, SendEmailOptions } from 'application/ports/mail-interface.service.js';
import { Resend } from 'resend';
import { ResendConfig } from '../../config/modules/resend-config.js';
import { mailTemplates } from '../templates/mail-templates.js';



export class ResendMailService implements IMailService {

    private readonly client: Resend
    private readonly resendConfig: ResendConfig

    constructor(config: ResendConfig) {
        this.resendConfig = config
        this.client = new Resend(config.apiKey)
    }


    async sendEmail(options: SendEmailOptions): Promise<void> {
        const forwardToEmail = this.resendConfig.overridesTo ?? options.to

        const templateBuilder = mailTemplates[options.template]
        const { body, subject } = templateBuilder(options.data)

        try {
            await this.client.emails.send({
                from: this.resendConfig.from,
                to: forwardToEmail,
                subject: subject,
                text: body
            })
        } catch (error) {
            throw new Error(`[ResendMailService] HTTP Failure: ${(error as Error).message}`);
        }
    }

}   