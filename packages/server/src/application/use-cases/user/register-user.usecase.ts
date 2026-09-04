import { RegisterUserOutput } from 'application/dtos/user/register-user.dto.js';
import { RegisterUserInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js';
import { IPasswordHasher } from 'core/ports/password-interface.service.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserStatusVo } from 'core/value-objects/user/user-status.vo.js';
import { IAuthService } from 'application/ports/auth-interface.service.js';
import { TokenIdVo } from 'core/value-objects/common/identifiers/token-id.vo.js';
import { VerificationTokenEntityClass } from 'core/entities/classes/token-entity.class.js';
import { TokenTypeVo } from 'core/value-objects/token/token-type.vo.js';
import { TokenExpirationVo } from 'core/value-objects/token/token-expiration.vo.js';
import { ITokenRepository } from 'core/repositories/token.repository.js';
import { IBaseUnitOfWork } from '../base.unit-of-work.js';
import { IEventBus } from 'application/ports/event-bus.port.js';
import { UserRegisteredEvent } from 'core/events/user-events/user-registered.event.js';

export class RegisterUserCase implements BaseUseCase<RegisterUserInput, RegisterUserOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly passwordHasher: IPasswordHasher,
        private readonly authService: IAuthService,
        private readonly tokenRepository: ITokenRepository,
        private readonly eventBus: IEventBus,
        private readonly unitOfWork: IBaseUnitOfWork,
    ) { }

    async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {

        // INITIALIZE VOs TO VALIDATE INPUTS RECEIVED
        const internalId = UserIdVo.create()
        const publicIdVo = UserIdVo.create()
        const username = UserUsernameVo.create(input.username)
        const nameUser = UserNameVo.create(input.name)
        const lastnameUser = UserLastnameVo.create(input.lastname)
        const email = UserEmailVo.create(input.email)
        const status = UserStatusVo.create('pending_verification')


        // VALIDATE USERNAME OR EMAIL NOT ALREADY TAKEN
        await this.ensureUserIsNotRegistered(username, email)

        // HASH PLAIN TEXT PASSWORD AND CONVERT TO VO
        const passwordVo = await UserPasswordVo.createAndHash(input.password, this.passwordHasher)


        // CREATE USER ENTITY
        const newUser = UserEntityClass.create({
            publicId: publicIdVo,
            username: username,
            name: nameUser,
            lastname: lastnameUser,
            email: email,
            password: passwordVo,
            status: status,
            usernameUpdatedAt: null,
            verifiedAt: null
        }, internalId)


        // GENERATE VALIDATION TOKEN
        const validationTokenId = TokenIdVo.create()

        const validationToken = VerificationTokenEntityClass.create({
            userId: newUser.publicId,
            type: TokenTypeVo.createEmailVerification(),
            expiresAt: TokenExpirationVo.createDefaultExpiration()
        }, validationTokenId)


        // PERSIST NEW USER TO REPOSITORY. CLEAN AND CONVERT TO PRIMITIVES
        // PERSIST VALIDATION TOKEN TO REPOSITORY
        const { newUserPersisted } = await this.unitOfWork.run(async () => {
            const newUserPersisted = await this.userRepository.save(newUser)
            await this.tokenRepository.saveToken(validationToken)

            return { newUserPersisted }
        })

        // PUBLISH DOMAIN EVENT
        await this.eventBus.publish(
            new UserRegisteredEvent(
                newUserPersisted.publicId.value,
                {
                    email: newUserPersisted.email.value,
                    fullname: newUserPersisted.fullname,
                    verificationToken: validationTokenId.value
                }
            )
        )

        // GENERATE AUTH SESSION TOKEN
        const tokenGenerated = await this.authService.generateToken({
            sub: newUserPersisted.publicId.value,
            role: 'user',
            verified: newUserPersisted.isValidated
        })


        // OUTPUT PRIMITIVES AND TOKEN TO CLIENT
        return this.mapToOutput(newUserPersisted, tokenGenerated)
    }


    private async ensureUserIsNotRegistered(username: UserUsernameVo, email: UserEmailVo) {
        const isUsernameTaken = await this.userRepository.usernameExists(username)

        if (isUsernameTaken) throw UserErrorFactory.usernameAlreadyExists()

        const isEmailTaken = await this.userRepository.emailExists(email)

        if (isEmailTaken) throw UserErrorFactory.emailAlreadyExists()
    }

    private mapToOutput(savedUser: UserEntityClass, authToken: string): RegisterUserOutput {
        const primitives = savedUser.toPrimitives()

        return {
            user: {
                id: primitives.publicId,
                email: primitives.email,
                status: primitives.status,
                fullname: savedUser.fullname,
                username: primitives.username,
                createdAt: primitives.createdAt.toISOString(),
                verifiedAt: primitives.verifiedAt?.toISOString() ?? null
            },
            token: authToken
        }
    }

}