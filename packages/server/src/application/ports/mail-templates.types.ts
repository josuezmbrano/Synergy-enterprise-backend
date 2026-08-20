export type MailTemplateData =

    | { template: 'REGISTER_VERIFICATION', data: { fullname: string; token: string } }
    | { template: 'PASSWORD_RESET_REQUEST_VERIFICATION'; data: { fullname: string; token: string } }
    | { template: 'RESEND_EMAIL_VERIFICATION'; data: { fullname: string; token: string } }
    | { template: 'EMAIL_UPDATE_VERIFICATION'; data: { fullname: string; token: string } }