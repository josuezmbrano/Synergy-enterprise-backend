import { Server } from "http";


export const registerGracefulShutdown = (server: Server, onShutdown: () => Promise<void>, timeoutMs: number = 10000): void => {

    let isShuttingDown = false

    const handleSignal = (signal: NodeJS.Signals) => {

        if (isShuttingDown) {
            console.log(`Shutdown already in progress. Ignoring ${signal}`)
            return
        }

        isShuttingDown = true
        console.log(`\nSignal received: ${signal}. Initiating graceful shutdown...`)

        const forceExitTimer = setTimeout(() => {
            console.error(`Forced shutdown! Operations exceeded timeout of ${timeoutMs}ms.`)
            process.exit(1)
        }, timeoutMs).unref()

        console.log('Closing HTTP server (stopping new incoming traffic)...');

        server.close(async () => {

            try {
                console.log('Closing database connections...');
                await onShutdown();
                console.log('Cleanup completed successfully.');
                process.exit(0);
            } catch (error) {
                console.error('Failed to close database connection cleanly:', error);
                clearTimeout(forceExitTimer)
                process.exit(1);
            }
        })

    }

    process.on('SIGINT', () => handleSignal('SIGINT'))
    process.on('SIGTERM', () => handleSignal('SIGTERM'))
}