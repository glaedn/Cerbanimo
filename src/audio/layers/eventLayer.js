import * as Tone from "tone";

const poly = new Tone.PolySynth().toDestination();

export const eventLayer = {
  taskAccepted({ impact_weight = 0.5 } = {}) {
    const velocity = 0.5 + impact_weight * 0.5;
    poly.triggerAttackRelease(["C4", "E4", "G4"], "8n", undefined, velocity);
  },

  taskSubmitted({ impact_weight = 0.5 } = {}) {
    poly.triggerAttackRelease(["D4", "F4", "A4"], "4n");
  },

  taskApproved({ impact_weight = 1.0 } = {}) {
    poly.triggerAttackRelease(["E4", "G4", "B4"], "4n");
  },

  taskRejected({ impact_weight = 0.5 } = {}) {
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
  }
};
