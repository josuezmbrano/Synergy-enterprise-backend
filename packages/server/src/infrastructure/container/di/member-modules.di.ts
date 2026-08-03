import { containerDI } from '../di.config.js';

// USE CASE IMPORTS
import { FindAllMembersCase } from 'application/use-cases/member/find-all-members.usecase.js';
import { FindMemberCase } from 'application/use-cases/member/find-member.usecase.js';
import { SetActiveStatusCase } from 'application/use-cases/member/status/set-active-status.usecase.js';
import { SetInactiveStatusCase } from 'application/use-cases/member/status/set-inactive-status.usecase.js';
import { SetOnLeaveStatusCase } from 'application/use-cases/member/status/set-onleave-status.usecase.js';
import { SetAdminRoleCase } from 'application/use-cases/member/role/set-admin-role.usecase.js';
import { SetContributorRoleCase } from 'application/use-cases/member/role/set-contributor-role.usecase.js';

// CONTROLLER IMPORTS
import { FindAllMembersController } from 'infrastructure/http/controllers/member/find-all-members.controller.js';
import { FindMemberController } from 'infrastructure/http/controllers/member/find-member.controller.js';
import { SetActiveStatusController } from 'infrastructure/http/controllers/member/set-active-status.controller.js';
import { SetInactiveStatusController } from 'infrastructure/http/controllers/member/set-inactive-status.controller.js';
import { SetOnLeaveStatusController } from 'infrastructure/http/controllers/member/set-onleave-status.controller.js';
import { SetAdminRoleController } from 'infrastructure/http/controllers/member/set-admin-role.controller.js';
import { SetContributorRoleController } from 'infrastructure/http/controllers/member/set-contributor-role.controller.js';


// USE CASES INSTANTIATION
const findAllMembersUseCase = new FindAllMembersCase(containerDI.repositories.memberRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository)
const findMemberUseCase = new FindMemberCase(containerDI.repositories.memberRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository)
const setActiveStatusUseCase = new SetActiveStatusCase(containerDI.repositories.memberRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository)
const setInactiveStatusUseCase = new SetInactiveStatusCase(containerDI.repositories.memberRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.taskRepository)
const setOnLeaveStatusUseCase = new SetOnLeaveStatusCase(containerDI.repositories.memberRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository, containerDI.repositories.taskRepository)
const setAdminRoleUseCase = new SetAdminRoleCase(containerDI.repositories.memberRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository)
const setContributorRoleUseCase = new SetContributorRoleCase(containerDI.repositories.memberRepository, containerDI.repositories.userRepository, containerDI.repositories.projectRepository)

// CONTROLLERS INSTANTIATION
const findAllMembersController = new FindAllMembersController(findAllMembersUseCase)
const findMemberController = new FindMemberController(findMemberUseCase)
const setActiveStatusController = new SetActiveStatusController(setActiveStatusUseCase)
const setInactiveStatusController = new SetInactiveStatusController(setInactiveStatusUseCase)
const setOnLeaveStatusController = new SetOnLeaveStatusController(setOnLeaveStatusUseCase)
const setAdminRoleController = new SetAdminRoleController(setAdminRoleUseCase)
const setContributorRoleController = new SetContributorRoleController(setContributorRoleUseCase)



export const memberModulesContainer = {
    useCases: {
        findAllMembersUseCase,
        findMemberUseCase,
        setActiveStatusUseCase,
        setInactiveStatusUseCase,
        setOnLeaveStatusUseCase,
        setAdminRoleUseCase,
        setContributorRoleUseCase
    },
    controllers: {
        findAllMembersController,
        findMemberController,
        setActiveStatusController,
        setInactiveStatusController,
        setOnLeaveStatusController,
        setAdminRoleController,
        setContributorRoleController
    }

} as const