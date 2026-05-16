import { audioEngine } from "../audio/AudioEngine";

export function useAudio() {
  return {
    start: () => audioEngine.start(),
    trigger: (event, payload) => audioEngine.trigger(event, payload),
    dispatch: (event, payload) => audioEngine.trigger(event, payload)
  };
}
