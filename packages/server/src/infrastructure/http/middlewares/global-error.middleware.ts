import { BaseDomainError } from 'core/errors/base-domain.error.js'
import type { Request, Response, NextFunction } from 'express'
import { env } from 'infrastructure/config/env.config.js'
import { containerDI } from 'infrastructure/container/di.config.js'
import { getHttpStatusCode } from 'infrastructure/mapper.error.js'

const pinoLogger = containerDI.loggerMonitorInstance.pinoLogger

export const GlobalErrorMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction) => {

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