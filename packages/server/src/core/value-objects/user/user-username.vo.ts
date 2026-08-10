import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { USER_CONSTRAINTS } from '@project/common/constants/user.constants.js';

export class UserUsernameVo extends BaseValueObject<string> {

    private constructor(value: string) {
        super(value)
    }

    public static create(username: string): UserUsernameVo {

        const sanitizedUsername = (username ?? '').trim()

        if (!sanitizedUsername) {
            throw UserErrorFactory.userValidationFailed({
                field: 'username',
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'Username cannot be empty'
            })
        }

        if (sanitizedUsername.length < USER_CONSTRAINTS.USERNAME_MIN_LENGTH || sanitizedUsername.length > USER_CONSTRAINTS.USERNAME_MAX_LENGTH) {
            throw UserErrorFactory.userValidationFailed({
                field: 'username',
                reason: 'LENGTH_MISMATCH',
                constraint: `min_length: ${USER_CONSTRAINTS.USERNAME_MIN_LENGTH} / max_length: ${USER_CONSTRAINTS.USERNAME_MAX_LENGTH}`,
                description: `Username length must be between ${USER_CONSTRAINTS.USERNAME_MIN_LENGTH} to ${USER_CONSTRAINTS.USERNAME_MAX_LENGTH} characters long`
            })
        }

        if (!USER_CONSTRAINTS.USERNAME_REGEX_FORMAT.test(sanitizedUsername)) {
            throw UserErrorFactory.userValidationFailed({
                field: 'username',
                reason: 'INVALID_CHARACTERS',
                constraint: 'alphanumeric, and (._-) only',
                description: 'Unauthorized special characters or symbols. Only alphanumeric characters and basic punctuation (., -, _) are allowed'
            })
        }

        return new UserUsernameVo(sanitizedUsername)
    }

    public get normalized(): string {
        return this.value.toLocaleLowerCase()
    }

}