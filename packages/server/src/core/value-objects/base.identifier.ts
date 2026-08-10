import { isEqual } from 'lodash-es'

export abstract class BaseIdentifier <T> {

    protected readonly _value: T


    protected constructor(value: T) {
        this._value = value
    }

    public get value(): T {
        return this._value
    }

    public equals(id?: BaseIdentifier<T>) {

        if (id === null || id === undefined) {
            return false
        }

        if (this.constructor !== id.constructor) {
            return false
        }

        return isEqual(this._value, id.value)
    }

}