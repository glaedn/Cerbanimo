// src/audio/scenes/portfolio.js
//
// "THE TRAIL'S END" — G Major, 70 BPM
//
// 16-bar contemplative phrase. Gentle memory-texture, star arp sparse and wide.
// Looking back at the sunset on the frontier.

export const portfolioScene = {
  bpm: 70,
  transitionTime: 4,
  mood: {
    stringsVol: -22,
    brassVol: -32,
    bassVol: -26,
    percVol: -60,
    reverbWet: 0.65,
    percussionActive: false,
    choirActive: true,
    arpActive: true,
    cyberActive: false,
    melodyActive: true,
    arpDensity: 0.2,
    cyberDensity: 0.1,
    bassIntensity: 0.3,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['G2', 'D3', 'A3'] },     // Gsus2
          { notes: ['E2', 'B2', 'D3', 'G3'] }, // Em7
          { notes: ['C3', 'G3', 'D4'] },     // Cadd9
          null,
          { notes: ['D2', 'A2', 'C3', 'F#3'] }, // D7
          { notes: ['B2', 'F#3', 'A3'] },    // Bm7
          null,
          { notes: ['C3', 'D3', 'G3'] },     // G/C
          { notes: ['E2', 'G2', 'B2', 'D3'] },
          { notes: ['A2', 'E3', 'G3'] },
          null,
          { notes: ['D2', 'A2', 'E3'] },
          { notes: ['G2', 'D3', 'A3'] },
          null,
          { notes: ['C3', 'E3', 'A3'] },
          { notes: ['D3', 'F#3', 'C4'] },
        ]
      ],
      pentatonicHigh: [
        ['G5', 'B5', 'D6'],
        ['A5', 'D6', 'E6'],
        ['G5', 'A5', 'D6', 'B5'],
      ],
      cyberNotes: [
        ['G4', 'B4', 'D5'],
        ['C5', 'E5', 'G5'],
        ['D5', 'F#5', 'A5'],
      ],
      bassNotes:  ['G1', 'D1', 'E1', 'C1', 'D1', 'B1', 'A1', 'G1'],
      slideNotes: ['B3', 'G3', 'A3', 'B3', 'E4', 'G3', 'F#4', 'D4'],
      harmonicaNotes: ['D4', 'G4', 'B4', 'D5', 'G4', 'B4', 'D5', 'G5'],
    },
  },
};