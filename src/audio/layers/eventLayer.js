import * as Tone from "tone";

const poly = new Tone.PolySynth().toDestination();

// Specialized Synths for Achievement Orchestration
const brassSwell = new Tone.PolySynth(Tone.FMSynth, {
  envelope: { attack: 0.5, decay: 0.5, sustain: 1, release: 2 }
}).toDestination();

const celestaSparkle = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 1 }
}).toDestination();

const subBassLift = new Tone.MonoSynth({
  oscillator: { type: "triangle" },
  envelope: { attack: 0.1, decay: 0.5, sustain: 0.8, release: 2 }
}).toDestination();

// Orchestral motifs for events
export const eventLayer = {
  taskAccepted({ impact_weight = 0.5 } = {}) {
    const velocity = 0.5 + impact_weight * 0.5;
    poly.triggerAttackRelease(["C4", "E4", "G4"], "8n", undefined, velocity);
  },

  taskSubmitted({ impact_weight = 0.5 } = {}) {
    // BIG moment: low drum hit + ascending flourish
    const now = Tone.now();
    subBassLift.triggerAttackRelease("D2", "4n", now);
    poly.triggerAttackRelease(["D4", "F4", "A4", "D5"], "4n", now + 0.1);
  },

  taskApproved({ impact_weight = 1.0 } = {}) {
    // Warm orchestral cadence
    poly.triggerAttackRelease(["E4", "G4", "B4", "E5"], "2n");
  },

  taskRejected({ impact_weight = 0.5 } = {}) {
    // Gentle descending motif
    poly.triggerAttackRelease(["G3", "Bb3", "D4"], "4n");
  },

  taskDropped({ impact_weight = 0.5 } = {}) {
      poly.triggerAttackRelease(["C3", "Eb3", "G3"], "8n");
  },

  taskCascade({ dependencies_unblocked = 1 } = {}) {
    for (let i = 0; i < dependencies_unblocked; i++) {
      setTimeout(() => {
        poly.triggerAttackRelease("C5", "16n");
      }, i * 120);
    }
  },

  guildSpike({ demand_level = 0.5 } = {}) {
    poly.triggerAttackRelease(["G4", "B4", "D5"], "2n", undefined, demand_level);
  },

  levelUp() {
    // Shimmering choir/brass bloom stack
    const now = Tone.now();

    // Sub bass grounding
    subBassLift.triggerAttackRelease("D1", "1n", now);

    // Brass swell
    brassSwell.triggerAttackRelease(["D3", "A3", "D4"], "1n", now);

    // Celesta sparkles
    const sparkles = ["D6", "F#6", "A6", "D7"];
    sparkles.forEach((note, i) => {
      celestaSparkle.triggerAttackRelease(note, "4n", now + i * 0.1);
    });

    // Main choir-like poly accent
    poly.triggerAttackRelease(["D4", "F#4", "A4", "D5"], "1n", now + 0.3);
  },

  collaborationInvite() {
    // Hopeful suspended chord (Dsus2)
    poly.triggerAttackRelease(["D4", "E4", "A4"], "2n");
  },

  votePassed() {
    // Ceremonial horn cadence
    const now = Tone.now();
    brassSwell.triggerAttackRelease(["D3", "F#3", "A3"], "2n", now);
    brassSwell.triggerAttackRelease(["D4", "F#4", "A4"], "2n", now + 0.2);
  },

  voteFailed() {
    poly.triggerAttackRelease(["D4", "F4", "Ab4"], "2n");
  }
};
