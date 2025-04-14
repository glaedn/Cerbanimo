import React, { useState, useEffect } from 'react';
import './IdleSpaceGame.css'; // Import your CSS file for styles

const IdleSpaceGame = () => {
  const [isWarping, setIsWarping] = useState(true);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [resourcesEarned, setResourcesEarned] = useState(0);
  const [spentTokens, setSpentTokens] = useState(0);
  const [availableTokens, setAvailableTokens] = useState(0); // Example initial value
  const [upgrades, setUpgrades] = useState({
    warpSpeed: 1,
    contactSpeed: 1,
    resourceBoost: 1
  });
  const [tick, setTick] = useState(0);
  const [showUpgradeMenu, setShowUpgradeMenu] = useState(false);
  const [twinkleStars, setTwinkleStars] = useState([]);
  const [planetStyle, setPlanetStyle] = useState({});
  // Initialize with empty array to prevent mapping errors
  const [landmassesStyle, setLandmassesStyle] = useState([]);
  const [planetAnimating, setPlanetAnimating] = useState('');
  const [planetInitialized, setPlanetInitialized] = useState(false);
  const [moons, setMoons] = useState([]);

  useEffect(() => {
    if (!isWarping && currentPhase > 0) {
      setPlanetAnimating('planet-enter');
    } else if (isWarping) {
      setPlanetAnimating('planet-exit');
    }
  }, [isWarping, currentPhase]);
  
  // Generate a random landmass pattern
  const generateLandmassPattern = (hue) => {
    const landmassCount = 2 + Math.floor(Math.random() * 10); // 1-12 landmasses
    let landmassStyles = [];
    
    for (let i = 0; i < landmassCount; i++) {
      // Generate random positioning and size for each landmass
      const top = Math.random() * 60;
      const left = Math.random() * 60;
      const size = 10 + Math.random() * 40; // Size between 10-50%
      const opacity = .8; // Opacity between 0.1-0.3
      
      // Color variations based on the planet's main hue
      const saturation = 60 + Math.random() * 20;
      const lightness = 30 + Math.random() * 40;
      const hueVariation = hue;
      
      landmassStyles.push({
        position: 'absolute',
        top: `${top}%`,
        left: `${left}%`,
        width: `${size}%`,
        height: `${size}%`,
        borderRadius: `${50 + Math.random() * 50}%`,
        backgroundColor: `hsla(${hueVariation}, ${saturation}%, ${lightness}%, ${opacity})`,
        boxShadow: `0 0 ${Math.random() * 10}px hsla(${hueVariation}, ${saturation}%, ${lightness}%, ${opacity / 2})`,
        transform: `rotate(${Math.random() * 360}deg)`,
        filter: `blur(${1 + Math.random() * 2}px)`,
        mixBlendMode: 'overlay'
      });
    }
    
    return landmassStyles;
  };
  
  useEffect(() => {
    // Only initialize planet style when arriving (Phase 1) and not yet initialized
    if (currentPhase === 1 && !planetInitialized) {
      const randomHue = Math.floor(Math.random() * 360);
      const randomSize = 100 + Math.random() * 40;
      const moonCount = 1 + Math.floor(Math.random() * 3); // 1-3 moons
      let generatedMoons = [];

      for (let i = 0; i < moonCount; i++) {
        const size = 20 + Math.random() * 20; // 20-40px
        const distance = 80 + Math.random() * 20; // orbital distance
        const duration = `${150 + Math.random() * 50}s`;
        const moonHue = (randomHue + 180 + Math.random() * 40) % 360;

        generatedMoons.push({
          size,
          distance,
          color: `hsl(${moonHue}, 60%, 70%)`,
          animationDuration: duration,
        });
      }
      setMoons(generatedMoons);
      // Generate planet base style
      setPlanetStyle({
        background: `radial-gradient(circle at 40% 40%, hsl(${randomHue}, 80%, 60%), hsl(${randomHue}, 70%, 20%))`,
        width: `${randomSize}px`,
        height: `${randomSize}px`,
        boxShadow: `0 0 30px hsl(${randomHue}, 90%, 50%)`,
      });
    
      // Generate landmasses for this planet
      setLandmassesStyle(generateLandmassPattern(randomHue));
      
      setPlanetInitialized(true);
    }
  
    // Reset when starting a new warp
    if (currentPhase === 0 && isWarping) {
      setPlanetInitialized(false);
    }
  }, [currentPhase, isWarping]);

  useEffect(() => {
    if (isWarping) {
      const timeout = setTimeout(() => {
        setIsWarping(false);
        setCurrentPhase(1);
      }, 10000 / upgrades.warpSpeed);
      return () => clearTimeout(timeout);
    }
  }, [isWarping, upgrades.warpSpeed]);

  useEffect(() => {
    if (currentPhase > 0 && currentPhase <= 3) {
      const timeout = setTimeout(() => {
        if (currentPhase < 3) {
          setCurrentPhase(currentPhase + 1);
        } else {
          setResourcesEarned(prev => prev + upgrades.resourceBoost);
          setCurrentPhase(0);
          setIsWarping(true);
        }
      }, 10000 / upgrades.contactSpeed);
      return () => clearTimeout(timeout);
    }
  }, [currentPhase, upgrades.contactSpeed, upgrades.resourceBoost]);

  const phaseTexts = [
    '',
    'Making first contact...',
    'Establishing trade agreements...',
    'Exchanging resources...'
  ];

  useEffect(() => {
    const generatedStars = Array.from({ length: 60 }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 4}s`
    }));
    setTwinkleStars(generatedStars);
  }, []);
  
  // Function to handle upgrade purchases
  const handleUpgrade = (upgradeType) => {
    if (availableTokens > 0) {
      setUpgrades(prev => ({
        ...prev,
        [upgradeType]: prev[upgradeType] + 1
      }));
      setAvailableTokens(prev => prev - 1);
      setSpentTokens(prev => prev + 1);
    }
  };

  // Added function to award tokens
  const awardToken = () => {
    setAvailableTokens(prev => prev + 1);
  };

  // Award a token every 10 resources
  useEffect(() => {
    if (resourcesEarned > 0 && resourcesEarned % 10 === 0) {
      awardToken();
    }
  }, [resourcesEarned]);

  // Custom moon orbital animation
  const getMoonStyle = (moon, index) => {
    const orbitDuration = parseFloat(moon.animationDuration) * 100;
    const orbitPosition = (Date.now() % orbitDuration) / orbitDuration;
    const angle = 2 * Math.PI * orbitPosition;
    const sinVal = Math.sin(angle);
    const cosVal = Math.cos(angle);
  
    const isFront = sinVal > 0;
    const distance = moon.distance;
    const xPos = Math.cos(angle) * distance * 1.5;
    const yPos = Math.sin(angle) * distance * ((index % 3 - 1) * 0.1);
  
    const scale = isFront ? 1 : 0.7;
  
    return {
      width: `${moon.size}px`,
      height: `${moon.size}px`,
      backgroundColor: moon.color,
      transform: `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px)) scale(${scale})`,
      zIndex: isFront ? 3 : 1,
      filter: isFront ? 'drop-shadow(0 0 6px currentColor)' : 'drop-shadow(0 0 2px currentColor) brightness(0.8)',
      transition: 'transform 1s ease, filter 1s ease',
    };
  };

  // Animation frame for moon orbits
  useEffect(() => {
    let animationFrameId;
    const update = () => {
      setTick(prev => prev + 1); // Force re-render
      animationFrameId = requestAnimationFrame(update);
    };
  
    if (!isWarping && moons.length > 0) {
      animationFrameId = requestAnimationFrame(update);
    }
  
    return () => cancelAnimationFrame(animationFrameId);
  }, [isWarping, moons]);
  

  return (
    <div className="space-game-container">
      {/* Background effects - now positioned with lower z-index */}
      <div className={`starfield ${!isWarping ? 'paused' : ''}`}
        style={{
          '--warp-speed': !isWarping ? '12s' : '3s',
          zIndex: 0,
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      >
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * -100}%`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              '--scale': Math.random() * 1.5 + 0.5,
            }}
          />
        ))}
      </div>
      
      <div className={`twinkle-field ${isWarping ? 'fade-out' : 'fade-in'}`}
        style={{
          zIndex: 0,
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      >
        {twinkleStars.map((star, i) => (
          <div
            key={i}
            className="twinkle-star"
            style={star}
          />
        ))}
      </div>


      {/* Main game interface */}
      <div className="w-full h-screen flex flex-col items-center justify-center relative">
        {/* Holographic UI container */}
        <div className="holographic-container relative z-10 w-full max-w-4xl mx-auto">
          {/* Top status bar */}
          <div className="status-bar flex justify-between p-4 border-b border-cyan-400/30">
            <div className="resource-display holo-text text-lg">
              <span className="text-cyan-300">Resources:</span> {resourcesEarned}
            </div>
            <div className="token-display holo-text text-lg">
              <span className="text-cyan-300">Spent Tokens:</span> {spentTokens}
              <br />
              <span className="text-cyan-300">Available Tokens:</span> {availableTokens}
            </div>
          </div>

          {/* Main content area */}
          <div className="holo-content-area p-8 flex flex-col items-center justify-center min-h-64">
            {!isWarping && (
              <div className="planet-interface text-center">
                <div className="text-2xl mb-4 holo-glow text-cyan-100">Planet Detected</div>
                <div className="text-xl mb-4 holo-pulse">{phaseTexts[currentPhase]}</div>
                <div className="flex space-x-4 justify-center mt-6">
                  {[1, 2, 3].map(n => (
                    <div
                      key={n}
                      className={`w-8 h-8 border-2 rounded-full flex items-center justify-center transition-all duration-300 ${
                        currentPhase >= n 
                          ? 'bg-cyan-400/70 border-cyan-200 text-black holo-glow' 
                          : 'bg-transparent border-cyan-400/50'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            )}
            
            {isWarping && (
              <div className="warp-status text-center">
                <div className="text-2xl holo-pulse text-cyan-100">Warping to Next System</div>
                <div className="loading-bar mt-6 w-64 h-2 bg-cyan-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400/70 rounded-full animate-warp-progress"></div>
                </div>
              </div>
            )}
          </div>

          {/* Control panel */}
          <div className="control-panel border-t border-cyan-400/30 p-4 flex justify-center">
            <button
              onClick={() => setShowUpgradeMenu(prev => !prev)}
              className="holo-button px-6 py-3 bg-cyan-900/50 border border-cyan-400/70 rounded text-cyan-100 hover:bg-cyan-800/50 transition-all"
            >
              {showUpgradeMenu ? 'Close Upgrades' : 'Open Upgrades'}
            </button>
          </div>
        </div>

        {/* Upgrade menu overlay */}
        {showUpgradeMenu && (
          <div className="upgrade-menu-container absolute bottom-40 z-20 bg-black/80 border border-cyan-400/50 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-xl text-cyan-200 mb-4 border-b border-cyan-500/30 pb-2">Ship Upgrades</h3>
            
            <div className="upgrades-list space-y-4">
              <div className="upgrade-item flex justify-between items-center">
                <div>
                  <div className="text-cyan-100">Warp Drive Efficiency</div>
                  <div className="text-xs text-cyan-400/70">Current Level: {upgrades.warpSpeed}</div>
                </div>
                <button 
                  onClick={() => handleUpgrade('warpSpeed')}
                  className={`holo-button px-3 py-1 bg-cyan-900/50 border border-cyan-400/50 rounded text-cyan-100 text-sm hover:bg-cyan-800/50 ${availableTokens <= 0 ? 'opacity-50' : ''}`}
                  disabled={availableTokens <= 0}
                >
                  Upgrade
                </button>
              </div>
              
              <div className="upgrade-item flex justify-between items-center">
                <div>
                  <div className="text-cyan-100">Contact Systems</div>
                  <div className="text-xs text-cyan-400/70">Current Level: {upgrades.contactSpeed}</div>
                </div>
                <button 
                  onClick={() => handleUpgrade('contactSpeed')}
                  className={`holo-button px-3 py-1 bg-cyan-900/50 border border-cyan-400/50 rounded text-cyan-100 text-sm hover:bg-cyan-800/50 ${availableTokens <= 0 ? 'opacity-50' : ''}`}
                  disabled={availableTokens <= 0}
                >
                  Upgrade
                </button>
              </div>
              
              <div className="upgrade-item flex justify-between items-center">
                <div>
                  <div className="text-cyan-100">Resource Collectors</div>
                  <div className="text-xs text-cyan-400/70">Current Level: {upgrades.resourceBoost}</div>
                </div>
                <button 
                  onClick={() => handleUpgrade('resourceBoost')}
                  className={`holo-button px-3 py-1 bg-cyan-900/50 border border-cyan-400/50 rounded text-cyan-100 text-sm hover:bg-cyan-800/50 ${availableTokens <= 0 ? 'opacity-50' : ''}`} 
                  disabled={availableTokens <= 0}
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Planet and moons with JS-based animation instead of CSS animation */}
      <div className="planet-container">
  <div className={`planet-animation ${!isWarping ? 'planet-enter' : 'planet-exit'}`}>
    {/* Moons now placed directly in the container */}
    {!isWarping && moons.map((moon, index) => (
      <div
        key={index}
        className="moon"
        style={getMoonStyle(moon, index)}
      />
    ))}
    <div
      className={`planet ${currentPhase === 0 ? 'hidden' : ''}`}
      style={{
        ...planetStyle,
        overflow: 'hidden',
        position: 'relative',
        margin: '0 auto',
        transition: 'all 1s ease',
        zIndex: 2, // Planet in middle of stack
      }}
    >
      {landmassesStyle.map((style, index) => (
        <div key={index} style={style} className="landmass"></div>
      ))}
    </div>
  </div>
</div>
<div className={`spaceship-container ${isWarping ? 'warp' : ''}`}>
  <div className="ship-body">
  <div className="spaceship">
  <div className="spaceship-wing left"></div>
<div className="spaceship-body"></div>
<div className="cockpit"></div>
    <div className="body-core"></div>
  <div className="spaceship-wing right"></div>
  {isWarping &&
  Array.from({ length: 10 }).map((_, i) => (
    <div
      key={i}
      className="spark"
      style={{
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2.5}s`,
        transform: `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`
      }}
    />
  ))}
</div>
{isWarping &&
  [0, 0.5, 1].map((delay, i) => (
    <div
      key={i}
      className="warp-ring"
      style={{ animationDelay: `${delay}s` }}
    />
  ))}
  <div className={`thruster ${isWarping ? 'active' : ''}`} />
    
  </div>
</div>
    </div>
  );
};

export default IdleSpaceGame;