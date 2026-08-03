import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { USER_CONSTRAINTS } from '@project/common/constants/user.constants.js';

export class UserNameVo extends BaseValueObject<string> {

    public readonly voType = 'UserNameVo';

    private constructor(value: string) {
        super(value)
    }

    public static create(name: string): UserNameVo {

        const sanitizedName = (name ?? '').trim()

        if (!sanitizedName) {
            throw UserErrorFactory.userValidationFailed({
                field: 'name',
                receivedValue: sanitizedName,
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'User name cannot be empty'
            })
        }

        const normalizedName = sanitizedName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')

        if (normalizedName.length < USER_CONSTRAINTS.NAME_MIN_LENGTH || normalizedName.length > USER_CONSTRAINTS.NAME_MAX_LENGTH) {
            throw UserErrorFactory.userValidationFailed({
                field: 'name',
                receivedValue: normalizedName,
                reason: 'LENGTH_MISMATCH',
                constraint: `min_length: ${USER_CONSTRAINTS.NAME_MIN_LENGTH} / max_length: ${USER_CONSTRAINTS.NAME_MAX_LENGTH}`,
                description: `User name length must be between ${USER_CONSTRAINTS.NAME_MIN_LENGTH} to ${USER_CONSTRAINTS.NAME_MAX_LENGTH} characters long`
            })
        }

        if (!USER_CONSTRAINTS.NAME_REGEX_FORMAT.test(normalizedName)) {
            throw UserErrorFactory.userValidationFailed({
                field: 'name',
                receivedValue: normalizedName,
                reason: 'INVALID_CHARACTERS',
                constraint: 'Letters, spaces, hyphens and accents only',
                description: 'Unauthorized special characters or symbols. Only letter characters (including accents), spaces, and (-) are allowed'
            })
        }

        return new UserNameVo(normalizedName)
    }

}