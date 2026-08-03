import { Router } from 'express'
import type { Router as RouterType } from 'express-serve-static-core'
import { containerDI } from 'infrastructure/container/di.config.js'
import { invitationModulesContainer } from 'infrastructure/container/di/invitation-modules.di.js'

export const invitationRouter: RouterType = Router()

// Destructured controllers from the DI invitation module container
const {
    acceptInvitationController,
    getAllInvitationsController,
    getInvitationController,
    rejectInvitationController
} = invitationModulesContainer.controllers

// Destructured auth middleware from the DI base tools container
const { checkAuth } = containerDI.middlewares


// PROTECT ALL PRIVATE INVITATION ROUTES WITH THE AUTH MIDDLEWARE
invitationRouter.use(checkAuth.execute)


// PRIVATE ROUTES

// Invitation collection management
invitationRouter.get('/', getAllInvitationsController.execute)
invitationRouter.get('/:invitationId', getInvitationController.execute)
// State transitions
invitationRouter.patch('/:invitationId/accept', acceptInvitationController.execute)
invitationRouter.patch('/:invitationId/reject', rejectInvitationController.execute)