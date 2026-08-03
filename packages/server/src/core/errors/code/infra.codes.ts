export const InfraErrorCodes = {
    INFRASTRUCTURE_MAPPING_ERROR: 'INFRA_001',
    INFRASTRUCTURE_PERSISTENCE_ERROR: 'INFRA_002',
    INFRASTRUCTURE_CONNECTION_ERROR: 'INFRA_003'
 } as const

export type InfraErrorCode = typeof InfraErrorCodes[keyof typeof InfraErrorCodes]