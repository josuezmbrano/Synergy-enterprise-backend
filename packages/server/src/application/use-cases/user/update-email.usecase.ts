import { UpdateUserEmailOutput } from 'application/dtos/user/update-user-email.dto.js';
import { UpdateUserEmailInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IPasswordHasher } from 'core/services/password-interface.service.js';
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { IAuthService } from 'core/services/auth-interface.service.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { ITokenRepository } from 'core/repositories/token.repository.js';
import { IMailService } from 'core/services/mail-interface.service.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { IBaseUnitOfWork } from '../base.unit-of-work.js';
import { mailTemplates } from 'core/constants/mail-templates.js';

export class UpdateEmailCase implements BaseUseCase<UpdateUserEmailInput, UpdateUserEmailOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly tokenRepository: ITokenRepository,
        private readonly passwordHasher: IPasswordHasher,
        private readonly authService: IAuthService,
        private readonly mailService: IMailService,
        private readonly unitOfWork: IBaseUnitOfWork
    ) { }

    async execute(input: UpdateUserEmailInput): Promise<UpdateUserEmailOutput> {

        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()


        // ENSURE INPUT PASSWORD RECEIVED, MATCH CURRENT PASSWORD TO VALIDATE CHANGE
        const isPasswordValid = await this.passwordHasher.compare(input.currentPassword, userAccount.password.value)

        if (!isPasswordValid) throw AuthErrorFactory.invalidCredentials({
            reason: 'INVALID_CURRENT_PASSWORD',
            constraint: 'password_must_match_current',
            description: 'The password provided does not match your current password.'
        })


        // CREATE EMAIL VO, VALIDATE NONEXISTENCE AND CALL THE CORRESPONDING UPDATE METHOD
        const newEmail = UserEmailVo.create(input.newEmail)

        const emailExists = await this.userRepository.emailExists(newEmail)

        if (emailExists) throw UserErrorFactory.emailAlreadyExists()

        userAccount.updateEmail(newEmail)


        // GENERATE A NEW AUTH SESSION TOKEN
        const newSessionToken = await this.authService.generateToken({
            sub: userAccount.publicId.value,
            role: 'user',
            verified: userAccount.isValidated
        })


        // GENERATE A NEW VALIDATION TOKEN ID AND CREATE THE ENTITY WITH ITS PROPS
        const validationToken = TokenIdVo.create()

        const newValidationToken = VerificationTokenEntityClass.create({
            userId: actingUserPublicId,
            type: TokenTypeVo.createEmailVerification(),
            expiresAt: TokenExpirationVo.createDefaultExpiration()
        }, validationToken)


        // PERSIST THE CHANGES TO USER REPOSITORY. CLEAN AND CONVERT TO PRIMITIVES
        // PERSIST THE VALIDATION TOKEN GENERATED TO REPOSITORY
        const { userUpdated } = await this.unitOfWork.run(async () => {

            const existingUserToken = await this.tokenRepository.findByUser(actingUserPublicId)

            if (existingUserToken && existingUserToken.isType(TokenTypeVo.createEmailVerification())) {
                await this.tokenRepository.deleteToken(existingUserToken)
            }

            const userUpdated = await this.userRepository.save(userAccount)
            await this.tokenRepository.saveToken(newValidationToken)

            return { userUpdated }
        })


        // THIS STRUCTURES THE EMAIL TEMPLATE FOR THE MAIL SERVICE
        const mailContent = mailTemplates.EMAIL_UPDATE_VERIFICATION({fullname: userUpdated.fullname, token: validationToken.value})


        // SEND THE MAIL SERVICE TO PERMIT USER REVERIFICATION ONCE UPDATE IS COMPLETED 
        try {
            await this.mailService.sendEmail({to: userUpdated.email.value, subject: mailContent.subject, body: mailContent.body})
        } catch (error) {
            console.error(`[UpdateEmailCase]: SMTP Failure for ${userUpdated.email.value}`, error)
        }


        return this.mapToOutput(userUpdated, newSessionToken)
    }


    private mapToOutput(user: UserEntityClass, sessionToken: string): UpdateUserEmailOutput {
        const primitives = user.toPrimitives()

        return {
            user: {
                id: primitives.publicId,
                fullname: user.fullname,
                username: primitives.username,
                verifiedAt: primitives.verifiedAt?.toISOString() ?? null,
                createdAt: primitives.createdAt.toISOString(),
                email: primitives.email,
                status: primitives.status
            },
            token: sessionToken
        }
    }

}