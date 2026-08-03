import { InviteToProjectBodySchema, InviteToProjectInput } from '@project/common/schemas/invitation.schema.js'
import { InviteToProjectCase } from 'application/use-cases/invitation/invite-to-project.case.js'
import type { Request, Response, NextFunction } from 'express'
import z from 'zod'

type InviteToProjectBody = z.infer<typeof InviteToProjectBodySchema>

export class InviteToProjectController {
    constructor(private readonly inviteToProjectUseCase: InviteToProjectCase) { }

    execute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {

            // Recover actor id from the auth payload
            const actorId = req.user.sub

            // Retrieve the project id from the request parameters
            const projectId = req.params.projectId as string

            // Retrieve the Zod-validated body properties
            const { message, targetRole, targetUserId } = req.body as InviteToProjectBody

            const input: InviteToProjectInput = {
                actorId,
                projectId,
                message,
                targetRole,
                targetUserId
            }

            const result = await this.inviteToProjectUseCase.execute(input)

            res.status(200).json({
                status: 'success',
                data: result
            })

        } catch (error) {

            next(error) // The error goes up to the GlobalErrorMiddleware
        }
    }
    
}