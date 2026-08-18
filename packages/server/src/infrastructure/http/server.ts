import type { Express } from "express"
import prisma from "infrastructure/lib/prisma.js"
import { registerGracefulShutdown } from "infrastructure/lib/shutdown-handler.js"
import { app } from "./app.js"
import { env } from "infrastructure/config/env.config.js"

const startServer = (app: Express, port: number) => {

    const server = app.listen(port, () => {
        const address = server.address()
        const actualPort = address && typeof address === 'object' ? address.port : port
        console.log(`🚀 Secure HTTP server running on http://localhost:${actualPort}`)
    })

    server.on('error', (error) => {
        console.error('Critical error while initiating server: ', error)
        process.exit(1)
    })

    registerGracefulShutdown(server, async () => await prisma.$disconnect())
}

startServer(app, env.PORT)

