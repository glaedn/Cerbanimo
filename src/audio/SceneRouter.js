import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { audioEngine } from './AudioEngine';

const routeToSceneMap = [
  { pattern: /^\/governance/, scene: 'governance' },
  { pattern: /^\/profile\/skill-constellation/, scene: 'skill-galaxy' },
  { pattern: /^\/guilds/, scene: 'guild-hub' },
  { pattern: /^\/communities/, scene: 'community' },
  { pattern: /^\/communityhub/, scene: 'community' },
  { pattern: /^\/onboarding/, scene: 'onboarding' },
  { pattern: /^\/dashboard/, scene: 'normal' },
  { pattern: /^\/marketplace/, scene: 'marketplace' },
  { pattern: /^\/tasks/, scene: 'marketplace' },
  { pattern: /^\/needs/, scene: 'marketplace' },
  { pattern: /^\/impact-atlas/, scene: 'atlas' },
  { pattern: /^\/federation-atlas/, scene: 'atlas' },
  { pattern: /^\/$/, scene: 'landing' }
];

const SceneRouter = () => {
  const location = useLocation();

  useEffect(() => {
    const route = routeToSceneMap.find(m => m.pattern.test(location.pathname));
    const scene = route ? route.scene : 'normal';

    console.log(`SceneRouter: path ${location.pathname} mapped to scene ${scene}`);
    audioEngine.trigger('context.change', { context: scene });
  }, [location.pathname]);

  return null;
};

export default SceneRouter;
