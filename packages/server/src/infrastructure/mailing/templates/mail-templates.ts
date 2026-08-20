import { MailTemplateData } from "application/ports/mail-templates.types.js"

export interface MailContent {
    subject: string
    body: string
}

type TemplateData<T extends MailTemplateData['template']> = Extract<MailTemplateData, { template: T }>['data']


export const mailTemplates: { [K in MailTemplateData['template']]: (data: TemplateData<K>) => MailContent } = {

    REGISTER_VERIFICATION: (data): MailContent => ({
        subject: '🔐 Account confirmation - Synergy security code',
        body: `Dear ${data.fullname},

Thank you for registering on our platform. To complete the email address verification process, please use the following security token:

🔑 ${data.token}

For security reasons, we recommend that you do not share this code with anyone. If you did not make this request, please disregard this message.

Sincerely, Synergy Technical Support`
    }),


    PASSWORD_RESET_REQUEST_VERIFICATION: (data): MailContent => ({
        subject: '[Security] Verification code to reset password',
        body: `Dear ${data.fullname},

A request has been generated to change the password associated with your email address on our platform.

To verify your identity and proceed with the password reset, please use the following verification token:

👉 ${data.token}

This one-time code is valid for the next 60 minutes. If you have not initiated this process, please dismiss this message. No further action is required.

Sincerely, Synergy Security Department`
    }),


    RESEND_EMAIL_VERIFICATION: (data): MailContent => ({
        subject: 'Resend request: Account verification code',
        body: `Dear ${data.fullname},

We have received your request to resend the identity verification code associated with your account.

Below is your new security token:

🔑 ${data.token}

Please note that generating this new code invalidates any previous tokens sent to this address. This code is for one-time use only.

If you have not yet done this, we recommend contacting our support team.

Sincerely,
Synergy Technical Support`
    }),


    EMAIL_UPDATE_VERIFICATION: (data): MailContent => ({
        subject: '[Security] Email update verification',
        body: `Dear ${data.fullname},

A process has been initiated to update your personal information on your account, specifically to change your primary email address to this inbox.

To validate ownership of this new email account and authorize the update in our systems, please enter the following verification token:

👉 ${data.token}

Please note that this confirmation code will expire in 24hrs. If you did not initiate this request, please disregard this email immediately.

Sincerely, Synergy Identity Support`
    })
}