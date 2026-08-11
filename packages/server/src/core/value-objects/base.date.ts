import { BaseValueObject } from "./base.value-objects.js";


export abstract class BaseDate<V extends string> extends BaseValueObject<Date, V> {

    protected abstract readonly voType: V

    protected constructor (value: Date) {
        super(new Date(value.getTime()))
    }

    public get value(): Date {
        return new Date(this._props.getTime());
    }

    public isBefore(otherDate: BaseDate<string>): boolean {
        return this.value.getTime() < otherDate.value.getTime()
    }

    public isAfter(otherDate: BaseDate<string>): boolean {
        return this.value.getTime() > otherDate.value.getTime()
    }

    public toISO(): string {
        return this.value.toISOString()
    }
}