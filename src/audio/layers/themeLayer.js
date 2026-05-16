import * as Tone from "tone";

// GLOBAL EFFECTS
const limiter = new Tone.Limiter(-1).toDestination();

const reverb = new Tone.Reverb({
  decay: 8,
  wet: 0.45,
}).connect(limiter);

// INSTRUMENTS
const strings = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sawtooth" },
  envelope: { attack: 1.2, release: 4 }
}).connect(reverb);

const brass = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity: 1.5,
  modulationIndex: 3,
  envelope: { attack: 0.4, release: 2 }
}).connect(reverb);

const bass = new Tone.MonoSynth({
  oscillator: { type: "triangle" },
  filter: { Q: 2, type: "lowpass", rolloff: -24 },
  envelope: { attack: 0.1, release: 1.5 }
}).connect(reverb);

const kick = new Tone.MembraneSynth().connect(reverb);
const hat = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
}).connect(reverb);

// MUSICAL DATA
const chordProgression = [
  ["D3", "F3", "A3"],
  ["Bb2", "D3", "F3"],
  ["F3", "A3", "C4"],
  ["C3", "E3", "G3"]
];

const brassNotes = ["D4", null, "F4", "A4"];

const bassNotes = [
  "D2", "D2", "A1", "D2",
  "Bb1", "Bb1", "F1", "Bb1",
  "F1", "F1", "C2", "F1",
  "C2", "C2", "G1", "C2"
];

// SEQUENCES
let sequences = [];
let started = false;

const state = {
  urgency: 0,
  collaboration: 0,
  growth: 0,
  context: "normal"
};

const synthMap = {
  strings, brass, bass, kick, hat
};

export const themeLayer = {
  initialize() {
    if (sequences.length > 0) return;

    Tone.Transport.bpm.value = 88;

    const stringSeq = new Tone.Sequence((time, chord) => {
      strings.triggerAttackRelease(chord, "2n", time);
    }, chordProgression, "1m");

    const brassSeq = new Tone.Sequence((time, note) => {
      if (note) brass.triggerAttackRelease(note, "1n", time);
    }, brassNotes, "1m");

    const bassSeq = new Tone.Sequence((time, note) => {
      if (note) bass.triggerAttackRelease(note, "8n", time);
    }, bassNotes, "4n");

    const kickSeq = new Tone.Sequence((time) => {
      kick.triggerAttackRelease("D1", "8n", time);
    }, [0, 2, 4, 6], "4n");

    const hatSeq = new Tone.Sequence((time) => {
      hat.triggerAttackRelease("16n", time);
    }, [0, 1, 2, 3, 4, 5, 6, 7], "8n");

    sequences = [stringSeq, brassSeq, bassSeq, kickSeq, hatSeq];

    Tone.Transport.loop = true;
    Tone.Transport.loopStart = "0:0:0";
    Tone.Transport.loopEnd = "16m";
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
    started = false;
  },

  updateState(newState) {
    Object.assign(state, newState);
    this.applyState();
  },

  applyState() {
    // Urgency affects filters and percussion
    const lowpass = state.urgency > 0.5 ? 400 : 2000;
    bass.filter.frequency.rampTo(lowpass, 2);

    // Growth affects volume and complexity (simplified here as volume)
    const growthVol = Tone.gainToDb(Math.max(0.1, state.growth));
    strings.volume.rampTo(growthVol, 2);

    // Collaboration affects stereo width (simplified as reverb wet)
    reverb.wet.rampTo(0.3 + state.collaboration * 0.4, 2);
  },

  setContext(context) {
    state.context = context;
    console.log(`Setting audio context to: ${context}`);

    switch (context) {
      case "landing":
        this.setMood({
          stringsVol: 0,
          brassVol: -20,
          bassVol: -10,
          percVol: -30,
          reverbWet: 0.8
        });
        break;
      case "portfolio":
        this.setMood({
          stringsVol: -5,
          brassVol: -40,
          bassVol: -15,
          percVol: -40,
          reverbWet: 0.5
        });
        break;
      case "workspace":
        this.setMood({
          stringsVol: -10,
          brassVol: -10,
          bassVol: -5,
          percVol: -5,
          reverbWet: 0.3
        });
        break;
      case "crisis":
        this.setMood({
          stringsVol: -2,
          brassVol: -5,
          bassVol: 0,
          percVol: 0,
          reverbWet: 0.2
        });
        break;
      default:
        this.setMood({
          stringsVol: -5,
          brassVol: -15,
          bassVol: -10,
          percVol: -15,
          reverbWet: 0.45
        });
    }
  },

  setMood({ stringsVol, brassVol, bassVol, percVol, reverbWet }) {
    strings.volume.rampTo(stringsVol, 4);
    brass.volume.rampTo(brassVol, 4);
    bass.volume.rampTo(bassVol, 4);
    kick.volume.rampTo(percVol, 4);
    hat.volume.rampTo(percVol, 4);
    reverb.wet.rampTo(reverbWet, 4);
  }
};
