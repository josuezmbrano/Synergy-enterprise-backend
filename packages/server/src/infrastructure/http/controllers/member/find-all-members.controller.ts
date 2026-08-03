import { FindAllMembersInput } from '@project/common/schemas/member.schema.js';
import { FindAllMembersCase } from 'application/use-cases/member/find-all-members.usecase.js';
import type { Request, Response, NextFunction } from 'express';

export class FindAllMembersController {
    constructor(private readonly findAllMembersUseCase: FindAllMembersCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameter
            const projectId = req.params.projectId as string

            const input: FindAllMembersInput = {
                actorId,
                projectId
            }

            const result = await this.findAllMembersUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next (error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}