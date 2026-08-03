import { InfraErrorCodes } from '../code/infra.codes.js'
import { InfraDomainError } from '../domain/domain-classes.error.js'
import { createReverseMap } from '../utils/reverse-map.error.js'

const reverseMap = createReverseMap(InfraErrorCodes)

export const InfraErrorFactory = {

    mappingError: (context: string, details: string, metaData?: Record<string, unknown>) => {
        const internalCode = InfraErrorCodes.INFRASTRUCTURE_MAPPING_ERROR
        const code = reverseMap(internalCode)
        return new InfraDomainError(
            `Error transforming data in:  [${context}]: ${details}`, InfraErrorCodes.INFRASTRUCTURE_MAPPING_ERROR, code, metaData 
        )
    },

    persistenceError: (context: string, details: string, metaData?: Record<string, unknown>) => {
        const internalCode = InfraErrorCodes.INFRASTRUCTURE_PERSISTENCE_ERROR
        const code = reverseMap(internalCode)
        return new InfraDomainError(
            `Persistence error during: [${context}]: ${details}`, InfraErrorCodes.INFRASTRUCTURE_PERSISTENCE_ERROR, code, metaData 
        )
    },

    connectionError: (service: string, details: string, metaData?: Record<string, unknown>) => {
        const internalCode = InfraErrorCodes.INFRASTRUCTURE_CONNECTION_ERROR
        const code = reverseMap(internalCode)
        return new InfraDomainError(
            `Connection failed with [${service}]: ${details}`, InfraErrorCodes.INFRASTRUCTURE_CONNECTION_ERROR, code, metaData 
        )
    }
}