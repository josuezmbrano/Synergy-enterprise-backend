import { Env } from "../env.schema.js"

export const getSaltRounds = (env: Env): number => {

    return {
        production: 12,
        development: 10,
        test: 2
    }[env.NODE_ENV]
}