// src/audio/scenes/skillGalaxy.js
//
// "THE SKILL GALAXY" — E major, 58 BPM
//
// 16-bar mapping phrase. Discovery and self-reflection.
// Maximum shimmering arps, no percussion or bass.

export const skillGalaxyScene = {
  bpm: 58,
  transitionTime: 4,
  mood: {
    stringsVol: -26,
    brassVol: -60,
    bassVol: -60,
    percVol: -60,
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
      pentatonicHigh: [
        ['E5', 'G#5', 'B5'],
        ['F#5', 'B5', 'C#6'],
        ['G#5', 'B5', 'E6', 'C#6'],
      ],
      cyberNotes: [
        ['E4', 'G#4', 'B4'],
        ['A4', 'C#5', 'E5'],
        ['B4', 'D#5', 'F#5'],
      ],
      bassNotes:  ['E1', 'B1', 'A1', 'F#1', 'G#1', 'C#1', 'B1', 'E1'],
      slideNotes: ['G#4', 'E4', 'F#4', 'B4'],
      harmonicaNotes: ['B4', 'E5', 'G#5', 'C#5'],
    }
  }
};