import * as Tone from "tone";

// ─── GLOBAL FX ────────────────────────────────────────────────────────────────

// The master limiter — keeps the frontier from going too loud
const masterLimiter = new Tone.Limiter(-1);

// Vast cosmic reverb — the endless void between star systems
const spaceReverb = new Tone.Reverb({
  decay: 14,
  wet: 0.55,
}).connect(masterLimiter);

// Canyon delay — slapback echo of calls across the open frontier
const canyonDelay = new Tone.FeedbackDelay({
  delayTime: "8n.",
  feedback: 0.22,
  wet: 0.2,
}).connect(spaceReverb);

// Short reverb for percussion — dry canyon walls
const dryReverb = new Tone.Reverb({
  decay: 1.8,
  wet: 0.25,
}).connect(masterLimiter);

// ─── INSTRUMENTS ──────────────────────────────────────────────────────────────

// Steel string / banjo pluck — twangy, percussive attack, quick decay
// AM modulation gives it that characteristic overtone snap
const steelString = new Tone.PolySynth(Tone.AMSynth, {
  harmonicity: 3.5,
  oscillator: { type: "triangle" },
  envelope: { attack: 0.005, decay: 0.35, sustain: 0.08, release: 1.4 },
  modulation: { type: "square" },
  modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.4 },
}).connect(canyonDelay);

// Slide guitar — portamento glide between chord tones, warm sawtooth
// The portamento is what makes it feel like a slide; notes bleed into each other
const slide = new Tone.MonoSynth({
  oscillator: { type: "sawtooth" },
  filter: { Q: 3, type: "lowpass", rolloff: -24 },
  filterEnvelope: {
    attack: 0.06,
    decay: 0.5,
    sustain: 0.5,
    release: 2.5,
    baseFrequency: 280,
    octaves: 3.5,
  },
  envelope: { attack: 0.1, decay: 0.6, sustain: 0.6, release: 3 },
  portamento: 0.18,
}).connect(canyonDelay);

// Space harmonica — FM synthesis approximating a reedy blues harp
// Replaces the choir; same on/off flag (choirActive), new voice
const harmonica = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity: 2,
  modulationIndex: 4.5,
  oscillator: { type: "triangle" },
  envelope: { attack: 0.09, decay: 0.25, sustain: 0.65, release: 1.8 },
  modulation: { type: "sawtooth" },
  modulationEnvelope: { attack: 0.12, decay: 0.2, sustain: 0.5, release: 1.2 },
}).connect(canyonDelay);

// Cosmic pad — the nebula wash underneath everything
// Very slow attack, sustains through chord changes, barely audible but felt
const cosmicPad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 5, decay: 1, sustain: 0.85, release: 10 },
}).connect(spaceReverb);

// Stellar arp — high pentatonic shimmer, like starlight catching on a spacesuit visor
// Replaces the old square-wave arp; much more ethereal
const starArp = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.02, decay: 0.25, sustain: 0, release: 1.2 },
}).connect(spaceReverb);

// Upright-ish bass — woody, resonant, a space cowboy's standup bass
const bass = new Tone.MonoSynth({
  oscillator: { type: "triangle" },
  filter: { Q: 3, type: "lowpass", rolloff: -24 },
  filterEnvelope: {
    attack: 0.06,
    decay: 0.5,
    sustain: 0.3,
    release: 1.2,
    baseFrequency: 100,
    octaves: 2,
  },
  envelope: { attack: 0.09, decay: 0.7, sustain: 0.25, release: 1.5 },
}).connect(dryReverb);

const subBass = new Tone.MonoSynth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.1, decay: 0.5, sustain: 0.1, release: 2 },
}).connect(masterLimiter);

// Kick — big, boomy, prairie thunder rolling across the dust
const kick = new Tone.MembraneSynth({
  pitchDecay: 0.09,
  octaves: 7,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.55, sustain: 0.01, release: 2 },
}).connect(masterLimiter);

// Snare — sparse rimshot crack, dry and present
const snare = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.001, decay: 0.17, sustain: 0 },
}).connect(dryReverb);

// Hi-hat — dusty, sparse ticks like boot spurs on a metal floor
const hat = new Tone.MetalSynth({
  frequency: 280,
  envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
  harmonicity: 3.1,
  modulationIndex: 14,
}).connect(dryReverb);

// ─── MUSICAL DATA ─────────────────────────────────────────────────────────────
// G major / G mixolydian — bright, open, heroic frontier
// The mixolydian b7 (F natural in G) gives that cosmic, slightly unresolved edge

const progressions = [
  // I - IV - V - I (classic western cadence — this is home base)
  [
    { notes: ["G3", "B3", "D4"] },
    { notes: ["C3", "E3", "G3"] },
    { notes: ["D3", "F#3", "A3"] },
    { notes: ["G3", "B3", "D4"] },
  ],
  // I - vi - IV - V (cinematic, building across the stars)
  [
    { notes: ["G3", "B3", "D4"] },
    { notes: ["E3", "G3", "B3"] },
    { notes: ["C3", "E3", "G3"] },
    { notes: ["D3", "F#3", "A3"] },
  ],
  // IV - I - ii - V (rolling, roaming, open road feel)
  [
    { notes: ["C3", "E3", "G3"] },
    { notes: ["G3", "B3", "D4"] },
    { notes: ["A2", "C3", "E3"] },
    { notes: ["D3", "F#3", "A3"] },
  ],
];

// G major pentatonic in high register for the stellar arp
// Sparse and random — not a melody, just light catching on things
const pentatonicHigh = [
  "G5", "A5", "B5", "D6", "E6", "G6",
  "B5", null, "D6", null, "E6", null,
  "G6", null, "A5", null,
];

// Walking bass — cowboy upright bass feel, thumbed not plucked
const bassNotes = [
  "G1", "G1", "D1", "G1",
  "C1", "C1", "G1", "C1",
  "D1", "D1", "A1", "D1",
  "E1", "E1", "B1", "E1",
];

// Slide guitar notes — 3rds and 5ths, meandering through the changes
// Portamento makes these feel like a physical slide on strings
const slideNotes = [
  "B3", "G3", "A3", "B3",
  "E4", "G3", "F#4", "D4",
  "G4", "E4", "B3", "D4",
  "A3", "G3", "F#3", "B3",
];

// Harmonica notes — G pentatonic, mid-register, slightly plaintive
const harmonicaNotes = [
  "D4", "G4", "B4", "D5",
  "G4", "B4", "D5", "G5",
  "E4", "G4", "A4", "B4",
  "D5", "B4", "A4", "G4",
];

// ─── STATE ────────────────────────────────────────────────────────────────────
let currentProgressionIndex = 0;
let sequences = [];
let rotatorId = null;
let started = false;

const state = {
  urgency: 0,
  collaboration: 0,
  growth: 0,
  context: "normal",
  percussionActive: false,
  choirActive: false,    // activates harmonica
  arpActive: false,      // activates stellar star arp
  melodyActive: false,   // activates slide guitar
  arpDensity: 0.4,
  bassIntensity: 0.5,
};

// ─── THEME LAYER ─────────────────────────────────────────────────────────────
export const themeLayer = {
  initialize() {
    if (sequences.length > 0) return;

    // 76 BPM — loping, unhurried
    // A space cowboy doesn't rush; the stars aren't going anywhere
    Tone.Transport.bpm.value = 76;

    // ── Steel string — boom-chick country picking pattern
    // Plays on every half note; the backbone of the cowboy groove
    const steelSeq = new Tone.Sequence(
      (time, event) => {
        if (event?.notes) {
          steelString.triggerAttackRelease(
            event.notes,
            "16n",
            time,
            0.55 + state.collaboration * 0.35
          );
        }
      },
      progressions[currentProgressionIndex],
      "2n"
    );

    // ── Cosmic pad — nebula wash, barely audible, always felt
    // Plays every 2 bars, octave below the chord
    const padSeq = new Tone.Sequence(
      (time, event) => {
        if (event?.notes) {
          const padNotes = event.notes.map((n) =>
            Tone.Frequency(n).transpose(-12).toNote()
          );
          cosmicPad.triggerAttackRelease(padNotes, "4m", time, 0.35);
        }
      },
      progressions[currentProgressionIndex],
      "2m"
    );

    // ── Slide guitar — portamento melody, wandering and expressive
    const slideSeq = new Tone.Sequence(
      (time, note) => {
        if (state.melodyActive && note) {
          slide.triggerAttackRelease(note, "4n.", time, 0.65);
        }
      },
      slideNotes,
      "4n"
    );

    // ── Space harmonica — plaintive, reedy, calls to the horizon
    const harmonicaSeq = new Tone.Sequence(
      (time, note) => {
        if (state.choirActive && note) {
          harmonica.triggerAttackRelease([note], "4n.", time, 0.6);
        }
      },
      harmonicaNotes,
      "4n"
    );

    // ── Stellar arp — sparse, random starfield shimmer
    // Never plays every note — randomized by arpDensity for a natural twinkle
    const starArpSeq = new Tone.Sequence(
      (time, note) => {
        if (state.arpActive && note && Math.random() < state.arpDensity) {
          starArp.triggerAttackRelease(note, "32n", time, 0.3);
        }
      },
      pentatonicHigh,
      "8n"
    );

    // ── Bass — upright walking feel, thumbed pluck
    const bassSeq = new Tone.Sequence(
      (time, note) => {
        if (state.bassIntensity > 0.2 && note) {
          bass.triggerAttackRelease(
            note,
            "8n.",
            time,
            0.65 + state.bassIntensity * 0.25
          );
          if (state.bassIntensity > 0.7) {
            subBass.triggerAttackRelease(
              Tone.Frequency(note).transpose(-12).toNote(),
              "4n",
              time
            );
          }
        }
      },
      bassNotes,
      "4n"
    );

    // ── Kick — sparse and boomy, beats 1 and 3 only
    // Cowboys stomp once, they don't shuffle
    const kickSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active) {
          kick.triggerAttackRelease("G1", "8n", time, 0.8);
        }
      },
      [1, 0, 0, 0, 1, 0, 0, 0],
      "8n"
    );

    // ── Snare — rimshot on 2 and 4, dry and cracking
    const snareSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active) {
          snare.triggerAttackRelease("8n", time, 0.5);
        }
      },
      [0, 0, 1, 0, 0, 0, 1, 0],
      "8n"
    );

    // ── Hat — sparse, dusty, like spurs on the deck of a starship
    const hatSeq = new Tone.Sequence(
      (time, active) => {
        if (state.percussionActive && active && Math.random() > 0.4) {
          hat.triggerAttackRelease("32n", time, 0.25);
        }
      },
      [1, 0, 1, 0, 1, 0, 1, 0],
      "8n"
    );

    // ── Progression rotator — every 16 bars, the landscape shifts
    rotatorId = Tone.Transport.scheduleRepeat(() => {
      currentProgressionIndex = (currentProgressionIndex + 1) % progressions.length;
      const nextProg = progressions[currentProgressionIndex];
      steelSeq.events = nextProg;
      padSeq.events = nextProg;
    }, "16m");

    sequences = [
      steelSeq,
      padSeq,
      slideSeq,
      harmonicaSeq,
      starArpSeq,
      bassSeq,
      kickSeq,
      snareSeq,
      hatSeq,
    ];

    Tone.Transport.loop = true;
    Tone.Transport.loopStart = "0:0:0";
    Tone.Transport.loopEnd = "32m";
  },

  async start() {
    this.initialize();
    if (started) return;
    await Tone.start();
    sequences.forEach((seq) => seq.start(0));
    Tone.Transport.start();
    started = true;
  },

  stop() {
    sequences.forEach((seq) => seq.stop());
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
    // Urgency: filter the bass down — tension closes in like a sandstorm
    const filterFreq = state.urgency > 0.5 ? 250 : 1600;
    bass.filter.frequency.rampTo(filterFreq, 2);

    // Growth: open up the steel string — the frontier expands with you
    const strVol = Tone.gainToDb(Math.max(0.1, state.growth));
    steelString.volume.rampTo(strVol, 2);

    // Collaboration: more reverb — when you ride together, the sound carries further
    spaceReverb.wet.rampTo(0.4 + state.collaboration * 0.35, 2);
    canyonDelay.wet.rampTo(0.12 + state.collaboration * 0.22, 2);
  },

  setMood(moodConfig) {
    const {
      stringsVol = -12,      // steel string / slide volume
      brassVol = -24,        // harmonica volume (was brass)
      bassVol = -16,
      percVol = -18,
      reverbWet = 0.55,
      percussionActive = false,
      choirActive = false,   // harmonica on/off
      arpActive = false,     // star arp on/off
      melodyActive = false,  // slide on/off
      arpDensity = 0.4,
      bassIntensity = 0.5,
    } = moodConfig;

    steelString.volume.rampTo(stringsVol, 4);
    slide.volume.rampTo(stringsVol + 2, 4);
    harmonica.volume.rampTo(brassVol, 4);
    cosmicPad.volume.rampTo(stringsVol - 8, 4);
    starArp.volume.rampTo(stringsVol - 2, 4);
    bass.volume.rampTo(bassVol, 4);
    kick.volume.rampTo(percVol, 4);
    snare.volume.rampTo(percVol, 4);
    hat.volume.rampTo(percVol - 8, 4);
    spaceReverb.wet.rampTo(reverbWet, 4);

    state.percussionActive = percussionActive;
    state.choirActive = choirActive;
    state.arpActive = arpActive;
    state.melodyActive = melodyActive;
    state.arpDensity = arpDensity;
    state.bassIntensity = bassIntensity;
  },
};