import { uiLayer } from "./layers/uiLayer";
import { eventLayer } from "./layers/eventLayer";
import { ambientLayer } from "./layers/ambientLayer";
import { themeLayer } from "./layers/themeLayer";
import { audioSceneManager } from "./AudioSceneManager";

const musicState = {
  urgency: 0.2,
  collaboration: 0.8,
  exploration: 0.5,
  governance: 0.1,
  socialDensity: 0.7
};

export function handleEvent(eventType, payload = {}) {
  console.log(`AudioDirector dispatch: ${eventType}`, payload);

  const { emotionalWeight = 0.5, urgency = 0.5 } = payload;

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
    case "ui.modal_open":
      uiLayer.openModal();
      break;

    case "task.accepted":
      eventLayer.taskAccepted(payload);
      break;
    case "task.submitted":
      eventLayer.taskSubmitted(payload);
      // Boost collaboration state on task submission
      musicState.collaboration = Math.min(1, musicState.collaboration + 0.1);
      themeLayer.updateState({ collaboration: musicState.collaboration });
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
      musicState.urgency = payload.decay_factor || 0.5;
      themeLayer.updateState({ urgency: musicState.urgency });
      break;
    case "project.health.update":
      ambientLayer.updateProjectTone(payload);
      musicState.exploration = payload.health_score || 0.5;
      themeLayer.updateState({ growth: musicState.exploration });
      break;
    case "guild.demand.spike":
      eventLayer.guildSpike(payload);
      break;

    case "context.change":
      audioSceneManager.transitionTo(payload.context);
      break;
    case "state.update":
      themeLayer.updateState(payload);
      break;

    default:
      console.warn(`No handler for audio event: ${eventType}`);
      break;
  }
}

// Map the dispatch function for a cleaner API
export const AudioDirector = {
  dispatch: handleEvent
};
