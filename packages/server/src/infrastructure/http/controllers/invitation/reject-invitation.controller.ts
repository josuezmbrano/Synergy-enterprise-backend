import { RejectInvitationInput } from '@project/common/schemas/invitation.schema.js'
import { RejectInvitationCase } from 'application/use-cases/invitation/reject-invitation.case.js'
import { NextFunction, Request, Response } from 'express'

export class RejectInvitationController {
    constructor(private readonly rejectInvitationUseCase: RejectInvitationCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the invitation id from the request parameters
            const invitationId = req.params.invitationId as string

            const input: RejectInvitationInput = {
                actorId,
                invitationId
            }

            const result = await this.rejectInvitationUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware
        }
    }

}