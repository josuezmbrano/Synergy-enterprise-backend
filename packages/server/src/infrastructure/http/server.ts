import { registerGracefulShutdown } from "infrastructure/lib/shutdown-handler.js"
import { getEnv } from "infrastructure/config/env.config.js"
import { createContainer } from "infrastructure/container/di.config.js"
import { createApp } from "./app.js"
import { loadProductionSecrets } from "infrastructure/config/load.secrets.js"



const startServer = async () => {

    await loadProductionSecrets()

    const env = getEnv()
    const container = createContainer(env)
    const app = createApp(container)
    const prisma = container.prisma


    const pinoLogger = container.loggerMonitorInstance.pinoLogger
    const port = env.PORT

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

    registerGracefulShutdown(server, async () => await prisma.$disconnect(), container.loggerMonitorInstance)
}

startServer()

