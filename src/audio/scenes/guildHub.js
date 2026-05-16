// Guild Hub — communal, warm
// 78 BPM, G major.
export const guildHubScene = {
  bpm: 78,
  mood: {
    stringsVol: -14,
    brassVol: -20,
    bassVol: -18,
    percVol: -24,
    reverbWet: 0.4,
    percussionActive: true,
    choirActive: true,  // harmonica Active
    arpActive: false,
    melodyActive: true,
    arpDensity: 0.3,
    bassIntensity: 0.5,
    melodicMaterial: {
      progressions: [
        // G Major warm
        [
          { notes: ["G3", "B3", "D4"] },
          { notes: ["C3", "E3", "G3"] },
          { notes: ["D3", "F#3", "A3"] },
          { notes: ["G3", "B3", "D4"] },
        ]
      ],
      bassNotes: [
        "G1", "D1", "G1", "B1",
        "C1", "G1", "C1", "E1",
        "D1", "A1", "D1", "F#1",
        "G1", "D1", "G1", "B1",
      ]
    }
  }
};
