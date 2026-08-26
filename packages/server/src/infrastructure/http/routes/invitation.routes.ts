import { Router } from 'express'
import { MiddlewareModules } from 'infrastructure/container/di.config.js'
import { InvitationModules } from 'infrastructure/container/di/invitation-modules.di.js'



export const createInvitationRouter = (modules: InvitationModules, middlewares: MiddlewareModules): Router => {
    const invitationRouter = Router()
    const { controllers } = modules
    const { checkAuth } = middlewares

    // PROTECT ALL PRIVATE INVITATION ROUTES WITH THE AUTH MIDDLEWARE
    invitationRouter.use(checkAuth.execute)


    // PRIVATE ROUTES

    // Invitation collection management
    invitationRouter.get('/', controllers.getAllInvitationsController.execute)
    invitationRouter.get('/:invitationId', controllers.getInvitationController.execute)
    // State transitions
    invitationRouter.patch('/:invitationId/accept', controllers.acceptInvitationController.execute)
    invitationRouter.patch('/:invitationId/reject', controllers.rejectInvitationController.execute)

    return invitationRouter
}


