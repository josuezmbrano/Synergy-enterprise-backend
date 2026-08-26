import { ContainerBase } from '../di.base.js';

// CONTROLLER IMPORTS
import { GetLivenessController } from "infrastructure/http/controllers/health/get-liveness.controller.js";
import { GetReadinessController } from "infrastructure/http/controllers/health/get-readiness.controller.js";



export const createHealthModules = (containerDI: ContainerBase) => {

    // CONTROLLER INSTANTIATION
    const getLivenessController = new GetLivenessController()
    const getReadinessController = new GetReadinessController(containerDI.healthMonitorResource.databasePinger)

    return {
        controllers: {
            getLivenessController,
            getReadinessController
        }
    } as const
}

export type HealthModules = ReturnType<typeof createHealthModules>