import { FindMemberInput } from '@project/common/schemas/member.schema.js'
import { FindMemberCase } from 'application/use-cases/member/find-member.usecase.js'
import type { Request, Response, NextFunction } from 'express'

export class FindMemberController {
    constructor(private readonly findMemberUseCase: FindMemberCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameter
            const projectId = req.params.projectId as string

            // Retrieve the member id from the request parameter
            const memberId = req.params.memberId as string

            const input: FindMemberInput = {
                actorId,
                projectId,
                memberId
            }

            const result = await this.findMemberUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}