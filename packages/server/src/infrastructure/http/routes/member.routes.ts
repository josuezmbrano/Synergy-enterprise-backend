import { Router } from 'express';
import { MiddlewareModules } from 'infrastructure/container/di.config.js';
import { MemberModules } from 'infrastructure/container/di/member-modules.di.js';


export const createMemberRouter = (modules: MemberModules, middlewares: MiddlewareModules): Router => {
    const memberRouter = Router()
    const { controllers } = modules
    const { checkAuth } = middlewares

    // PROTECT ALL PRIVATE MEMBER ROUTES WITH THE AUTH MIDDLEWARE
    memberRouter.use(checkAuth.execute)


    // PRIVATE ROUTES

    // Member collection management
    memberRouter.get('/:projectId/members', controllers.findAllMembersController.execute)
    memberRouter.get('/:projectId/members/:memberId', controllers.findMemberController.execute)
    // State transitions
    memberRouter.patch('/:projectId/members/:targetMemberId/active', controllers.setActiveStatusController.execute)
    memberRouter.patch('/:projectId/members/:targetMemberId/inactive', controllers.setInactiveStatusController.execute)
    memberRouter.patch('/:projectId/members/:targetMemberId/on-leave', controllers.setOnLeaveStatusController.execute)
    // Role updates
    memberRouter.patch('/:projectId/members/:targetMemberId/role-admin', controllers.setAdminRoleController.execute)
    memberRouter.patch('/:projectId/members/:targetMemberId/role-contributor', controllers.setContributorRoleController.execute)

    return memberRouter
}


