import { getServerConfig, ServerPortConfig } from 'infrastructure/config/server.config.js'
import { app } from './app.js'
import type { Express } from 'express-serve-static-core'


class StartServer {

    private readonly expressApp: Express
    private readonly config: ServerPortConfig
    private realPort: string | number

    constructor(config: ServerPortConfig) {
        this.expressApp = app
        this.config = config
        this.realPort = config.port
    }


    private getConfig(): ServerPortConfig {
        return this.config
    }


    public start(): void {
        try {

            const server = this.expressApp.listen(this.getConfig().port, () => {
                // EXTRACT THE CORRECT PORT ADDRESS INFO IN CASE WE ARE LISTENING
                // TO THE OPEN PORT ASSIGNMENT (0) ON TEST ENVIRONMENT
                const address = server.address()
                const actualPort = typeof address === 'string' ? address : address?.port;
                this.realPort = actualPort || this.getConfig().port
                
                console.log(`🚀 Secure HTTP server running on http://localhost:${actualPort || this.getConfig().port}`)
            })

        } catch (error) {

            console.error('Critical error while initiating server:', error)
            process.exit(1)
        }
    }

    public get actualPort(): string | number {
        return this.realPort
    }

}

const server = new StartServer(getServerConfig())
server.start()

