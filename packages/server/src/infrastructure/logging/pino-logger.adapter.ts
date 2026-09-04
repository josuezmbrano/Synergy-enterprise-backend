import { LoggerPort } from "application/ports/logger.port.js";
import { requestContext } from "../context/request.context.js";
import pino from "pino";


export class PinoLoggerAdapter implements LoggerPort {
    constructor(private readonly pinoInstance: pino.Logger) { }

    info(message: string, metadata?: Record<string, unknown>): void {
        this.callPino('info', message, undefined, metadata)
    }

    warn(message: string, metadata?: Record<string, unknown>): void {
        this.callPino('warn', message, undefined, metadata)
    }

    debug(message: string, metadata?: Record<string, unknown>): void {
        this.callPino('debug', message, undefined, metadata)
    }

    error(message: string, error?: unknown, metadata?: Record<string, unknown>): void {
        this.callPino('error', message, error, metadata)
    }

    child(bindings: Record<string, unknown>): LoggerPort {
        return new PinoLoggerAdapter(this.pinoInstance.child(bindings))
    }

    private callPino(
        level: 'info' | 'error' | 'warn' | 'debug',
        message: string,
        error?: unknown,
        metadata: Record<string, unknown> = {}
    ): void {

        const store = requestContext.getStore()
        const requestId = store?.get('requestId')

        const payload: Record<string, unknown> = {
            ...(requestId ? { requestId } : {}),
            ...metadata
        }

        if (error !== undefined) payload.err = error

        if (Object.keys(payload).length === 0) {
            this.pinoInstance[level](message)
            return
        }

        this.pinoInstance[level](payload, message)
    }
}