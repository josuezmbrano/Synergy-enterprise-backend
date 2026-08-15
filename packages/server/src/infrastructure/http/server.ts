import { env } from 'infrastructure/config/env.config.js'
import { app } from './app.js'
import type { Express } from 'express-serve-static-core'


class StartServer {

    private readonly expressApp: Express
    private realPort: number

    constructor(port: number) {
        this.expressApp = app
        this.realPort = port
    }

    public start(): void {
        const server = this.expressApp.listen(this.realPort, () => {
            // EXTRACT THE CORRECT PORT ADDRESS INFO IN CASE WE ARE LISTENING
            // TO THE OPEN PORT ASSIGNMENT (0) ON TEST ENVIRONMENT
            const address = server.address()

            if (address && typeof address === 'object') this.realPort = address.port

            console.log(`🚀 Secure HTTP server running on http://localhost:${this.realPort}`)
        })

        server.on('error', (error) => {
            console.error('Critical error while initiating server:', error)
            process.exit(1)
        })
    }

    public get actualPort(): number {
        return this.realPort
    }

}

const server = new StartServer(env.PORT)
server.start()

