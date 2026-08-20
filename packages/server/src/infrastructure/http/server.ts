import type { Express } from "express"
import prisma from "infrastructure/lib/prisma.js"
import { registerGracefulShutdown } from "infrastructure/lib/shutdown-handler.js"
import { app } from "./app.js"
import { env } from "infrastructure/config/env.config.js"
import { containerDI } from "infrastructure/container/di.config.js"

const pinoLogger = containerDI.loggerMonitorInstance.pinoLogger

const startServer = (app: Express, port: number) => {

    const server = app.listen(port, () => {
        const address = server.address()
        const actualPort = address && typeof address === 'object' ? address.port : port
        pinoLogger.info('🚀 Secure HTTP server running', {
            url: `http://localhost:${actualPort}`,
            port: actualPort,
            protocol: 'http',
            environment: env.NODE_ENV,
            nodeVersion: process.version
        })
    })

    server.on('error', (error) => {
        pinoLogger.error('Critical error while initiating server', error, {
            phase: 'server bootstrap',
            action: 'app.listen'
        })
        process.exit(1)
    })

    registerGracefulShutdown(server, async () => await prisma.$disconnect())
}

startServer(app, env.PORT)

