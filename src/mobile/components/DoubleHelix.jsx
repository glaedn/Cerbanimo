import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

// A single status orb
const StatusOrb = ({ health, ...props }) => {
  const color = health > 0.8 ? 'hsl(120, 100%, 80%)' : health > 0.5 ? 'hsl(60, 100%, 80%)' : 'hsl(0, 100%, 80%)';
  const emissive = health > 0.8 ? 'hsl(120, 100%, 50%)' : health > 0.5 ? 'hsl(60, 100%, 50%)' : 'hsl(0, 100%, 50%)';

  return (
    <mesh {...props}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={1} toneMapped={false} />
    </mesh>
  );
};

// The Double Helix structure
const Helix = ({ orbs: orbData }) => {
  const mesh = useRef();

  // Create a twisting curve for the helix
  const createHelixCurve = (offset) => {
    const points = [];
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 4; // Two full twists
      const x = Math.cos(angle + offset) * 1;
      const z = Math.sin(angle + offset) * 1;
      const y = (i / 64) * 8 - 4; // Height of the helix
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  };

  const curve1 = createHelixCurve(0);
  const curve2 = createHelixCurve(Math.PI); // Offset by 180 degrees

  const tubeGeometry1 = new THREE.TubeGeometry(curve1, 64, 0.02, 8, false);
  const tubeGeometry2 = new THREE.TubeGeometry(curve2, 64, 0.02, 8, false);

  // Place orbs along the first curve
  const orbs = orbData.map((orb, i) => {
    const point = curve1.getPointAt(i / orbData.length);
    return <StatusOrb key={orb.id} health={orb.health} position={point} />;
  });

  // Animate the rotation
  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.1; // Slow rotation
    }
  });

  return (
    <group ref={mesh}>
      <mesh geometry={tubeGeometry1}>
        <meshStandardMaterial color="#fff" emissive="#aaa" emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      <mesh geometry={tubeGeometry2}>
        <meshStandardMaterial color="#fff" emissive="#aaa" emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      {orbs}
    </group>
  );
};


const DoubleHelix = ({ orbs }) => {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Helix orbs={orbs} />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
};

export default DoubleHelix;
