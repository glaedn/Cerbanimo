// Skill Galaxy — discovery, mapping oneself
// E major pentatonic, 58 BPM. No percussion, no bass.
// Stellar arp at very high density (0.9) but with a long release so notes blur together into a shimmer.
export const skillGalaxyScene = {
  bpm: 58,
  transitionTime: 4,
  mood: {
    stringsVol: -20,
    brassVol: -40,
    bassVol: -60,
    percVol: -60,
    reverbWet: 0.8,
    percussionActive: false,
    choirActive: false,
    arpActive: true,
    melodyActive: false,
    arpDensity: 0.9,
    bassIntensity: 0,
    melodicMaterial: {
      progressions: [
        [
          { notes: ["E3", "G#3", "B3"] },
          { notes: ["A3", "C#4", "E4"] },
          { notes: ["B3", "D#4", "F#4"] },
          { notes: ["E3", "G#3", "B3"] }
        ]
      ],
      pentatonicHigh: [
        "E5", "F#5", "G#5", "B5", "C#6", "E6",
        "G#5", null, "B5", null, "C#6", null,
        "E6", null, "F#5", null,
      ]
    }
  }
};
