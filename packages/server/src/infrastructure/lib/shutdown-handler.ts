import { Server } from "http";
import { containerDI } from "infrastructure/container/di.config.js";

const pinoLogger = containerDI.loggerMonitorInstance.pinoLogger

export const registerGracefulShutdown = (server: Server, onShutdown: () => Promise<void>, timeoutMs: number = 10000): void => {

    let isShuttingDown = false

    const handleSignal = (signal: NodeJS.Signals) => {

        if (isShuttingDown) {
            pinoLogger.warn('Shutdown already in progress. Ignoring duplicate signal', { signal })
            return
        }

        isShuttingDown = true
        pinoLogger.warn(`Signal received: ${signal}. Initiating graceful shutdown...`, { signal, timeoutMs })

        const forceExitTimer = setTimeout(() => {
            pinoLogger.error(`Forced shutdown! Operations exceeded timeout of ${timeoutMs}ms`, undefined, { timeoutMs })
            process.exit(1)
        }, timeoutMs).unref()

        pinoLogger.info('Closing HTTP server (stopping new incoming traffic)...')

        server.close(async () => {

            try {
                pinoLogger.info('Closing database connections and cleaning up resources...')
                await onShutdown();
                pinoLogger.info('Cleanup completed successfully. Exiting process.')
                process.exit(0);
            } catch (error) {
                pinoLogger.error('Failed to close resources cleanly during shutdown', error)
                clearTimeout(forceExitTimer)
                process.exit(1);
            }
        })

    }

    process.on('SIGINT', () => handleSignal('SIGINT'))
    process.on('SIGTERM', () => handleSignal('SIGTERM'))
}