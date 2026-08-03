import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { UserProps } from 'core/entities/props/user.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js';
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';

export class UserMother {

    static create() {
        return UserEntityClass.create({
            publicId: UserIdVo.create(),
            username: UserUsernameVo.create('josue_dev'),
            name: UserNameVo.create('Josue'),
            lastname: UserLastnameVo.create('Zambrano'),
            email: UserEmailVo.create('josue@example.com'),
            password: UserPasswordVo.create('Hash_Safe_123!'),
            status: UserStatusVo.create('pending_verification'),
            usernameUpdatedAt: null,
            verifiedAt: null
        }, UserIdVo.create())
    }

    static createDefault(overrides?: Partial<UserProps>): UserEntityClass {

        const defaults = {
            publicId: UserIdVo.create(),
            username: UserUsernameVo.create('moises_dev'),
            name: UserNameVo.create('Moises'),
            lastname: UserLastnameVo.create('Zambrano'),
            email: UserEmailVo.create('moises@example.com'),
            password: UserPasswordVo.create('Hash_123!'),
            status: UserStatusVo.create('active'),
            usernameUpdatedAt: DateVo.create(),
            verifiedAt: DateVo.create(),
            ...overrides
        }

        return UserEntityClass.create(defaults, UserIdVo.create())
    }

    static reconstituteDefault(overrides?: Partial<UserProps>): UserEntityClass {

        const defaults = {
            publicId: UserIdVo.fromId('8f3c7a2b-9231-4c6e-8d8a-6b83f3d7a8d5'),
            username: UserUsernameVo.create('moises_dev'),
            name: UserNameVo.create('Moises'),
            lastname: UserLastnameVo.create('Zambrano'),
            email: UserEmailVo.create('moises@example.com'),
            password: UserPasswordVo.create('Hash_123!'),
            status: UserStatusVo.create('active'),
            usernameUpdatedAt: DateVo.create(),
            verifiedAt: DateVo.create(),
            ...overrides
        }

        return UserEntityClass.reconstitute(
            defaults, 
            UserIdVo.fromId('f47ac10b-58cc-4372-a567-0e02b2c3d479'), 
            DateVo.create(), 
            DateVo.create()
        )
    }

    static createSuspended(): UserEntityClass {
        return this.reconstituteDefault({status: UserStatusVo.create('suspended')})
    }
    
    static createPending(): UserEntityClass {
        return this.reconstituteDefault({status: UserStatusVo.create('pending_verification'), verifiedAt: null})
    }
    



}