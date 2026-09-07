import { AcquireLockInput, IIdempotencyRepository } from "core/events/idempotency.repository.js";
import { EventStatus, Prisma, PrismaClient } from "infrastructure/generated/prisma/client.js";
import { BasePrismaRepository } from "infrastructure/persistence/base.prisma-repository.js";

export class PrismaIdempotencyRepository extends BasePrismaRepository implements IIdempotencyRepository {

    constructor(prisma: PrismaClient) { super(prisma) }

    async acquireLock(input: AcquireLockInput): Promise<boolean> {

        const now = new Date()
        const timeoutMs = input.lockTimeoutMs ?? 5 * 60 * 1000
        const staleThreshold = new Date(now.getTime() - timeoutMs)

        try {
            await this.getClient().processedEvent.create({
                data: {
                    event_id: input.eventId,
                    event_name: input.eventName,
                    consumer: input.consumer,
                    status: EventStatus.PROCESSING,
                    processed_at: now,
                    completed_at: null
                }
            })
            return true

        } catch (error) {

            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {

                const result = await this.getClient().processedEvent.updateMany({
                    where: {
                        event_id: input.eventId,
                        consumer: input.consumer,
                        OR: [
                            { status: EventStatus.FAILED },
                            {
                                status: EventStatus.PROCESSING,
                                processed_at: { lt: staleThreshold }
                            }
                        ]
                    },
                    data: {
                        status: EventStatus.PROCESSING,
                        processed_at: now,
                        completed_at: null
                    }
                })

                return result.count > 0
            }

            throw error
        }
    }


    async markAsCompleted(eventId: string, consumer: string): Promise<void> {
        await this.getClient().processedEvent.updateMany({
            where: {
                event_id: eventId,
                consumer: consumer,
                status: EventStatus.PROCESSING
            },
            data: {
                status: EventStatus.COMPLETED,
                completed_at: new Date()
            }
        })
    }


    async markAsFailed(eventId: string, consumer: string): Promise<void> {
        await this.getClient().processedEvent.updateMany({
            where: {
                event_id: eventId,
                consumer: consumer,
                status: EventStatus.PROCESSING
            },
            data: {
                status: EventStatus.FAILED
            }
        })
    }

}