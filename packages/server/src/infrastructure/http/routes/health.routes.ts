import { Router } from "express";
import { HealthModules } from "infrastructure/container/di/health-modules.di.js";

export const createHealthRouter = (modules: HealthModules): Router => {
    const healthRouter = Router()
    const { controllers } = modules

    healthRouter.get('/liveness', controllers.getLivenessController.execute)
    healthRouter.get('/readiness', controllers.getReadinessController.execute)

    return healthRouter
}
