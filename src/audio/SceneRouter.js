import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { audioEngine } from './AudioEngine';

const routeToSceneMap = [
  { pattern: /^\/orbit/, scene: 'dashboard' },
  { pattern: /^\/missions/, scene: 'workspace' },
  { pattern: /^\/commons/, scene: 'community' },
  { pattern: /^\/signals/, scene: 'governance' },
  { pattern: /^\/orbit\/skills/, scene: 'skill-galaxy' },
  { pattern: /^\/commons\/guilds/, scene: 'guild-hub' },
  { pattern: /^\/commons\/marketplace/, scene: 'community' },
  { pattern: /^\/commons\/communities/, scene: 'community' },
  { pattern: /^\/missions\/tasks/, scene: 'workspace' },
  { pattern: /^\/onboarding/, scene: 'onboarding' },
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
