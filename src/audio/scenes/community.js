// src/audio/scenes/community.js
//
// "COMMUNITY HUB" — G Major, 84 BPM
//
// Busy conversational motifs. Diverse cell-based melodies.

export const communityScene = {
  bpm: 84,
  transitionTime: 2,
  mood: {
    stringsVol: -20,
    brassVol: -22,
    bassVol: -20,
    percVol: -22,
    reverbWet: 0.35,
    percussionActive: true,
    choirActive: true,
    arpActive: true,
    cyberActive: true,
    melodyActive: true,
    arpDensity: 0.5,
    cyberDensity: 0.5,
    bassIntensity: 0.7,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['G2', 'D3', 'B3'] },
          { notes: ['C3', 'G3', 'E4'] },
          { notes: ['D3', 'A3', 'F#4'] },
          null,
          { notes: ['E3', 'G3', 'D4'] },
          { notes: ['C3', 'E3', 'A4'] },
          null,
          { notes: ['D3', 'G3', 'C4'] },
          { notes: ['G2', 'B2', 'D3', 'F#3'] },
          { notes: ['C3', 'E3', 'G3', 'D4'] },
          null,
          { notes: ['A2', 'C#3', 'E3', 'G3'] },
          { notes: ['D3', 'F#3', 'A3', 'C4'] },
          null,
          { notes: ['G3', 'B3', 'D4', 'F#4'] },
          { notes: ['C3', 'D3', 'G3', 'B3'] },
        ]
      ],
      slideCells: [
        ['G3', 'B3', 'D4', 'B3', 'C4', 'E4', 'G4', 'E4'],
        ['D4', 'F#4', 'A4', 'F#4', 'G4', 'D4', 'B3', 'G3'],
      ],
      harmonicaCells: [
        ['D4', 'G4', 'B4', 'G4', 'C5', 'E5', 'D5', 'B4'],
      ],
      starCells: [
        ['G5', 'B5', 'D6'],
        ['C6', 'E6', 'G6'],
      ],
      cyberCells: [
        ['G4', 'B4', 'D5', 'G5'],
        ['C5', 'E5', 'G5', 'E5'],
      ],
      bassNotes:  ['G1', 'D1', 'C1', 'E1', 'D1', 'A1', 'B1', 'G1'],
    }
  }
};