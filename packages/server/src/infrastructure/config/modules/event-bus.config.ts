import { Env } from "../env.schema.js";
import { IEventBus } from "application/ports/event-bus.port.js";
import { AWSBridgeEventBus } from "infrastructure/events/aws-bridge-bus.event.js";
import { InMemoryEventBus } from "infrastructure/events/in-memory-bus.event.js";
import { PinoLoggerAdapter } from "infrastructure/logging/pino-logger.adapter.js";

export const createEventBus = (env: Env, logger: PinoLoggerAdapter): IEventBus => {
    
    const provider = env.EVENT_BUS_PROVIDER ?? (env.NODE_ENV === 'production' ? 'aws' : 'memory')

    if (provider === 'memory') return new InMemoryEventBus(logger)

    return new AWSBridgeEventBus({
        eventBusName: env.EVENT_BRIDGE_BUS_NAME,
        source: 'synergy.application',
        region: env.AWS_REGION
    }, logger)
}