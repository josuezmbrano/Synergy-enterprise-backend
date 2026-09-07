export interface LoggerPort {
    info(message: string, metadata?: Record<string, unknown>): void
    debug(message: string, metadata?: Record<string, unknown>): void
    warn(message: string, metadata?: Record<string, unknown>): void
    error(message: string, error?: unknown, metadata?: Record<string, unknown>): void
    child(bindings: Record<string, unknown>): LoggerPort
}