export interface AcquireLockInput {
    eventId: string
    eventName: string
    consumer: string
    lockTimeoutMs?: number
}

export interface IIdempotencyRepository {

    acquireLock(input: AcquireLockInput): Promise<boolean>
    markAsCompleted(eventId: string, consumer: string): Promise<void>
    markAsFailed(eventId: string, consumer: string): Promise<void>
}