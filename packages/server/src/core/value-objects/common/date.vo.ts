import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';

export class DateVo extends BaseValueObject<Date> {

    public readonly voType = 'DateVo';

    protected constructor(value: Date) {
        super(new Date(value.getTime()))
    }

    public static create(value?: Date | string | number): DateVo {
        const date = value ? new Date(value) : new Date()

        if (isNaN(date.getTime())) {
            throw CommonErrorFactory.commonValidationFailed(
                'The provided value cannot be parsed into a valid date object.',
                {
                    field: 'date',
                    receivedValue: String(value),
                    reason: 'INVALID_DATE',
                    constraint: 'must_be_valid_calendar_date',
                    description: 'The provided value is not a valid date'
                }
            )
        }

        return new DateVo(date)
    }

    public static startOfDay(date: Date = new Date()): DateVo {
        const copy = new Date(date.getTime())
        copy.setHours(0, 0, 0, 0)
        return DateVo.create(copy)
    }

    public get value(): Date {
        return new Date(this._props.getTime());
    }

    public isBefore(otherDate: DateVo): boolean {
        return this.value.getTime() < otherDate.value.getTime()
    }

    public isAfter(otherDate: DateVo): boolean {
        return this.value.getTime() > otherDate.value.getTime()
    }

    public equals(otherDate: DateVo): boolean {
        return this.value.getTime() === otherDate.value.getTime()
    }

    public toISO(): string {
        return this.value.toISOString()
    }

    

}