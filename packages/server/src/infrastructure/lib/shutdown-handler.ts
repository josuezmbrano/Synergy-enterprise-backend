import { Server } from "http";
import { LoggerMonitor } from "infrastructure/container/di.config.js";


export const registerGracefulShutdown = (server: Server, onShutdown: () => Promise<void>, logger: LoggerMonitor, timeoutMs: number = 10000): void => {

    const pinoLogger = logger.pinoLogger

    let isShuttingDown = false

    const handleSignal = async (signal: NodeJS.Signals) => {

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


        
        pinoLogger.info('Closing HTTP server (stopping new incoming traffic)...');
        server.close((err) => {
            if (err) {
                pinoLogger.error('Error closing HTTP server', err);
            } else {
                pinoLogger.info('HTTP server closed successfully.');
            }
        });

        try {
            pinoLogger.info('Closing database connections and cleaning up resources...')
            await onShutdown();
            pinoLogger.info('Cleanup completed successfully. Exiting process.')
            process.exit(0);
        } catch (error) {
            pinoLogger.error('Failed to close resources cleanly during shutdown', error)
            process.exit(1);
        } finally {
            clearTimeout(forceExitTimer)
        }

    }

    process.on('SIGINT', () => handleSignal('SIGINT'))
    process.on('SIGTERM', () => handleSignal('SIGTERM'))
}