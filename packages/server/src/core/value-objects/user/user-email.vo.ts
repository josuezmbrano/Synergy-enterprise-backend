import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { USER_CONSTRAINTS } from '@project/common/constants/user.constants.js';

export class UserEmailVo extends BaseValueObject<string> {

    private constructor(value: string) {
        super(value)
    }

    public static create(email: string): UserEmailVo {

        const sanitizedEmail = (email ?? '').trim().toLowerCase()

        if (!sanitizedEmail) {
            throw UserErrorFactory.userValidationFailed({
                field: 'email',
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'User email cannot be empty'
            })
        }

        if (sanitizedEmail.length > USER_CONSTRAINTS.EMAIL_MAX_LENGTH) {
            throw UserErrorFactory.userValidationFailed({
                field: 'email',
                reason: 'LENGTH_MISMATCH',
                constraint: `max_length: ${USER_CONSTRAINTS.EMAIL_MAX_LENGTH}`,
                description: `Email address is too long (max  ${USER_CONSTRAINTS.EMAIL_MAX_LENGTH})`
            })
        }

        if (!USER_CONSTRAINTS.EMAIL_REGEX_FORMAT.test(sanitizedEmail)) {
            throw UserErrorFactory.userValidationFailed({
                field: 'email',
                reason: 'INVALID_FORMAT',
                constraint: 'valid_email_pattern',
                description: 'The email address format is invalid. Example: user@domain.com'
            })
        }

        return new UserEmailVo(sanitizedEmail)
    }

}