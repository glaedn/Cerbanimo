// Workspace — head down, getting it done
// Faster tempo, percussion forward, arp dense and driving
// No melody or harmonica — they'd distract from deep work
export const workspaceScene = {
  bpm: 88,
  mood: {
    stringsVol: -10,     // steel string: prominent, driving the rhythm
    brassVol: -40,       // harmonica: off (volume muted)
    bassVol: -14,        // bass: forward, anchoring the groove
    percVol: -16,        // drums: most present of any scene
    reverbWet: 0.28,     // less reverb — tighter, more focused sound
    percussionActive: true,
    choirActive: false,
    arpActive: true,     // star arp: on but sparse — focus, not distraction
    melodyActive: false,
    arpDensity: 0.65,
    bassIntensity: 0.8,
  },
};