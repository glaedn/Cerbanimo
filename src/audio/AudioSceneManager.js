import * as Tone from "tone";
import { themeLayer } from "./layers/themeLayer";

class AudioSceneManager {
  constructor() {
    this.currentScene = null;
    this.scenes = {};
  }

  registerScene(name, config) {
    this.scenes[name] = config;
  }

  transitionTo(sceneName) {
    const config = this.scenes[sceneName];
    if (!config) {
      console.warn(`Scene ${sceneName} not found`);
      return;
    }

    this.currentScene = sceneName;
    console.log(`Transitioning to scene: ${sceneName}`, config);

    // Ramp BPM
    if (config.bpm) {
      if (sceneName === 'crisis') {
        Tone.Transport.bpm.value = config.bpm;
      } else {
        Tone.Transport.bpm.rampTo(config.bpm, config.transitionTime || 4);
      }
    }

    // Apply layer volumes and effects via themeLayer
    if (themeLayer && themeLayer.setMood) {
      themeLayer.setMood({
        ...(config.mood || {}),
        transitionTime: config.transitionTime || 4
      });
    }
  }
}

export const audioSceneManager = new AudioSceneManager();
