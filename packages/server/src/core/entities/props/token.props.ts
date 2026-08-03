import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';

export interface TokenProps {
    userId: UserIdVo
    type: TokenTypeVo
    expiresAt: TokenExpirationVo
}