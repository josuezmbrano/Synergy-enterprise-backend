import { BaseDomainError } from 'core/errors/base-domain.error.js'
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { Env } from 'infrastructure/config/env.schema.js'
import { LoggerMonitor } from 'infrastructure/container/di.config.js'
import { getHttpStatusCode } from 'infrastructure/mapper.error.js'



export const GlobalErrorMiddleware = (logger: LoggerMonitor, env: Env): ErrorRequestHandler => {
    return (err: Error, req: Request, res: Response, _next: NextFunction) => {

        const pinoLogger = logger.pinoLogger

        if (err instanceof BaseDomainError) {

            const statusCode = getHttpStatusCode(err.errorType, err.internalCode)
            const errorResponse = err.toJSON()

            pinoLogger.warn(`Domain error [${err.errorType}]: ${err.message}`, {
                internalCode: err.internalCode,
                path: req.path,
                statusCode
            });

            res.status(statusCode).json({
                status: 'error',
                error: errorResponse
            })

            return

        }

        pinoLogger.error('Unhandled server error', err, {
            path: req.path,
            method: req.method
        });

        return res.status(500).json({
            status: 'error',
            error: env.NODE_ENV === 'production' ? 'Internal server error' : { message: err.message, stack: err.stack }
        })

    }
}