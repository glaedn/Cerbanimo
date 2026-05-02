import * as Tone from "tone";

const pad = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 2, release: 4 }
}).toDestination();

let tension = 0;
let started = false;

export const ambientLayer = {
  start() {
    if (started) return;
    started = true;
    Tone.Transport.scheduleRepeat((time) => {
      const note = tension > 0.5 ? "C3" : "G3";
      pad.triggerAttackRelease(note, "2n", time);
    }, "2n");

    Tone.Transport.start();
  },

  increaseTension({ decay_factor = 0.1 } = {}) {
    tension = Math.min(1, tension + (decay_factor * 0.1));
  },

  updateProjectTone({ health_score = 1 } = {}) {
    tension = 1 - health_score;
  }
};
