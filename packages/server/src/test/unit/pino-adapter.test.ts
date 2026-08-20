import { PinoLoggerAdapter } from "infrastructure/logging/pino-logger.adapter.js"
import pino from "pino"
import { mock, MockProxy } from "vitest-mock-extended"
import { requestContext } from "infrastructure/logging/request.context.js"

describe('PinoLoggerAdapter (Infrastructure)', () => {

    let sut: PinoLoggerAdapter
    let mockPino: MockProxy<pino.Logger>

    beforeEach(() => {
        vi.clearAllMocks()
        mockPino = mock<pino.Logger>()
        sut = new PinoLoggerAdapter(mockPino)
    })

    describe('Basic Logging Methods', () => {

        it('should log info message without metadata or request context', () => {
            const message = 'Application started'

            sut.info(message)

            expect(mockPino.info).toHaveBeenCalledWith(message)
            expect(mockPino.info).toHaveBeenCalledTimes(1)
        })

        it('should log info with metadata when provided', () => {
            const message = 'User authenticated'
            const metadata = { userId: 'usr-123' }

            sut.info(message, metadata)

            expect(mockPino.info).toHaveBeenCalledWith(metadata, message)
        })

        it('should log warn with metadata', () => {
            const message = 'Rate limit approaching'
            const metadata = { attempts: 4 }

            sut.warn(message, metadata)

            expect(mockPino.warn).toHaveBeenCalledWith(metadata, message)
        })

        it('should log debug with metadata', () => {
            const message = 'Cache miss'
            const metadata = { key: 'user:123' }

            sut.debug(message, metadata)

            expect(mockPino.debug).toHaveBeenCalledWith(metadata, message)
        })

        it('should log error with exception object and metadata', () => {
            const message = 'Database query failed'
            const error = new Error('Connection timeout')
            const metadata = { queryTimeMs: 5000 }

            sut.error(message, error, metadata)

            expect(mockPino.error).toHaveBeenCalledWith(
                {
                    ...metadata,
                    err: error
                },
                message
            )
        })
    })

    describe('Request Context Integration (AsyncLocalStorage)', () => {

        it('should automatically inject requestId from requestContext into log payload', () => {
            const message = 'Processing HTTP request'
            const store = new Map<string, string>([['requestId', 'req-abc-999']])

            requestContext.run(store, () => {
                sut.info(message)
            })

            expect(mockPino.info).toHaveBeenCalledWith(
                { requestId: 'req-abc-999' },
                message
            )
        })

        it('should merge requestId and custom metadata in the same payload', () => {
            const message = 'Order processed'
            const metadata = { orderId: 'ord-456' }
            const store = new Map<string, string>([['requestId', 'req-abc-999']])

            requestContext.run(store, () => {
                sut.info(message, metadata)
            })

            expect(mockPino.info).toHaveBeenCalledWith(
                {
                    requestId: 'req-abc-999',
                    orderId: 'ord-456'
                },
                message
            )
        })

        it('should merge requestId, error object, and metadata on error log', () => {
            const message = 'Payment processing failed'
            const error = new Error('Declined card')
            const metadata = { amount: 100 }
            const store = new Map<string, string>([['requestId', 'req-abc-999']])

            requestContext.run(store, () => {
                sut.error(message, error, metadata)
            })

            expect(mockPino.error).toHaveBeenCalledWith(
                {
                    requestId: 'req-abc-999',
                    amount: 100,
                    err: error
                },
                message
            )
        })
    })

    describe('Child Loggers Creation', () => {

        it('should return a new instance of PinoLoggerAdapter with child pino instance', () => {
            const bindings = { module: 'AuthModule' }
            const mockChildPino = mock<pino.Logger<string, boolean>>()
            mockPino.child.mockReturnValue(mockChildPino)

            const childAdapter = sut.child(bindings)

            expect(mockPino.child).toHaveBeenCalledWith(bindings)
            expect(childAdapter).toBeInstanceOf(PinoLoggerAdapter)

            // Probamos que el logger hijo use la instancia child de pino
            childAdapter.info('Child log test')
            expect(mockChildPino.info).toHaveBeenCalledWith('Child log test')
        })
    })

})