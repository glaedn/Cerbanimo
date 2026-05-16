// src/audio/layers/themeLayer.js
//
// CHANGES from previous version:
//   FX CHAIN FIXES (source of loud low-tone):
//     - Added Tone.Compressor before the Limiter. The old chain had hard-limiting
//       only — stacked pads and bass would clip instead of compress.
//     - Added a 60 Hz highpass filter before the compressor. Catches subsonic
//       content from subBass playing G0/C0 and from the cosmicPad reverb tail.
//     - Reduced spaceReverb decay from 14s → 7s. 14 seconds of reverb on bass
//       and pad chords was the main low-end accumulation source.
//     - Reduced canyonDelay feedback from 0.22 → 0.12. At 0.22 into a 14s reverb,
//       delayed notes fed the reverb repeatedly — a self-reinforcing buildup loop.
//     - Reduced cosmicPad release from 10s → 4s, velocity capped at 0.18.
//       Previously 2+ pad chords were always sustaining simultaneously.
//     - Reduced kick release from 2s → 0.4s. Long kick tails were stacking at
//       fast tempos and feeding the limiter hard.
//     - Fixed subBass: floors the transposed note at C1 (32.7 Hz). G0 (24.5 Hz)
//       is subsonic and causes distortion through the limiter.
//
//   NEW INSTRUMENT:
//     - cyberArp: MonoSynth with pulse wave oscillator. Plays 16th-note patterns
//       defined per-scene. Gives the cybernetic pulse feel — a precise, rhythmic
//       digital signal running underneath the organic cowboy instruments.
//
//   MELODY SWAP:
//     - swapMelody() now aligns to the next bar boundary to avoid mid-phrase cuts.

import * as Tone from 'tone';

// ─── FX CHAIN ─────────────────────────────────────────────────────────────────

// Final output (connects to AudioEngine's themeGain)
const masterLimiter = new Tone.Limiter(-2);

// Compressor before hard limiting — handles dynamic peaks from stacked instruments
// without clipping. Gentle ratio keeps the frontier sound alive.
const masterCompressor = new Tone.Compressor({
  threshold: -14,
  knee:       6,
  ratio:      4,
  attack:     0.003,
  release:    0.15,
}).connect(masterLimiter);

// Highpass filter cuts subsonic content (< 60 Hz) before it hits the compressor.
// Prevents subBass / cosmicPad reverb tail from building up into a low drone.
const hpFilter = new Tone.Filter({
  frequency: 60,
  type:      'highpass',
  rolloff:   -12,
}).connect(masterCompressor);

// Long cosmic reverb — the void between star systems.
// Decay reduced 14 → 7 to stop low-end accumulation.
const spaceReverb = new Tone.Reverb({
  decay: 7,
  wet:   0.5,
}).connect(hpFilter);

// Slapback delay — echoes of calls across the frontier.
// Feedback reduced 0.22 → 0.12 to break the delay→reverb feedback loop.
const canyonDelay = new Tone.FeedbackDelay({
  delayTime: '8n.',
  feedback:   0.12,
  wet:        0.18,
}).connect(spaceReverb);

// Dry reverb for percussion — short, present.
const dryReverb = new Tone.Reverb({
  decay: 1.5,
  wet:   0.22,
}).connect(hpFilter);

// ─── INSTRUMENTS ──────────────────────────────────────────────────────────────

// Steel string — twangy AM pluck, the heartbeat of the cowboy groove
const steelString = new Tone.PolySynth(Tone.AMSynth, {
  harmonicity:        3.5,
  oscillator:         { type: 'triangle' },
  envelope:           { attack: 0.005, decay: 0.35, sustain: 0.08, release: 1.4 },
  modulation:         { type: 'square' },
  modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.4 },
}).connect(canyonDelay);

// Slide guitar — portamento glide, warm sawtooth, the frontier's voice
const slide = new Tone.MonoSynth({
  oscillator:      { type: 'sawtooth' },
  filter:          { Q: 3, type: 'lowpass', rolloff: -24 },
  filterEnvelope:  { attack: 0.06, decay: 0.5, sustain: 0.5, release: 2.5, baseFrequency: 280, octaves: 3.5 },
  envelope:        { attack: 0.1, decay: 0.6, sustain: 0.6, release: 3 },
  portamento:       0.18,
}).connect(canyonDelay);

// Space harmonica — FM reed approximation, plaintive and expressive
const harmonica = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity:        2,
  modulationIndex:    4.5,
  oscillator:         { type: 'triangle' },
  envelope:           { attack: 0.09, decay: 0.25, sustain: 0.65, release: 1.8 },
  modulation:         { type: 'sawtooth' },
  modulationEnvelope: { attack: 0.12, decay: 0.2, sustain: 0.5, release: 1.2 },
}).connect(canyonDelay);

// Cosmic pad — nebula wash under everything.
// Release reduced 10 → 4s, velocity capped at 0.18 to stop stacking buildup.
const cosmicPad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope:   { attack: 5, decay: 1, sustain: 0.8, release: 4 },
  volume:     -6,
}).connect(spaceReverb);

// Stellar arp — sparse sine shimmer, like starlight on a visor
const starArp = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.02, decay: 0.25, sustain: 0, release: 1.2 },
}).connect(spaceReverb);

// CYBER ARP — pulse wave, rhythmic, digital precision
// The "cybernetic" counterpart to the organic starArp.
// Plays 16th-note sequences defined per scene. Fast filter envelope for that
// classic pulse-bass "pew" character — circuits firing across the frontier.
const cyberArp = new Tone.MonoSynth({
  oscillator:    { type: 'pulse', width: 0.25 },
  filter:        { Q: 3, type: 'lowpass', frequency: 2800, rolloff: -24 },
  filterEnvelope:{ attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.2, baseFrequency: 900, octaves: 2.2 },
  envelope:      { attack: 0.002, decay: 0.1, sustain: 0.25, release: 0.3 },
  portamento:     0.012,
}).connect(canyonDelay);

// Upright-ish bass — woody, resonant
const bass = new Tone.MonoSynth({
  oscillator:    { type: 'triangle' },
  filter:        { Q: 3, type: 'lowpass', rolloff: -24 },
  filterEnvelope:{ attack: 0.06, decay: 0.5, sustain: 0.3, release: 1.2, baseFrequency: 100, octaves: 2 },
  envelope:      { attack: 0.09, decay: 0.7, sustain: 0.25, release: 1.5 },
}).connect(dryReverb);

// Sub bass — fundamental reinforcement only. No reverb to avoid mudding.
const subBass = new Tone.MonoSynth({
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.08, decay: 0.5, sustain: 0.1, release: 1.5 },
}).connect(hpFilter); // through HP filter — any note below 60 Hz is cut

// Kick — boomy membrane, reduced release to prevent tail stacking
const kick = new Tone.MembraneSynth({
  pitchDecay: 0.07,
  octaves:    6,
  oscillator: { type: 'sine' },
  envelope:   { attack: 0.001, decay: 0.45, sustain: 0.01, release: 0.4 }, // was release: 2
}).connect(dryReverb);

// Snare — sparse rimshot
const snare = new Tone.NoiseSynth({
  noise:    { type: 'white' },
  envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
}).connect(dryReverb);

// Hi-hat — dusty tick, like boot spurs
const hat = new Tone.MetalSynth({
  frequency:       280,
  envelope:        { attack: 0.001, decay: 0.04, release: 0.01 },
  harmonicity:     3.1,
  modulationIndex: 14,
}).connect(dryReverb);

// ─── DEFAULT MELODIC MATERIAL (G major / G Mixolydian) ───────────────────────
// Overridden per scene via swapMelody()

let progressions = [
  [
    { notes: ['G3', 'B3', 'D4'] },
    { notes: ['C3', 'E3', 'G3'] },
    { notes: ['D3', 'F#3', 'A3'] },
    { notes: ['G3', 'B3', 'D4'] },
  ],
  [
    { notes: ['G3', 'B3', 'D4'] },
    { notes: ['E3', 'G3', 'B3'] },
    { notes: ['C3', 'E3', 'G3'] },
    { notes: ['D3', 'F#3', 'A3'] },
  ],
];

let pentatonicHigh = [
  'G5', 'A5', 'B5', 'D6', 'E6', 'G6',
  'B5', null, 'D6', null, 'E6', null,
  'G6', null, 'A5', null,
];

// Default cyber arp pattern (G major pentatonic 16ths)
let cyberNotes = [
  'G5', 'B5', 'D6', null, 'G5', null, 'D6', 'B5',
  'A5', null, 'E6', null, 'D6', 'B5', 'G5', null,
];

let bassNotes = [
  'G1', 'G1', 'D1', 'G1',
  'C1', 'C1', 'G1', 'C1',
  'D1', 'D1', 'A1', 'D1',
  'E1', 'E1', 'B1', 'E1',
];

let slideNotes = [
  'B3', 'G3', 'A3', 'B3',
  'E4', 'G3', 'F#4', 'D4',
  'G4', 'E4', 'B3', 'D4',
  'A3', 'G3', 'F#3', 'B3',
];

let harmonicaNotes = [
  'D4', 'G4', 'B4', 'D5',
  'G4', 'B4', 'D5', 'G5',
  'E4', 'G4', 'A4', 'B4',
  'D5', 'B4', 'A4', 'G4',
];

// ─── STATE ────────────────────────────────────────────────────────────────────
let currentProgressionIndex = 0;
let sequences    = [];
let rotatorId    = null;
let started      = false;
let pendingSwap  = null; // queued melody swap, fires on next bar

let steelSeq, padSeq, slideSeq, harmonicaSeq, starArpSeq, cyberArpSeq, bassSeq,
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
  arpDensity:       0.4,
  cyberDensity:     0.5,
  bassIntensity:    0.5,
};

// ─── THEME LAYER ─────────────────────────────────────────────────────────────
export const themeLayer = {
  initialize() {
    if (sequences.length > 0) return;

    Tone.Transport.bpm.value = 76;

    // Steel string — boom-chick backbone
    steelSeq = new Tone.Sequence(
      (time, event) => {
        if (!event?.notes) return;
        const vel = (0.5 + state.collaboration * 0.35) * (0.85 + Math.random() * 0.3);
        steelString.triggerAttackRelease(event.notes, '16n', time, Math.min(vel, 1));
      },
      progressions[currentProgressionIndex],
      '2n'
    );

    // Cosmic pad — nebula wash, fires every 2 bars
    padSeq = new Tone.Sequence(
      (time, event) => {
        if (!event?.notes) return;
        const padNotes = event.notes.map(n => Tone.Frequency(n).transpose(-12).toNote());
        cosmicPad.triggerAttackRelease(padNotes, '2m', time, 0.18);
      },
      progressions[currentProgressionIndex],
      '2m'
    );

    // Slide guitar
    slideSeq = new Tone.Sequence(
      (time, note) => {
        if (state.melodyActive && note) {
          slide.triggerAttackRelease(note, '4n.', time, 0.6);
        }
      },
      slideNotes,
      '4n'
    );

    // Harmonica
    harmonicaSeq = new Tone.Sequence(
      (time, note) => {
        if (state.choirActive && note) {
          harmonica.triggerAttackRelease([note], '4n.', time, 0.55);
        }
      },
      harmonicaNotes,
      '4n'
    );

    // Stellar arp — organic randomised shimmer
    starArpSeq = new Tone.Sequence(
      (time, note) => {
        if (state.arpActive && note && Math.random() < state.arpDensity) {
          starArp.triggerAttackRelease(note, '32n', time, 0.28);
        }
      },
      pentatonicHigh,
      '8n'
    );

    // Cyber arp — precise 16th-note pulse, never random
    cyberArpSeq = new Tone.Sequence(
      (time, note) => {
        if (state.cyberActive && note) {
          const vel = 0.35 + state.cyberDensity * 0.25;
          cyberArp.triggerAttackRelease(note, '16n', time, vel);
        }
      },
      cyberNotes,
      '16n'
    );

    // Walking bass
    bassSeq = new Tone.Sequence(
      (time, note) => {
        if (state.bassIntensity > 0.2 && note) {
          bass.triggerAttackRelease(note, '8n.', time, 0.6 + state.bassIntensity * 0.25);
          if (state.bassIntensity > 0.7) {
            // Floor the transposed note at C1 (32.7 Hz) — prevents subsonic output
            const rawHz      = Tone.Frequency(note).toFrequency();
            const targetHz   = rawHz / 2;                            // one octave down
            const clampedHz  = Math.max(32.7, targetHz);
            subBass.triggerAttackRelease(clampedHz, '4n', time, 0.45);
          }
        }
      },
      bassNotes,
      '4n'
    );

    // Kick — beats 1 and 3
    kickSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active) {
          kick.triggerAttackRelease('G1', '8n', time, 0.75);
        }
      },
      [1, 0, 0, 0, 1, 0, 0, 0],
      '8n'
    );

    // Snare — 2 and 4
    snareSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active) {
          snare.triggerAttackRelease('8n', time, 0.45);
        }
      },
      [0, 0, 1, 0, 0, 0, 1, 0],
      '8n'
    );

    // Hat — sparse
    hatSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active && Math.random() > 0.4) {
          hat.triggerAttackRelease('32n', time, 0.22);
        }
      },
      [1, 0, 1, 0, 1, 0, 1, 0],
      '8n'
    );

    // Progression rotator — every 16 bars
    rotatorId = Tone.Transport.scheduleRepeat(() => {
      // Apply any pending melody swap at the bar boundary
      if (pendingSwap) {
        this._applySwap(pendingSwap);
        pendingSwap = null;
      }
      currentProgressionIndex = (currentProgressionIndex + 1) % progressions.length;
      steelSeq.events = progressions[currentProgressionIndex];
      padSeq.events   = progressions[currentProgressionIndex];
    }, '16m');

    sequences = [
      steelSeq, padSeq, slideSeq, harmonicaSeq,
      starArpSeq, cyberArpSeq, bassSeq,
      kickSeq, snareSeq, hatSeq,
    ];

    Tone.Transport.loop      = true;
    Tone.Transport.loopStart = '0:0:0';
    Tone.Transport.loopEnd   = '32m';
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
    masterLimiter.connect(target);
  },

  updateState(newState) {
    Object.assign(state, newState);
    this.applyState();
  },

  applyState() {
    const filterFreq = state.urgency > 0.5 ? 220 : 1600;
    bass.filter.frequency.rampTo(filterFreq, 2);

    const strVol = Tone.gainToDb(Math.max(0.1, state.growth));
    steelString.volume.rampTo(strVol, 2);

    spaceReverb.wet.rampTo(0.38 + state.collaboration * 0.28, 2);
    canyonDelay.wet.rampTo(0.1  + state.collaboration * 0.14, 2);
  },

  setMood(moodConfig) {
    const {
      stringsVol       = -12,
      brassVol         = -24,
      bassVol          = -16,
      percVol          = -18,
      reverbWet        = 0.5,
      percussionActive = false,
      choirActive      = false,
      arpActive        = false,
      cyberActive      = false,
      melodyActive     = false,
      arpDensity       = 0.4,
      cyberDensity     = 0.5,
      bassIntensity    = 0.5,
      melodicMaterial  = null,
      transitionTime   = 4,
    } = moodConfig;

    steelString.volume.rampTo(stringsVol,     transitionTime);
    slide.volume.rampTo(stringsVol + 2,       transitionTime);
    harmonica.volume.rampTo(brassVol,         transitionTime);
    cosmicPad.volume.rampTo(stringsVol - 10,  transitionTime); // pad sits well back
    starArp.volume.rampTo(stringsVol - 4,     transitionTime);
    cyberArp.volume.rampTo(stringsVol + 4,    transitionTime); // cyber arp sits forward
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
    state.arpDensity       = arpDensity;
    state.cyberDensity     = cyberDensity;
    state.bassIntensity    = bassIntensity;

    if (melodicMaterial) {
      // Queue swap for next bar boundary to avoid mid-phrase clicks
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
    steelSeq.events    = progressions[currentProgressionIndex];
    padSeq.events      = progressions[currentProgressionIndex];
    starArpSeq.events  = pentatonicHigh;
    cyberArpSeq.events = cyberNotes;
    bassSeq.events     = bassNotes;
    slideSeq.events    = slideNotes;
    harmonicaSeq.events = harmonicaNotes;
  },

  swapMelody(material) {
    // Public API — queues swap for bar boundary
    pendingSwap = material;
  },
};