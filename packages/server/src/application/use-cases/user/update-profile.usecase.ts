import { UpdateUserProfileOutput } from 'application/dtos/user/update-user-profile.dto.js';
import { UpdateUserProfileInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserNameVo } from 'core/value-objects/user/user-name.vo.js';
import { UserLastnameVo } from 'core/value-objects/user/user-lastname.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';

export class UpdateProfileCase implements BaseUseCase<UpdateUserProfileInput, UpdateUserProfileOutput> {

    constructor(
        private readonly userRepository: IUserRepository
    ) { }

    async execute(input: UpdateUserProfileInput): Promise<UpdateUserProfileOutput> {

        // VALIDATE USER EXISTENCE AND ACCOUNT PERMISSION
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()


        if (!input.name && !input.lastname && !input.username) return this.mapToOutput(userAccount)


        // CHECK INPUT RECEIVED AND APPLY CORRESPONDING UPDATE
        if (input.name) {
            const newName = UserNameVo.create(input.name)
            userAccount.updateName(newName)
        }

        if (input.lastname) {
            const newLastname = UserLastnameVo.create(input.lastname)
            userAccount.updateLastname(newLastname)
        }

        if (input.username) {
            const newUsername = UserUsernameVo.create(input.username)

            if (newUsername.normalized !== userAccount.username.normalized) {

                const usernameExists = await this.userRepository.usernameExists(newUsername)
                if (usernameExists) throw UserErrorFactory.usernameAlreadyExists()

                userAccount.updateUsername(newUsername)
            }

            if (input.username !== userAccount.username.value) {
                userAccount.updateUsername(newUsername)
            }
        }

        const savedUser = await this.userRepository.save(userAccount)
        return this.mapToOutput(savedUser)
    }

    private mapToOutput(user: UserEntityClass): UpdateUserProfileOutput {
        const primitives = user.toPrimitives()

        return {
            id: primitives.publicId,
            fullname: user.fullname,
            email: primitives.email,
            status: primitives.status,
            username: primitives.username,
            createdAt: primitives.createdAt.toISOString(),
            verifiedAt: primitives.verifiedAt?.toISOString() ?? null
        }
    }
}