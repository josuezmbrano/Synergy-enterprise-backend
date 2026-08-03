import { CorsOptions } from "cors";

const allowedOrigins = ['http://localhost:3000']

type StaticOrigin = boolean | string | RegExp | Array<boolean | string | RegExp>;

export const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, origin?: StaticOrigin) => void): void => {

        if (!origin) {
            return callback(null, true)
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(null, false)
        }
    },

    credentials: true,
    methods: ['GET', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}