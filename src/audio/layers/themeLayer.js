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
  portamento:       0.25, // increased for emotional bends
}).connect(canyonDelay);

const harmonica = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity:        2,
  modulationIndex:    4.5,
  oscillator:         { type: 'triangle' },
  envelope:           { attack: 0.12, decay: 0.25, sustain: 0.65, release: 1.8 }, // slightly slower attack
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

const machineSynth = new Tone.Synth({
  oscillator: { type: 'triangle' },
  envelope:   { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.8 },
}).connect(dryReverb);

// ─── UTILS ────────────────────────────────────────────────────────────────────
const getDrift = () => (Math.random() - 0.5) * 0.03;

function mutatePhrase(phrase, chance = 0.15) {
  if (!phrase) return null;
  return phrase.map(note => {
    if (!note || Math.random() > chance) return note;
    const interval = Math.random() > 0.5 ? 2 : -2;
    try {
      return Tone.Frequency(note).transpose(interval).toNote();
    } catch {
      return note;
    }
  });
}

function anchorToChord(note, chordNotes) {
  if (!note || !chordNotes || chordNotes.length === 0) return note;
  // 30% chance to anchor to a chord tone if it wasn't already
  if (Math.random() > 0.3) return note;
  return chordNotes[Math.floor(Math.random() * chordNotes.length)];
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let progressions = [
  new Array(16).fill({ notes: ['G3', 'B3', 'D4'] })
];

let melodicMaterial = {
  slideCells:     [['G4', null, 'A4', 'B4', 'D5', null, 'B4', 'A4']],
  harmonicaCells: [['D5', 'B4', 'A4', null]],
  starCells:      [['G5', 'B5', 'D6'], ['A5', 'D6', 'E6']],
  cyberCells:     [['G4', 'B4', 'D5', 'B4']],
  bassNotes:      ['G1', 'D1', 'C1', 'E1'],
};

let activeSlide = null;
let activeHarmonica = null;

let currentProgressionIndex = 0;
let phraseStep = 0; // 0, 1, 2, 3 for A-A'-B-A
let measureCounter = 0;

let sequences    = [];
let rotatorId    = null;
let mutationId   = null;
let conductorId  = null;
let started      = false;
let pendingSwap  = null;

let steelSeq, padSeq, slideSeq, harmonicaSeq, starArpSeq, cyberArpSeq, bassSeq,
    kickSeq, snareSeq, hatSeq, machineSeq;

let machineRoot = 'G3';

const state = {
  urgency:          0,
  collaboration:    0,
  growth:           0,
  percussionActive: false,
  choirActive:      false,
  arpActive:        false,
  cyberActive:      false,
  melodyActive:     false,
  machineActive:    true,
  arpDensity:       0.3,
  cyberDensity:     0.4,
  bassIntensity:    0.4,
};

// ─── THEME LAYER ─────────────────────────────────────────────────────────────
export const themeLayer = {
  initialize() {
    if (sequences.length > 0) return;

    Tone.Transport.bpm.value = 76;

    // 1. Steel String - Repetitive rhythmic anchor
    steelSeq = new Tone.Sequence(
      (time, event) => {
        if (!event?.notes) return;
        const drift = getDrift();
        const vel = (0.15 + state.collaboration * 0.15) * (0.8 + Math.random() * 0.2);
        steelString.triggerAttackRelease(event.notes, '16n', time + drift, Math.min(vel, 0.35));
      },
      progressions[currentProgressionIndex],
      '1m'
    );

    // 2. Cosmic Pad - Sustained harmonic glue
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

    // 3. Slide Guitar - Long emotional bends (Phrase A/B)
    slideSeq = new Tone.Sequence(
      (time, note) => {
        if (state.melodyActive && note) {
          const drift = getDrift();
          const chord = progressions[currentProgressionIndex][measureCounter % 16];
          const anchoredNote = anchorToChord(note, chord?.notes);
          slide.triggerAttackRelease(anchoredNote, '2n', time + drift, 0.22);
        }
      },
      new Array(8).fill(null), // Placeholder, updated by Conductor
      '2n'
    );

    // 4. Harmonica - Sparse answering phrases (Response)
    harmonicaSeq = new Tone.Sequence(
      (time, note) => {
        if (state.choirActive && note) {
          const drift = getDrift();
          const chord = progressions[currentProgressionIndex][measureCounter % 16];
          const anchoredNote = anchorToChord(note, chord?.notes);
          harmonica.triggerAttackRelease([anchoredNote], '2n', time + drift, 0.18);
        }
      },
      new Array(8).fill(null), // Placeholder, updated by Conductor
      '2n'
    );

    // 5. Stellar Arp - Embellishments
    starArpSeq = new Tone.Sequence(
      (time, note) => {
        if (state.arpActive && note && Math.random() < state.arpDensity) {
          const drift = getDrift();
          starArp.triggerAttackRelease(note, '16n', time + drift, 0.08);
        }
      },
      new Array(16).fill(null),
      '16n'
    );

    // 6. Cyber Arp - Repetitive hypnotic pulse
    cyberArpSeq = new Tone.Sequence(
      (time, note) => {
        if (state.cyberActive && note) {
          const drift = getDrift();
          const vel = 0.1 + state.cyberDensity * 0.08;
          cyberArp.triggerAttackRelease(note, '16n', time + drift, vel);
        }
      },
      new Array(16).fill(null),
      '16n'
    );

    // 7. Bass - Conservative grounding
    bassSeq = new Tone.Sequence(
      (time, note) => {
        if (state.bassIntensity > 0.2 && note) {
          const drift = getDrift();
          bass.triggerAttackRelease(note, '2n', time + drift, 0.22 + state.bassIntensity * 0.1);
          if (state.bassIntensity > 0.7 && Math.random() > 0.6) {
            const clampedHz = Math.max(32.7, Tone.Frequency(note).toFrequency() / 2);
            subBass.triggerAttackRelease(clampedHz, '1m', time + drift, 0.25);
          }
        }
      },
      melodicMaterial.bassNotes,
      '2n'
    );

    // 8. Percussion - Textural Dust
    kickSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active && Math.random() > 0.4) {
          kick.triggerAttackRelease('G1', '8n', time + getDrift(), 0.18);
        }
      },
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      '8n'
    );

    snareSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active && Math.random() > 0.6) {
          snare.triggerAttackRelease('8n', time + getDrift(), 0.12);
        }
      },
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      '8n'
    );

    hatSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active && Math.random() > 0.7) {
          hat.triggerAttackRelease('32n', time + getDrift(), 0.08);
        }
      },
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      '16n'
    );

    // 9. Progression Rotator & Counter
    rotatorId = Tone.Transport.scheduleRepeat(() => {
      measureCounter = (measureCounter + 1) % 128;

      if (measureCounter % 16 === 0) {
        if (pendingSwap) {
          this._applySwap(pendingSwap);
          pendingSwap = null;
        }
        currentProgressionIndex = (currentProgressionIndex + 1) % progressions.length;
        steelSeq.events = progressions[currentProgressionIndex];
        padSeq.events   = progressions[currentProgressionIndex];
      }
    }, '1m');

    // 10. The Conductor - Manages Call & Response and Phrase Evolution
    conductorId = Tone.Transport.scheduleRepeat(() => {
      const phraseIdx = Math.floor((measureCounter % 16) / 4); // 0,1,2,3 for A,A',B,A

      // Update Arp Motifs every 4 bars
      if (measureCounter % 4 === 0) {
        const starCell = melodicMaterial.starCells[measureCounter % melodicMaterial.starCells.length];
        starArpSeq.events = mutatePhrase(starCell, 0.1);

        const cyberCell = melodicMaterial.cyberCells[measureCounter % melodicMaterial.cyberCells.length];
        cyberArpSeq.events = mutatePhrase(cyberCell, 0.05);
      }

      // Call and Response Logic (8 bar cycles)
      if (measureCounter % 8 === 0) {
        // Bar 1-4: Slide plays
        activeSlide = melodicMaterial.slideCells[Math.floor(Math.random() * melodicMaterial.slideCells.length)];
        slideSeq.events = activeSlide;
        harmonicaSeq.events = new Array(8).fill(null);
      } else if (measureCounter % 8 === 4) {
        // Bar 5-8: Harmonica responds
        slideSeq.events = new Array(8).fill(null);
        const harmCell = melodicMaterial.harmonicaCells[Math.floor(Math.random() * melodicMaterial.harmonicaCells.length)];
        activeHarmonica = mutatePhrase(harmCell, 0.2); // slight variation in response
        harmonicaSeq.events = activeHarmonica;
      }

    }, '1m');

    // 11. Dynamic Mutation Scheduler - 16m
    mutationId = Tone.Transport.scheduleRepeat(() => {
      canyonDelay.feedback.rampTo(0.05 + Math.random() * 0.1, 8);
      spaceReverb.wet.rampTo(0.3 + Math.random() * 0.2, 8);

      if (state.percussionActive && Math.random() > 0.7) {
        noiseSwell.triggerAttackRelease('4m', Tone.now(), 0.04);
      }
    }, '16m');

    // 12. Machine Scale - Generative background pulse
    machineSeq = new Tone.Sequence(
      (time, noteIdx) => {
        if (!state.machineActive) return;

        const groupIdx = Math.floor(noteIdx / 4); // 0, 1, 2, 3
        const scaleIdx = noteIdx % 4; // 0, 1, 2, 3

        const scale = [0, 2, 4, 7]; // Ascending fragment
        const groupOffset = groupIdx * -2; // Down a step every 4 notes

        const totalOffset = groupOffset + scale[scaleIdx];
        const note = Tone.Frequency(machineRoot).transpose(totalOffset).toNote();

        const drift = getDrift();
        const vel = 0.04 + (state.urgency * 0.06);
        machineSynth.triggerAttackRelease(note, '16n', time + drift, vel);

        if (noteIdx === 15) {
          const roots = ['G3', 'C4', 'D4', 'A3', 'F3', 'Bb3'];
          machineRoot = roots[Math.floor(Math.random() * roots.length)];
        }
      },
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      '8n'
    );

    sequences = [
      steelSeq, padSeq, slideSeq, harmonicaSeq,
      starArpSeq, cyberArpSeq, bassSeq,
      kickSeq, snareSeq, hatSeq, machineSeq,
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
    if (rotatorId !== null) Tone.Transport.clear(rotatorId);
    if (mutationId !== null) Tone.Transport.clear(mutationId);
    if (conductorId !== null) Tone.Transport.clear(conductorId);
    rotatorId = null;
    mutationId = null;
    conductorId = null;
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

    const strVol = Tone.gainToDb(Math.max(0.05, state.growth * 0.4));
    steelString.volume.rampTo(strVol, 2);

    spaceReverb.wet.rampTo(0.2 + state.collaboration * 0.4, 2);
    canyonDelay.wet.rampTo(0.05 + state.collaboration * 0.2, 2);
  },

  setMood(moodConfig) {
    const {
      stringsVol       = -22,
      brassVol         = -26,
      bassVol          = -22,
      percVol          = -28,
      reverbWet        = 0.4,
      percussionActive = false,
      choirActive      = false,
      arpActive        = false,
      cyberActive      = false,
      melodyActive     = false,
      machineActive    = true,
      arpDensity       = 0.3,
      cyberDensity     = 0.4,
      bassIntensity    = 0.4,
      melodicMaterial  = null,
      transitionTime   = 4,
    } = moodConfig;

    steelString.volume.rampTo(stringsVol,     transitionTime);
    slide.volume.rampTo(stringsVol + 3,       transitionTime);
    harmonica.volume.rampTo(brassVol,         transitionTime);
    cosmicPad.volume.rampTo(stringsVol - 6,   transitionTime);
    starArp.volume.rampTo(stringsVol - 4,     transitionTime);
    cyberArp.volume.rampTo(stringsVol + 2,    transitionTime);
    machineSynth.volume.rampTo(stringsVol - 2, transitionTime);
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
    state.machineActive    = machineActive;
    state.arpDensity       = arpDensity;
    state.cyberDensity     = cyberDensity;
    state.bassIntensity    = bassIntensity;

    if (melodicMaterial) {
      pendingSwap = melodicMaterial;
    }
  },

  _applySwap(material) {
    if (material.progressions) progressions = material.progressions;
    melodicMaterial = { ...melodicMaterial, ...material };

    if (!steelSeq) return;
    currentProgressionIndex = 0;
    measureCounter = 0;

    steelSeq.events    = progressions[currentProgressionIndex];
    padSeq.events      = progressions[currentProgressionIndex];
    bassSeq.events     = melodicMaterial.bassNotes;
  },

  swapMelody(material) {
    pendingSwap = material;
  },
};