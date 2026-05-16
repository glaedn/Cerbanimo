import { uiLayer } from "./layers/uiLayer";
import { eventLayer } from "./layers/eventLayer";
import { ambientLayer } from "./layers/ambientLayer";
import { themeLayer } from "./layers/themeLayer";

export function handleEvent(eventType, payload) {
  console.log(`Handling audio event: ${eventType}`, payload);
  switch (eventType) {
    case "ui.click":
      uiLayer.click();
      break;
    case "ui.hover":
      uiLayer.hover();
      break;
    case "ui.confirm":
      uiLayer.confirm();
      break;
    case "ui.error":
      uiLayer.error();
      break;
    case "ui.message":
      uiLayer.message();
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

    case "reputation.levelup":
      eventLayer.levelUp();
      break;
    case "collaboration.invite":
      eventLayer.collaborationInvite();
      break;
    case "vote.passed":
      eventLayer.votePassed();
      break;
    case "vote.failed":
      eventLayer.voteFailed();
      break;

    case "task.decaying":
      ambientLayer.increaseTension(payload);
      themeLayer.updateState({ urgency: payload.decay_factor || 0.5 });
      break;
    case "project.health.update":
      ambientLayer.updateProjectTone(payload);
      themeLayer.updateState({ growth: payload.health_score || 0.5 });
      break;
    case "guild.demand.spike":
      eventLayer.guildSpike(payload);
      break;

    case "context.change":
      themeLayer.setContext(payload.context);
      break;
    case "state.update":
      themeLayer.updateState(payload);
      break;

    default:
      console.warn(`No handler for audio event: ${eventType}`);
      break;
  }
}
