import { DateVo } from 'core/value-objects/common/date.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js';
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';

export interface UserProps {
    publicId: UserIdVo
    username: UserUsernameVo
    name: UserNameVo
    lastname: UserLastnameVo
    email: UserEmailVo
    password: UserPasswordVo
    status: UserStatusVo
    usernameUpdatedAt: DateVo | null
    verifiedAt: DateVo | null
}