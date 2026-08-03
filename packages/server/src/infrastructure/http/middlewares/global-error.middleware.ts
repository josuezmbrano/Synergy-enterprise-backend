import { BaseDomainError } from 'core/errors/base-domain.error.js'
import type { Request, Response, NextFunction } from 'express'
import { ENV } from 'infrastructure/config/env.js'
import { getHttpStatusCode } from 'infrastructure/mapper.error.js'

export const GlobalErrorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {

    if (err instanceof BaseDomainError) {

        const statusCode = getHttpStatusCode(err.errorType, err.internalCode)
        const errorResponse = err.toJSON()

        res.status(statusCode).json({
            status: 'error',
            error: errorResponse
        })

        return

    }

    console.error('Unhandled server error', err)

    return res.status(500).json({
        status: 'error',
        error: ENV.NODE_ENV === 'production' ? 'Internal server error' : { message: err.message, stack: err.stack }
    })

}