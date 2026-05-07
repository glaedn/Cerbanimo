import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { EventEmitter } from 'events';
import 'dotenv/config';

class EventBusService extends EventEmitter {
  constructor() {
    super();
    this.queueName = 'civic-events';
    this.redisUrl = process.env.REDIS_URL;
    this.useRedis = false;
    this.queue = null;
    this.worker = null;
  }

  async initialize() {
    if (this.redisUrl) {
      try {
        this.connection = new IORedis(this.redisUrl, {
          maxRetriesPerRequest: null,
        });

        // Test connection
        await this.connection.ping();

        this.useRedis = true;
        this.queue = new Queue(this.queueName, { connection: this.connection });
        console.log('EventBus: Using BullMQ with Redis');
      } catch (err) {
        console.warn('EventBus: Redis connection failed, falling back to EventEmitter', err.message);
        this.useRedis = false;
      }
    } else {
      console.log('EventBus: No REDIS_URL found, using EventEmitter fallback');
    }
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

    if (this.useRedis && this.queue) {
      await this.queue.add(eventType, event, {
        removeOnComplete: true,
        removeOnFail: 1000,
      });
    } else {
      // Async emission to mimic queue behavior
      setImmediate(() => {
        this.emit('event', event);
        this.emit(eventType, event);
      });
    }

    return event;
  }

  startInProcessWorker(handler) {
    if (this.useRedis) {
      this.worker = new Worker(this.queueName, async (job) => {
        await handler(job.data);
      }, { connection: this.connection });

      this.worker.on('failed', (job, err) => {
        console.error(`EventBus: Job ${job.id} failed`, err);
      });
    } else {
      this.on('event', async (event) => {
        try {
          await handler(event);
        } catch (err) {
          console.error('EventBus: Local handler failed', err);
        }
      });
    }
  }
}

export default new EventBusService();
