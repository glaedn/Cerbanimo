import * as Tone from "tone";

const bloomSynth = new Tone.PolySynth(Tone.DuoSynth, {
  voice0: { oscillator: { type: "triangle" }, envelope: { attack: 0.5, decay: 0.5, sustain: 1, release: 2 } },
  voice1: { oscillator: { type: "sine" }, envelope: { attack: 0.8, decay: 0.2, sustain: 1, release: 3 } }
});

const sparkleSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 1 }
});

export const socialLayer = {
  connect(target) {
    bloomSynth.connect(target);
    sparkleSynth.connect(target);
  },

  communityJoined() {
    const now = Tone.now();
    bloomSynth.triggerAttackRelease(["G3", "B3", "D4", "G4"], "2n", now, 0.4);
    sparkleSynth.triggerAttackRelease("G6", "8n", now + 0.5, 0.3);
  },

  constellationFormed() {
    const now = Tone.now();
    bloomSynth.triggerAttackRelease(["D3", "A3", "D4", "F#4", "A4"], "4n", now, 0.5);
    const sparkles = ["D6", "F#6", "A6", "D7"];
    sparkles.forEach((note, i) => {
      sparkleSynth.triggerAttackRelease(note, "4n", now + i * 0.15, 0.4);
    });
  }
};
