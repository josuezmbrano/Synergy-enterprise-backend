import { Env } from "infrastructure/config/env.schema.js";
import { createContainerBase } from "./di.base.js";
import { createAuthModules } from "./di/auth-modules.di.js";
import { createHealthModules } from "./di/health-modules.di.js";
import { createInvitationModules } from "./di/invitation-modules.di.js";
import { createMemberModules } from "./di/member-modules.di.js";
import { createProjectModules } from "./di/project-modules.di.js";
import { createTaskModules } from "./di/task-modules.di.js";
import { createUserModules } from "./di/user-modules.di.js";

export const createContainer = (env: Env) => {

    const containerBase = createContainerBase(env)

    return {
        ...containerBase,
        modules: {
            auth: createAuthModules(containerBase),
            health: createHealthModules(containerBase),
            invitation: createInvitationModules(containerBase),
            member: createMemberModules(containerBase),
            project: createProjectModules(containerBase),
            task: createTaskModules(containerBase),
            user: createUserModules(containerBase)
        }
    } as const
}

export type ApplicationContainer = ReturnType<typeof createContainer>
export type MiddlewareModules = ApplicationContainer['middlewares']
export type LoggerMonitor = ApplicationContainer['loggerMonitorInstance']