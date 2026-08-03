import { VerifyUserEmailOutput } from 'application/dtos/user/verify-user-email.dto.js';
import { VerifyUserEmailInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { ITokenRepository } from 'core/repositories/token.repository.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { IBaseUnitOfWork } from '../base.unit-of-work.js';

export class VerifyEmailCase implements BaseUseCase<VerifyUserEmailInput, VerifyUserEmailOutput> {

    constructor(
        private readonly tokenRepository: ITokenRepository,
        private readonly userRepository: IUserRepository,
        private readonly unitOfWork: IBaseUnitOfWork
    ) { }

    async execute(input: VerifyUserEmailInput): Promise<VerifyUserEmailOutput> {

        // VALIDATE TOKEN EXISTENCE AND FIND IT IN THE REPOSITORY
        const tokenId = TokenIdVo.fromId(input.token)
        const token = await this.tokenRepository.findByToken(tokenId)

        if (!token) throw TokenErrorFactory.tokenNotFound()


        // VALIDATE TOKEN TYPE AND EXPIRATION
        token.ensureCanBeValidated(TokenTypeVo.createEmailVerification())

        // FIND USER RELATED TO THE VALIDATION TOKEN SENT
        const userAccount = await this.userRepository.findByPublicId(token.userId)

        if (!userAccount) throw UserErrorFactory.userNotFound()


        // CALL THE CORRESPONDING ACTIVATION METHOD
        userAccount.verifyEmail()


        // PERSIST THE CHANGES TO USER REPOSITORY. CLEAN AND CONVERT TO PRIMITIVES
        // DELETE TOKEN USED TO AVOID RE-USING
        const { userUpdated } = await this.unitOfWork.run(async () => {
            const userUpdated = await this.userRepository.save(userAccount)
            await this.tokenRepository.deleteToken(token)

            return { userUpdated }
        })


        return {
            id: userUpdated.publicId.value,
            success: true,
            username: userUpdated.username.value
        }
    }

}