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
  envelope:           { attack: 0.1, decay: 0.6, sustain: 0.1, release: 2 },
  modulation:         { type: 'square' },
  modulationEnvelope: { attack: 0.05, decay: 0.3, sustain: 0, release: 0.8 },
}).connect(canyonDelay);

const slide = new Tone.MonoSynth({
  oscillator:      { type: 'sawtooth' },
  filter:          { Q: 2, type: 'lowpass', rolloff: -24 },
  filterEnvelope:  { attack: 0.2, decay: 0.8, sustain: 0.5, release: 4, baseFrequency: 200, octaves: 3 },
  envelope:        { attack: 0.4, decay: 1, sustain: 0.7, release: 5 },
  portamento:       0.4, // increased for more fluid, less gridlocked transitions
}).connect(canyonDelay);

const harmonica = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity:        1.5,
  modulationIndex:    3,
  oscillator:         { type: 'sine' },
  envelope:           { attack: 0.3, decay: 0.4, sustain: 0.6, release: 2.5 },
  modulation:         { type: 'triangle' },
  modulationEnvelope: { attack: 0.2, decay: 0.3, sustain: 0.4, release: 1.5 },
}).connect(canyonDelay);

const cosmicPad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 12, decay: 1, sustain: 0.8, release: 12 },
  volume:     -22,
}).connect(spaceReverb);

const starArp = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.02, decay: 0.25, sustain: 0, release: 1.2 },
}).connect(spaceReverb);

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

// ─── UTILS ────────────────────────────────────────────────────────────────────
const getDrift = () => (Math.random() - 0.5) * 0.03;

function mutatePhrase(phrase, chance = 0.15) {
  if (!phrase) return null;
  return phrase.map(item => {
    if (!item || Math.random() > chance) return item;

    // Handle both string notes and event objects
    const isObject = typeof item === 'object' && item.note;
    const note = isObject ? item.note : item;

    const interval = Math.random() > 0.5 ? 2 : -2;
    try {
      const newNote = Tone.Frequency(note).transpose(interval).toNote();
      return isObject ? { ...item, note: newNote } : newNote;
    } catch {
      return item;
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

let steelSeq, padSeq, slideSeq, harmonicaSeq, starArpSeq, bassSeq,
    kickSeq, snareSeq, hatSeq;

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

    // 1. Steel String - Rhythmic harmonic anchor
    steelSeq = new Tone.Sequence(
      (time, event) => {
        if (!event?.notes) return;
        const drift = getDrift();
        // Slightly higher velocity for better blend
        const vel = (0.12 + state.collaboration * 0.1) * (0.8 + Math.random() * 0.2);
        steelString.triggerAttackRelease(event.notes, '8n', time + drift, Math.min(vel, 0.25));
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

    // 3. Slide Guitar - Narrative phrasing engine
    slideSeq = new Tone.Sequence(
      (time, event) => {
        if (state.melodyActive && event?.note) {
          const drift = getDrift();
          // Use measureCounter to ensure we stay synced to the 16-bar harmonic narrative
          const progressionIdx = measureCounter % 16;
          const chord = progressions[currentProgressionIndex][progressionIdx];
          const anchoredNote = anchorToChord(event.note, chord?.notes);
          const dur = event.dur || '4n';
          const vel = (event.vel || 0.12) * (0.7 + Math.random() * 0.4);
          slide.triggerAttackRelease(anchoredNote, dur, time + drift, vel);
        }
      },
      new Array(32).fill(null),
      '8n'
    );

    // 4. Harmonica - Bluesy response engine
    harmonicaSeq = new Tone.Sequence(
      (time, event) => {
        if (state.choirActive && event?.note) {
          const drift = getDrift();
          const progressionIdx = measureCounter % 16;
          const chord = progressions[currentProgressionIndex][progressionIdx];
          const anchoredNote = anchorToChord(event.note, chord?.notes);
          const dur = event.dur || '4n';
          const vel = (event.vel || 0.1) * (0.7 + Math.random() * 0.4);
          harmonica.triggerAttackRelease([anchoredNote], dur, time + drift, vel);
        }
      },
      new Array(32).fill(null),
      '8n'
    );


    // 5. Stellar Arp - High generative stardust
    starArpSeq = new Tone.Sequence(
      (time) => {
        if (!state.arpActive || Math.random() > state.arpDensity) return;

        const chord = progressions[currentProgressionIndex][measureCounter % 16];
        const notes = chord?.notes || ['G4'];

        // Non-repeating random selection from chord tones + octaves
        const note = notes[Math.floor(Math.random() * notes.length)];
        const oct  = Math.random() > 0.6 ? 24 : 12;
        const target = Tone.Frequency(note).transpose(oct).toNote();

        const drift = getDrift();
        starArp.triggerAttackRelease(target, '16n', time + drift, 0.05 + Math.random() * 0.03);
      },
      new Array(16).fill(0),
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
      [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
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

    // 10. The Conductor - Manages Narrative Breathing (16 bar cycles)
    // Measures Lead-Silence-Response-Silence (4 bars each)
    conductorId = Tone.Transport.scheduleRepeat(() => {
      const pos = measureCounter % 16;

      if (pos === 0) {
        // Measures 1-4: Slide Narrative
        activeSlide = melodicMaterial.slideCells[Math.floor(Math.random() * melodicMaterial.slideCells.length)];
        slideSeq.events = activeSlide;
        harmonicaSeq.events = new Array(32).fill(null);
        console.log("Conductor: Slide Narrative (Measures 1-4)");
      }
      else if (pos === 4) {
        // Measures 5-8: ATMOSPHERIC SILENCE
        // User specifically wants the sound at measure 5 deleted.
        slideSeq.events = new Array(32).fill(null);
        harmonicaSeq.events = new Array(32).fill(null);
        console.log("Conductor: Breathing Silence (Measures 5-8)");
      }
      else if (pos === 8) {
        // Measures 9-12: Harmonica Response
        slideSeq.events = new Array(32).fill(null);
        activeHarmonica = melodicMaterial.harmonicaCells[Math.floor(Math.random() * melodicMaterial.harmonicaCells.length)];
        harmonicaSeq.events = activeHarmonica;
        console.log("Conductor: Harmonica Response (Measures 9-12)");
      }
      else if (pos === 12) {
        // Measures 13-16: ATMOSPHERIC SILENCE
        slideSeq.events = new Array(32).fill(null);
        harmonicaSeq.events = new Array(32).fill(null);
        console.log("Conductor: Breathing Silence (Measures 13-16)");
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

    sequences = [
      steelSeq, padSeq, slideSeq, harmonicaSeq,
      starArpSeq, bassSeq,
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
      stringsVol       = -18, // Restored blend
      brassVol         = -42, // Subdued Melody (Slide/Harmonica)
      bassVol          = -18, // Stronger foundation
      percVol          = -22, // Better presence
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
    slide.volume.rampTo(brassVol,             transitionTime);
    harmonica.volume.rampTo(brassVol - 4,     transitionTime);
    cosmicPad.volume.rampTo(stringsVol - 2,   transitionTime);
    starArp.volume.rampTo(stringsVol - 16,    transitionTime); // Very subtle stardust
    bass.volume.rampTo(bassVol,               transitionTime);
    kick.volume.rampTo(percVol,               transitionTime);
    snare.volume.rampTo(percVol,              transitionTime);
    hat.volume.rampTo(percVol - 8,            transitionTime);
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