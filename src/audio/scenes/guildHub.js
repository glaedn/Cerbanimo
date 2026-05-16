// src/audio/scenes/guildHub.js
//
// "GUILD HUB" — G Major, 78 BPM
//
// 16-bar communal phrase. Warm, welcoming, and grounded.

export const guildHubScene = {
  bpm: 78,
  transitionTime: 3,
  mood: {
    stringsVol: -18,
    brassVol: -24,
    bassVol: -20,
    percVol: -28,
    reverbWet: 0.45,
    percussionActive: true,
    choirActive: true,
    arpActive: true,
    cyberActive: true,
    melodyActive: true,
    arpDensity: 0.3,
    cyberDensity: 0.3,
    bassIntensity: 0.5,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['G2', 'D3', 'B3'] },     // G
          { notes: ['C3', 'G3', 'E4'] },     // C
          { notes: ['D3', 'A3', 'F#4'] },    // D
          null,
          { notes: ['E3', 'G3', 'B3'] },
          { notes: ['A2', 'C3', 'E3'] },
          null,
          { notes: ['D3', 'F#3', 'C4'] },    // D7
          { notes: ['G2', 'B2', 'D3', 'F#3'] }, // Gmaj7
          { notes: ['C3', 'E3', 'G3', 'B3'] },  // Cmaj7
          null,
          { notes: ['A2', 'E3', 'G3', 'C#4'] }, // A7
          { notes: ['D2', 'A2', 'D3', 'F#3'] }, // D
          null,
          { notes: ['G3', 'B3', 'E4'] },     // G/E
          { notes: ['C3', 'D3', 'G3'] },     // G/C
        ]
      ],
      pentatonicHigh: [
        ['G5', 'B5', 'D6'],
        ['A5', 'C#6', 'E6'],
        ['G5', 'A5', 'B5', 'D6'],
      ],
      cyberNotes: [
        ['G4', 'B4', 'D5'],
        ['C5', 'E5', 'G5'],
        ['D5', 'F#5', 'A5'],
      ],
      bassNotes:  ['G1', 'D1', 'C1', 'E1', 'D1', 'A1', 'G1', 'B1'],
      slideNotes: ['B3', 'D4', 'G3', 'A3', 'C4', 'B3', 'G3', 'D4'],
      harmonicaNotes: ['D4', 'G4', 'B4', 'A4', 'G4', 'E4', 'D4', 'G4'],
    },
  }
};