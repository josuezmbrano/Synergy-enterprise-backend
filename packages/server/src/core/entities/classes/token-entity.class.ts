import { BaseEntity } from '../base.entity.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { TokenProps } from '../props/token.props.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { DateVo } from 'core/value-objects/common/date.vo.js';

export class VerificationTokenEntityClass extends BaseEntity<TokenIdVo, TokenProps> {

    private constructor(props: TokenProps, id: TokenIdVo, createdAt?: DateVo) {
        super(id, props, createdAt)
    }

    public static create(props: TokenProps, id: TokenIdVo): VerificationTokenEntityClass {
        return new VerificationTokenEntityClass({ ...props }, id)
    }

    public static reconstitute(props: TokenProps, id: TokenIdVo, createdAt: DateVo) {
        return new VerificationTokenEntityClass({...props}, id, createdAt)
    }


    public get userId() {
        return this._props.userId
    }

    public get expiresAt() {
        return this._props.expiresAt
    }

    public get tokenCreatedAt() {
        return this.createdAt
    }

    public get type() {
        return this._props.type
    }


    // BUSINESS LOGIC METHODS

    // CONSULT INFORMATION
    // USED TO PASS INFO TO DIFFERENT ENTITIES
    public isValid(): boolean {
        return !this._props.expiresAt.isExpired()
    }

    public isType(type: TokenTypeVo): boolean {
        return this._props.type.value === type.value
    }

    public isOwnedBy(userId: UserIdVo): boolean {
        return this._props.userId.equals(userId)
    }

    // AUTHORIZATION 
    // USED IN USECASES
    public ensureCanBeValidated(expectedType: TokenTypeVo): void {

        if (!this.isValid()) throw TokenErrorFactory.tokenExpired()

        if (!this.isType(expectedType)) throw TokenErrorFactory.tokenInvalidType()
    }

    public ensureEmailCooldown(): void {

        const now = new Date()
        const secondsSinceLast = (now.getTime() - this.createdAt.value.getTime()) / 1000

        if (secondsSinceLast < 60) throw TokenErrorFactory.tokenCooldownLimit()
    }

}