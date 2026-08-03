import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { IBaseRepository } from './base.repository.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';

export interface IUserRepository extends IBaseRepository<UserIdVo, UserEntityClass> {

    usernameExists(username: UserUsernameVo): Promise<boolean>
    emailExists(email: UserEmailVo): Promise<boolean>
    findByEmail(email: UserEmailVo): Promise<UserEntityClass | null>
    findByUsername(username: UserUsernameVo): Promise<UserEntityClass | null>
    findAllUsersByIds(internalUserIds: UserIdVo[]): Promise<UserEntityClass[]>
}