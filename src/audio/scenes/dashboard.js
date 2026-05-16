// src/audio/scenes/dashboard.js
//
// "NEON SALOON" — Bb major / Bb Mixolydian, 76 BPM
//
// 16-bar narrative phrase. Drifting neon fog, digital tumbleweeds.
// Key shift from G to Bb adds a half-step of brightness.

export const dashboardScene = {
  bpm:            76,
  transitionTime:  2,
  mood: {
    stringsVol:       -20,
    brassVol:         -32,
    bassVol:          -22,
    percVol:          -30,
    reverbWet:         0.45,
    percussionActive:  true,
    choirActive:       false,
    arpActive:         true,
    cyberActive:       true,
    melodyActive:      false,
    arpDensity:        0.3,
    cyberDensity:      0.35,
    bassIntensity:     0.5,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['Bb2', 'F3', 'C4'] },    // Bbsus2
          { notes: ['G2', 'D3', 'F3', 'Bb3'] }, // Gm7
          { notes: ['Eb3', 'Bb3', 'F4'] },   // Ebadd9
          null,
          { notes: ['F2', 'C3', 'Eb3', 'A3'] }, // F7
          { notes: ['D3', 'A3', 'C4'] },    // Dm7
          null,
          { notes: ['Eb3', 'F3', 'Bb3'] },   // Bb/Eb
          { notes: ['G2', 'Bb2', 'D3', 'F3'] },
          { notes: ['C2', 'G2', 'Bb2', 'Eb3'] },
          null,
          { notes: ['F2', 'C3', 'G3'] },
          { notes: ['Bb2', 'F3', 'C4'] },
          null,
          { notes: ['Eb3', 'G3', 'C4'] },
          { notes: ['F3', 'A3', 'Eb4'] },
        ]
      ],
      pentatonicHigh: [
        ['Bb5', 'F6', 'G6'],
        ['C6', 'F6', 'G6'],
        ['Bb5', 'C6', 'F6', 'D6'],
      ],
      cyberNotes: [
        ['Bb4', 'D5', 'F5'],
        ['Eb5', 'G5', 'Bb5'],
        ['F5', 'A5', 'C6', 'Bb5'],
      ],
      bassNotes:  ['Bb1', 'F1', 'Eb1', 'G1', 'F1', 'D1', 'C1', 'Bb1'],
      slideNotes: ['D4', 'F4', 'Bb3', 'Eb4', 'G4', 'F4', 'D4', 'Bb3'],
      harmonicaNotes: ['F4', 'Bb4', 'D5', 'G5', 'F5', 'D5', 'C5', 'Bb4'],
    },
  },
};