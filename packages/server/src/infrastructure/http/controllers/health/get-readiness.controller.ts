import type { Request, Response } from 'express'
import { DatabasePinger } from 'infrastructure/lib/database-pinger.js'


export class GetReadinessController {

    constructor(private readonly dbPinger: DatabasePinger) { }

    execute = async (_req: Request, res: Response): Promise<void> => {

        res.setHeader('Cache-control', 'no-store, no-cache, must-revalidate')
        res.setHeader('Pragma', 'no-cache')

        let timer: NodeJS.Timeout | undefined
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Exceeded DB timeout')), 2000)
        })

        try {

            const dbCheckPromise = this.dbPinger.ping()
            await Promise.race([dbCheckPromise, timeoutPromise])

            res.status(200).json({
                status: 'UP',
                timestamp: new Date().toISOString(),
                checks: {
                    database: {
                        status: 'UP'
                    }
                }
            })

        } catch (error) {

            const errorMessage = error instanceof Error ? error.message : 'Database connection timeout / unreachable'

            res.status(503).json({
                status: 'DOWN',
                timestamp: new Date().toISOString(),
                checks: {
                    database: {
                        status: 'DOWN',
                        error: errorMessage
                    }
                }
            })

        } finally {

            if (timer) {
                clearTimeout(timer)
            }
        }
    }
    
}