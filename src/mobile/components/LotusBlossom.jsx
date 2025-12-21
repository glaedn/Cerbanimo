import React, { useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { dummyData } from '../dummyData';
import './LotusBlossom.css';

const { petals } = dummyData.lotusBlossom;

const PETAL_WIDTH = 90;
const FAN_ANGLE = 50;
const LIFT = 120;
const VISIBLE_COUNT = 7;
const HALF = Math.floor(VISIBLE_COUNT / 2);

const getWrappedIndex = (i, length) =>
  ((i % length) + length) % length;

const wrap = (v, range) => {
  const r = range * 2 + 1;
  return ((v % r) + r) % r - range;
};

const LotusBlossom = () => {
  const dragging = useRef(false);

  const [{ pos }, api] = useSpring(() => ({
    pos: 0,
    config: { mass: 1, tension: 280, friction: 36 }
  }));

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx], last }) => {
      if (down) dragging.current = true;

      const delta = mx / PETAL_WIDTH;

      if (down) {
        api.start({ pos: pos.get() - delta, immediate: true });
      } else if (last) {
        const momentum = vx * dx * 3;
        api.start({
          pos: Math.round(pos.get() + momentum),
          immediate: false
        });
        dragging.current = false;
      }
    },
    { filterTaps: true, rubberband: true }
  );

  return (
    <div className="lotus-blossom-container">
      <div className="lotus-blossom" {...bind()}>
        {Array.from({ length: VISIBLE_COUNT }).map((_, slot) => (
          <animated.div
            key={slot}
            className="petal"
            onClick={() => {
              if (dragging.current) return;

              api.start({
                pos: Math.round(pos.get()) + (slot - HALF),
                immediate: false
              });
            }}
            style={{
              transform: pos.to(p => {
                const offset = wrap(slot - HALF - p, HALF);
                const angle = offset * (FAN_ANGLE / VISIBLE_COUNT);

                return `
                  rotateZ(${angle}deg)
                  translateY(${-LIFT}px)
                  scale(${Math.abs(offset) < 0.01 ? 1.15 : 1})
                `;
              }),
              opacity: pos.to(p => {
                const o = Math.abs(wrap(slot - HALF - p, HALF));
                return o > HALF ? 0 : 1;
              }),
              zIndex: pos.to(p =>
                Math.round(100 - Math.abs(wrap(slot - HALF - p, HALF)) * 10)
              )
            }}
          >
            <div className="petal-content">
              <animated.h3>
                {pos.to(p => {
                  const idx = getWrappedIndex(
                    Math.round(p) + slot - HALF,
                    petals.length
                  );
                  return petals[idx].title;
                })}
              </animated.h3>

              <animated.p>
                {pos.to(p => {
                  const idx = getWrappedIndex(
                    Math.round(p) + slot - HALF,
                    petals.length
                  );
                  return petals[idx].capability;
                })}
              </animated.p>
            </div>
          </animated.div>
        ))}
      </div>
    </div>
  );
};

export default LotusBlossom;
