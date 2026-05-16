// src/audio/layers/themeLayer.js
import * as Tone from 'tone';

// ─── FX CHAIN ─────────────────────────────────────────────────────────────────

const masterLimiter = new Tone.Limiter(-2);

const masterCompressor = new Tone.Compressor({
  threshold: -14,
  knee:       6,
  ratio:      4,
  attack:     0.003,
  release:    0.15,
}).connect(masterLimiter);

const hpFilter = new Tone.Filter({
  frequency: 60,
  type:      'highpass',
  rolloff:   -12,
}).connect(masterCompressor);

const spaceReverb = new Tone.Reverb({
  decay: 7,
  wet:   0.5,
}).connect(hpFilter);

const canyonDelay = new Tone.FeedbackDelay({
  delayTime: '8n.',
  feedback:   0.12,
  wet:        0.18,
}).connect(spaceReverb);

const dryReverb = new Tone.Reverb({
  decay: 1.5,
  wet:   0.22,
}).connect(hpFilter);

// Noise Swell for textural percussion
const noiseFilter = new Tone.Filter({
  frequency: 1200,
  type: 'lowpass',
  Q: 1
}).connect(dryReverb);

const noiseSwell = new Tone.NoiseSynth({
  noise: { type: 'pink' },
  envelope: { attack: 4, decay: 4, sustain: 0.1, release: 4 }
}).connect(noiseFilter);

// ─── INSTRUMENTS ──────────────────────────────────────────────────────────────

const steelString = new Tone.PolySynth(Tone.AMSynth, {
  harmonicity:        3.5,
  oscillator:         { type: 'triangle' },
  envelope:           { attack: 0.005, decay: 0.35, sustain: 0.08, release: 1.4 },
  modulation:         { type: 'square' },
  modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.4 },
}).connect(canyonDelay);

const slide = new Tone.MonoSynth({
  oscillator:      { type: 'sawtooth' },
  filter:          { Q: 3, type: 'lowpass', rolloff: -24 },
  filterEnvelope:  { attack: 0.06, decay: 0.5, sustain: 0.5, release: 2.5, baseFrequency: 280, octaves: 3.5 },
  envelope:        { attack: 0.1, decay: 0.6, sustain: 0.6, release: 3 },
  portamento:       0.18,
}).connect(canyonDelay);

const harmonica = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity:        2,
  modulationIndex:    4.5,
  oscillator:         { type: 'triangle' },
  envelope:           { attack: 0.09, decay: 0.25, sustain: 0.65, release: 1.8 },
  modulation:         { type: 'sawtooth' },
  modulationEnvelope: { attack: 0.12, decay: 0.2, sustain: 0.5, release: 1.2 },
}).connect(canyonDelay);

const cosmicPad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 8, decay: 1, sustain: 0.8, release: 10 },
  volume:     -16,
}).connect(spaceReverb);

const starArp = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.02, decay: 0.25, sustain: 0, release: 1.2 },
}).connect(spaceReverb);

const cyberArp = new Tone.MonoSynth({
  oscillator:    { type: 'pulse', width: 0.25 },
  filter:        { Q: 3, type: 'lowpass', frequency: 2800, rolloff: -24 },
  filterEnvelope:{ attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.2, baseFrequency: 900, octaves: 2.2 },
  envelope:      { attack: 0.002, decay: 0.1, sustain: 0.25, release: 0.3 },
  portamento:     0.012,
}).connect(canyonDelay);

const bass = new Tone.MonoSynth({
  oscillator:    { type: 'triangle' },
  filter:        { Q: 3, type: 'lowpass', rolloff: -24 },
  filterEnvelope:{ attack: 0.06, decay: 0.5, sustain: 0.3, release: 1.2, baseFrequency: 100, octaves: 2 },
  envelope:      { attack: 0.09, decay: 0.7, sustain: 0.25, release: 1.5 },
}).connect(dryReverb);

const subBass = new Tone.MonoSynth({
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.08, decay: 0.5, sustain: 0.1, release: 1.5 },
}).connect(hpFilter);

const kick = new Tone.MembraneSynth({
  pitchDecay: 0.07,
  octaves:    6,
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.001, decay: 0.45, sustain: 0.01, release: 0.4 },
}).connect(dryReverb);

const snare = new Tone.NoiseSynth({
  noise:    { type: 'white' },
  envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
}).connect(dryReverb);

const hat = new Tone.MetalSynth({
  frequency:       280,
  envelope:        { attack: 0.001, decay: 0.04, release: 0.01 },
  harmonicity:     3.1,
  modulationIndex: 14,
}).connect(dryReverb);

// ─── STATE ────────────────────────────────────────────────────────────────────
let progressions = [
  new Array(16).fill({ notes: ['G3', 'B3', 'D4'] })
];

let pentatonicHigh = [['G5', 'B5', 'D6'], ['A5', 'D6', 'E6'], ['G5', 'A5', 'D6', 'B5']];
let cyberNotes     = [['G4', 'B4', 'D5'], ['A4', 'E5', 'G5'], ['D5', 'G5', 'B5']];
let bassNotes      = ['G1', 'D1', 'C1', 'E1'];
let slideNotes     = ['B3', 'G3', 'A3', 'D4'];
let harmonicaNotes = ['D4', 'G4', 'B4', 'D5'];

let currentProgressionIndex = 0;
let sequences    = [];
let rotatorId    = null;
let mutationId   = null;
let started      = false;
let pendingSwap  = null;

// Generative State Tracking
let starMotifIndex = 0;
let starMotifStep  = 0;
let cyberMotifIndex = 0;
let cyberMotifStep  = 0;

const state = {
  urgency:          0,
  collaboration:    0,
  growth:           0,
  percussionActive: false,
  choirActive:      false,
  arpActive:        false,
  cyberActive:      false,
  melodyActive:     false,
  arpDensity:       0.3,
  cyberDensity:     0.4,
  bassIntensity:    0.4,
};

const getDrift = () => (Math.random() - 0.5) * 0.03;

// ─── THEME LAYER ─────────────────────────────────────────────────────────────
export const themeLayer = {
  initialize() {
    if (sequences.length > 0) return;

    Tone.Transport.bpm.value = 76;

    // 1. Steel String - Sparse 16-bar Narrative
    steelSeq = new Tone.Sequence(
      (time, event) => {
        if (!event?.notes || Math.random() > 0.6) return;
        const drift = getDrift();
        const vel = (0.2 + state.collaboration * 0.2) * (0.8 + Math.random() * 0.2);
        steelString.triggerAttackRelease(event.notes, '8n', time + drift, Math.min(vel, 0.4));
      },
      progressions[currentProgressionIndex],
      '1m'
    );

    // 2. Cosmic Pad - Continuous Atmospheric Ocean
    padSeq = new Tone.Sequence(
      (time, event) => {
        if (!event?.notes) return;
        const drift = getDrift();
        const padNotes = event.notes.map(n => Tone.Frequency(n).transpose(-12).toNote());

        const duration = Math.random() > 0.7 ? '8m' : '4m';
        const inversion = Math.random() > 0.5
          ? padNotes
          : [...padNotes.slice(1), padNotes[0]];

        cosmicPad.triggerAttackRelease(
          inversion,
          duration,
          time + drift,
          0.05 + Math.random() * 0.04
        );
      },
      progressions[currentProgressionIndex],
      '1m'
    );

    // 3. Slide Guitar - Sparse Response (Polymeter: 20)
    slideSeq = new Tone.Sequence(
      (time, note) => {
        if (state.melodyActive && note && Math.random() > 0.7) {
          const drift = getDrift();
          slide.triggerAttackRelease(note, '2m', time + drift, 0.25);
        }
      },
      new Array(20).fill(0).map((_, i) => slideNotes[i % slideNotes.length]),
      '2n'
    );

    // 4. Harmonica - Rare Accents (Polymeter: 12)
    harmonicaSeq = new Tone.Sequence(
      (time, note) => {
        if (state.choirActive && note && Math.random() > 0.8) {
          const drift = getDrift();
          harmonica.triggerAttackRelease([note], '2m', time + drift, 0.2);
        }
      },
      new Array(12).fill(0).map((_, i) => harmonicaNotes[i % harmonicaNotes.length]),
      '1n'
    );

    // 5. Stellar Arp - Generative Motif Mutation (Polymeter: 15)
    starArpSeq = new Tone.Sequence(
      (time) => {
        if (!state.arpActive) return;

        const motif = pentatonicHigh[starMotifIndex];
        const note = motif[starMotifStep];

        if (note && Math.random() > 0.4) {
          const drift = getDrift();
          starArp.triggerAttackRelease(note, '16n', time + drift, 0.1);
        }

        starMotifStep++;
        if (starMotifStep >= motif.length) {
          starMotifStep = 0;
          if (Math.random() > 0.55) {
            starMotifIndex = Math.floor(Math.random() * pentatonicHigh.length);
          }
        }
      },
      new Array(15).fill(0),
      '16n'
    );

    // 6. Cyber Arp - Generative Digital Pulse (Polymeter: 14)
    cyberArpSeq = new Tone.Sequence(
      (time) => {
        if (!state.cyberActive) return;

        const motif = cyberNotes[cyberMotifIndex];
        const note = motif[cyberMotifStep];

        if (note && Math.random() > 0.3) {
          const drift = getDrift();
          const vel = 0.1 + state.cyberDensity * 0.1;
          cyberArp.triggerAttackRelease(note, '16n', time + drift, vel);
        }

        cyberMotifStep++;
        if (cyberMotifStep >= motif.length) {
          cyberMotifStep = 0;
          if (Math.random() > 0.6) {
            cyberMotifIndex = Math.floor(Math.random() * cyberNotes.length);
          }
        }
      },
      new Array(14).fill(0),
      '16n'
    );

    // 7. Bass - Half-time, Humanized (Polymeter: 16)
    bassSeq = new Tone.Sequence(
      (time, note) => {
        if (state.bassIntensity > 0.2 && note && Math.random() > 0.3) {
          const drift = getDrift();
          bass.triggerAttackRelease(note, '2n', time + drift, 0.25 + state.bassIntensity * 0.1);
          if (state.bassIntensity > 0.7 && Math.random() > 0.5) {
            const clampedHz = Math.max(32.7, Tone.Frequency(note).toFrequency() / 2);
            subBass.triggerAttackRelease(clampedHz, '1m', time + drift, 0.3);
          }
        }
      },
      new Array(16).fill(0).map((_, i) => bassNotes[i % bassNotes.length]),
      '2n'
    );

    // 8. Percussion - Textural Dust (Polymeter: 11 for Hat)
    kickSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active && Math.random() > 0.5) {
          kick.triggerAttackRelease('G1', '8n', time + getDrift(), 0.22);
        }
      },
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      '8n'
    );

    snareSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active && Math.random() > 0.7) {
          snare.triggerAttackRelease('8n', time + getDrift(), 0.15);
        }
      },
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      '8n'
    );

    hatSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active && Math.random() > 0.8) {
          hat.triggerAttackRelease('32n', time + getDrift(), 0.1);
        }
      },
      new Array(11).fill(1),
      '16n'
    );

    // 9. Progression Rotator - 16m
    rotatorId = Tone.Transport.scheduleRepeat(() => {
      if (pendingSwap) {
        this._applySwap(pendingSwap);
        pendingSwap = null;
      }
      currentProgressionIndex = (currentProgressionIndex + 1) % progressions.length;
      steelSeq.events = progressions[currentProgressionIndex];
      padSeq.events   = progressions[currentProgressionIndex];
    }, '16m');

    // 10. Dynamic Mutation Scheduler - 8m
    mutationId = Tone.Transport.scheduleRepeat(() => {
      state.cyberDensity = 0.2 + Math.random() * 0.4;
      state.arpDensity = 0.1 + Math.random() * 0.3;

      canyonDelay.feedback.rampTo(0.05 + Math.random() * 0.15, 4);
      spaceReverb.wet.rampTo(0.3 + Math.random() * 0.3, 4);

      if (state.percussionActive && Math.random() > 0.6) {
        noiseSwell.triggerAttackRelease('4m', Tone.now(), 0.05);
      }
    }, '8m');

    sequences = [
      steelSeq, padSeq, slideSeq, harmonicaSeq,
      starArpSeq, cyberArpSeq, bassSeq,
      kickSeq, snareSeq, hatSeq,
    ];

    Tone.Transport.loop      = true;
    Tone.Transport.loopStart = '0:0:0';
    Tone.Transport.loopEnd   = '128m';
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
    if (mutationId !== null) {
      Tone.Transport.clear(mutationId);
      mutationId = null;
    }
    started = false;
  },

  connect(target) {
    masterLimiter.connect(target);
  },

  updateState(newState) {
    Object.assign(state, newState);
    this.applyState();
  },

  applyState() {
    const filterFreq = state.urgency > 0.5 ? 400 : 2200;
    bass.filter.frequency.rampTo(filterFreq, 2);

    const strVol = Tone.gainToDb(Math.max(0.05, state.growth * 0.5));
    steelString.volume.rampTo(strVol, 2);

    spaceReverb.wet.rampTo(0.2 + state.collaboration * 0.4, 2);
    canyonDelay.wet.rampTo(0.05 + state.collaboration * 0.2, 2);
  },

  setMood(moodConfig) {
    const {
      stringsVol       = -20,
      brassVol         = -26,
      bassVol          = -22,
      percVol          = -28,
      reverbWet        = 0.4,
      percussionActive = false,
      choirActive      = false,
      arpActive        = false,
      cyberActive      = false,
      melodyActive     = false,
      arpDensity       = 0.3,
      cyberDensity     = 0.4,
      bassIntensity    = 0.4,
      melodicMaterial  = null,
      transitionTime   = 4,
    } = moodConfig;

    steelString.volume.rampTo(stringsVol,     transitionTime);
    slide.volume.rampTo(stringsVol + 2,       transitionTime);
    harmonica.volume.rampTo(brassVol,         transitionTime);
    cosmicPad.volume.rampTo(stringsVol - 6,   transitionTime);
    starArp.volume.rampTo(stringsVol - 4,     transitionTime);
    cyberArp.volume.rampTo(stringsVol + 2,    transitionTime);
    bass.volume.rampTo(bassVol,               transitionTime);
    kick.volume.rampTo(percVol,               transitionTime);
    snare.volume.rampTo(percVol,              transitionTime);
    hat.volume.rampTo(percVol - 6,            transitionTime);
    spaceReverb.wet.rampTo(reverbWet,         transitionTime);

    state.percussionActive = percussionActive;
    state.choirActive      = choirActive;
    state.arpActive        = arpActive;
    state.cyberActive      = cyberActive;
    state.melodyActive     = melodyActive;
    state.arpDensity       = arpDensity;
    state.cyberDensity     = cyberDensity;
    state.bassIntensity    = bassIntensity;

    if (melodicMaterial) {
      pendingSwap = melodicMaterial;
    }
  },

  _applySwap(material) {
    const {
      progressions:    newProgs,
      pentatonicHigh:  newArp,
      cyberNotes:      newCyber,
      bassNotes:       newBass,
      slideNotes:      newSlide,
      harmonicaNotes:  newHarm,
    } = material;

    if (newProgs)  progressions    = newProgs;
    if (newArp)    pentatonicHigh  = newArp;
    if (newCyber)  cyberNotes      = newCyber;
    if (newBass)   bassNotes       = newBass;
    if (newSlide)  slideNotes      = newSlide;
    if (newHarm)   harmonicaNotes  = newHarm;

    if (!steelSeq) return;
    currentProgressionIndex = 0;

    // Reset generative counters on swap
    starMotifIndex = 0;
    starMotifStep = 0;
    cyberMotifIndex = 0;
    cyberMotifStep = 0;

    steelSeq.events    = progressions[currentProgressionIndex];
    padSeq.events      = progressions[currentProgressionIndex];

    // Arps and Lead instruments are now generative or mapped to polymeters,
    // so we just update their source material references.

    // Re-initialize polymeter sequences if lengths changed
    if (newSlide) {
      slideSeq.events = new Array(20).fill(0).map((_, i) => slideNotes[i % slideNotes.length]);
    }
    if (newHarm) {
      harmonicaSeq.events = new Array(12).fill(0).map((_, i) => harmonicaNotes[i % harmonicaNotes.length]);
    }
    if (newBass) {
      bassSeq.events = new Array(16).fill(0).map((_, i) => bassNotes[i % bassNotes.length]);
    }
  },

  swapMelody(material) {
    pendingSwap = material;
  },
};