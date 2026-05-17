// src/audio/AudioEngine.js
import * as Tone from 'tone';
import { AudioDirector } from './AudioDirector';
import { themeLayer } from './layers/themeLayer';
import { uiLayer } from './layers/uiLayer';
import { eventLayer } from './layers/eventLayer';
import { tokenLayer } from './layers/tokenLayer';
import { socialLayer } from './layers/socialLayer';
import { ambientLayer } from './layers/ambientLayer';
import { audioSceneManager } from './AudioSceneManager';

import { homepageScene }   from './scenes/homepage';
import { dashboardScene }  from './scenes/dashboard';
import { workspaceScene }  from './scenes/workspace';
import { governanceScene } from './scenes/governance';
import { crisisScene }     from './scenes/crisis';
import { portfolioScene }  from './scenes/portfolio';
import { skillGalaxyScene } from './scenes/skillGalaxy';
import { guildHubScene }   from './scenes/guildHub';
import { communityScene }  from './scenes/community';
import { onboardingScene } from './scenes/onboarding';

class AudioEngine {
  constructor() {
    this.started      = false;
    this.themeStarted = false;
    this.eventQueue   = [];

    // Increase the default 100ms look-ahead to 180ms.
    // This schedules audio events further ahead of the playhead, giving the
    // worklet enough buffer to survive heavy React render frames without glitching.
    Tone.getContext().lookAhead = 0.18;

    // Global Mastering Chain
    this.masterLimiter = new Tone.Limiter(-1).toDestination();

    this.masterEQ = new Tone.EQ3({
      low: -2,
      mid: 0,
      high: -4
    });

    this.masterCompressor = new Tone.Compressor({
      threshold: -18,
      ratio: 3,
      attack: 0.02,
      release: 0.2
    });

    this.masterLowpass = new Tone.Filter({
      type: "lowpass",
      frequency: 12000,
      rolloff: -12
    });

    // Connect the chain
    this.masterEQ.chain(this.masterCompressor, this.masterLowpass, this.masterLimiter);

    // Master gain nodes — theme music and UI/event sounds stay independently
    // controllable (music toggle, UI toggle, master volume).
    this.themeGain = new Tone.Gain(1.4).connect(this.masterEQ);
    this.uiGain    = new Tone.Gain(0.7).connect(this.masterEQ);

    // Wire layers into their buses
    themeLayer.connect(this.themeGain);
    uiLayer.connect(this.uiGain);
    eventLayer.connect(this.uiGain);
    tokenLayer.connect(this.uiGain);
    socialLayer.connect(this.uiGain);
    ambientLayer.connect(this.themeGain);

    // Register scenes
    audioSceneManager.registerScene('normal',      dashboardScene);
    audioSceneManager.registerScene('landing',     homepageScene);
    audioSceneManager.registerScene('workspace',   workspaceScene);
    audioSceneManager.registerScene('governance',  governanceScene);
    audioSceneManager.registerScene('crisis',      crisisScene);
    audioSceneManager.registerScene('portfolio',   portfolioScene);
    audioSceneManager.registerScene('skill-galaxy', skillGalaxyScene);
    audioSceneManager.registerScene('guild-hub',   guildHubScene);
    audioSceneManager.registerScene('community',   communityScene);
    audioSceneManager.registerScene('onboarding',  onboardingScene);
    audioSceneManager.registerScene('marketplace', workspaceScene);
    audioSceneManager.registerScene('atlas',       portfolioScene);

    // Bootstrap first-interaction start for browser compliance
    if (typeof window !== 'undefined') {
      const handleStart = () => {
        this.start();
        window.removeEventListener('mousedown', handleStart);
        window.removeEventListener('keydown', handleStart);
        window.removeEventListener('touchstart', handleStart);
      };
      window.addEventListener('mousedown', handleStart);
      window.addEventListener('keydown', handleStart);
      window.addEventListener('touchstart', handleStart);
    }
  }

  async start() {
    if (!this.started) {
      await Tone.start();
      this.started = true;
      console.log('Audio Engine started (lookAhead:', Tone.getContext().lookAhead, 's)');

      // Drain queue
      const queue = [...this.eventQueue];
      this.eventQueue = [];
      queue.forEach(({ type, payload }) => this.trigger(type, payload));
    }
  }

  async startTheme() {
    await this.start();
    if (!this.themeStarted) {
      await themeLayer.start();
      this.themeStarted = true;
      console.log('Theme music started');
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

  setMasterVolume(value) {
    const db = value === 0 ? -Infinity : Tone.gainToDb(value / 100);
    Tone.getDestination().volume.rampTo(db, 0.1);
  }

  trigger(eventType, payload) {
    if (!this.started) {
      this.eventQueue.push({ type: eventType, payload });
      return;
    }
    AudioDirector.dispatch(eventType, payload);
  }
}

export const audioEngine = new AudioEngine();