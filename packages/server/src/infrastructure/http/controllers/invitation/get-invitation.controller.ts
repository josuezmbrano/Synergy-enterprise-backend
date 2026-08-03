import { GetInvitationInput } from '@project/common/schemas/invitation.schema.js'
import { GetInvitationCase } from 'application/use-cases/invitation/get-invitation.case.js'
import type { Request, Response, NextFunction } from 'express'


export class GetInvitationController {
    constructor(private readonly getInvitationUseCase: GetInvitationCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the invitation id from the request parameters
            const invitationId = req.params.invitationId as string

            const input: GetInvitationInput = {
                actorId,
                invitationId
            }

            const result = await this.getInvitationUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware
        }
    }

}