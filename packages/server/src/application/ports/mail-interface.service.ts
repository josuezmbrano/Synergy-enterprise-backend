import { MailTemplateData } from "./mail-templates.types.js"

export type SendEmailOptions = {
    to: string
} & MailTemplateData

export interface IMailService {

    sendEmail(options: SendEmailOptions): Promise<void>
}