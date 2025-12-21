import React, { useState, useRef } from 'react';
import { useSpring, a } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import { dummyData } from '../dummyData';
import './LotusBlossom.css';

const Petal = ({ item, style }) => {
  const [tapped, setTapped] = useState(false);
  const tapTimeout = useRef(null);

  const handleClick = () => {
    if (tapTimeout.current) {
      // Double tap
      clearTimeout(tapTimeout.current);
      tapTimeout.current = null;
      console.log(`Double tapped on: ${item.title}`);
      // Add navigation/action for double tap here
    } else {
      // Single tap
      setTapped(true);
      console.log(`Single tapped on: ${item.title}`);
      tapTimeout.current = setTimeout(() => {
        tapTimeout.current = null;
        setTapped(false);
      }, 300); // 300ms window for double tap
    }
  };

  const glowColor = tapped ? 'var(--glow-color-active, #0ff)' : item.glowColor;

  return (
    <a.div
      className="petal"
      style={{ ...style, '--glow-color': glowColor }}
      onClick={handleClick}
    >
      <h3>{item.title}</h3>
      <p>{item.type}</p>
    </a.div>
  );
};

const LotusBlossom = () => {
  const [rotation, setRotation] = useState(0);
  const petals = dummyData.lotusBlossom;
  const angleStep = 360 / petals.length;

  const bind = useGesture({
    onDrag: ({ down, movement: [mx] }) => {
      if (down) {
        setRotation(mx * 0.5); // Adjust sensitivity
      } else {
        // Snap to nearest petal
        const nearestAngle = Math.round(rotation / angleStep) * angleStep;
        setRotation(nearestAngle);
      }
    },
  });

  const { y } = useSpring({ y: rotation });

  return (
    <div className="lotus-blossom-container" {...bind()}>
      <a.div className="lotus-blossom" style={{ transform: y.to(r => `rotateY(${r}deg)`) }}>
        {petals.map((item, index) => {
          const angle = index * angleStep;
          return (
            <Petal
              key={item.id}
              item={item}
              style={{
                transform: `rotateY(${angle}deg) translateZ(150px)`,
              }}
            />
          );
        })}
      </a.div>
    </div>
  );
};

export default LotusBlossom;
