import { isEqual } from 'lodash-es'
import { deepFreeze, DeepReadonly } from 'core/utils/deepFreeze.js'

export abstract class BaseValueObject<T> {

    protected readonly _props: DeepReadonly<T>
    
    protected constructor(props: T) {
        this._props = deepFreeze(props)

        Object.freeze(this)
    }

    public get value(): DeepReadonly<T> {
        return this._props
    }

    public equals(vo?: BaseValueObject<T>): boolean {

        if (vo === null || vo === undefined) {
            return false
        }

        if (this.constructor !== vo.constructor) {
            return false
        }

        if (this._props === null || typeof this._props !== 'object') {
            return this._props === vo.value
        }

        return isEqual(this._props, vo.value)
    }

}








