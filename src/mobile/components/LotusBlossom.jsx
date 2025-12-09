import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, a } from '@react-spring/three';
import { useDrag } from '@use-gesture/react';

const Petal = ({ type, ...props }) => {
  const mesh = useRef();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0, 0, -0.5, 1, 0, 1.5);
  shape.bezierCurveTo(0, 1.5, 0.5, 1, 0, 0);

  const color = {
    realm: 'hsl(270, 100%, 80%)', // pale violet
    manifestation: 'hsl(180, 100%, 80%)', // icy cyan
    completed: 'hsl(50, 100%, 80%)', // soft gold
    blocked: 'hsl(0, 100%, 80%)', // dim red ember
  }[type] || 'hsl(300, 100%, 80%)'; // default

  const emissive = {
    realm: 'hsl(270, 100%, 50%)',
    manifestation: 'hsl(180, 100%, 50%)',
    completed: 'hsl(50, 100%, 50%)',
    blocked: 'hsl(0, 100%, 50%)',
  }[type] || 'hsl(300, 100%, 50%)';

  return (
    <mesh {...props} ref={mesh}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={1} toneMapped={false} />
    </mesh>
  );
};

const LotusBlossom = ({ petals: petalData }) => {
  const group = useRef();
  const petalCount = petalData.length;
  const radius = 2;

  const [spring, api] = useSpring(() => ({
    rotation: [0, 0, 0],
    config: { mass: 1, tension: 280, friction: 60 },
  }));

  const bind = useDrag(({ movement: [mx], down }) => {
    api.start({ rotation: [0, mx / 100, 0] });
  });

  const petals = petalData.map((petal, i) => {
    const angle = (i - Math.floor(petalCount / 2)) * (Math.PI / 6);
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius;
    const rotationY = -angle;

    return (
      <Petal
        key={petal.id}
        type={petal.type}
        position={[x, 0, z]}
        rotation={[0, rotationY, 0]}
        scale={[0.9, 0.9, 0.9]}
      />
    );
  });

  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 50 }} {...bind()}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <a.group ref={group} {...spring}>
        {petals}
      </a.group>
      <OrbitControls enabled={false} />
    </Canvas>
  );
};

export default LotusBlossom;
