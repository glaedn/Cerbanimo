import { EventEmitter } from 'events';
import boss from '../jobs/boss.js';
import 'dotenv/config';

class EventBusService extends EventEmitter {
  constructor() {
    super();
    this.queueName = 'civic-events';
    this.boss = boss;
  }

  async initialize() {
    // pg-boss is initialized in server.js
    console.log('EventBus: Using pg-boss for event persistence');
  }

  async publish(eventType, payload, metadata = {}) {
    const event = {
      id: metadata.id,
      eventType,
      payload,
      actorId: metadata.actorId,
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      timestamp: new Date().toISOString()
    };

    try {
      await this.boss.send(this.queueName, event, {
        retryLimit: 5,
        retryBackoff: true
      });
    } catch (err) {
      console.warn('EventBus: pg-boss publish failed, falling back to local emission', err.message);
      // Async emission to mimic queue behavior
      setImmediate(() => {
        this.emit('event', event);
        this.emit(eventType, event);
      });
    }

    return event;
  }

  async startInProcessWorker(handler) {
    console.log('EventBus: Starting pg-boss worker for civic-events');

    await this.boss.work(this.queueName, async (job) => {
      await handler(job.data);
    });

    // Also listen for local emissions for fallback/immediate needs
    this.on('event', async (event) => {
      try {
        await handler(event);
      } catch (err) {
        console.error('EventBus: Local handler failed', err);
      }
    });
  }
}

export default new EventBusService();
