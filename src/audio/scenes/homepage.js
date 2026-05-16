// src/audio/scenes/homepage.js
//
// "FIRST LIGHT ON THE FRONTIER" — Db major, 66 BPM
//
// Expanded to 16-bar harmonic arcs. Sparse, suspended, and drifting.
// Cinematic discovery and grandeur.

export const homepageScene = {
  bpm:            66,
  transitionTime:  5,
  mood: {
    stringsVol:       -22,
    brassVol:         -24,
    bassVol:          -28,
    percVol:          -60,
    reverbWet:         0.75,
    percussionActive:  false,
    choirActive:       true,
    arpActive:         false,
    cyberActive:       true,
    melodyActive:      true,
    arpDensity:        0.1,
    cyberDensity:      0.2,
    bassIntensity:     0.2,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['Db2', 'Ab2', 'Eb3'] }, // Dbsus2
          { notes: ['Bb2', 'F3', 'Ab3', 'Db4'] }, // Bbm7
          { notes: ['Gb2', 'Db3', 'Ab3'] }, // Gbadd9
          null,
          { notes: ['Ab2', 'Eb3', 'Gb3', 'C4'] }, // Ab7
          { notes: ['F2', 'C3', 'Eb3', 'Ab3'] }, // Fm7
          null,
          { notes: ['Gb2', 'Ab2', 'Db3'] }, // Db/Gb
          { notes: ['Bb2', 'Db3', 'F3', 'Ab3'] },
          { notes: ['Eb2', 'Bb2', 'Db3', 'Gb3'] }, // Ebm7
          null,
          { notes: ['Ab2', 'Eb3', 'Bb3'] }, // Absus4
          { notes: ['Db2', 'Ab2', 'Eb3'] },
          null,
          { notes: ['Gb2', 'Bb2', 'Eb3'] },
          { notes: ['Ab2', 'C3', 'Gb3'] },
        ]
      ],
      pentatonicHigh: [
        ['Db5', 'Ab5', 'Db6'],
        ['Eb5', 'Ab5', 'Bb5'],
        ['Db5', 'Eb5', 'Ab5', 'F5'],
      ],
      cyberNotes: [
        ['Db4', 'Ab4', 'Db5'],
        ['F4', 'Bb4', 'Db5'],
        ['Eb4', 'Ab4', 'C5'],
      ],
      bassNotes:  ['Db1', 'Ab1', 'Gb1', 'Bb1', 'Ab1', 'F1', 'Eb1', 'Db1'],
      slideNotes: ['F4', 'Db4', 'Eb4', 'Ab4', 'Bb4', 'Ab4', 'F4', 'Eb4'],
      harmonicaNotes: ['Ab4', 'Db5', 'F5', 'Eb5', 'Db5', 'Bb4', 'Ab4', 'Gb4'],
    },
  },
};