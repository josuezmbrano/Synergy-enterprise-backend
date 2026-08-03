import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { TokenProps } from 'core/entities/props/token.props.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';

export class TokenMother {

    static createEmailVerification() {
        return VerificationTokenEntityClass.create({
            userId: UserIdVo.create(),
            type: TokenTypeVo.createEmailVerification(),
            expiresAt: TokenExpirationVo.createDefaultExpiration()
        }, TokenIdVo.create())
    }

    static createPasswordResetVerification() {
        return VerificationTokenEntityClass.create({
            userId: UserIdVo.create(),
            type: TokenTypeVo.createPasswordReset(),
            expiresAt: TokenExpirationVo.createDefaultExpiration()
        }, TokenIdVo.create())
    }

    static reconstituteDefault(overrides?: Partial<TokenProps>) {

        const defaults = {
            userId: UserIdVo.fromId('f47ac10b-58cc-4372-a567-0e02b2c3d479'),
            type: TokenTypeVo.createEmailVerification(),
            expiresAt: TokenExpirationVo.createDefaultExpiration(),
            ...overrides
        }

        return VerificationTokenEntityClass.reconstitute(
            defaults,
            TokenIdVo.fromId('9e6c99b8-a6b0-4c3e-8395-9276d4705574'),
            DateVo.create()
        )
    }

    static reconstitutePassword() {
        return this.reconstituteDefault({
            userId: UserIdVo.fromId('3b719463-548c-4a37-9759-971c261e4792'),
            type: TokenTypeVo.createPasswordReset()
        })
    }

    static reconstituteExpired() {

        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 24);

        return this.reconstituteDefault({
            expiresAt: TokenExpirationVo.fromDatabase(pastDate)
        })
    }

}