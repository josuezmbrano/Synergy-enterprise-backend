import pino from "pino"


const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

export const pinoOptions: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || (isTest ? 'silent' : isDevelopment ? 'debug' : 'info'),
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

export const bootstrapLogger = pino({
    level: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
    ...(process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                ignore: 'pid,hostname'
            }
        }
    })
})