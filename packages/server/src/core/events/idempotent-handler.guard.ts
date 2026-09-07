import { IIdempotencyRepository } from "./idempotency.repository.js"
import { LoggerPort } from "core/ports/logger.port.js"


export interface EventHandler<TEvent> {
    consumerName: string
    handle(event: TEvent): Promise<void>
}


export class IdempotentHandlerGuard {

    constructor(
        private readonly idempotencyRepository: IIdempotencyRepository,
        private readonly logger: LoggerPort
    ) { }

    public async execute<TEvent extends { id: string, name: string }>(
        event: TEvent, handler: EventHandler<TEvent>, lockTimeoutMs?: number
    ): Promise<void> {

        const { id: eventId, name: eventName } = event
        const { consumerName } = handler

        const acquired = await this.idempotencyRepository.acquireLock({
            eventId,
            eventName,
            consumer: consumerName,
            lockTimeoutMs
        })

        if (!acquired) {
            this.logger.info(
                `[Idempotency] Event ${eventId} is already COMPLETED or PROCESSING by another instance of ${consumerName}. Skipping.`
            )
            return
        }

        try {

            await handler.handle(event)
            await this.idempotencyRepository.markAsCompleted(eventId, consumerName)
        } catch (error) {

            await this.idempotencyRepository.markAsFailed(eventId, consumerName)
            this.logger.error(`[Idempotency] Handler failed for event ${eventId}. Status set to FAILED for SQS retry.`, error)
            throw error
        }
    }

}