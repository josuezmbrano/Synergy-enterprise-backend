export type DeepReadonly<T> = T extends Function
    // Conditionally checks in steps if T is a function
    // and array or an object 
    // Makes every nested object or array to be recursively inmutable
    ? T
    : T extends Date
    ? T
    : T extends Array<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T

export const deepFreeze = <T>(value: T, seen = new WeakSet<Object>()): DeepReadonly<T> => {
    // 1. Checks if value is a primitive to return (primitives are not freezable)
    if (value === null || typeof value !== 'object' && typeof value !== 'function') {
        return value as DeepReadonly<T>
    }

    // 1.1 Exclude Built-ins 
    if (value instanceof Date || value instanceof RegExp) {
        return value as unknown as DeepReadonly<T>
    }

    // 2. If it was already processed, then it returns to avoid
    // circular infinite loop
    if (seen.has(value)) {
        return value as unknown as DeepReadonly<T>
    }
    seen.add(value)

    // 3. Iterate through every internal properties of every key 
    // to freeze them
    const keys = Reflect.ownKeys(value)
    for (const key of keys) {

        // It only freezes the property it its configurable
        // and repeats the deep freeze process if the key is an object
        const descriptor = Object.getOwnPropertyDescriptor(value, key)

        if (descriptor) { deepFreeze(Reflect.get(value, key), seen) }
    }

    // 4. Once the process is over, it makes sure the
    // box is locked
    return Object.freeze(value) as unknown as DeepReadonly<T>
}