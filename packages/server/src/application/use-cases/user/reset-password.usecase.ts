import { ResetPasswordOutput } from 'application/dtos/user/reset-password.dto.js';
import { ResetPasswordInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { ITokenRepository } from 'core/repositories/token.repository.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { TokenErrorFactory } from 'core/errors/factories/token-factory.error.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IPasswordHasher } from 'core/ports/password-interface.service.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { IBaseUnitOfWork } from '../base.unit-of-work.js';

export class ResetPasswordCase implements BaseUseCase<ResetPasswordInput, ResetPasswordOutput> {

    constructor(
        private readonly tokenRepository: ITokenRepository,
        private readonly userRepository: IUserRepository,
        private readonly passwordHasher: IPasswordHasher,
        private readonly unitOfWork: IBaseUnitOfWork
    ) { }

    async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {

        // VALIDATE VERIFICATION TOKEN
        const verificationTokenId = TokenIdVo.fromId(input.token)

        const verificationToken = await this.tokenRepository.findByToken(verificationTokenId)

        if (!verificationToken) throw TokenErrorFactory.tokenNotFound()

        verificationToken.ensureCanBeValidated(TokenTypeVo.createPasswordReset())


        // VALIDATE USER EXISTENCE
        const userAccount = await this.userRepository.findByPublicId(verificationToken.userId)

        if (!userAccount) throw UserErrorFactory.userNotFound()


        // CHECK PASSWORD EQUALITY 
        const isPasswordEqual = await this.passwordHasher.compare(input.newPassword, userAccount.password.value)

        if (isPasswordEqual) throw UserErrorFactory.userPasswordReuse()


        // CREATE NEW PASSWORD HASHED VO AND UPDATE ENTITY
        const hashedPasswordVo = await UserPasswordVo.createAndHash(input.newPassword, this.passwordHasher)

        userAccount.resetPassword(hashedPasswordVo)


        // PERSIST AND DELETE 
        await this.unitOfWork.run(async () => {
            await this.userRepository.save(userAccount)
            await this.tokenRepository.deleteToken(verificationToken)
        })


        return {
            success: true
        }
    }

}