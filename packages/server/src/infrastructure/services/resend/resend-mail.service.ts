import { IMailService, SendEmailInput } from 'core/services/mail-interface.service.js';
import { Resend } from 'resend';
import { ResendConfig } from './resend-config.js';



export class ResendMailService implements IMailService {

    private readonly client: Resend
    private readonly resendConfig: ResendConfig

    constructor(config: ResendConfig) {
        this.resendConfig = config
        this.client = new Resend(config.apiKey)
    }


    async sendEmail(input: SendEmailInput): Promise<void> {
        const forwardToEmail = this.resendConfig.overridesTo ?? input.to

        try {
            await this.client.emails.send({
                from: this.resendConfig.from,
                to: forwardToEmail,
                subject: input.subject,
                text: input.body
            })
        } catch (error) {
            throw new Error(`[ResendMailService] HTTP Failure: ${(error as Error).message}`);
        }
    }

}   