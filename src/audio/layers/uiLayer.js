import * as Tone from "tone";

// PERSISTENT SYNTHS
const clickSynth = new Tone.MembraneSynth().toDestination();

const hoverSynth = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
}).toDestination();

const confirmSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 }
}).toDestination();

const errorSynth = new Tone.MonoSynth({
  oscillator: { type: "square" },
  filter: { Q: 2, type: "lowpass", rolloff: -12 },
  envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 }
}).toDestination();

const messageSynth = new Tone.PolySynth(Tone.DuoSynth, {
  voice0: {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 1 }
  },
  voice1: {
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.5 }
  }
}).toDestination();

export const uiLayer = {
  click() {
    if (Tone.getContext().state !== 'running') return;
    clickSynth.triggerAttackRelease("C2", "8n");
  },

  hover() {
    if (Tone.getContext().state !== 'running') return;
    hoverSynth.triggerAttackRelease("A5", "32n");
  },

  confirm() {
    if (Tone.getContext().state !== 'running') return;
    confirmSynth.triggerAttackRelease(["D4", "F4", "A4"], "16n");
  },

  error() {
    if (Tone.getContext().state !== 'running') return;
    errorSynth.triggerAttackRelease("G1", "8n");
  },

  message() {
    if (Tone.getContext().state !== 'running') return;
    // Soft marimba-like tone
    messageSynth.triggerAttackRelease(["C5", "G5"], "16n");
  }
};
