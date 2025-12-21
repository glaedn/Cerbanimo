import React, { useState, useRef, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import { dummyData } from '../dummyData';
import './DoubleHelix.css';

const Tooltip = ({ text, x, y, visible }) => {
  const { opacity, transform } = useSpring({
    opacity: visible ? 1 : 0,
    transform: `translate(${x}px, ${y - 30}px) scale(${visible ? 1 : 0.8})`,
    config: { tension: 300, friction: 20 },
  });

  return (
    <animated.div
      className="tooltip"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        opacity,
        transform,
      }}
    >
      {text}
    </animated.div>
  );
};


const DoubleHelix = () => {
  const orbs = dummyData.doubleHelix;
  const [scrollX, setScrollX] = useState(0);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const tapTimeout = useRef(null);

  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const handleOrbClick = (e, orb) => {
     e.stopPropagation(); // Prevent drag gesture from firing
    if (tapTimeout.current) {
      clearTimeout(tapTimeout.current);
      tapTimeout.current = null;
      console.log(`Double tapped on: ${orb.title}`);
      setTooltip({ visible: false });
    } else {
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;

      setTooltip({
        visible: true,
        text: orb.title,
        x: x,
        y: y
      });

      tapTimeout.current = setTimeout(() => {
        tapTimeout.current = null;
        // Hide tooltip after a delay if it's a single tap
        setTimeout(() => setTooltip(t => ({ ...t, visible: false })), 2000);
      }, 300); // 300ms window for double tap
    }
  };

  const bind = useGesture({
    onDrag: ({ offset: [dx] }) => {
      setScrollX(dx);
    },
    onDragStart: () => setTooltip({ visible: false }),
  });

  const getOrbPosition = useCallback((index, total) => {
    const width = 800; // Wider virtual canvas for scrolling
    const height = 150;
    const phase = scrollX * 0.01;
    const x = (index / total) * width;
    const angle = (x / width) * 4 * Math.PI + phase;
    const y1 = height / 2 + Math.sin(angle) * 50;
    const y2 = height / 2 + Math.cos(angle) * 50;
    return index % 2 === 0 ? { x, y: y1 } : { x, y: y2 };
  }, [scrollX]);

  return (
    <div ref={containerRef} className="double-helix-container" {...bind()}>
       {tooltip.visible && <Tooltip {...tooltip} />}
      <svg ref={svgRef} className="double-helix-svg" viewBox="0 0 400 150">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {orbs.map((_, index) => {
          const { x, y } = getOrbPosition(index, orbs.length);
          const nextPos = getOrbPosition(index + 1, orbs.length);
           return (
              <path
                key={`path-${index}`}
                className="helix-path"
                d={`M ${x} ${y} C ${(x + nextPos.x) / 2} ${y}, ${(x + nextPos.x) / 2} ${nextPos.y}, ${nextPos.x} ${nextPos.y}`}
              />
           );
        })}
        {orbs.map((orb, index) => {
          const { x, y } = getOrbPosition(index, orbs.length);
          return (
            <circle
              key={orb.id}
              className="helix-orb"
              cx={x}
              cy={y}
              style={{ '--glow-color': orb.glowColor }}
              onClick={(e) => handleOrbClick(e, orb)}
            />
          );
        })}
      </svg>
    </div>
  );
};

export default DoubleHelix;
