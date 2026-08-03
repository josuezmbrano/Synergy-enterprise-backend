import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { USER_CONSTRAINTS } from '@project/common/constants/user.constants.js';

export class UserLastnameVo extends BaseValueObject<string> {

    public readonly voType = 'UserLastnameVo';

    private constructor(value: string) {
        super(value)
    }

    public static create(lastname: string): UserLastnameVo {

        const sanitizedLastname = (lastname ?? '').trim()

        if (!sanitizedLastname) {
            throw UserErrorFactory.userValidationFailed({
                field: 'lastname',
                receivedValue: sanitizedLastname,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'User last name cannot be empty'
            })
        }

        const normalizedLastname = sanitizedLastname
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')


        if (normalizedLastname.length < USER_CONSTRAINTS.LASTNAME_MIN_LENGTH || normalizedLastname.length > USER_CONSTRAINTS.LASTNAME_MAX_LENGTH) {
            throw UserErrorFactory.userValidationFailed({
                field: 'lastname',
                receivedValue: normalizedLastname,
                reason: 'LENGTH_MISMATCH',
                constraint: `min_length: ${USER_CONSTRAINTS.LASTNAME_MIN_LENGTH}/ max_length: ${USER_CONSTRAINTS.LASTNAME_MIN_LENGTH}`,
                description: `User last name length must be between ${USER_CONSTRAINTS.LASTNAME_MIN_LENGTH} to ${USER_CONSTRAINTS.LASTNAME_MIN_LENGTH} characters long`
            })
        }


        if (!USER_CONSTRAINTS.LASTNAME_REGEX_FORMAT.test(normalizedLastname)) {
            throw UserErrorFactory.userValidationFailed({
                field: 'lastname',
                receivedValue: normalizedLastname,
                reason: 'INVALID_CHARACTERS',
                constraint: 'Letters, spaces, hyphens and accents only',
                description: 'Unauthorized special characters or symbols. Only letter characters (including accents), spaces, and (-) are allowed'
            })
        }

        return new UserLastnameVo(normalizedLastname)
    }

}