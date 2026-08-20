import { env } from "infrastructure/config/env.config.js"

export interface ResendConfig {
    apiKey: string,
    from: string,
    overridesTo?: string
}


const isProduction = env.NODE_ENV === 'production'

export const resendConfig: ResendConfig = Object.freeze({
    apiKey: env.RESEND_API_KEY,
    from: isProduction ? 'Synergy <no-reply@tudominio.com>' : 'Acme <onboarding@resend.dev>',
    ...(env.NODE_ENV === 'development' && { overridesTo: env.DEV_PERSONAL_EMAIL })
})