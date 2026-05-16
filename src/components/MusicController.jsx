import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAudio } from '../hooks/useAudio';
import { audioEngine } from '../audio/AudioEngine';

const MusicController = () => {
  const { activeContext, isCrisisMode } = useAppStore();
  const { trigger } = useAudio();

  // Handle context changes
  useEffect(() => {
    console.log(`MusicController: activeContext changed to ${activeContext}`);
    trigger('context.change', { context: activeContext });
  }, [activeContext, trigger]);

  // Handle crisis mode
  useEffect(() => {
    if (isCrisisMode) {
      trigger('context.change', { context: 'crisis' });
    } else {
      trigger('context.change', { context: activeContext });
    }
  }, [isCrisisMode, activeContext, trigger]);

  // Start theme music as soon as audioEngine is started
  useEffect(() => {
    let interval;
    const tryStartTheme = async () => {
        if (audioEngine.started) {
            console.log("MusicController: Audio Engine started detected, starting theme.");
            await audioEngine.startTheme();
            if (interval) clearInterval(interval);
        }
    };

    // Check immediately
    tryStartTheme();

    // Or poll until it starts (since browser gesture requirement is unpredictable)
    interval = setInterval(tryStartTheme, 1000);

    return () => {
        if (interval) clearInterval(interval);
    };
  }, []);

  return null;
};

export default MusicController;
