import { SetActiveStatusInput } from '@project/common/schemas/member.schema.js';
import { SetActiveStatusCase } from 'application/use-cases/member/status/set-active-status.usecase.js'
import type { Request, Response, NextFunction } from 'express';


export class SetActiveStatusController {
    constructor(private readonly setActiveStatusUseCase: SetActiveStatusCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Retrieve the actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameter
            const projectId = req.params.projectId as string

            // Retrieve the target member id from the request parameter
            const targetMemberId = req.params.targetMemberId as string

            const input: SetActiveStatusInput = {
                actorId,
                projectId,
                targetMemberId
            }

            const result = await this.setActiveStatusUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware implementation
        }
    }

}