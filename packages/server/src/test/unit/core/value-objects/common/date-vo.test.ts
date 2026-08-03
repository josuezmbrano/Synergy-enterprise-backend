import { CommonDomainError } from 'core/errors/domain/domain-classes.error.js'
import { DateVo } from 'core/value-objects/common/date.vo.js'
import { expectDomainError } from 'test/utils/test-errors.utils.js'

describe('DateVo creation validation and prop testing.', () => {

    it('must create a DateVo and receive a parameter of type value equal to Date | String | Number.', () => {

        const nowDate = new Date()

        const before = new Date()
        before.setHours(before.getHours() - 15)
        const beforeString = before.toISOString()

        const after = new Date()
        after.setHours(after.getHours() + 24)
        const afterNumber = after.getTime()

        const createdDate = (expectedFormat: Date | string | number): DateVo => {
            const date = DateVo.create(expectedFormat)
            return date
        }

        const evaluatedTime = (expectedVo: DateVo) => {

            const now = new Date()

            const diffInMs = expectedVo.value.getTime() - now.getTime()
            const diffInHours = Math.round(diffInMs / (1000 * 60 * 60)) + 0

            return diffInHours
        }

        const nowVo = createdDate(nowDate)
        const beforeVo = createdDate(beforeString)
        const afterVo = createdDate(afterNumber)

        expect(evaluatedTime(nowVo)).toBe(0)
        expect(evaluatedTime(afterVo)).toBe(24)
        expect(evaluatedTime(beforeVo)).toBe(-15)
    })

    it('must throw an INVALID_DATE reason value error if provided value is not a valid date object.', () => {

        expectDomainError(CommonDomainError, () => DateVo.create('afk'), 4, undefined, 'INVALID_DATE', 'date')
    })

    it('should convert to string the current DateVo', () => {

        const dateVo = DateVo.create()
        const dateString = dateVo.toISO()

        expect(dateString).toBeTypeOf('string')
    })

    describe('Comparison functions to calculate greater, less or equal Date value', () => {

        it('should evaluate DateVo as before current date', () => {

            const before = new Date()
            before.setHours(before.getHours() - 15)

            const beforeVo = DateVo.create(before)

            expect(beforeVo.isBefore(DateVo.create())).toBe(true)
            expect(beforeVo.isAfter(DateVo.create())).toBe(false)
            expect(beforeVo.equals(DateVo.create())).toBe(false)
        })

        it('should evaluate DateVo as After current date', () => {

            const after = new Date()
            after.setHours(after.getHours() + 24)

            const afterVo = DateVo.create(after)

            expect(afterVo.isBefore(DateVo.create())).toBe(false)
            expect(afterVo.isAfter(DateVo.create())).toBe(true)
            expect(afterVo.equals(DateVo.create())).toBe(false)
        })

        it('should evaluate DateVo as equal current date', () => {

            const now = new Date()

            const nowVo = DateVo.create(now)

            expect(nowVo.isBefore(DateVo.create())).toBe(false)
            expect(nowVo.isAfter(DateVo.create())).toBe(false)
            expect(nowVo.equals(DateVo.create(now))).toBe(true)
        })

    })

})