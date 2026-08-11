import { CommonErrorFactory } from 'core/errors/factories/common-factory.error.js';
import { BaseDate } from '../base.date.js';

export class DateVo extends BaseDate<'DateVo'> {

    protected readonly voType = 'DateVo' as const

    protected constructor(value: Date) {
        super(value)
    }

    public static create(value?: Date | string | number): DateVo {
        const date = value === undefined
            ? new Date()
            : new Date(value)

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
}