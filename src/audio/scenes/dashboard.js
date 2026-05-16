// Dashboard — the command deck, the saloon, the place where things happen
// Full groove: steel string picking, bass walking, light percussion
// The arp adds that starfield shimmer overhead
export const dashboardScene = {
  bpm: 76,
  mood: {
    stringsVol: -12,     // steel string: full presence — this is the heartbeat
    brassVol: -28,       // harmonica: quiet undertone
    bassVol: -16,        // bass: solid walking foundation
    percVol: -20,        // drums: present but not aggressive
    reverbWet: 0.45,
    percussionActive: true,
    choirActive: false,  // harmonica: off — let the steel string carry it
    arpActive: true,     // star arp: on — stars overhead while you work
    melodyActive: false, // slide: off — melody reserved for quieter moments
    arpDensity: 0.5,
    bassIntensity: 0.6,
  }
};
