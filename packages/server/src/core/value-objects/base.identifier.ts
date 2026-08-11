import { isEqual } from 'lodash-es'

export abstract class BaseIdentifier <T, ID extends string> {

    protected abstract readonly identifierType: ID
    protected readonly _value: T


    protected constructor(value: T) {
        this._value = value
    }

    public get value(): T {
        return this._value
    }

    public equals(id?: this) {

        if (id === null || id === undefined) {
            return false
        }

        if (this.identifierType !== id.identifierType) {
            return false
        }

        return isEqual(this._value, id.value)
    }

}