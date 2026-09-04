import { BaseDomainEvent, EventMetadata } from "../base-domain.events.js"

export interface UpdatedEmailPayload {
    email: string
    fullname: string
    verificationToken: string
}

export class UserUpdatedEmailEvent extends BaseDomainEvent<UpdatedEmailPayload> {

    public readonly aggregateType = 'user' as const
    public readonly eventName = 'user.updated-email' as const

    constructor(
        aggregateId: string,
        payload: UpdatedEmailPayload,
        metadata?: EventMetadata,
        eventId?: string,
        occurredAt?: string
    ) {
        super(aggregateId, payload, metadata, eventId, occurredAt)
    }

}