import { BaseDomainEvent, EventMetadata } from "../base-domain.events.js"

export interface RequestedPasswordResetPayload {
    email: string
    fullname: string
    verificationToken: string
}

export class UserRequestedPasswordResetEvent extends BaseDomainEvent<RequestedPasswordResetPayload> {

    public readonly aggregateType = 'user' as const
    public readonly eventName = 'user.requested-password-reset' as const

    constructor(
        aggregateId: string,
        payload: RequestedPasswordResetPayload,
        metadata?: EventMetadata,
        eventId?: string,
        occurredAt?: string
    ) {
        super(aggregateId, payload, metadata, eventId, occurredAt)
    }

}