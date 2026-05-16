// src/audio/scenes/workspace.js
//
// "DATA STREAM" — C Dorian, 92 BPM
//
// Relentless hypnotic pulses. Industrial focus.

export const workspaceScene = {
  bpm:            92,
  transitionTime:  2,
  mood: {
    stringsVol: -24,
    brassVol: -68,
    bassVol: -22,
    percVol: -30,
    reverbWet:         0.25,
    percussionActive:  true,
    choirActive:       false,
    arpActive:         false,
    cyberActive:       true,
    melodyActive:      false,
    arpDensity:        0.0,
    cyberDensity:      0.7,
    bassIntensity:     0.7,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['C2', 'G2', 'Eb3'] },    // Cm
          { notes: ['Bb2', 'F3', 'D4'] },    // Bb
          { notes: ['Ab2', 'Eb3', 'C4'] },   // Ab
          null,
          { notes: ['G2', 'D3', 'B3'] },     // G
          { notes: ['Eb2', 'Bb2', 'G3'] },   // Eb
          null,
          { notes: ['F2', 'C3', 'Ab3'] },    // Fm
          { notes: ['C2', 'G2', 'Eb3'] },
          { notes: ['Bb2', 'F3', 'D4'] },
          null,
          { notes: ['Ab2', 'Eb3', 'G3'] },   // Abmaj7
          { notes: ['G2', 'B2', 'F3'] },     // G7
          null,
          { notes: ['C2', 'Eb3', 'Bb3'] },   // Cm7
          { notes: ['D2', 'F3', 'C4'] },     // Dm7b5
        ]
      ],
      slideCells: [
      [
        { note: 'G4', dur: '2n.', vel: 0.12 },
        { note: 'Eb4', dur: '8n', vel: 0.12 },
        { note: 'F4', dur: '4n', vel: 0.12 },
        { note: 'G4', dur: '8n', vel: 0.12 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'Eb4', dur: '8n', vel: 0.08 },
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'Eb4', dur: '8n', vel: 0.08 },
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'Eb4', dur: '8n', vel: 0.08 },
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'Eb4', dur: '8n', vel: 0.08 },
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'Eb4', dur: '8n', vel: 0.08 },
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'Eb4', dur: '8n', vel: 0.08 },
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'Eb4', dur: '8n', vel: 0.08 },
        { note: 'F4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 }
      ]
      ],
    harmonicaCells: [
      [
        { note: 'G4', dur: '2n.', vel: 0.12 },
        { note: 'C5', dur: '8n', vel: 0.12 },
        { note: 'Eb5', dur: '4n', vel: 0.12 },
        { note: 'G5', dur: '8n', vel: 0.12 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'C5', dur: '8n', vel: 0.08 },
        { note: 'Eb5', dur: '4n', vel: 0.08 },
        { note: 'G5', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'C5', dur: '8n', vel: 0.08 },
        { note: 'Eb5', dur: '4n', vel: 0.08 },
        { note: 'G5', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'C5', dur: '8n', vel: 0.08 },
        { note: 'Eb5', dur: '4n', vel: 0.08 },
        { note: 'G5', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'C5', dur: '8n', vel: 0.08 },
        { note: 'Eb5', dur: '4n', vel: 0.08 },
        { note: 'G5', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'C5', dur: '8n', vel: 0.08 },
        { note: 'Eb5', dur: '4n', vel: 0.08 },
        { note: 'G5', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'C5', dur: '8n', vel: 0.08 },
        { note: 'Eb5', dur: '4n', vel: 0.08 },
        { note: 'G5', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n.', vel: 0.08 },
        { note: 'C5', dur: '8n', vel: 0.08 },
        { note: 'Eb5', dur: '4n', vel: 0.08 },
        { note: 'G5', dur: '8n', vel: 0.08 }
      ]
      ],
    starCells: [
        ['C5', 'Eb5', 'G5'],
        ['G5', 'Bb5', 'C6'],
      ],
      cyberCells: [
        ['C4', 'Eb4', 'G4', 'Bb4'],
        ['G4', 'Bb4', 'D5', 'F5'],
      ],
      bassNotes:  ['C1', 'G1', 'Bb1', 'Ab1', 'G1', 'Eb1', 'F1', 'C1'],
    },
  },
};