import { RequestPasswordResetOutput } from 'application/dtos/user/request-password-reset.dto.js';
import { RequestPasswordResetInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { ITokenRepository } from 'core/repositories/token.repository.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { IBaseUnitOfWork } from '../base.unit-of-work.js';
import { IEventBus } from 'application/ports/event-bus.port.js';
import { UserRequestedPasswordResetEvent } from 'core/events/user-events/user-requested-password-reset.event.js';



export class RequestPasswordResetCase implements BaseUseCase<RequestPasswordResetInput, RequestPasswordResetOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly tokenRepository: ITokenRepository,
        private readonly eventBus: IEventBus,
        private readonly unitOfWork: IBaseUnitOfWork,
    ) { }

    async execute(input: RequestPasswordResetInput): Promise<RequestPasswordResetOutput> {

        // CHECK FOR USER EXISTENCE
        const actingUserEmail = UserEmailVo.create(input.email)
        const userAccount = await this.userRepository.findByEmail(actingUserEmail)


        // SILENT RETURN IF NO USER ACCOUNT EXISTS
        if (!userAccount) {
            return { email: actingUserEmail.value, success: true }
        }


        // CREATE NEW VERIFICATION TOKEN
        const verificationTokenId = TokenIdVo.create()

        const verificationToken = VerificationTokenEntityClass.create({
            type: TokenTypeVo.createPasswordReset(),
            expiresAt: TokenExpirationVo.createDefaultExpiration(),
            userId: userAccount.publicId
        }, verificationTokenId)


        // CHECK FOR PREVIOUS TOKEN EXISTENCY, COOLDOWN AND DELETION
        await this.unitOfWork.run(async () => {

            const existingToken = await this.tokenRepository.findByUser(userAccount.publicId)

            if (existingToken && existingToken.isType(TokenTypeVo.createPasswordReset())) {

                existingToken.ensureEmailCooldown()
                await this.tokenRepository.deleteToken(existingToken)
            }

            await this.tokenRepository.saveToken(verificationToken)
        })


        await this.eventBus.publish(
            new UserRequestedPasswordResetEvent(
                userAccount.publicId.value,
                {
                    email: actingUserEmail.value,
                    fullname: userAccount.fullname,
                    verificationToken: verificationTokenId.value
                }
            )
        )


        // RETURN PRIMTIIVE TO CLIENT
        return {
            email: actingUserEmail.value,
            success: true
        }
    }

}