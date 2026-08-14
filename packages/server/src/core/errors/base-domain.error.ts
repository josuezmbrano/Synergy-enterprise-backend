import { ENV } from 'infrastructure/config/env.js'
import { DomainNames } from 'infrastructure/mapper.error.js'

interface ErrorMetadata {
    [key: string]: unknown
}

export abstract class BaseDomainError extends Error {

    readonly name: string
    readonly occurredAt: string

    protected constructor(
        message: string,
        public readonly errorType: DomainNames,
        public readonly internalCode: string,
        public readonly code: string,
        public readonly isOperational: boolean,
        public readonly metadata?: ErrorMetadata
    ) {
        super(message)

        this.name = this.constructor.name
        this.occurredAt = new Date().toISOString()

        Object.setPrototypeOf(this, new.target.prototype)

        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }
    
    toJSON() {
        return {
            name: this.name,
            occurredAt: this.occurredAt,
            message: this.message,
            errorType: this.errorType,
            internalCode: this.internalCode,
            code: this.code,
            ...(this.metadata && {metadata: this.metadata}),
            isOperational: this.isOperational,
            ...(ENV.NODE_ENV === 'development' && {stack: this.stack})
        }
    }

}

