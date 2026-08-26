import pino from "pino"
import { Env } from "../env.schema.js"


export const createPinoOptions = (env: Env): pino.LoggerOptions => {

    const isDevelopment = env.NODE_ENV === 'development'
    const isTest = env.NODE_ENV === 'test'

    return {
        level: env.LOG_LEVEL || (isTest ? 'silent' : isDevelopment ? 'debug' : 'info'),
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
            err: pino.stdSerializers.err
        },
        messageKey: 'msg',
        redact: {
            paths: [
                // HTTP HEADERS
                'req.headers.cookie',
                'req.headers["set-cookie"]',
                'req.headers.authorization',
                // BODY CREDENTIALS
                'req.body.password',
                'req.body.token',
                'req.body.newPassword',
                'req.body.currentPassword',
                'req.body.oldPassword',
                '*.password'
            ],
            censor: '[REDACTED]'
        },
        ...(isDevelopment && {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname'
                }
            }
        })
    }

}
