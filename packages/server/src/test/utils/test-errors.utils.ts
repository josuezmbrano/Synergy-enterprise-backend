import { BaseDomainError } from 'core/errors/base-domain.error.js'

export interface ErrorMetadata {
    field: string
    reason: string
    constraint: string
    description: string
}

export const expectDomainError = <T extends BaseDomainError>(
   errorClass: new (...args: any[]) => T, act: () => void, assertions: number, code?: string, reason?: string, field?: string
) => {

    expect.assertions(assertions)
    expect(act).toThrow()

    try {
        act()
    } catch (error) {

        if (error instanceof BaseDomainError) {
            const meta = error.metadata as ErrorMetadata | undefined

            expect(error).toBeInstanceOf(errorClass)
            
            if (reason) expect(meta?.reason).toBe(reason)
            if (field) expect(meta?.field).toBe(field)
            if (code) expect(error.code).toBe(code)
        
            return
        }

        console.log(error)
        throw(error)
    }
}