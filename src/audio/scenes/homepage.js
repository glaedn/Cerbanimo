// src/audio/scenes/homepage.js
//
// "FIRST LIGHT ON THE FRONTIER" — Db major, 66 BPM
//
// The new user descends toward an unknown planet. No percussion — just the
// vast silence of space with a harmonica calling from the surface below.
// Db major is cinematic and slightly mysterious — used in film scores to
// evoke discovery and grandeur. The cyber arp is barely present: a faint
// signal from the colony below, not yet understood.
// Maximum reverb. The frontier is enormous.

export const homepageScene = {
  bpm:            66,
  transitionTime:  5,
  mood: {
    stringsVol:       -18,
    brassVol:         -16,
    bassVol:          -22,
    percVol:          -60,
    reverbWet:         0.82,
    percussionActive:  false,
    choirActive:       true,
    arpActive:         false,
    cyberActive:       true,
    melodyActive:      true,
    arpDensity:        0.15,
    cyberDensity:      0.25,
    bassIntensity:     0.28,
    melodicMaterial: {
      progressions: [
        // I – IV – V – I  in Db
        [
          { notes: ['Db3', 'F3',  'Ab3']  },
          { notes: ['Gb3', 'Bb3', 'Db4']  },
          { notes: ['Ab3', 'C4',  'Eb4']  },
          { notes: ['Db3', 'F3',  'Ab3']  },
        ],
        // I – Bbm – Gb – Ab  (darker, more yearning)
        [
          { notes: ['Db3', 'F3',  'Ab3']  },
          { notes: ['Bb2', 'Db3', 'F3']   },
          { notes: ['Gb3', 'Bb3', 'Db4']  },
          { notes: ['Ab3', 'C4',  'Eb4']  },
        ],
      ],
      pentatonicHigh: [
        'Db5', null,  'Eb5', null, 'F5',  null, 'Ab5', null,
        'Bb5', null,  'Db6', null, 'F6',  null, 'Ab6', null,
      ],
      // Cyber arp: very sparse, almost subliminal — a distant beacon
      cyberNotes: [
        'Db5', null, null, null, 'Ab5', null, null, null,
        'F5',  null, null, null, 'Eb5', null, null, null,
      ],
      bassNotes: [
        'Db1', 'Ab1', 'Db1', 'F1',
        'Gb1', 'Db1', 'Gb1', 'Bb1',
        'Ab1', 'Eb1', 'Ab1', 'C2',
        'Db1', 'Ab1', 'Db1', 'Gb1',
      ],
      slideNotes: [
        'F4',  'Db4', 'Eb4', 'F4',
        'Ab4', 'F4',  'Eb4', 'Db4',
        'Bb4', 'Ab4', 'F4',  'Eb4',
        'Ab4', 'F4',  'Eb4', 'Db4',
      ],
      harmonicaNotes: [
        'Ab4', 'Db5', 'F5',  'Db5',
        'Ab4', 'Eb5', 'Db5', 'Ab4',
        'Gb4', 'Ab4', 'Bb4', 'Db5',
        'F5',  'Eb5', 'Db5', 'Ab4',
      ],
    },
  },
};