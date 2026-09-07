import { IIdempotencyRepository } from "core/events/idempotency.repository.js"
import { IdempotentHandlerGuard } from "core/events/idempotent-handler.guard.js"
import { LoggerPort } from "core/ports/logger.port.js"

describe('IdempotentHandlerGuard', () => {

    let repositoryMock: IIdempotencyRepository
    let loggerMock: LoggerPort
    let guard: IdempotentHandlerGuard

    beforeEach(() => {
        repositoryMock = {
            acquireLock: vi.fn(),
            markAsCompleted: vi.fn(),
            markAsFailed: vi.fn(),
        }
        loggerMock = {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
        } as unknown as LoggerPort

        guard = new IdempotentHandlerGuard(repositoryMock, loggerMock)
    })

    it('must execute the handler and mark as COMPLETED if it acquires the lock.', async () => {
        vi.mocked(repositoryMock.acquireLock).mockResolvedValue(true)
        const handler = { consumerName: 'TestConsumer', handle: vi.fn().mockResolvedValue(undefined) }
        const event = { id: 'evt-1', name: 'UserCreated' }

        await guard.execute(event, handler)

        expect(repositoryMock.acquireLock).toHaveBeenCalledWith({
            eventId: 'evt-1',
            eventName: 'UserCreated',
            consumer: 'TestConsumer',
            lockTimeoutMs: undefined,
        })
        expect(handler.handle).toHaveBeenCalledWith(event)
        expect(repositoryMock.markAsCompleted).toHaveBeenCalledWith('evt-1', 'TestConsumer')
        expect(repositoryMock.markAsFailed).not.toHaveBeenCalled()
    })

    it('must not execute the handler if the lock is not acquired.', async () => {
        vi.mocked(repositoryMock.acquireLock).mockResolvedValue(false)
        const handler = { consumerName: 'TestConsumer', handle: vi.fn() }
        const event = { id: 'evt-1', name: 'UserCreated' }

        await guard.execute(event, handler)

        expect(handler.handle).not.toHaveBeenCalled()
        expect(repositoryMock.markAsCompleted).not.toHaveBeenCalled()
        expect(loggerMock.info).toHaveBeenCalled()
    })

    it('must re-throw the exception and mark as FAILED if the handler fails.', async () => {
        vi.mocked(repositoryMock.acquireLock).mockResolvedValue(true)
        const error = new Error('Handler Business Error')
        const handler = { consumerName: 'TestConsumer', handle: vi.fn().mockRejectedValue(error) }
        const event = { id: 'evt-1', name: 'UserCreated' }

        await expect(guard.execute(event, handler)).rejects.toThrow('Handler Business Error')

        expect(repositoryMock.markAsFailed).toHaveBeenCalledWith('evt-1', 'TestConsumer')
        expect(repositoryMock.markAsCompleted).not.toHaveBeenCalled()
        expect(loggerMock.error).toHaveBeenCalled()
    })
})