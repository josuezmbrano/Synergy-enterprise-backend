import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UniqueIdentifier } from 'core/value-objects/unique.identifier.js';


export abstract class BaseEntity <I extends UniqueIdentifier, T> {

    protected readonly _id: I
    protected readonly _props: T
    protected readonly createdAt: DateVo
    protected updatedAt: DateVo

    protected constructor(id: I, props: T, createdAt?: DateVo, updatedAt?: DateVo) {
        this._id = id
        this._props = props
        this.createdAt = createdAt ?? DateVo.create()
        this.updatedAt = updatedAt ?? DateVo.create()
    }

    public get id() {
        return this._id
    }

    abstract get entityType(): string

    protected markAsUpdated(): void {
        this.updatedAt = DateVo.create()
    }

    public equals(object?: BaseEntity<I, T>): boolean {

        if (object === null || object === undefined) {
            return false
        }

        if (!(object instanceof BaseEntity)) {
            return false
        }

        if (object.entityType !== this.entityType) {
            return false
        }

        return this._id.equals(object._id)
    }
}