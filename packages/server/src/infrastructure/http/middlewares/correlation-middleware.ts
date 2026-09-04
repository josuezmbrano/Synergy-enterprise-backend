import type { Request, Response, NextFunction } from 'express'
import { requestContext } from 'infrastructure/context/request.context.js'

export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {

    const correlationId = (req.headers['x-request-id'] as string) || crypto.randomUUID()

    res.setHeader('X-Request-ID', correlationId)

    const store = new Map<string, unknown>()
    store.set('requestId', correlationId)

    requestContext.run(store, () => {
        next()
    })
}