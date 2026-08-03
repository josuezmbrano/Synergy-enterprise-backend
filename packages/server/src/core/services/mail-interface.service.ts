export interface SendEmailInput {
    to: string
    subject: string
    body: string
}

export interface IMailService {

    sendEmail(input: SendEmailInput): Promise<void>
}