import * as Tone from "tone";

// PERSISTENT SYNTHS
const clickSynth = new Tone.MembraneSynth().toDestination();

// Tiny glass tick / digital pluck for hover
const hoverSynth = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
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

// Reverse shimmer for modal open
const shimmerSynth = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.1, decay: 0.2, sustain: 0.1, release: 0.3 }
}).toDestination();

export const uiLayer = {
  click() {
    if (Tone.getContext().state !== 'running') return;
    clickSynth.triggerAttackRelease("C2", "8n");
  },

  hover() {
    if (Tone.getContext().state !== 'running') return;
    // High frequency "glass tick"
    hoverSynth.triggerAttackRelease("C6", "32n");
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
    messageSynth.triggerAttackRelease(["C5", "G5"], "16n");
  },

  openModal() {
    if (Tone.getContext().state !== 'running') return;
    const now = Tone.now();
    shimmerSynth.triggerAttackRelease("16n", now);
    hoverSynth.triggerAttackRelease("C5", "8n", now + 0.1);
  }
};
