import { ENV } from 'infrastructure/config/env.js'
import { DomainNames } from 'infrastructure/mapper.error.js'

interface ErrorMetaData {
    [key: string]: unknown
}

export class BaseDomainError extends Error {

    readonly name: string
    readonly date: string

    protected constructor(
        public readonly message: string,
        public readonly errorType: DomainNames,
        public readonly internalCode: string,
        public readonly code: string,
        public readonly isOperational: boolean,
        public readonly metaData?: ErrorMetaData
    ) {
        super(message)

        this.name = this.constructor.name
        this.date = new Date().toISOString()

        Object.setPrototypeOf(this, new.target.prototype)

        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }
    
    toJSON() {
        return {
            name: this.name,
            date: this.date,
            message: this.message,
            errorType: this.errorType,
            internalCode: this.internalCode,
            code: this.code,
            ...(this.metaData && {metaData: this.metaData}),
            isOperational: this.isOperational,
            ...(ENV.NODE_ENV === 'development' && {stack: this.stack})
        }
    }

}

