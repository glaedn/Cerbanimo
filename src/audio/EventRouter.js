import { uiLayer } from "./layers/uiLayer";
import { eventLayer } from "./layers/eventLayer";
import { ambientLayer } from "./layers/ambientLayer";

export function handleEvent(eventType, payload) {
  console.log(`Handling audio event: ${eventType}`, payload);
  switch (eventType) {
    case "ui.click":
      uiLayer.click();
      break;

    case "task.accepted":
      eventLayer.taskAccepted(payload);
      break;

    case "task.submitted":
      eventLayer.taskSubmitted(payload);
      break;

    case "task.approved":
      eventLayer.taskApproved(payload);
      break;

    case "task.rejected":
      eventLayer.taskRejected(payload);
      break;

    case "task.dropped":
      eventLayer.taskDropped(payload);
      break;

    case "task.unblocked":
      eventLayer.taskCascade(payload);
      break;

    case "task.decaying":
      ambientLayer.increaseTension(payload);
      break;

    case "project.health.update":
      ambientLayer.updateProjectTone(payload);
      break;

    case "guild.demand.spike":
      eventLayer.guildSpike(payload);
      break;

    default:
      console.warn(`No handler for audio event: ${eventType}`);
      break;
  }
}
