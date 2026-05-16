// src/audio/scenes/guildHub.js
//
// "GUILD HUB" — G Major, 78 BPM
//
// Warm communal motifs. Conversational call and response.

export const guildHubScene = {
  bpm: 78,
  transitionTime: 3,
  mood: {
    stringsVol: -26,
    brassVol: -32,
    bassVol: -24,
    percVol: -36,
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
          { notes: ['E3', 'G3', 'B3'] },     // Em
          { notes: ['A2', 'C3', 'E3'] },     // Am
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
      slideCells: [
      [
        { note: 'B3', dur: '2n.', vel: 0.12 },
        { note: 'D4', dur: '8n', vel: 0.12 },
        { note: 'G3', dur: '4n', vel: 0.12 },
        { note: 'A3', dur: '8n', vel: 0.12 },
        { note: 'C4', dur: '2n', vel: 0.12 },
        { note: 'B3', dur: '8n', vel: 0.12 },
        { note: 'G3', dur: '4n', vel: 0.12 },
        { note: 'D4', dur: '8n', vel: 0.12 },
        { note: 'B3', dur: '2n.', vel: 0.08 },
        { note: 'D4', dur: '8n', vel: 0.08 },
        { note: 'G3', dur: '4n', vel: 0.08 },
        { note: 'A3', dur: '8n', vel: 0.08 },
        { note: 'C4', dur: '2n', vel: 0.08 },
        { note: 'B3', dur: '8n', vel: 0.08 },
        { note: 'G3', dur: '4n', vel: 0.08 },
        { note: 'D4', dur: '8n', vel: 0.08 },
        { note: 'B3', dur: '2n.', vel: 0.08 },
        { note: 'D4', dur: '8n', vel: 0.08 },
        { note: 'G3', dur: '4n', vel: 0.08 },
        { note: 'A3', dur: '8n', vel: 0.08 },
        { note: 'C4', dur: '2n', vel: 0.08 },
        { note: 'B3', dur: '8n', vel: 0.08 },
        { note: 'G3', dur: '4n', vel: 0.08 },
        { note: 'D4', dur: '8n', vel: 0.08 },
        { note: 'B3', dur: '2n.', vel: 0.08 },
        { note: 'D4', dur: '8n', vel: 0.08 },
        { note: 'G3', dur: '4n', vel: 0.08 },
        { note: 'A3', dur: '8n', vel: 0.08 },
        { note: 'C4', dur: '2n', vel: 0.08 },
        { note: 'B3', dur: '8n', vel: 0.08 },
        { note: 'G3', dur: '4n', vel: 0.08 },
        { note: 'D4', dur: '8n', vel: 0.08 }
      ]
      ],
    harmonicaCells: [
      [
        { note: 'D4', dur: '2n.', vel: 0.12 },
        { note: 'G4', dur: '8n', vel: 0.12 },
        { note: 'B4', dur: '4n', vel: 0.12 },
        { note: 'A4', dur: '8n', vel: 0.12 },
        { note: 'G4', dur: '2n', vel: 0.12 },
        { note: 'E4', dur: '8n', vel: 0.12 },
        { note: 'D4', dur: '4n', vel: 0.12 },
        { note: 'G4', dur: '8n', vel: 0.12 },
        { note: 'D4', dur: '2n.', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '4n', vel: 0.08 },
        { note: 'A4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'D4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'D4', dur: '2n.', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '4n', vel: 0.08 },
        { note: 'A4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'D4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'D4', dur: '2n.', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '4n', vel: 0.08 },
        { note: 'A4', dur: '8n', vel: 0.08 },
        { note: 'G4', dur: '2n', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'D4', dur: '4n', vel: 0.08 },
        { note: 'G4', dur: '8n', vel: 0.08 }
      ]
      ],
    starCells: [
        ['G5', 'B5', 'D6'],
        ['A5', 'C#6', 'E6'],
      ],
      cyberCells: [
        ['G4', 'B4', 'D5', 'G5'],
        ['D5', 'F#5', 'A5', 'F#5'],
      ],
      bassNotes:  ['G1', 'D1', 'C1', 'E1', 'D1', 'A1', 'G1', 'B1'],
    },
  }
};