import { LoginUserOutput } from 'application/dtos/user/login-user.dto.js';
import { LoginUserInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { IPasswordHasher } from 'core/ports/password-interface.service.js';
import { IAuthService } from 'application/ports/auth-interface.service.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';


export class LoginUserCase implements BaseUseCase<LoginUserInput, LoginUserOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly passwordHasher: IPasswordHasher,
        private readonly authService: IAuthService
    ) { }

    async execute(input: LoginUserInput): Promise<LoginUserOutput> {

        // INITIALIZE VOs
        const email = UserEmailVo.create(input.email)

        
        // RETRIEVE USER DATA AND CHECK FOR EXISTENCE
        const user = await this.userRepository.findByEmail(email)


        // USE A DUMMY PASSWORD AS A DEFENSE TO AVOID TIMING ATTACKS AND CONDITION THE PASSWORD TO COMPARE
        const dummyPassword = '$2a$10$cY3UyST/B3qdckodWbqo8.ONiw/wj8uuWg4lRrdFcwirmxbczwFr6'
        const passwordToCompare = user ? user.password.value : dummyPassword


        // COMPARE THE STORED HASHED PASSWORD AGAINST THE PLAIN INPUT PASSWORD
        const isPasswordValid = await this.passwordHasher.compare(input.password, passwordToCompare)

        if (!isPasswordValid || !user) throw AuthErrorFactory.invalidCredentials()

        
        // FAIL_FAST IF USER IS SUSPENDED
        user.ensureCanLogin()


        // GENERATE AUTH TOKEN
        const tokenGenerated = await this.authService.generateToken({
            sub: user.publicId.value,
            verified: user.isValidated,
            role: 'user'
        })


        // CONVERT TO PRIMITIVES AND OUTPUT USER DATA AND TOKEN TO CLIENT
        return this.mapToOutput(user, tokenGenerated)
    }


    private mapToOutput(user: UserEntityClass, tokenGenerated: string): LoginUserOutput {
        const primitives = user.toPrimitives()

        return {
            user: {
                id: primitives.publicId,
                username: primitives.username,
                email: primitives.email,
                status: primitives.status,
                fullname: user.fullname,
                createdAt: primitives.createdAt.toISOString(),
                verifiedAt: primitives.verifiedAt?.toISOString() ?? null
            },
            token: tokenGenerated
        }
    }


}