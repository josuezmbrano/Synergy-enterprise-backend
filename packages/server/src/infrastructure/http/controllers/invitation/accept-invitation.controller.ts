import { AcceptInvitationInput } from '@project/common/schemas/invitation.schema.js';
import { AcceptInvitationCase } from 'application/use-cases/invitation/accept-invitation.case.js';
import type { Request, Response, NextFunction } from 'express'


export class AcceptInvitationController {
    constructor(private readonly acceptInvitationUseCase: AcceptInvitationCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the invitation id from the request parameters
            const invitationId = req.params.invitationId as string

            const input: AcceptInvitationInput = {
                actorId,
                invitationId
            }

            const result = await this.acceptInvitationUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware
        }
    }

}