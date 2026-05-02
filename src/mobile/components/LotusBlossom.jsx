import React, { useState } from 'react';
import { useSprings, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import './LotusBlossom.css';
import petal from '../assets/petal.png';

const petals = [
  { id: 1, title: 'Trending Realms' },
  { id: 2, title: 'Joined Realms' },
  { id: 3, title: 'Active Manifestations' },
  { id: 4, title: 'Past Manifestations' },
  { id: 5, title: 'Resources' },
];

const positions = [-2, -1, 0, 1, 2];

const LotusBlossom = () => {
  const [centerIndex, setCenterIndex] = useState(2);
  const [springs, api] = useSprings(petals.length, i => ({
    x: positions[i] * 100,
    scale: i === centerIndex ? 1.15 : 1,
    zIndex: i === centerIndex ? 5 : 4 - Math.abs(i - centerIndex),
  }));

  const bind = useDrag(({ down, movement: [mx] }) => {
    const newCenter = Math.round(centerIndex - mx / 100);
    if (!down && newCenter !== centerIndex) {
      setCenterIndex(Math.max(0, Math.min(petals.length - 1, newCenter)));
    }
    api.start(i => ({
      x: (positions[i] - centerIndex) * 100 + (down ? mx : 0),
      scale: i === centerIndex ? 1.15 : 1,
      zIndex: i === centerIndex ? 5 : 4 - Math.abs(i - centerIndex),
    }));
  });

  return (
    <div className="lotus-blossom" {...bind()}>
      {springs.map(({ x, scale, zIndex }, i) => (
        <animated.img
          key={petals[i].id}
          src={petal}
          alt={`petal ${petals[i].id}`}
          className={`petal petal-${i + 1}`}
          style={{
            transform: x.to(xVal => `translateX(${xVal}px) scale(${scale.get()})`),
            zIndex,
          }}
        />
      ))}
      <div className="petal-title">
        {petals[centerIndex].title}
      </div>
    </div>
  );
};

export default LotusBlossom;
