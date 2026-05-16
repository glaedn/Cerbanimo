import * as Tone from "tone";

const pad = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "fatsawtooth",
    count: 3,
    spread: 20
  },
  envelope: { attack: 2, release: 4 }
});

let tension = 0;
let started = false;

export const ambientLayer = {
  connect(target) {
    pad.connect(target);
  },

  start() {
    if (started) return;
    started = true;
    Tone.Transport.scheduleRepeat((time) => {
      const notes = tension > 0.5 ? ["C3", "Eb3", "G3"] : ["G3", "B3", "D4"];
      pad.triggerAttackRelease(notes, "2n", time);
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
