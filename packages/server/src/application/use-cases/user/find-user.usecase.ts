import { FindUserOutput } from 'application/dtos/user/find-user.dto.js';
import { FindUserInput } from '@project/common/schemas/user.schema.js'
import { BaseUseCase } from '../base.use-case.js';
import { IUserRepository } from 'core/repositories/user.repository.js';
import { UserIdVo } from 'core/value-objects/common/identifiers/user-id.vo.js';
import { UserErrorFactory } from 'core/errors/factories/user-factory.error.js';
import { UserEmailVo } from 'core/value-objects/user/user-email.vo.js';
import { UserUsernameVo } from 'core/value-objects/user/user-username.vo.js';
import { UserEntityClass } from 'core/entities/classes/user-entity.class.js';

export class FindUserCase implements BaseUseCase<FindUserInput, FindUserOutput> {

    constructor(
        private readonly userRepository: IUserRepository
    ) { }

    async execute(input: FindUserInput): Promise<FindUserOutput> {

        // VALIDATE ACTING USER EXISTENCE AND ACCOUNT PERMISSION
        const actingUserPublicId = UserIdVo.fromId(input.actorId)
        const userAccount = await this.userRepository.findByPublicId(actingUserPublicId)

        if (!userAccount) throw UserErrorFactory.userNotFound()

        userAccount.ensureCanViewPlatform()


        // SELF SEARCH OPTIMIZATION
        if(input.query.toLowerCase() === userAccount.email.value || input.query.toLowerCase() === userAccount.username.normalized) {
            return this.mapToOutput(userAccount, true)
        }


        // CHECK THE TYPE OF QUERY INPUT BY INTENT ROUTING AND CREATE CORRESPONDING VO
        const isEmailQuery = input.query.includes('@')

        const targetUser = isEmailQuery ?
            await this.userRepository.findByEmail(UserEmailVo.create(input.query))
            : await this.userRepository.findByUsername(UserUsernameVo.create(input.query))


        // VALIDATE TARGET USER EXISTENCE AND ACCOUNT STATUS 
        if (!targetUser) throw UserErrorFactory.userNotFound()

        return this.mapToOutput(targetUser, isEmailQuery)
    }


    private mapToOutput(user: UserEntityClass, isDirectEmailSearch: boolean): FindUserOutput {
        const primitives = user.toPrimitives()
        const isVerified = user.isVerified()

        return {
            id: primitives.publicId,
            username: primitives.username,
            fullname: user.fullname,
            email: (isVerified || isDirectEmailSearch) ? primitives.email : '•••@••••.com',
            status: isVerified ? 'ACTIVE' : 'UNVERIFIED',
            verifiedAt: primitives.verifiedAt?.toISOString() ?? null,
            createdAt: primitives.createdAt.toISOString()
        }
    }

}