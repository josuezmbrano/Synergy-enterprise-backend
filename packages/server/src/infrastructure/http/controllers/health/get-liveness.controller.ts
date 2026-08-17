import type { Request, Response } from 'express'


export class GetLivenessController {

    execute = (_req: Request, res: Response): void => {

        // HTTP HEADERS TO AVOID CACHE STORE ON BROWSERS OR INTERMEDIATES FROM THIS RESPONSE
        res.setHeader('Cache-control', 'no-store, no-cache, must-revalidate')
        res.setHeader('Pragma', 'no-cache')

        const uptimeMetric = Number(process.uptime().toFixed(2))
        const memoryUsage = process.memoryUsage()

        res.status(200).json({
            status: 'UP',
            uptime: uptimeMetric,
            memory: {
                rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
                heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
            },
            timestamp: new Date().toISOString()
        })
    }

}