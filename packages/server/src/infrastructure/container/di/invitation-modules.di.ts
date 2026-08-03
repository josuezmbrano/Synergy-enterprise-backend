import { containerDI } from '../di.config.js';

// USE CASE IMPORTS
import { AcceptInvitationCase } from 'application/use-cases/invitation/accept-invitation.case.js';
import { GetAllInvitationsCase } from 'application/use-cases/invitation/get-all-invitations.case.js';
import { GetInvitationCase } from 'application/use-cases/invitation/get-invitation.case.js';
import { InviteToProjectCase } from 'application/use-cases/invitation/invite-to-project.case.js';
import { RejectInvitationCase } from 'application/use-cases/invitation/reject-invitation.case.js';

// CONTROLLER IMPORTS
import { AcceptInvitationController } from 'infrastructure/http/controllers/invitation/accept-invitation.controller.js';
import { GetAllInvitationsController } from 'infrastructure/http/controllers/invitation/get-all-invitations.controller.js';
import { GetInvitationController } from 'infrastructure/http/controllers/invitation/get-invitation.controller.js';
import { InviteToProjectController } from 'infrastructure/http/controllers/invitation/invite-to-project.controller.js';
import { RejectInvitationController } from 'infrastructure/http/controllers/invitation/reject-invitation.controller.js';


// USE CASES INSTANTIATION
const acceptInvitationUseCase = new AcceptInvitationCase(containerDI.repositories.userRepository, containerDI.repositories.memberRepository, containerDI.repositories.invitationRepository, containerDI.repositories.projectRepository, containerDI.transactionalCoordinator.unitOfWork)
const getAllInvitationsUseCase = new GetAllInvitationsCase(containerDI.repositories.userRepository, containerDI.repositories.invitationRepository, containerDI.repositories.projectRepository)
const getInvitationUseCase = new GetInvitationCase(containerDI.repositories.userRepository, containerDI.repositories.invitationRepository, containerDI.repositories.taskRepository, containerDI.repositories.memberRepository, containerDI.repositories.projectRepository)
const inviteToProjectUseCase = new InviteToProjectCase(containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.memberRepository, containerDI.repositories.invitationRepository)
const rejectInvitationUseCase = new RejectInvitationCase(containerDI.repositories.userRepository, containerDI.repositories.invitationRepository, containerDI.repositories.projectRepository)

// CONTROLLERS INSTANTIATION
const acceptInvitationController = new AcceptInvitationController(acceptInvitationUseCase)
const getAllInvitationsController = new GetAllInvitationsController(getAllInvitationsUseCase)
const getInvitationController = new GetInvitationController(getInvitationUseCase)
const inviteToProjectController = new InviteToProjectController(inviteToProjectUseCase)
const rejectInvitationController = new RejectInvitationController(rejectInvitationUseCase)



export const invitationModulesContainer = {
    useCases: {
        acceptInvitationUseCase,
        getAllInvitationsUseCase,
        getInvitationUseCase,
        inviteToProjectUseCase,
        rejectInvitationUseCase
    },

    controllers: {
        acceptInvitationController,
        getAllInvitationsController,
        getInvitationController,
        inviteToProjectController,
        rejectInvitationController
    }
} as const