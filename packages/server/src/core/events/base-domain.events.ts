export interface EventMetadata {
    correlationId: string,
    causationId?: string,
    actorId?: string,
    version: number
}

export abstract class BaseDomainEvent<TPayload = Record<string, unknown>> {
    public readonly eventId: string
    public readonly occurredAt: string
    public abstract readonly eventName: string
    public abstract readonly aggregateType: string

    protected constructor(
        public readonly aggregateId: string,
        public readonly payload: Readonly<TPayload>,
        public readonly metadata?: Readonly<EventMetadata>,
        eventId?: string,
        occurredAt?: string
    ) {
        this.eventId = eventId ?? crypto.randomUUID()
        this.occurredAt = occurredAt ?? new Date().toISOString()
        Object.freeze(this.payload)
        if (this.metadata) Object.freeze(this.metadata)
    }

    public toJSON() {
        return {
            eventId: this.eventId,
            eventName: this.eventName,
            aggregateId: this.aggregateId,
            aggregateType: this.aggregateType,
            occurredAt: this.occurredAt,
            payload: this.payload,
            metadata: {
                correlationId: this.metadata?.causationId ?? this.eventId,
                causationId: this.metadata?.causationId,
                actorId: this.metadata?.actorId,
                version: this.metadata?.version ?? 1
            }
        }
    }
}