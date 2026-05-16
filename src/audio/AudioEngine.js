import * as Tone from "tone";
import { AudioDirector } from "./AudioDirector";
import { themeLayer } from "./layers/themeLayer";
import { uiLayer } from "./layers/uiLayer";
import { eventLayer } from "./layers/eventLayer";
import { ambientLayer } from "./layers/ambientLayer";
import { audioSceneManager } from "./AudioSceneManager";

// Register all scenes
import { homepageScene } from "./scenes/homepage";
import { dashboardScene } from "./scenes/dashboard";
import { workspaceScene } from "./scenes/workspace";
import { governanceScene } from "./scenes/governance";
import { crisisScene } from "./scenes/crisis";
import { portfolioScene } from "./scenes/portfolio";

class AudioEngine {
  constructor() {
    this.started = false;
    this.context = Tone.getContext();
    this.themeStarted = false;

    // Master Gain Nodes for Muting
    this.themeGain = new Tone.Gain(1).toDestination();
    this.uiGain = new Tone.Gain(1).toDestination();

    // Deferred connections to avoid initialization order issues in tests
    themeLayer.connect(this.themeGain);
    uiLayer.connect(this.uiGain);
    eventLayer.connect(this.uiGain);
    ambientLayer.connect(this.themeGain);

    // Register scenes with the manager
    audioSceneManager.registerScene("normal", dashboardScene);
    audioSceneManager.registerScene("landing", homepageScene);
    audioSceneManager.registerScene("workspace", workspaceScene);
    audioSceneManager.registerScene("governance", governanceScene);
    audioSceneManager.registerScene("crisis", crisisScene);
    audioSceneManager.registerScene("portfolio", portfolioScene);
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

      // Initialize with default scene
      audioSceneManager.transitionTo("normal");
    }
  }

  stopTheme() {
    themeLayer.stop();
    this.themeStarted = false;
  }

  toggleTheme(enabled) {
    this.themeGain.gain.rampTo(enabled ? 1 : 0, 0.5);
  }

  toggleUI(enabled) {
    this.uiGain.gain.rampTo(enabled ? 1 : 0, 0.5);
  }

  trigger(eventType, payload) {
    if (!this.started) {
      console.warn(`AudioEngine not started yet. Ignoring event: ${eventType}`);
      return;
    }
    AudioDirector.dispatch(eventType, payload);
  }
}

export const audioEngine = new AudioEngine();
