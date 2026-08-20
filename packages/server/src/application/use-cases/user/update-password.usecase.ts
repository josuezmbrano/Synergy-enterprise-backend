import { UpdateUserPasswordOutput } from 'application/dtos/user/update-user-password.dto.js';
import { UpdateUserPasswordInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { IPasswordHasher } from 'core/ports/password-interface.service.js';
import { AuthErrorFactory } from 'core/errors/factories/auth-factory.error.js';
import { UserPasswordVo } from 'core/value-objects/user/user-password.vo.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';

export class UpdatePasswordCase implements BaseUseCase<UpdateUserPasswordInput, UpdateUserPasswordOutput> {

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly passwordHasher: IPasswordHasher
    ) { }

    async execute(input: UpdateUserPasswordInput): Promise<UpdateUserPasswordOutput> {

        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()


        // VALIDATE CURRENT PASSWORD BEFORE ALLOWING THE UPDATE
        const isPasswordValid = await this.passwordHasher.compare(input.oldPassword, userAccount.password.value)

        if (!isPasswordValid) throw AuthErrorFactory.invalidCredentials({
            reason: 'INVALID_CURRENT_PASSWORD',
            constraint: 'password_must_match_current',
            description: 'The password provided does not match your current password.'
        })


        // CHECK PASSWORD EQUALITY 
        if (input.newPassword === input.oldPassword) throw UserErrorFactory.userPasswordReuse()


        // HASH NEW PASSWORD
        const newPasswordHashedVo = await UserPasswordVo.createAndHash(input.newPassword, this.passwordHasher)


        // CALL THE CORRESPONDING METHOD TO UPDATE
        userAccount.updatePassword(newPasswordHashedVo)

        const savedUser = await this.userRepository.save(userAccount)

        return this.mapToOutput(savedUser)
    }

    private mapToOutput(user: UserEntityClass): UpdateUserPasswordOutput {
        const primitives = user.toPrimitives()

        return {
            id: primitives.publicId,
            username: primitives.username,
            createdAt: primitives.createdAt.toISOString(),
            email: primitives.email,
            fullname: user.fullname,
            verifiedAt: primitives.verifiedAt?.toISOString() ?? null,
            status: primitives.status
        }
    }

}