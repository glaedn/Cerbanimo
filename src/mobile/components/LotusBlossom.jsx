import React, { useState, useRef } from 'react';
import { useSprings, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { dummyData } from '../dummyData';
import './LotusBlossom.css';

const { petals } = dummyData.lotusBlossom;
const PETAL_WIDTH = 90; // width of a petal
const CONTAINER_WIDTH = 390; // width of the mobile canvas

const LotusBlossom = () => {
  const [index, setIndex] = useState(Math.floor(petals.length / 2)); // Start in the middle
  const clickTimer = useRef(null);

  const handlePetalClick = (i) => {
    if (clickTimer.current) {
      // Double click
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      console.log(`Double tapped on petal: ${petals[i].title}. Transition to Focused Lotus View.`);
    } else {
      // Single click
      clickTimer.current = setTimeout(() => {
        console.log(`Single tapped on petal: ${petals[i].title}. Reveal description bubble.`);
        clickTimer.current = null;
      }, 250); // 250ms delay to wait for a potential second click
    }
  };


  // Function to set the springs based on the current index
  const getSprings = (currentIndex) => (i) => {
    const isActive = i === currentIndex;
    // Corrected calculation for 'x' to center the petals properly
    const x = (i - currentIndex) * (PETAL_WIDTH / 2) + (CONTAINER_WIDTH / 2) - (PETAL_WIDTH / 2);
    const rot = (i - currentIndex) * 15;
    const scale = isActive ? 1.2 : 1;
    const zIndex = petals.length - Math.abs(i - currentIndex);

    // Simplified display logic: always render, let transform and zIndex handle visibility
    return {
      to: {
        transform: `translateX(${x}px) rotateY(${rot}deg) scale(${scale})`,
        zIndex,
        filter: `drop-shadow(0 0 ${isActive ? '25px' : '10px'} var(--glow-color-${petals[i].type || 'default'}))`,
      },
      config: { mass: 1, tension: 280, friction: 60 },
    };
  };

  const [springs, api] = useSprings(petals.length, getSprings(index));

  const bind = useDrag(({ down, movement: [mx], direction: [xDir], distance, cancel, active }) => {
    if (distance > 10) { // If drag distance is significant, cancel any pending click
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
        }
    }
    if (!active && distance > PETAL_WIDTH / 4) {
        const newIndex = Math.min(Math.max(0, index + (mx > 0 ? -1 : 1)), petals.length - 1);
        setIndex(newIndex);
    }
    api.start(getSprings(index));
  });

  // Center on the initial render
  React.useEffect(() => {
    api.start(getSprings(index));
  }, []);


  return (
    <div className="lotus-blossom-container">
      <div className="lotus-blossom" {...bind()}>
        {springs.map((styles, i) => (
          <animated.div
            key={petals[i].id}
            className={`petal petal-type-${petals[i].type}`}
            style={styles}
            onClick={() => handlePetalClick(i)}
          >
            <div className="petal-content">
              <h3>{petals[i].title}</h3>
              <p>{petals[i].capability}</p>
            </div>
          </animated.div>
        ))}
      </div>
    </div>
  );
};

export default LotusBlossom;
