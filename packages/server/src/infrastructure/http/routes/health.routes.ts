import { Router } from "express";
import { Router as RouterType } from "express-serve-static-core";
import { healthModulesContainer } from "infrastructure/container/di/health-modules.di.js";

export const healthRoutes: RouterType = Router()


// Destructured controllers from the DI auth module container
const { getLivenessController, getReadinessController } = healthModulesContainer.controllers

healthRoutes.get('/liveness', getLivenessController.execute)
healthRoutes.get('/readiness', getReadinessController.execute)