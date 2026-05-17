import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { audioEngine } from './AudioEngine';

const routeToSceneMap = [
  { pattern: /^\/orbit/, scene: 'dashboard' },
  { pattern: /^\/missions/, scene: 'workspace' },
  { pattern: /^\/commons/, scene: 'community' },
  { pattern: /^\/signals/, scene: 'governance' },
  { pattern: /^\/governance/, scene: 'governance' },
  { pattern: /^\/profile\/skill-constellation/, scene: 'skill-galaxy' },
  { pattern: /^\/guilds/, scene: 'guild-hub' },
  { pattern: /^\/communities/, scene: 'community' },
  { pattern: /^\/communityhub/, scene: 'community' },
  { pattern: /^\/onboarding/, scene: 'onboarding' },
  { pattern: /^\/dashboard/, scene: 'dashboard' },
  { pattern: /^\/marketplace/, scene: 'community' },
  { pattern: /^\/tasks/, scene: 'workspace' },
  { pattern: /^\/needs/, scene: 'community' },
  { pattern: /^\/impact-atlas/, scene: 'governance' },
  { pattern: /^\/federation-atlas/, scene: 'governance' },
  { pattern: /^\/$/, scene: 'homepage' }
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
