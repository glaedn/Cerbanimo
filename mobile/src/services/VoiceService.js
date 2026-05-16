import * as Speech from "expo-speech";

export const VoiceService = {
  speak: (text, options = {}) => {
    Speech.speak(text, {
      language: "en",
      pitch: 1.0,
      rate: 1.0,
      ...options
    });
  },

  announceMission: (mission) => {
    VoiceService.speak(`New mission received: ${mission.title}. Urgency: ${mission.urgency}.`);
  },

  announceCrisis: (active) => {
    VoiceService.speak(active ? "Crisis mode activated. Stay safe and follow tactical signals." : "Crisis mode deactivated.");
  },

  stop: () => {
    Speech.stop();
  }
};
