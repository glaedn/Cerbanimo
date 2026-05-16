// src/audio/scenes/onboarding.js
//
// "THE ARRIVAL" — A major, 62 BPM
//
// Structured unfolding destiny. Long emotional bends.

export const onboardingScene = {
  bpm: 62,
  transitionTime: 6,
  mood: {
    stringsVol: -24,
    brassVol: -32,
    bassVol: -28,
    percVol: -60,
    reverbWet: 0.65,
    percussionActive: false,
    choirActive: true,
    arpActive: true,
    cyberActive: true,
    melodyActive: true,
    arpDensity: 0.15,
    cyberDensity: 0.2,
    bassIntensity: 0.3,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['A2', 'E3', 'B3'] },     // Asus2
          { notes: ['F#2', 'C#3', 'E3', 'A3'] }, // F#m7
          { notes: ['D3', 'A3', 'E4'] },     // Dadd9
          null,
          { notes: ['E2', 'B2', 'D3', 'G#3'] }, // E7
          { notes: ['C#3', 'G#3', 'B3'] },   // C#m7
          null,
          { notes: ['D3', 'E3', 'A3'] },     // A/D
          { notes: ['F#2', 'A2', 'C#3', 'E3'] },
          { notes: ['B2', 'F#3', 'A3', 'D4'] },
          null,
          { notes: ['E2', 'B2', 'F#3'] },
          { notes: ['A2', 'E3', 'B3'] },
          null,
          { notes: ['D3', 'F#3', 'B3'] },
          { notes: ['E3', 'G#3', 'D4'] },
        ]
      ],
      slideCells: [
        ['C#4', null, 'E4', 'A3', 'D4', null, 'F#4', 'E4'],
      ],
      harmonicaCells: [
        ['E4', 'A4', 'C#5', 'F#5'],
      ],
      starCells: [
        ['A5', 'E6', 'F#6'],
        ['B5', 'E6', 'G#6'],
      ],
      cyberCells: [
        ['A4', 'C#5', 'E5', 'C#5'],
        ['D5', 'F#5', 'A5', 'F#5'],
      ],
      bassNotes:  ['A1', 'E1', 'D1', 'F#1', 'E1', 'C#1', 'B1', 'A1'],
    },
  }
};