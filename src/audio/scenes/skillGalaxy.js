// src/audio/scenes/skillGalaxy.js
//
// "THE SKILL GALAXY" — E major, 58 BPM
//
// Shimmering structured motifs. Reflective and evolving.

export const skillGalaxyScene = {
  bpm: 58,
  transitionTime: 4,
  mood: {
    stringsVol: -32,
    brassVol: -68,
    bassVol: -64,
    percVol: -68,
    reverbWet: 0.8,
    percussionActive: false,
    choirActive: false,
    arpActive: true,
    cyberActive: true,
    melodyActive: false,
    arpDensity: 0.8,
    cyberDensity: 0.4,
    bassIntensity: 0,
    melodicMaterial: {
      progressions: [
        [
          { notes: ['E2', 'B2', 'F#3'] },    // Esus2
          { notes: ['A2', 'E3', 'B3'] },    // Asus2
          { notes: ['B2', 'F#3', 'C#4'] },  // Bsus2
          null,
          { notes: ['C#3', 'G#3', 'B3', 'E4'] }, // C#m7
          { notes: ['F#2', 'C#3', 'E3', 'A#3'] }, // F#7
          null,
          { notes: ['A2', 'B2', 'E3'] },    // E/A
          { notes: ['E2', 'G#2', 'B2', 'D#3'] }, // Emaj7
          { notes: ['A2', 'C#3', 'E3', 'G#3'] }, // Amaj7
          null,
          { notes: ['F#2', 'A2', 'C#3', 'E3'] }, // F#m7
          { notes: ['B2', 'D#3', 'F#3', 'A3'] }, // B7
          null,
          { notes: ['E3', 'G#3', 'C#4'] },
          { notes: ['A3', 'B3', 'E4'] },
        ]
      ],
      slideCells: [
      [
        { note: 'G#4', dur: '2n.', vel: 0.12 },
        { note: 'E4', dur: '8n', vel: 0.12 },
        { note: 'F#4', dur: '4n', vel: 0.12 },
        { note: 'B4', dur: '8n', vel: 0.12 },
        { note: 'G#4', dur: '2n.', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'F#4', dur: '4n', vel: 0.08 },
        { note: 'B4', dur: '8n', vel: 0.08 },
        { note: 'G#4', dur: '2n.', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'F#4', dur: '4n', vel: 0.08 },
        { note: 'B4', dur: '8n', vel: 0.08 },
        { note: 'G#4', dur: '2n.', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'F#4', dur: '4n', vel: 0.08 },
        { note: 'B4', dur: '8n', vel: 0.08 },
        { note: 'G#4', dur: '2n.', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'F#4', dur: '4n', vel: 0.08 },
        { note: 'B4', dur: '8n', vel: 0.08 },
        { note: 'G#4', dur: '2n.', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'F#4', dur: '4n', vel: 0.08 },
        { note: 'B4', dur: '8n', vel: 0.08 },
        { note: 'G#4', dur: '2n.', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'F#4', dur: '4n', vel: 0.08 },
        { note: 'B4', dur: '8n', vel: 0.08 },
        { note: 'G#4', dur: '2n.', vel: 0.08 },
        { note: 'E4', dur: '8n', vel: 0.08 },
        { note: 'F#4', dur: '4n', vel: 0.08 },
        { note: 'B4', dur: '8n', vel: 0.08 }
      ]
      ],
    harmonicaCells: [
      [
        { note: 'B4', dur: '2n.', vel: 0.12 },
        { note: 'E5', dur: '8n', vel: 0.12 },
        { note: 'G#5', dur: '4n', vel: 0.12 },
        { note: 'C#5', dur: '8n', vel: 0.12 },
        { note: 'B4', dur: '2n.', vel: 0.08 },
        { note: 'E5', dur: '8n', vel: 0.08 },
        { note: 'G#5', dur: '4n', vel: 0.08 },
        { note: 'C#5', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '2n.', vel: 0.08 },
        { note: 'E5', dur: '8n', vel: 0.08 },
        { note: 'G#5', dur: '4n', vel: 0.08 },
        { note: 'C#5', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '2n.', vel: 0.08 },
        { note: 'E5', dur: '8n', vel: 0.08 },
        { note: 'G#5', dur: '4n', vel: 0.08 },
        { note: 'C#5', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '2n.', vel: 0.08 },
        { note: 'E5', dur: '8n', vel: 0.08 },
        { note: 'G#5', dur: '4n', vel: 0.08 },
        { note: 'C#5', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '2n.', vel: 0.08 },
        { note: 'E5', dur: '8n', vel: 0.08 },
        { note: 'G#5', dur: '4n', vel: 0.08 },
        { note: 'C#5', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '2n.', vel: 0.08 },
        { note: 'E5', dur: '8n', vel: 0.08 },
        { note: 'G#5', dur: '4n', vel: 0.08 },
        { note: 'C#5', dur: '8n', vel: 0.08 },
        { note: 'B4', dur: '2n.', vel: 0.08 },
        { note: 'E5', dur: '8n', vel: 0.08 },
        { note: 'G#5', dur: '4n', vel: 0.08 },
        { note: 'C#5', dur: '8n', vel: 0.08 }
      ]
      ],
    starCells: [
        ['E5', 'G#5', 'B5'],
        ['G#5', 'B5', 'E6'],
      ],
      cyberCells: [
        ['E4', 'G#4', 'B4', 'E5'],
        ['A4', 'C#5', 'E5', 'C#5'],
      ],
      bassNotes:  ['E1', 'B1', 'A1', 'F#1', 'G#1', 'C#1', 'B1', 'E1'],
    }
  }
};