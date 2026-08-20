import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { xss } from 'express-xss-sanitizer'
import { authRouter } from './routes/auth.routes.js'
import { userRouter } from './routes/user.routes.js'
import { GlobalErrorMiddleware } from './middlewares/global-error.middleware.js'
import { projectRouter } from './routes/project.routes.js'
import { memberRouter } from './routes/member.routes.js'
import { taskRouter } from './routes/task.routes.js'
import { corsOptions } from './middlewares/cors-options.middleware.js'
import type { Request, Response } from 'express-serve-static-core'
import { invitationRouter } from './routes/invitation.routes.js'
import { invitationModulesContainer } from 'infrastructure/container/di/invitation-modules.di.js'
import { containerDI } from 'infrastructure/container/di.config.js'
import { validateRequest } from './middlewares/validate-request.middleware.js'
import { InviteToProjectBodySchema } from '@project/common/schemas/invitation.schema.js'
import { healthRoutes } from './routes/health.routes.js'
import { correlationMiddleware } from './middlewares/correlation-middleware.js'


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
app.use('/health', healthRoutes)

// CORRELATION MIDDLEWARE
app.use(correlationMiddleware)

// ROUTER ASSEMBLY
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', userRouter)

// PROJECT MODULES HIERARCHY
app.use('/api/v1/projects', projectRouter)
app.use('/api/v1/projects', memberRouter)
app.use('/api/v1/projects', taskRouter)
// INVITE TO PROJECT ROUTE (PROJECT HIERARCHY)
app.post('/api/v1/projects/:projectId/invitations', 
    containerDI.middlewares.checkAuth.execute, 
    validateRequest(InviteToProjectBodySchema), 
    invitationModulesContainer.controllers.inviteToProjectController.execute)
    
// INVITATION MODULES HIERARCHY
app.use('/api/v1/invitations', invitationRouter)


// OUTPUT MIDDLEWARES
app.use(GlobalErrorMiddleware)


export { app }