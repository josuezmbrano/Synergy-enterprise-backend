import { BaseDomainEvent, EventMetadata } from "../base-domain.events.js"

export interface UserRegisteredPayload {
    email: string,
    fullname: string,
    verificationToken: string
}

export class UserRegisteredEvent extends BaseDomainEvent<UserRegisteredPayload> {
    
    public readonly eventName = 'user.registered' as const
    public readonly aggregateType = 'user' as const

    constructor (
        aggregateId: string,
        payload: UserRegisteredPayload,
        metadata?: EventMetadata,
        eventId?: string,
        occurredAt?: string
    ) {
        super(aggregateId, payload, metadata, eventId, occurredAt)
    }
}