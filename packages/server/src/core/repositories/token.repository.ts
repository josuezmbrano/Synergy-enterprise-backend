import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';

export interface ITokenRepository {

    saveToken(token: VerificationTokenEntityClass): Promise<void>
    deleteToken(token: VerificationTokenEntityClass): Promise<void>
    findByToken(token: TokenIdVo): Promise<VerificationTokenEntityClass | null>
    findByUser(publicUserId: UserIdVo): Promise<VerificationTokenEntityClass | null>
}