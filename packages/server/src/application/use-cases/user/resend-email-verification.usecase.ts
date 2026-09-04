import { ResendEmailVerificationOutput } from 'application/dtos/user/resend-email-verification.dto.js';
import { ResendEmailVerificationInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { ITokenRepository } from 'core/repositories/token.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { IBaseUnitOfWork } from '../base.unit-of-work.js';
import { IEventBus } from 'application/ports/event-bus.port.js';
import { UserResentEmailVerificationEvent } from 'core/events/user-events/user.resent-email-verification.event.js';


export class ResendEmailVerificationCase implements BaseUseCase<ResendEmailVerificationInput, ResendEmailVerificationOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly tokenRepository: ITokenRepository,
        private readonly unitOfWork: IBaseUnitOfWork,
        private readonly eventBus: IEventBus
    ) { }

    async execute(input: ResendEmailVerificationInput): Promise<ResendEmailVerificationOutput> {

        // VALIDATE ACTING USER EXISTENCE
        const actingUserPublicId = UserIdVo.fromId(input.userId)
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()
        userAccount.ensureIsStillPending()


        // CREATE NEW VERIFICATION TOKEN
        const verificationTokenId = TokenIdVo.create()

        const verificationToken = VerificationTokenEntityClass.create({
            type: TokenTypeVo.createEmailVerification(),
            expiresAt: TokenExpirationVo.createDefaultExpiration(),
            userId: actingUserPublicId
        }, verificationTokenId)


        await this.unitOfWork.run(async () => {
            // CHECK FOR PREVIOUS EXISTENCE USER TOKEN
            const existingUserToken = await this.tokenRepository.findByUser(actingUserPublicId)

            // IF EXISTS, DELETE PREVIOUS TOKEN VALIDATING COOLDOWN
            if (existingUserToken && existingUserToken.isType(TokenTypeVo.createEmailVerification())) {
                existingUserToken.ensureEmailCooldown()
                await this.tokenRepository.deleteToken(existingUserToken)
            }

            await this.tokenRepository.saveToken(verificationToken)
        })

        await this.eventBus.publish(
            new UserResentEmailVerificationEvent(
                userAccount.publicId.value,
                {
                    email: userAccount.email.value,
                    fullname: userAccount.fullname,
                    verificationToken: verificationTokenId.value
                }
            )
        )


       
        // OUTPUT PRIMITIVES TO CLIENT
        return {
            id: userAccount.publicId.value,
            success: true,
            username: userAccount.username.value
        }
    }

}