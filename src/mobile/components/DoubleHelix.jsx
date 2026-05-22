import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import useUserProjects from '../../hooks/useUserProjects';
import './DoubleHelix.css';

const WIDTH = 490;
const HEIGHT = 120;
const AMPLITUDE = 30;
const FREQUENCY = 0.12;
const SEGMENTS = 120;



const HELIX_SPEED = 0.0006; // base helix drift
const ORB_SPEED_MULTIPLIER = 1; // orbs move slightly faster

const DoubleHelix = ({ spineHeight }) => {
  const { profile } = useUserProfile();
  const { projects } = useUserProjects(profile?.id);

  const orbs = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    return projects.map(proj => ({
      id: proj.id,
      title: proj.name,
      description: proj.description,
      status: proj.status === 'active' ? 'healthy' : (proj.status === 'blocked' ? 'stalled' : 'progressing')
    }));
  }, [projects]);

  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeOrb, setActiveOrb] = useState(null);
  const [dragging, setDragging] = useState(false);
  const velocity = useRef(0);
  const lastMoveTime = useRef(0);
  const speed = Math.min(Math.abs(velocity.current) * 600, 8);
  const [hoveredOrbId, setHoveredOrbId] = useState(null);


  const lastX = useRef(0);
  const rafRef = useRef(null);

  /* --- animation loop --- */
  useEffect(() => {
    const animate = () => {
      if (!paused && !dragging && !activeOrb && !hoveredOrbId) {
        setTime(t => t + HELIX_SPEED);
      }


      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, dragging, activeOrb, hoveredOrbId]);

  /* --- sine path generator --- */
  const generatePath = (phase) => {
    let path = `M 0 ${HEIGHT / 2}`;
    for (let i = 0; i <= SEGMENTS; i++) {
      const x = (WIDTH / SEGMENTS) * i;
      const y =
        HEIGHT / 2 +
        Math.sin(phase + i * FREQUENCY) * AMPLITUDE;
      path += ` L ${x} ${y}`;
    }
    return path;
  };

  const strandPhase = time * Math.PI * 2;

  /* --- interaction handlers --- */
  const handlePointerDown = (e) => {
    setDragging(true);
    setPaused(true);
    lastX.current = e.clientX || e.touches?.[0]?.clientX;
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const x = e.clientX || e.touches?.[0]?.clientX;
    const now = performance.now();
    const deltaX = x - lastX.current;
    const deltaTime = now - (lastMoveTime.current || now);
    const magneticPull =
      dragging && Math.abs(x - WIDTH / 2) < 40
        ? (x - WIDTH / 2) * 0.000015
        : 0;

    const delta = deltaX * 0.0008;
    velocity.current = delta / Math.max(deltaTime, 1);

    setTime(t => t - delta + magneticPull);


    lastX.current = x;
    lastMoveTime.current = now;

  };

  const handlePointerUp = () => {
    setDragging(false);

    let v = velocity.current * 16; // scale for frame time
    velocity.current = 0;

    const decay = () => {
      if (Math.abs(v) < 0.00001 || activeOrb) {
        setPaused(false);
        return;
      }

      setTime(t => t - v);
      v *= 0.92; // friction
      requestAnimationFrame(decay);
    };

    requestAnimationFrame(decay);
  };


  const centerOrb = (index) => {
    if (orbs.length === 0) return;
    const baseProgress = index / orbs.length;
    const targetTime = 0.5 - baseProgress;

    let start = time;
    let startTime = null;
    const duration = 400;

    const animateCenter = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / duration, 1);

      // smooth ease
      const eased =
        t === 1
          ? 1
          : 1 + Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3);


      setTime(start + (targetTime - start) * eased);

      if (t < 1) {
        requestAnimationFrame(animateCenter);
      }
    };

    requestAnimationFrame(animateCenter);
  };


  return (
    <div
      className="double-helix-container"
      style={{
        '--spine-height': `${spineHeight}px`,
        cursor: dragging
          ? 'grabbing'
          : hoveredOrbId
            ? 'pointer'
            : 'grab'
      }}
      onClick={() => {
        if (activeOrb) {
          setActiveOrb(null);
          setPaused(false);
        }
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >

      <svg
        className="double-helix-svg"
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <defs>
          <linearGradient id="helixGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* strands */}
        <path
          d={generatePath(strandPhase)}
          className="helix-strand"
          style={{ filter: `blur(${speed}px)` }}
        />

        <path
          d={generatePath(strandPhase + Math.PI)}
          className="helix-strand"
          style={{ filter: `blur(${speed}px)` }}
        />

        {/* orbs */}
        {orbs.map((orb, i) => {
          const baseProgress = orbs.length > 0 ? i / orbs.length : 0;
          const orbTime =
            (time * ORB_SPEED_MULTIPLIER + baseProgress) % 1;

          const x = WIDTH * orbTime;
          const strandOffset = i % 2 === 0 ? 0 : Math.PI;
          const y =
            HEIGHT / 2 +
            Math.sin(
              strandPhase * ORB_SPEED_MULTIPLIER +
              strandOffset +
              orbTime * SEGMENTS * FREQUENCY
            ) *
            AMPLITUDE;

          const centerDistance = Math.abs(x - WIDTH / 2);
          const nearCenter = centerDistance < 18;

          return (
            <g
              key={orb.id}
              onMouseEnter={() => setHoveredOrbId(orb.id)}
              onMouseLeave={() => setHoveredOrbId(null)}
              onTouchStart={() => setHoveredOrbId(orb.id)}
              onTouchEnd={() => setHoveredOrbId(null)}
              onClick={(e) => {
                e.stopPropagation();
                setPaused(true);
                centerOrb(i);
                setActiveOrb(orb);
              }}
            >

              <circle
                cx={x}
                cy={y}
                r={nearCenter ? 8 : 6}
                className={`helix-orb orb-status-${orb.status}`}
                style={{
                  filter: hoveredOrbId === orb.id
                    ? 'drop-shadow(0 0 10px rgba(120,220,255,0.85))'
                    : 'url(#glow)',
                  transform: hoveredOrbId === orb.id ? 'scale(1.1)' : 'scale(1)',
                  transformOrigin: `${x}px ${y}px`,
                  transition: 'filter 120ms ease, transform 120ms ease'
                }}

              />

              {nearCenter && !activeOrb && (
                <text
                  x={x}
                  y={y - 14}
                  className="orb-float-title"
                >
                  {orb.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {activeOrb && (
        <div
          className="orb-popup"
          onClick={(e) => e.stopPropagation()}
        >

          <h4>{activeOrb.title}</h4>
          <p>{activeOrb.description}</p>
          <div className="orb-popup-actions">
            <button
              className="orb-explore-btn"
              onClick={(e) => {
                e.stopPropagation();
                // placeholder navigation
                console.log('Explore', activeOrb.id);
              }}
            >
              Explore
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default DoubleHelix;
