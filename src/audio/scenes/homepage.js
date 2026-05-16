// Landing — wide open sky, you just rode in to a new frontier
// Slow, ambient, cosmic pad dominant; harmonica and slide tell you this place has stories
export const homepageScene = {
  bpm: 68,
  mood: {
    stringsVol: -16,     // steel string barely audible — just texture
    brassVol: -18,       // harmonica forward — sets the emotional tone
    bassVol: -20,        // bass present but soft
    percVol: -60,        // no drums — silence of space
    reverbWet: 0.8,      // maximum reverb — you're out in the open
    percussionActive: false,
    choirActive: true,   // harmonica: yes — this is the face of the platform
    arpActive: false,    // no star arp — don't overcrowd the arrival
    melodyActive: true,  // slide: yes — gives the landing page a voice
    arpDensity: 0.2,
    bassIntensity: 0.3,
    melodicMaterial: {
      harmonicaNotes: [
        "D4", "G4", "B4", "G4",
        "D4", "G4", "B4", "D5",
        "E4", "G4", "A4", "G4",
        "D4", "B4", "A4", "G4",
      ],
      pentatonicHigh: [
        "G5", null, "A5", null, "B5", null, "D6", null,
        "E6", null, "G6", null, "B6", null, "D7", null,
      ]
    }
  },
};
