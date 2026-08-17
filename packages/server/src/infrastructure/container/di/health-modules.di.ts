import { containerDI } from "../di.config.js";

// CONTROLLER IMPORTS
import { GetLivenessController } from "infrastructure/http/controllers/health/get-liveness.controller.js";
import { GetReadinessController } from "infrastructure/http/controllers/health/get-readiness.controller.js";



// CONTROLLER INSTANTIATION
const getLivenessController = new GetLivenessController()
const getReadinessController = new GetReadinessController(containerDI.healthMonitorResource.databasePinger)


export const healthModulesContainer = {
    controllers: {
        getLivenessController,
        getReadinessController
    }
} as const