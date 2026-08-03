import { isEqual } from 'lodash-es'

export abstract class BaseValueObject<T> {

    protected readonly _props: T
    
    public abstract readonly voType: string

    protected constructor(props: T) {
        this._props = typeof props === 'object' ? Object.freeze(props) : props
    }

    public get value(): T {
        return this._props
    }

    public equals(vo?: BaseValueObject<T>): boolean {

        if (vo === null || vo === undefined) {
            return false
        }

        if (!(vo instanceof BaseValueObject)) {
            return false
        }

        if (this.voType !== vo.voType) {
            return false
        }

        if (typeof this._props !== 'object') {
            return this._props === vo.value
        }

        return isEqual(this._props, vo.value)
    }

}








