export const createReverseMap = <T extends Record<string, string>>(errorCodes: T) => {

    const reverseMap = Object.fromEntries(
        Object.entries(errorCodes).map(([key, value]) => [value, key])
    ) as Record<T[keyof T], keyof T>

    return (uniqueCode: T[keyof T]): keyof T | 'UNKNOWN_DOMAIN_ERROR' => {
        return reverseMap[uniqueCode] ?? 'UNKNOWN_DOMAIN_ERROR'
    }

} 