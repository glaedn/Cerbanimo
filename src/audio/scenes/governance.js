// src/audio/scenes/governance.js
//
// "THE IRON VOTE" — F# minor / F# Aeolian, 56 BPM
//
// 16-bar solemn phrase. Gravity, distance, and permanence.
// Slow, deliberate pulses. Like a blockchain confirming history.

export const governanceScene = {
  bpm:            56,
  transitionTime:  6,
  mood: {
    stringsVol:       -24,
    brassVol:         -18,
    bassVol:          -22,
    percVol:          -60,
    reverbWet:         0.7,
    percussionActive:  false,
    choirActive:       true,
    arpActive:         false,
    cyberActive:       true,
    melodyActive:      true,
    arpDensity:        0.1,
    cyberDensity:      0.2,
    bassIntensity:     0.3,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['F#2', 'C#3', 'A3'] },   // F#m
          { notes: ['D3', 'A3', 'F#4'] },    // D
          { notes: ['A2', 'E3', 'C#4'] },    // A
          null,
          { notes: ['E2', 'B2', 'G#3'] },    // E
          { notes: ['C#3', 'G#3', 'E4'] },   // C#m
          null,
          { notes: ['D3', 'E3', 'F#3'] },    // F#m/D
          { notes: ['F#2', 'A2', 'C#3', 'E3'] }, // F#m7
          { notes: ['B2', 'D3', 'F#3', 'A3'] },  // Bm7
          null,
          { notes: ['E2', 'G#3', 'B3', 'D4'] },  // E7
          { notes: ['A2', 'C#3', 'E3', 'G#3'] }, // Amaj7
          null,
          { notes: ['D3', 'F#3', 'A3', 'C#4'] }, // Dmaj7
          { notes: ['C#3', 'E3', 'G#3', 'B3'] }, // C#m7
        ]
      ],
      pentatonicHigh: [
        ['F#5', 'C#6', 'E6'],
        ['A5', 'C#6', 'F#6'],
        ['F#5', 'A5', 'B5', 'C#6'],
      ],
      cyberNotes: [
        ['F#4', 'A4', 'C#5'],
        ['D5', 'F#5', 'A5'],
        ['E5', 'G#5', 'B5'],
      ],
      bassNotes:  ['F#1', 'C#1', 'D1', 'A1', 'E1', 'B1', 'F#1', 'C#1'],
      slideNotes: ['A3', 'F#3', 'G#3', 'A3', 'C#4', 'B3', 'A3', 'F#3'],
      harmonicaNotes: ['C#4', 'F#4', 'A4', 'E5', 'C#5', 'B4', 'A4', 'F#4'],
    },
  },
};