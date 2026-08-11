import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js';


export abstract class BaseEntity <I extends UniqueIdentifier<string>, T> {

    protected readonly _id: I
    protected _props: T
    protected readonly createdAt: DateVo
    protected updatedAt: DateVo

    protected constructor(id: I, props: T, createdAt?: DateVo, updatedAt?: DateVo) {
        this._id = id
        this._props = props

        const now = DateVo.create()
        this.createdAt = createdAt ?? now
        this.updatedAt = updatedAt ?? now
    }

    public get id() {
        return this._id
    }

    protected markAsUpdated(): void {
        this.updatedAt = DateVo.create()
    }

    public equals(object?: this): boolean {

        if (object === null || object === undefined) {
            return false
        }

        if (this.constructor !== object.constructor) {
            return false
        }

        return this._id.equals(object._id)
    }
}