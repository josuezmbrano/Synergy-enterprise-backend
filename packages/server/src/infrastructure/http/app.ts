import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { xss } from 'express-xss-sanitizer'
import { createHealthRouter } from './routes/health.routes.js'
import { createAuthRouter } from './routes/auth.routes.js'
import { createUserRouter } from './routes/user.routes.js'
import { createInvitationRouter } from './routes/invitation.routes.js'
import { createProjectRouter } from './routes/project.routes.js'
import { createMemberRouter } from './routes/member.routes.js'
import { createTaskRouter } from './routes/task.routes.js'
import { GlobalErrorMiddleware } from './middlewares/global-error.middleware.js'
import { corsOptions } from './middlewares/cors-options.middleware.js'
import { validateRequest } from './middlewares/validate-request.middleware.js'
import { InviteToProjectBodySchema } from '@project/common/schemas/invitation.schema.js'
import { correlationMiddleware } from './middlewares/correlation-middleware.js'
import type { ApplicationContainer } from 'infrastructure/container/di.config.js'
import type { Request, Response } from 'express-serve-static-core'



export const createApp = (container: ApplicationContainer) => {

    const app = express()


    // INPUT MIDDLEWARES 
    app.use(helmet())
    app.use(cors(corsOptions))
    app.use(cookieParser())
    app.use(express.json())
    app.use(xss())


    // BASIC HEALTH CHECK ROUTE
    app.get('/', (_req: Request, res: Response) => {
        res.status(200).send({ message: '[Synergy] Enterprise Project System app server is running!' });
    });

    // HEALTH CHECKS (INFRASTRUCTURE PROBES)
    app.use('/health', createHealthRouter(container.modules.health))

    // CORRELATION MIDDLEWARE
    app.use(correlationMiddleware)

    // ROUTER ASSEMBLY
    app.use('/api/v1/auth', createAuthRouter(container.modules.auth, container.middlewares))
    app.use('/api/v1/users', createUserRouter(container.modules.user, container.middlewares))

    // PROJECT MODULES HIERARCHY
    app.use('/api/v1/projects', createProjectRouter(container.modules.project, container.middlewares))
    app.use('/api/v1/projects', createMemberRouter(container.modules.member, container.middlewares))
    app.use('/api/v1/projects', createTaskRouter(container.modules.task, container.middlewares))
    // INVITE TO PROJECT ROUTE (PROJECT HIERARCHY)
    app.post('/api/v1/projects/:projectId/invitations',
        container.middlewares.checkAuth.execute,
        validateRequest(InviteToProjectBodySchema),
        container.modules.invitation.controllers.inviteToProjectController.execute)

    // INVITATION MODULES HIERARCHY
    app.use('/api/v1/invitations', createInvitationRouter(container.modules.invitation, container.middlewares))


    // OUTPUT MIDDLEWARES
    app.use(GlobalErrorMiddleware(container.loggerMonitorInstance, container.environment.env))

    return app
}
