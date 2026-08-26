import { Env } from "../env.schema.js"


export interface ResendConfig {
    apiKey: string,
    from: string,
    overridesTo?: string
}


export const getResendConfig = (env: Env): ResendConfig => {

    const isProduction = env.NODE_ENV === 'production'

    return Object.freeze({
        apiKey: env.RESEND_API_KEY,
        from: isProduction ? 'Synergy <no-reply@tudominio.com>' : 'Acme <onboarding@resend.dev>',
        ...(env.NODE_ENV === 'development' && { overridesTo: env.DEV_PERSONAL_EMAIL })
    })
}
