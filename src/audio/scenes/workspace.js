// src/audio/scenes/workspace.js
//
// "DATA STREAM" — C Dorian, 92 BPM
//
// Head down. Systems optimal. The cowboy has become the machine — or at least
// learned to speak its language. C Dorian (natural minor with a raised 6th)
// gives that classic "dark but not hopeless" cyberpunk feel — Deus Ex, Blade
// Runner. Full percussion. Cyber arp is the most prominent it gets: a
// relentless 16th-note pulse that drives the session forward.
// No melody or harmonica — they'd distract from deep work.

export const workspaceScene = {
  bpm:            92,
  transitionTime:  2,
  mood: {
    stringsVol:       -11,
    brassVol:         -40,
    bassVol:          -14,
    percVol:          -16,
    reverbWet:         0.24,
    percussionActive:  true,
    choirActive:       false,
    arpActive:         false,
    cyberActive:       true,
    melodyActive:      false,
    arpDensity:        0.0,
    cyberDensity:      0.85,
    bassIntensity:     0.82,
    melodicMaterial: {
      progressions: [
        // Cm – Fm – Gm – Cm  (minor groove)
        [
          { notes: ['C3',  'Eb3', 'G3']  },
          { notes: ['F3',  'Ab3', 'C4']  },
          { notes: ['G3',  'Bb3', 'D4']  },
          { notes: ['C3',  'Eb3', 'G3']  },
        ],
        // Cm – Bb – Ab – G  (Andalusian descent, driving)
        [
          { notes: ['C3',  'Eb3', 'G3']  },
          { notes: ['Bb2', 'D3',  'F3']  },
          { notes: ['Ab2', 'C3',  'Eb3'] },
          { notes: ['G2',  'B2',  'D3']  },
        ],
        // Cm – Eb – Bb – Ab  (modal, slightly forward)
        [
          { notes: ['C3',  'Eb3', 'G3']  },
          { notes: ['Eb3', 'G3',  'Bb3'] },
          { notes: ['Bb2', 'D3',  'F3']  },
          { notes: ['Ab2', 'C3',  'Eb3'] },
        ],
      ],
      pentatonicHigh: [
        'C5', 'Eb5', 'G5', null, 'Bb5', null, 'G5', 'Eb5',
        null, null,  null, null, null,  null, null, null,
      ],
      // Cyber arp: relentless C minor pentatonic 16ths — the mission pulse
      cyberNotes: [
        'C5',  'Eb5', 'G5',  'C6',  null,  'Bb5', 'G5',  'Eb5',
        'C5',  'G5',  'Bb5', 'C6',  null,  'G5',  'Eb5', null,
      ],
      bassNotes: [
        'C1',  'G1',  'C1',  'Eb1',
        'F1',  'C1',  'F1',  'Ab1',
        'G1',  'D1',  'G1',  'Bb1',
        'C1',  'G1',  'Ab1', 'G1',
      ],
      // slide/harmonica not active in this scene — defined for swap correctness
      slideNotes: [
        'G4',  'Eb4', 'F4',  'G4',
        'Bb4', 'G4',  'Ab4', 'F4',
        'Eb4', 'D4',  'C4',  'Eb4',
        'G4',  'F4',  'Eb4', 'D4',
      ],
      harmonicaNotes: [
        'G4',  'C5',  'Eb5', 'G5',
        'C5',  'Eb5', 'G5',  'C6',
        'Ab4', 'C5',  'Eb5', 'F5',
        'G5',  'F5',  'Eb5', 'C5',
      ],
    },
  },
};