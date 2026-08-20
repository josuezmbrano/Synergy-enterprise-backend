import { env } from "infrastructure/config/env.config.js"

export const saltRounds: number = {
    production: 12,
    development: 10,
    test: 2
}[env.NODE_ENV]