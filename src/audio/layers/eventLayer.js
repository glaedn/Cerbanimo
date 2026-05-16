import * as Tone from "tone";

const poly = new Tone.PolySynth().toDestination();

// Orchestral motifs for events
export const eventLayer = {
  taskAccepted({ impact_weight = 0.5 } = {}) {
    const velocity = 0.5 + impact_weight * 0.5;
    poly.triggerAttackRelease(["C4", "E4", "G4"], "8n", undefined, velocity);
  },

  taskSubmitted({ impact_weight = 0.5 } = {}) {
    // Blueprint: Ascending orchestral flourish
    poly.triggerAttackRelease(["D4", "F4", "A4", "D5"], "4n");
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
    // Shimmering choir/brass bloom
    const now = Tone.now();
    poly.triggerAttackRelease("D4", "4n", now);
    poly.triggerAttackRelease("F4", "4n", now + 0.1);
    poly.triggerAttackRelease("A4", "4n", now + 0.2);
    poly.triggerAttackRelease("D5", "2n", now + 0.3);
  },

  collaborationInvite() {
    // Hopeful suspended chord (Dsus2)
    poly.triggerAttackRelease(["D4", "E4", "A4"], "2n");
  },

  votePassed() {
    poly.triggerAttackRelease(["D4", "F#4", "A4", "D5"], "2n");
  },

  voteFailed() {
    poly.triggerAttackRelease(["D4", "F4", "Ab4"], "2n");
  }
};
