import { Router } from 'express';
import { containerDI } from 'infrastructure/container/di.config.js';
import { memberModulesContainer } from 'infrastructure/container/di/member-modules.di.js';
import type { Router as RouterType } from 'express';

export const memberRouter: RouterType = Router()

// Destructured controllers from the DI member module container
const {
    findAllMembersController,
    findMemberController,
    setActiveStatusController,
    setAdminRoleController,
    setContributorRoleController,
    setInactiveStatusController,
    setOnLeaveStatusController
} = memberModulesContainer.controllers

// Destructured auth middleware from the DI base tools container
const { checkAuth } = containerDI.middlewares


// PROTECT ALL PRIVATE MEMBER ROUTES WITH THE AUTH MIDDLEWARE
memberRouter.use(checkAuth.execute)


// PRIVATE ROUTES

// Member collection management
memberRouter.get('/:projectId/members', findAllMembersController.execute)
memberRouter.get('/:projectId/members/:memberId', findMemberController.execute)
// State transitions
memberRouter.patch('/:projectId/members/:targetMemberId/active', setActiveStatusController.execute)
memberRouter.patch('/:projectId/members/:targetMemberId/inactive', setInactiveStatusController.execute)
memberRouter.patch('/:projectId/members/:targetMemberId/on-leave', setOnLeaveStatusController.execute)
// Role updates
memberRouter.patch('/:projectId/members/:targetMemberId/role-admin', setAdminRoleController.execute)
memberRouter.patch('/:projectId/members/:targetMemberId/role-contributor', setContributorRoleController.execute)

