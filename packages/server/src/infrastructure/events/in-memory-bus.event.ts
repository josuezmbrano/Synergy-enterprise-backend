import { IEventBus } from "application/ports/event-bus.port.js";
import { BaseDomainEvent } from "core/events/base-domain.events.js";
import { PinoLoggerAdapter } from "infrastructure/logging/pino-logger.adapter.js";
import { requestContext } from "infrastructure/context/request.context.js";

export class InMemoryEventBus implements IEventBus {

    public readonly publishedEvents: BaseDomainEvent[] = []

    constructor(private readonly logger: PinoLoggerAdapter) { }


    async publish(event: BaseDomainEvent): Promise<void> {

        const store = requestContext.getStore()
        const activeRequestId = store?.get('requestId')

        const eventSerialized = event.toJSON()
        const enrichedMetadata = {
            ...eventSerialized.metadata,
            correlationId: activeRequestId ?? eventSerialized.metadata.correlationId ?? event.eventId
        }

        this.publishedEvents.push(event)
        this.logger.info(
            `[EventBus] Domain event published: ${event.eventName}`,
            {
                ...eventSerialized,
                metadata: enrichedMetadata
            }
        )
    }

    async publishBatch(events: ReadonlyArray<BaseDomainEvent>): Promise<void> {

        for (const event of events) {
            await this.publish(event)
        }
    }

    public clear(): void {
        this.publishedEvents.length = 0
    }
}