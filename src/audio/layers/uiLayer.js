import * as Tone from "tone";

// Single instance of click synth
const clickSynth = new Tone.MembraneSynth().toDestination();

export const uiLayer = {
  click() {
    if (Tone.getContext().state !== 'running') return;
    clickSynth.triggerAttackRelease("C2", "8n");
  },

  hover() {
    if (Tone.getContext().state !== 'running') return;
    // For hover, we might want a simpler, short synth
    const hoverSynth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    hoverSynth.triggerAttackRelease("E5", "16n");
    // Note: in a real app, you'd reuse synths instead of creating new ones
  }
};
