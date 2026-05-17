// src/audio/AudioQualityManager.js
import * as Tone from 'tone';

const IS_MOBILE = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

class AudioQualityManager {
  constructor() {
    this.quality = IS_MOBILE ? 'balanced' : 'high';
    this.fps = 60;
    this._lastTime = performance.now();
    this._frameCount = 0;

    if (typeof window !== 'undefined') {
      this._startFPSMonitoring();
    }
  }

  _startFPSMonitoring() {
    const loop = () => {
      this._frameCount++;
      const now = performance.now();
      if (now - this._lastTime >= 1000) {
        this.fps = (this._frameCount * 1000) / (now - this._lastTime);
        this._frameCount = 0;
        this._lastTime = now;
        this._adjustQuality();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _adjustQuality() {
    if (this.fps < 30 && this.quality === 'high') {
      this.quality = 'balanced';
      console.log('Audio quality degraded to balanced due to low FPS');
    } else if (this.fps < 20 && this.quality === 'balanced') {
      this.quality = 'low';
      console.log('Audio quality degraded to low due to very low FPS');
    } else if (this.fps > 50 && this.quality === 'low') {
      this.quality = 'balanced';
      console.log('Audio quality restored to balanced');
    } else if (this.fps > 55 && this.quality === 'balanced' && !IS_MOBILE) {
      this.quality = 'high';
      console.log('Audio quality restored to high');
    }
  }

  get isMobile() {
    return IS_MOBILE;
  }

  get maxPolyphony() {
    if (this.quality === 'low') return 4;
    if (this.quality === 'balanced') return 8;
    return 16;
  }

  get useReducedFX() {
    return this.quality !== 'high';
  }

  oscillatorType(preferredType) {
    if (this.quality === 'low') return 'sine';
    if (this.quality === 'balanced' && (preferredType === 'sawtooth' || preferredType === 'square')) {
        return 'triangle';
    }
    return preferredType;
  }
}

export const audioQualityManager = new AudioQualityManager();
