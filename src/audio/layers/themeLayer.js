import * as Tone from "tone";

// GLOBAL EFFECTS
const limiter = new Tone.Limiter(-1);

const reverb = new Tone.Reverb({
  decay: 8,
  wet: 0.45,
}).connect(limiter);

// INSTRUMENTS
const strings = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "fatsawtooth",
    count: 4,
    spread: 30
  },
  envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 5 }
}).connect(reverb);

const brass = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity: 1.5,
  modulationIndex: 3,
  envelope: { attack: 0.4, release: 2 }
}).connect(reverb);

const choir = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: { attack: 2, release: 6 }
});
const choirFilter = new Tone.Filter(1200, "lowpass");
const choirVerb = new Tone.Reverb(8);
choir.connect(choirFilter);
choirFilter.connect(choirVerb);
choirVerb.connect(limiter);

const pad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 3, release: 5 }
}).connect(reverb);

const bass = new Tone.MonoSynth({
  oscillator: { type: "triangle" },
  filter: { Q: 2, type: "lowpass", rolloff: -24 },
  envelope: { attack: 0.1, release: 1.5 }
}).connect(reverb);

const subBass = new Tone.MonoSynth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.1, release: 2 }
}).connect(limiter);

const taiko = new Tone.MembraneSynth({
  pitchDecay: 0.08,
  octaves: 6,
  oscillator: { type: "sine" }
}).connect(reverb);

const pulseHat = new Tone.MetalSynth({
  frequency: 250,
  envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
  harmonicity: 5.1,
  modulationIndex: 32
}).connect(reverb);

const kick = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 4,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
}).connect(limiter);

const snare = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
}).connect(reverb);

const arp = new Tone.Synth({
  oscillator: { type: "square" },
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
}).connect(reverb);

const melody = new Tone.DuoSynth({
  voice0: { oscillator: { type: "triangle" } },
  voice1: { oscillator: { type: "sine" } }
}).connect(reverb);

// MUSICAL DATA
// Chords are wrapped in objects to prevent Tone.Sequence from subdividing them
const progressions = [
  [
    { notes: ["D3","F3","A3"] },
    { notes: ["Bb2","D3","F3"] },
    { notes: ["F3","A3","C4"] },
    { notes: ["C3","E3","G3"] }
  ],
  [
    { notes: ["D3","A3","C4"] },
    { notes: ["G2","Bb2","D3"] },
    { notes: ["Bb2","D3","F3"] },
    { notes: ["A2","C3","E3"] }
  ],
  [
    { notes: ["D3","F3","A3"] },
    { notes: ["F3","A3","C4"] },
    { notes: ["Bb2","D3","F3"] },
    { notes: ["A2","C3","E3"] }
  ]
];

let currentProgressionIndex = 0;

const bassNotes = [
  "D2", "D2", "A1", "D2",
  "Bb1", "Bb1", "F1", "Bb1",
  "F1", "F1", "C2", "F1",
  "C2", "C2", "G1", "C2"
];

// SEQUENCES
let sequences = [];
let rotatorId = null;
let started = false;

const state = {
  urgency: 0,
  collaboration: 0,
  growth: 0,
  context: "normal",
  percussionActive: false,
  choirActive: false,
  arpActive: false,
  melodyActive: false,
  arpDensity: 0.5,
  bassIntensity: 0.5
};

export const themeLayer = {
  initialize() {
    if (sequences.length > 0) return;

    Tone.Transport.bpm.value = 88;

    const stringSeq = new Tone.Sequence((time, event) => {
      if (event?.notes) strings.triggerAttackRelease(event.notes, "2n", time);
    }, progressions[currentProgressionIndex], "1m");

    const choirSeq = new Tone.Sequence((time, event) => {
      if (state.choirActive && event?.notes) {
        choir.triggerAttackRelease(event.notes.map(n => Tone.Frequency(n).transpose(12).toNote()), "1n", time);
      }
    }, progressions[currentProgressionIndex], "2m");

    const brassSeq = new Tone.Sequence((time, event) => {
      if (state.collaboration > 0.6 && event?.notes) {
         brass.triggerAttackRelease(event.notes[0], "1n", time);
      }
    }, progressions[currentProgressionIndex], "1m");

    const bassSeq = new Tone.Sequence((time, note) => {
      if (state.bassIntensity > 0.2 && note) {
        bass.triggerAttackRelease(note, "8n", time);
        if (state.bassIntensity > 0.7) subBass.triggerAttackRelease(Tone.Frequency(note).transpose(-12).toNote(), "4n", time);
      }
    }, bassNotes, "4n");

    const taikoSeq = new Tone.Sequence((time, event) => {
      if (state.percussionActive && event) taiko.triggerAttackRelease(event, "8n", time);
    }, ["D1", null, "A1", null, "D1", "A1", null, "E1"], "8n");

    const kickSeq = new Tone.Sequence((time, active) => {
      if (state.percussionActive && active) kick.triggerAttackRelease("D1", "8n", time);
    }, [1, 0, 0, 1, 1, 0, 0, 0], "8n");

    const snareSeq = new Tone.Sequence((time, active) => {
      if (state.percussionActive && active) snare.triggerAttackRelease("8n", time);
    }, [0, 0, 1, 0, 0, 0, 1, 0], "8n");

    const hatSeq = new Tone.Sequence((time, active) => {
      if (state.percussionActive && active) pulseHat.triggerAttackRelease("16n", time);
    }, [1, 1, 1, 1, 1, 1, 1, 1], "16n");

    const arpSeq = new Tone.Sequence((time, event) => {
      if (state.arpActive && event?.notes && Math.random() < state.arpDensity) {
        const note = event.notes[Math.floor(Math.random() * event.notes.length)];
        arp.triggerAttackRelease(Tone.Frequency(note).transpose(12).toNote(), "16n", time);
      }
    }, progressions[currentProgressionIndex], "8n");

    const melodySeq = new Tone.Sequence((time, event) => {
      if (state.melodyActive && event?.notes) {
         const note = event.notes[2] || event.notes[0];
         melody.triggerAttackRelease(Tone.Frequency(note).transpose(12).toNote(), "2n", time);
      }
    }, progressions[currentProgressionIndex], "2m");

    rotatorId = Tone.Transport.scheduleRepeat(() => {
      currentProgressionIndex = (currentProgressionIndex + 1) % progressions.length;
      const nextProg = progressions[currentProgressionIndex];
      stringSeq.events = nextProg;
      choirSeq.events = nextProg;
      brassSeq.events = nextProg;
      arpSeq.events = nextProg;
      melodySeq.events = nextProg;
    }, "16m");

    sequences = [stringSeq, choirSeq, brassSeq, bassSeq, taikoSeq, kickSeq, snareSeq, hatSeq, arpSeq, melodySeq];

    Tone.Transport.loop = true;
    Tone.Transport.loopStart = "0:0:0";
    Tone.Transport.loopEnd = "32m";
  },

  async start() {
    this.initialize();
    if (started) return;

    await Tone.start();
    sequences.forEach(seq => seq.start(0));
    Tone.Transport.start();
    started = true;
  },

  stop() {
    sequences.forEach(seq => seq.stop());
    if (rotatorId !== null) {
      Tone.Transport.clear(rotatorId);
      rotatorId = null;
    }
    started = false;
  },

  connect(target) {
    limiter.connect(target);
  },

  updateState(newState) {
    Object.assign(state, newState);
    this.applyState();
  },

  applyState() {
    const lowpass = state.urgency > 0.5 ? 400 : 2000;
    bass.filter.frequency.rampTo(lowpass, 2);

    const growthVol = Tone.gainToDb(Math.max(0.1, state.growth));
    strings.volume.rampTo(growthVol, 2);

    reverb.wet.rampTo(0.3 + state.collaboration * 0.4, 2);
  },

  setMood(moodConfig) {
    const {
      stringsVol = -12,
      brassVol = -22,
      bassVol = -18,
      percVol = -20,
      reverbWet = 0.45,
      percussionActive = false,
      choirActive = false,
      arpActive = false,
      melodyActive = false,
      arpDensity = 0.5,
      bassIntensity = 0.5
    } = moodConfig;

    strings.volume.rampTo(stringsVol, 4);
    brass.volume.rampTo(brassVol, 4);
    bass.volume.rampTo(bassVol, 4);
    taiko.volume.rampTo(percVol, 4);
    kick.volume.rampTo(percVol, 4);
    snare.volume.rampTo(percVol, 4);
    pulseHat.volume.rampTo(percVol + 6, 4);
    reverb.wet.rampTo(reverbWet, 4);

    state.percussionActive = percussionActive;
    state.choirActive = choirActive;
    state.arpActive = arpActive;
    state.melodyActive = melodyActive;
    state.arpDensity = arpDensity;
    state.bassIntensity = bassIntensity;
  }
};
