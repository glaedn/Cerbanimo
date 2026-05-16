// src/audio/layers/ambientLayer.js
//
// CHANGED from previous version:
//   - Removed the fatsawtooth PolySynth + scheduleRepeat that was the primary
//     source of low-frequency beating artifacts. Three detuned oscillators
//     firing every half-note with a 4-second release = constant low rumble.
//   - The ambient layer now provides on-demand tension stabs only — called
//     explicitly by AudioDirector, not on a repeating schedule.
//   - Uses a gentler sine pad at lower gain, gated through a highpass filter
//     to prevent subsonic buildup.

import * as Tone from 'tone';

// Gentle sine pad — provides a soft harmonic wash when tension events fire.
// Sine only (no detuned oscillators), highpass filtered, low velocity.
const hpFilter = new Tone.Filter({ frequency: 80, type: 'highpass', rolloff: -12 });

const pad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope: { attack: 1.5, decay: 0.5, sustain: 0.6, release: 3 },
  volume: -18,
}).connect(hpFilter);

let tension    = 0;
let padReverb  = null;

// Lazy-init the reverb (it's async internally in Tone.js).
function getOrCreateReverb(target) {
  if (padReverb) return padReverb;
  padReverb = new Tone.Reverb({ decay: 6, wet: 0.4 });
  hpFilter.connect(padReverb);
  padReverb.connect(target);
  return padReverb;
}

export const ambientLayer = {
  connect(target) {
    getOrCreateReverb(target);
  },

  // Called by AudioDirector on task.decaying
  increaseTension({ decay_factor = 0.1 } = {}) {
    tension = Math.min(1, tension + (decay_factor * 0.15));
    // Tension stab: minor triad rises with urgency
    const notes = tension > 0.5 ? ['C3', 'Eb3', 'G3'] : ['G3', 'Bb3', 'D4'];
    if (Tone.getContext().state === 'running') {
      pad.triggerAttackRelease(notes, '1n', Tone.now(), 0.15 + tension * 0.1);
    }
  },

  // Called by AudioDirector on project.health.update
  updateProjectTone({ health_score = 1 } = {}) {
    tension = Math.max(0, 1 - health_score);
  },
};