import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { BaseValueObject } from '../base.value-objects.js';
import { USER_CONSTRAINTS } from '@project/common/constants/user.constants.js';
import { IPasswordHasher } from 'core/services/password-interface.service.js';

export class UserPasswordVo extends BaseValueObject<string> {

    public readonly voType = 'UserPasswordVo';

    private constructor(value: string) {
        super(value)
    }

    public static create(password: string): UserPasswordVo {

        const valuePassword = password ?? ''

        if (!valuePassword) {
            throw UserErrorFactory.userValidationFailed({
                field: 'password',
                reason: 'REQUIRED',
                constraint: 'required_field',
                description: 'User password cannot be empty'
            })
        }

        if (valuePassword.length < USER_CONSTRAINTS.PASSWORD_MIN_LENGTH || valuePassword.length > USER_CONSTRAINTS.PASSWORD_MAX_LENGTH) {
            throw UserErrorFactory.userValidationFailed({
                field: 'password',
                reason: 'LENGTH_MISMATCH',
                constraint: `min_length: ${USER_CONSTRAINTS.PASSWORD_MIN_LENGTH} / max_length: ${USER_CONSTRAINTS.PASSWORD_MAX_LENGTH}`,
                description: `User password must be between ${USER_CONSTRAINTS.PASSWORD_MIN_LENGTH} and ${USER_CONSTRAINTS.PASSWORD_MAX_LENGTH} characters long`
            })
        }

        if (!USER_CONSTRAINTS.PASSWORD_REGEX_FORMAT.test(valuePassword)) {
            throw UserErrorFactory.userValidationFailed({
                field: 'password',
                reason: 'WEAK_PASSWORD',
                constraint: 'uppercase, lowercase and number required',
                description: 'User password must contain at least one uppercase letter, one lowercase letter and one number'
            })
        }

        return new UserPasswordVo(valuePassword)
    }

    public static fromHash(passwordHashed: string): UserPasswordVo {
        return new UserPasswordVo(passwordHashed)
    }

    public static async createAndHash(passwordToHash: string, hasher: IPasswordHasher): Promise<UserPasswordVo> {

        const passwordVo = UserPasswordVo.create(passwordToHash)
        const passwordHashed = await hasher.hash(passwordVo.value)
        return new UserPasswordVo(passwordHashed)
    }

}