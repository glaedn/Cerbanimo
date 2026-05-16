import * as Tone from "tone";
import { handleEvent } from "./EventRouter";
import { themeLayer } from "./layers/themeLayer";

class AudioEngine {
  constructor() {
    this.started = false;
    this.context = Tone.getContext();
    this.themeStarted = false;
  }

  async start() {
    if (!this.started) {
      await Tone.start();
      this.started = true;
      console.log("Audio Engine Started");
    }
  }

  async startTheme() {
    await this.start();
    if (!this.themeStarted) {
      await themeLayer.start();
      this.themeStarted = true;
      console.log("Theme Music Started");
    }
  }

  stopTheme() {
    themeLayer.stop();
    this.themeStarted = false;
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
