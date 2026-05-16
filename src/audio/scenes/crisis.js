// src/audio/scenes/crisis.js
//
// "STAMPEDE / HULL BREACH" — E minor, 104 BPM
//
// 16-bar tension phrase. Driving, unresolved, and frantic.
// Minimal reverb, maximum urgency.

export const crisisScene = {
  bpm: 104,
  transitionTime: 0.3,
  mood: {
    stringsVol: -12,
    brassVol: -60,
    bassVol: -16,
    percVol: -18,
    reverbWet: 0.2,
    percussionActive: true,
    choirActive: false,
    arpActive: true,
    cyberActive: true,
    melodyActive: false,
    arpDensity: 0.8,
    cyberDensity: 0.7,
    bassIntensity: 0.9,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['E2', 'B2', 'G3'] },    // Em
          { notes: ['C2', 'G2', 'D3'] },    // Cmaj9
          { notes: ['F#2', 'C#3', 'E3'] },  // F#dim/E
          { notes: ['B2', 'F#3', 'A3'] },   // B7
          { notes: ['E2', 'B2', 'D3'] },    // Em7
          { notes: ['A2', 'E3', 'G3'] },    // Am7
          { notes: ['D2', 'A2', 'C3'] },    // D7
          { notes: ['G2', 'D3', 'F#3'] },   // Gmaj7
          { notes: ['C2', 'G2', 'B2'] },    // Cmaj7
          { notes: ['F#2', 'A2', 'C3'] },   // F#m7b5
          { notes: ['B2', 'D#3', 'A3'] },   // B7b9
          { notes: ['E2', 'G2', 'B2'] },
          { notes: ['E2', 'B2', 'F#3'] },
          null,
          { notes: ['C2', 'E3', 'Bb3'] },   // C7
          { notes: ['B2', 'D#3', 'A3'] },
        ]
      ],
      pentatonicHigh: [
        ['E5', 'G5', 'B5'],
        ['F#5', 'A5', 'C6'],
        ['B5', 'D#6', 'A6'],
      ],
      cyberNotes: [
        ['E4', 'G4', 'B4', 'D5'],
        ['C4', 'E4', 'G4', 'B4'],
        ['B3', 'D#4', 'F#4', 'A4'],
      ],
      bassNotes:  ['E1', 'E1', 'C1', 'C1', 'B1', 'B1', 'A1', 'F#1'],
      slideNotes: ['E4', 'G4', 'F#4', 'B3'],
      harmonicaNotes: ['B4', 'E5', 'G5', 'F#5'],
    },
  },
};