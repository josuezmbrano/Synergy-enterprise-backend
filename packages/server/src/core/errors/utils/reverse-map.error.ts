export const createReverseMap = <T extends Record<string, string>>(errorCodes: T) => {

    const reverseMap = Object.fromEntries(
        Object.entries(errorCodes).map(([key, value]) => [value, key])
    )

    return (uniqueCode: string): string => {
        return reverseMap[uniqueCode] || 'UNKNOWN_DOMAIN_ERROR'
    }

}