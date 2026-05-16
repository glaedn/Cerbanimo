import EventBusService from '../services/EventBusService.js';
import EventRouter from '../services/EventRouter.js';

export const startEventWorker = () => {
  console.log('EventWorker: Starting...');

  EventBusService.startInProcessWorker(async (event) => {
    try {
      await EventRouter.handleEvent(event);
    } catch (err) {
      console.error('EventWorker: Failed to process event', err);
    }
  });

  console.log('EventWorker: Registered with EventBus');
};
