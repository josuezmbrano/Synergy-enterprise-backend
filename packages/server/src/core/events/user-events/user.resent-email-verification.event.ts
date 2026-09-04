import { BaseDomainEvent, EventMetadata } from "../base-domain.events.js"

export interface ResentEmailVerificationPayload {
    email: string
    fullname: string
    verificationToken: string
}

export class UserResentEmailVerificationEvent extends BaseDomainEvent<ResentEmailVerificationPayload> {

    public readonly aggregateType = 'user' as const
    public readonly eventName = 'user.resent-email-verification' as const

    constructor(
        aggregateId: string,
        payload: ResentEmailVerificationPayload,
        metadata?: EventMetadata,
        eventId?: string,
        occurredAt?: string
    ) {
        super(aggregateId, payload, metadata, eventId, occurredAt)
    }

}