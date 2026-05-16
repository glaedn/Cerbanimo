// src/audio/scenes/dashboard.js
//
// "NEON SALOON" — Bb major / Bb Mixolydian, 76 BPM
//
// Structured neon motifs. Repetitive rhythmic anchors.

export const dashboardScene = {
  bpm:            76,
  transitionTime:  2,
  mood: {
    stringsVol:       -22,
    brassVol:         -32,
    bassVol:          -24,
    percVol:          -30,
    reverbWet:         0.4,
    percussionActive:  true,
    choirActive:       false,
    arpActive:         true,
    cyberActive:       true,
    melodyActive:      false,
    arpDensity:        0.2,
    cyberDensity:      0.3,
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
      slideCells: [
        ['D4', 'F4', 'Bb3', 'D4', 'Eb4', 'G3', 'F4', 'Bb3'],
      ],
      harmonicaCells: [
        ['F4', 'Bb4', 'D5', 'G5'],
      ],
      starCells: [
        ['Bb5', 'F6', 'G6'],
        ['C6', 'F6', 'G6'],
      ],
      cyberCells: [
        ['Bb4', 'D5', 'F5', 'Bb5'],
        ['Eb5', 'G5', 'Bb5', 'G5'],
      ],
      bassNotes:  ['Bb1', 'F1', 'Eb1', 'G1', 'F1', 'D1', 'C1', 'Bb1'],
    },
  },
};