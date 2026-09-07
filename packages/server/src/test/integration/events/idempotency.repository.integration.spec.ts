import { getEnv } from "infrastructure/config/env.config.js"
import { ApplicationContainer, createContainer } from "infrastructure/container/di.config.js"
import { PrismaIdempotencyRepository } from "infrastructure/events/idempotency.prisma.js"
import { EventStatus, PrismaClient } from "infrastructure/generated/prisma/client.js"

describe('PrismaIdempotencyRepository (Integration Tests)', () => {
    let idempotencyRepository: PrismaIdempotencyRepository
    let containerDI: ApplicationContainer
    let prisma: PrismaClient

    beforeAll(() => {
        const env = getEnv()
        containerDI = createContainer(env);
        prisma = containerDI.prisma
    })

    beforeEach(async () => {
        await prisma.processedEvent.deleteMany()

        idempotencyRepository = new PrismaIdempotencyRepository(prisma);
    })

    const testEvent = {
        eventId: 'f07bc386-0be4-4e82-af37-0dce23018d4d',
        eventName: 'OrderPlaced',
        consumer: 'NotificationService',
    }


    it('must acquire the lock successfully for a new event.', async () => {
        const acquired = await idempotencyRepository.acquireLock(testEvent)
        expect(acquired).toBe(true)

        const record = await prisma.processedEvent.findUnique({
            where: { event_id_consumer: { event_id: testEvent.eventId, consumer: testEvent.consumer } },
        })
        expect(record?.status).toBe(EventStatus.PROCESSING)
    })

    it('must block simultaneous executions (Atómic Concurrency)', async () => {
        // Scenario where two workers compete for the lock simultaneously
        const [workerA, workerB] = await Promise.all([
            idempotencyRepository.acquireLock(testEvent),
            idempotencyRepository.acquireLock(testEvent),
        ])

        expect([workerA, workerB].filter(Boolean).length).toBe(1)
    })

    it('must re-acquire the lock if previous attempt was marked as FAILED.', async () => {
        // 1. Intento inicial falla
        await idempotencyRepository.acquireLock(testEvent)
        await idempotencyRepository.markAsFailed(testEvent.eventId, testEvent.consumer)

        // 2. SQS Retry attempt
        const reacquired = await idempotencyRepository.acquireLock(testEvent)
        expect(reacquired).toBe(true)
    })

    it('must release and re-acquire the lock if the previous process became stale.', async () => {
        // 1. insert stuck event processed 10 mins ago.
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
        await prisma.processedEvent.create({
            data: {
                event_id: testEvent.eventId,
                event_name: testEvent.eventName,
                consumer: testEvent.consumer,
                status: EventStatus.PROCESSING,
                processed_at: tenMinutesAgo,
            },
        })

        // 2. Attempting to acquire the lock with a 5-minute timeout. (5 * 60 * 1000)
        const acquired = await idempotencyRepository.acquireLock({
            ...testEvent,
            lockTimeoutMs: 5 * 60 * 1000,
        })

        expect(acquired).toBe(true)
    })
})