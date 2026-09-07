import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge'
import { IEventBus } from 'application/ports/event-bus.port.js'
import { BaseDomainEvent } from 'core/events/base-domain.events.js'
import { LoggerPort } from 'core/ports/logger.port.js'
import { requestContext } from 'infrastructure/context/request.context.js'
import { InfraErrorFactory } from 'core/errors/factories/infra-factory.error.js'

export interface AWSBridgeEventBusConfig {
  eventBusName: string
  source: string
  region?: string
}

export class AWSBridgeEventBus implements IEventBus {
  private readonly client: EventBridgeClient
  private static readonly AWS_EVENTBRIDGE_MAX_BATCH_SIZE = 10

  constructor(
    private readonly config: AWSBridgeEventBusConfig,
    private readonly logger: LoggerPort,
    client?: EventBridgeClient
  ) {
    this.client =
      client ??
      new EventBridgeClient({
        region: config.region ?? process.env.AWS_REGION ?? 'us-east-1',
      })
  }

  public async publish(event: BaseDomainEvent): Promise<void> {
    await this.publishBatch([event])
  }

  public async publishBatch(events: ReadonlyArray<BaseDomainEvent>): Promise<void> {
    if (events.length === 0) return

    
    const chunks = this.chunkArray(events, AWSBridgeEventBus.AWS_EVENTBRIDGE_MAX_BATCH_SIZE)

    for (const chunk of chunks) {
      await this.publishChunk(chunk)
    }
  }

  private async publishChunk(eventsChunk: ReadonlyArray<BaseDomainEvent>): Promise<void> {
    
    const store = requestContext.getStore()
    const activeRequestId = store?.get('requestId') as string | undefined

    
    const entries: PutEventsRequestEntry[] = eventsChunk.map((event) => {
      const eventSerialized = event.toJSON()

      const enrichedPayload = {
        ...eventSerialized,
        metadata: {
          ...eventSerialized.metadata,
          correlationId: activeRequestId ?? eventSerialized.metadata.correlationId ?? event.eventId,
        },
      }

      return {
        EventBusName: this.config.eventBusName,
        Source: this.config.source,
        DetailType: event.eventName,
        Detail: JSON.stringify(enrichedPayload),
        Time: new Date(event.occurredAt),
        Resources: [event.aggregateId], 
      }
    })

    try {
      const command = new PutEventsCommand({ Entries: entries })
      const response = await this.client.send(command)

      
      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const failedDetails = (response.Entries ?? [])
          .map((entry, index) => ({
            event: eventsChunk[index].eventName,
            eventId: eventsChunk[index].eventId,
            errorCode: entry.ErrorCode,
            errorMessage: entry.ErrorMessage,
          }))
          .filter((entry) => entry.errorCode !== undefined)

        this.logger.error('[AWSBridgeEventBus] Partial failure publishing events to EventBridge', undefined, {
          failedCount: response.FailedEntryCount,
          totalInBatch: eventsChunk.length,
          failures: failedDetails,
        })

        throw InfraErrorFactory.persistenceError(
          'AWSBridgeEventBus.publishChunk',
          `Failed to deliver ${response.FailedEntryCount} of ${eventsChunk.length} events to EventBridge.`
        )
      }

      this.logger.info(`[AWSBridgeEventBus] Dispatched ${eventsChunk.length} event(s) successfully`, {
        eventNames: eventsChunk.map((e) => e.eventName),
        eventIds: eventsChunk.map((e) => e.eventId),
      })
    } catch (error) {
      this.logger.error('[AWSBridgeEventBus] Critical failure communicating with AWS EventBridge', error, {
        busName: this.config.eventBusName,
        batchSize: eventsChunk.length,
      })

      if (error instanceof Error && error.name === 'InfraDomainError') {
        throw error
      }

      throw InfraErrorFactory.connectionError(
        'AWS EventBridge',
        error instanceof Error ? error.message : 'Unknown network failure'
      )
    }
  }


  private chunkArray<T>(items: ReadonlyArray<T>, size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }
}