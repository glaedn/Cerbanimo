import * as Tone from "tone";

const metalSynth = new Tone.PolySynth(Tone.MetalSynth, {
  frequency: 200,
  envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5
});

const chimeSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 1 }
});

export const tokenLayer = {
  connect(target) {
    metalSynth.connect(target);
    chimeSynth.connect(target);
  },

  tokenEarned() {
    const now = Tone.now();
    metalSynth.triggerAttackRelease("C6", "16n", now, 0.4);
    chimeSynth.triggerAttackRelease(["C6", "E6", "G6"], "8n", now + 0.05, 0.5);
  },

  tokenSpent() {
    const now = Tone.now();
    metalSynth.triggerAttackRelease("G5", "16n", now, 0.3);
    chimeSynth.triggerAttackRelease(["G5", "Eb5", "C5"], "8n", now + 0.05, 0.4);
  }
};
