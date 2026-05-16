// src/audio/scenes/governance.js
//
// "THE IRON VOTE" — F# minor / F# Aeolian, 56 BPM
//
// The council chamber where civilizations are shaped. Slower than any other
// scene. F# minor is remote, almost alien — the sharpest key in common use,
// as far from C as you can get. That harmonic distance reads as gravity.
// No percussion. The harmonica speaks for the collective: plaintive, certain.
// Cyber arp is a very slow, solemn pulse — like a blockchain confirming a
// transaction that cannot be undone. Every decision echoes at 14 seconds
// of reverb... wait, we fixed that. 7 seconds. Still long enough.

export const governanceScene = {
  bpm:            56,
  transitionTime:  6,
  mood: {
    stringsVol:       -22,
    brassVol:         -14,
    bassVol:          -19,
    percVol:          -60,
    reverbWet:         0.78,
    percussionActive:  false,
    choirActive:       true,
    arpActive:         false,
    cyberActive:       true,
    melodyActive:      true,
    arpDensity:        0.1,
    cyberDensity:      0.3,
    bassIntensity:     0.32,
    melodicMaterial: {
      progressions: [
        // F#m – A – E – F#m  (natural minor)
        [
          { notes: ['F#3', 'A3',  'C#4']  },
          { notes: ['A3',  'C#4', 'E4']   },
          { notes: ['E3',  'G#3', 'B3']   },
          { notes: ['F#3', 'A3',  'C#4']  },
        ],
        // F#m – D – A – E  (borrowed IV adds gravitas)
        [
          { notes: ['F#3', 'A3',  'C#4']  },
          { notes: ['D3',  'F#3', 'A3']   },
          { notes: ['A3',  'C#4', 'E4']   },
          { notes: ['E3',  'G#3', 'B3']   },
        ],
        // Bm – F#m – C#m – D  (darker, around the vi)
        [
          { notes: ['B3',  'D4',  'F#4']  },
          { notes: ['F#3', 'A3',  'C#4']  },
          { notes: ['C#3', 'E3',  'G#3']  },
          { notes: ['D3',  'F#3', 'A3']   },
        ],
      ],
      pentatonicHigh: [
        'F#5', null, 'A5', null, 'B5', null, 'C#6', null,
        'E6',  null, 'F#6',null, null, null,  null,  null,
      ],
      // Cyber arp: deliberate half-note pulse — a vote being tallied
      cyberNotes: [
        'F#4', null, null, null, 'C#5', null, null, null,
        'A4',  null, null, null, 'E5',  null, null, null,
      ],
      bassNotes: [
        'F#1', 'C#1', 'F#1', 'A1',
        'D1',  'A1',  'D1',  'F#1',
        'A1',  'E1',  'A1',  'C#2',
        'E1',  'B1',  'E1',  'G#1',
      ],
      slideNotes: [
        'A3',  'F#3', 'G#3', 'A3',
        'E4',  'C#4', 'B3',  'A3',
        'D4',  'A3',  'E4',  'C#4',
        'F#4', 'E4',  'D4',  'C#4',
      ],
      harmonicaNotes: [
        'C#4', 'F#4', 'A4',  'C#5',
        'F#4', 'A4',  'C#5', 'F#5',
        'D4',  'F#4', 'G#4', 'A4',
        'E5',  'C#5', 'B4',  'A4',
      ],
    },
  },
};