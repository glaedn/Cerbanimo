// src/audio/scenes/dashboard.js
//
// "NEON SALOON" — Bb major / Bb Mixolydian, 76 BPM
//
// The command deck. Walking into a space station bar where the regulars know
// the mission briefings by heart. The cowboy groove is here — but so is the
// hum of fluorescent neon, the chirp of a console behind the bar.
// Key shift from G to Bb adds a half-step of brightness, more "on" energy.
// Cyber arp runs a syncopated Bb pentatonic line — signals in the walls.

export const dashboardScene = {
  bpm:            76,
  transitionTime:  2,
  mood: {
    stringsVol:       -12,
    brassVol:         -28,
    bassVol:          -16,
    percVol:          -20,
    reverbWet:         0.42,
    percussionActive:  true,
    choirActive:       false,
    arpActive:         true,
    cyberActive:       true,
    melodyActive:      false,
    arpDensity:        0.5,
    cyberDensity:      0.55,
    bassIntensity:     0.6,
    melodicMaterial: {
      progressions: [
        // I – IV – V – I  (classic cadence, Bb home base)
        [
          { notes: ['Bb3', 'D4',  'F4']  },
          { notes: ['Eb3', 'G3',  'Bb3'] },
          { notes: ['F3',  'A3',  'C4']  },
          { notes: ['Bb3', 'D4',  'F4']  },
        ],
        // I – vi – IV – V  (cinematic, building)
        [
          { notes: ['Bb3', 'D4',  'F4']  },
          { notes: ['G3',  'Bb3', 'D4']  },
          { notes: ['Eb3', 'G3',  'Bb3'] },
          { notes: ['F3',  'A3',  'C4']  },
        ],
        // IV – I – ii – V  (open road)
        [
          { notes: ['Eb3', 'G3',  'Bb3'] },
          { notes: ['Bb3', 'D4',  'F4']  },
          { notes: ['C3',  'Eb3', 'G3']  },
          { notes: ['F3',  'A3',  'C4']  },
        ],
      ],
      pentatonicHigh: [
        'Bb5', 'C6',  'D6',  'F6',  'G6',  'Bb6',
        'D6',  null,  'F6',  null,  'G6',  null,
        'Bb6', null,  'C6',  null,
      ],
      cyberNotes: [
        'Bb4', 'D5',  'F5',  'Bb5', null,  'F5',  'D5',  'Bb4',
        'Eb5', 'G5',  'Bb5', null,  'F5',  'Eb5', 'D5',  null,
      ],
      bassNotes: [
        'Bb1', 'F1',  'Bb1', 'D2',
        'Eb1', 'Bb1', 'Eb1', 'G1',
        'F1',  'C1',  'F1',  'A1',
        'Bb1', 'F1',  'Bb1', 'Eb1',
      ],
      slideNotes: [
        'D4',  'F4',  'Bb3', 'D4',
        'Eb4', 'G3',  'F4',  'Bb3',
        'Bb3', 'D4',  'G4',  'F4',
        'Eb4', 'D4',  'C4',  'Bb3',
      ],
      harmonicaNotes: [
        'F4',  'Bb4', 'D5',  'F5',
        'Bb4', 'D5',  'F5',  'Bb5',
        'G4',  'Bb4', 'C5',  'D5',
        'F5',  'D5',  'C5',  'Bb4',
      ],
    },
  },
};