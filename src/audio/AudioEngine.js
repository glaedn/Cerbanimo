import * as Tone from "tone";
import { handleEvent } from "./EventRouter";

class AudioEngine {
  constructor() {
    this.started = false;
    this.context = Tone.getContext();
  }

  async start() {
    if (!this.started) {
      await Tone.start();
      this.started = true;
      console.log("Audio Engine Started");
    }
  }

  trigger(eventType, payload) {
    if (!this.started) {
      console.warn(`AudioEngine not started yet. Ignoring event: ${eventType}`);
      return;
    }
    handleEvent(eventType, payload);
  }
}

export const audioEngine = new AudioEngine();
