import * as Tone from "tone";

// SHARED FX BUSES
const uiReverb = new Tone.Reverb({
  decay: 4,
  wet: 0.4
});

const uiDelay = new Tone.FeedbackDelay({
  delayTime: "8n",
  feedback: 0.3,
  wet: 0.2
}).connect(uiReverb);

// PERSISTENT SYNTHS
const clickSynth = new Tone.MembraneSynth().connect(uiReverb);

// Tiny glass tick / digital pluck for hover
const hoverSynth = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
}).connect(uiDelay);

const confirmSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 }
}).connect(uiReverb);

const errorSynth = new Tone.MonoSynth({
  oscillator: { type: "square" },
  filter: { Q: 2, type: "lowpass", rolloff: -12 },
  envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 }
}).connect(uiReverb);

const messageSynth = new Tone.PolySynth(Tone.DuoSynth, {
  voice0: {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 1 }
  },
  voice1: {
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.5 }
  }
}).connect(uiReverb);

// Reverse shimmer for modal open
const shimmerSynth = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.1, decay: 0.2, sustain: 0.1, release: 0.3 }
}).connect(uiReverb);

const notificationSynth = new Tone.PolySynth(Tone.DuoSynth, {
  voice0: { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 } },
  voice1: { oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0, release: 0.2 } }
}).connect(uiDelay);

const toggleSynth = new Tone.Synth({
  oscillator: { type: "triangle" },
  envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
}).connect(uiReverb);

const slideSynth = new Tone.NoiseSynth({
  noise: { type: "brown" },
  envelope: { attack: 0.05, decay: 0.1, sustain: 0.05, release: 0.1 }
}).connect(new Tone.Filter(800, "lowpass").connect(uiReverb));

const dragSynth = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 2,
  oscillator: { type: "sine" }
}).connect(uiReverb);

export const uiLayer = {
  connect(target) {
    uiReverb.connect(target);
  },

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
  },

  closeModal() {
    if (Tone.getContext().state !== 'running') return;
    const now = Tone.now();
    hoverSynth.triggerAttackRelease("C5", "32n", now);
    hoverSynth.triggerAttackRelease("A4", "16n", now + 0.05);
  },

  tabSwitch() {
    if (Tone.getContext().state !== 'running') return;
    hoverSynth.triggerAttackRelease("E5", "32n");
  },

  dropdownOpen() {
    if (Tone.getContext().state !== 'running') return;
    hoverSynth.triggerAttackRelease("G4", "32n");
  },

  dropdownClose() {
    if (Tone.getContext().state !== 'running') return;
    hoverSynth.triggerAttackRelease("D4", "32n");
  },

  toggleOn() {
    if (Tone.getContext().state !== 'running') return;
    toggleSynth.triggerAttackRelease("C5", "32n");
    toggleSynth.triggerAttackRelease("E5", "32n", "+0.02");
  },

  toggleOff() {
    if (Tone.getContext().state !== 'running') return;
    toggleSynth.triggerAttackRelease("E5", "32n");
    toggleSynth.triggerAttackRelease("C4", "32n", "+0.02");
  },

  notificationArrive() {
    if (Tone.getContext().state !== 'running') return;
    notificationSynth.triggerAttackRelease(["G5", "D6"], "8n");
  },

  notificationDismiss() {
    if (Tone.getContext().state !== 'running') return;
    hoverSynth.triggerAttackRelease("G5", "32n");
  },

  filterApply() {
    if (Tone.getContext().state !== 'running') return;
    confirmSynth.triggerAttackRelease(["C4", "G4"], "16n");
  },

  listSelect() {
    if (Tone.getContext().state !== 'running') return;
    hoverSynth.triggerAttackRelease("A5", "32n");
  },

  sidebarOpen() {
    if (Tone.getContext().state !== 'running') return;
    slideSynth.triggerAttackRelease("120ms");
  },

  sidebarClose() {
    if (Tone.getContext().state !== 'running') return;
    slideSynth.triggerAttackRelease("100ms");
  },

  dragStart() {
    if (Tone.getContext().state !== 'running') return;
    dragSynth.triggerAttackRelease("A1", "32n");
  },

  dragDrop() {
    if (Tone.getContext().state !== 'running') return;
    dragSynth.triggerAttackRelease("D6", "32n");
    hoverSynth.triggerAttackRelease("D6", "16n", "+0.01");
  },

  copySuccess() {
    if (Tone.getContext().state !== 'running') return;
    confirmSynth.triggerAttackRelease(["C5", "E5", "G5"], "16n");
  },

  connectionOn() {
    if (Tone.getContext().state !== 'running') return;
    const now = Tone.now();
    notificationSynth.triggerAttackRelease("G4", "16n", now);
    notificationSynth.triggerAttackRelease("B4", "16n", now + 0.1);
    notificationSynth.triggerAttackRelease("D5", "16n", now + 0.2);
  },

  connectionLost() {
    if (Tone.getContext().state !== 'running') return;
    const now = Tone.now();
    notificationSynth.triggerAttackRelease("D5", "16n", now);
    notificationSynth.triggerAttackRelease("Bb4", "16n", now + 0.1);
    notificationSynth.triggerAttackRelease("G4", "16n", now + 0.2);
  }
};
