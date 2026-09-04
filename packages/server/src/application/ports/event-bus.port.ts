import { BaseDomainEvent } from "core/events/base-domain.events.js";

export interface IEventBus {
    publish(event: BaseDomainEvent): Promise<void>
    publishBatch(events: ReadonlyArray<BaseDomainEvent>): Promise<void>
}