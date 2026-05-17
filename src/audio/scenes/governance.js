// src/audio/scenes/governance.js
//
// "THE IRON VOTE" — F# minor / F# Aeolian, 56 BPM
//
// Solemn structured phrases. Gravitas and deliberation.

export const governanceScene = {
  bpm:            56,
  transitionTime:  6,
  mood: {
    stringsVol: -30,
    brassVol: -26,
    bassVol: -26,
    percVol: -68,
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
      slideCells: [
      [
        { note: 'Eb5', dur: '2n', vel: 0.12 },
        { note: 'C5', dur: '4n', vel: 0.1 },
        { note: 'Ab4', dur: '2n.', vel: 0.08 },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        { note: 'G4', dur: '8n', vel: 0.18 },
        { note: 'G4', dur: '8n', vel: 0.18 },
        { note: 'Bb4', dur: '4n', vel: 0.2 },
        { note: 'C5', dur: '4n', vel: 0.22 },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        { note: 'G4', dur: '4n', vel: 0.1 },
        { note: 'Bb4', dur: '8n', vel: 0.12 },
        { note: 'C5', dur: '2n', vel: 0.15 },
        null,
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '1n', vel: 0.1 },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        { note: 'D5', dur: '2n', vel: 0.14 },
        null,
        { note: 'C5', dur: '8n', vel: 0.12 },
        { note: 'Bb4', dur: '4n', vel: 0.1 },
        { note: 'G4', dur: '1n', vel: 0.08 },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
      ],
      harmonicaCells: [
      [
        { note: 'D5', dur: '2n', vel: 0.14 },
        null,
        { note: 'C5', dur: '8n', vel: 0.12 },
        { note: 'Bb4', dur: '4n', vel: 0.1 },
        { note: 'G4', dur: '1n', vel: 0.08 },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        { note: 'Eb5', dur: '2n', vel: 0.12 },
        { note: 'C5', dur: '4n', vel: 0.1 },
        { note: 'Ab4', dur: '2n.', vel: 0.08 },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        { note: 'G4', dur: '8n', vel: 0.18 },
        { note: 'G4', dur: '8n', vel: 0.18 },
        { note: 'Bb4', dur: '4n', vel: 0.2 },
        { note: 'C5', dur: '4n', vel: 0.22 },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        { note: 'G4', dur: '4n', vel: 0.1 },
        { note: 'Bb4', dur: '8n', vel: 0.12 },
        { note: 'C5', dur: '2n', vel: 0.15 },
        null,
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '1n', vel: 0.1 },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
      ],
      bassNotes:  ['F#1', 'C#1', 'D1', 'A1', 'E1', 'B1', 'F#1', 'C#1']
    },
  },
};