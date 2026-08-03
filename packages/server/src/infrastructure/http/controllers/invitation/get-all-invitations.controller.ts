import { GetAllInvitationsInput } from '@project/common/schemas/invitation.schema.js'
import { GetAllInvitationsCase } from 'application/use-cases/invitation/get-all-invitations.case.js'
import type { Request, Response, NextFunction } from 'express'


export class GetAllInvitationsController {
    constructor(private readonly getAllInvitationsUseCase: GetAllInvitationsCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover actor id from the auth payload
            const actorId = req.user.sub

            const input: GetAllInvitationsInput = {
                actorId
            }

            const result = await this.getAllInvitationsUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware
        }
    }

}