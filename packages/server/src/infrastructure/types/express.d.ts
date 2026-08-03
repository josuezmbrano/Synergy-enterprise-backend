import { Request } from 'express-serve-static-core';

type RequestPayload = {
    sub: string
    role: string
    verified: boolean
}

declare module 'express-serve-static-core' {
    interface Request {
        user: RequestPayload
    }
}