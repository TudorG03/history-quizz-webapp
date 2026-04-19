import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

function Car() {
  const meshRef = useRef<THREE.Group>(null);
  const status = useGameStore(state => state.status);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Default position
    let targetX = 0;
    let targetZ = 0;
    let targetRotZ = 0;
    let targetRotY = 0;

    if (status === 'crashed') {
      targetRotZ = Math.PI; // flip over
      targetZ = 2; 
    } else if (status === 'success') {
      // mini swerve left or right, let's just make it bump forward and slightly rotate
      targetZ = -1.5; 
      targetRotY = Math.sin(state.clock.elapsedTime * 20) * 0.1;
    }

    // Lerp position for smooth animation
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, delta * 5);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, delta * 5);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotZ, delta * 5);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, delta * 10);
  });

  return (
    <group ref={meshRef} position={[0, 0.5, 3]}>
      {/* Main body / Chassis */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1.6, 0.3, 3.4]} />
        <meshStandardMaterial color="#eab308" roughness={0.3} metalness={0.7} />
      </mesh>
      
      {/* Front wedge / Hood */}
      <mesh position={[0, 0.25, -1.1]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.5, 0.3, 1.2]} />
        <meshStandardMaterial color="#eab308" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Roof / Cabin */}
      <mesh position={[0, 0.5, 0.1]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.3, 0.4, 1.8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.1} metalness={0.5} />
      </mesh>
      
      {/* Windshield */}
      <mesh position={[0, 0.45, -0.8]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.2, 0.4, 0.8]} />
        <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Spoiler */}
      <mesh position={[0, 0.6, 1.5]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.5, 0.05, 0.4]} />
        <meshStandardMaterial color="#111111" roughness={0.4} />
      </mesh>
      {/* Spoiler struts */}
      <mesh position={[-0.5, 0.45, 1.5]}>
        <boxGeometry args={[0.05, 0.3, 0.2]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[0.5, 0.45, 1.5]}>
        <boxGeometry args={[0.05, 0.3, 0.2]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Headlights (Neon) */}
      <mesh position={[-0.6, 0.25, -1.65]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.6, 0.25, -1.65]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Tail lights */}
      <mesh position={[-0.6, 0.2, 1.7]}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.6, 0.2, 1.7]}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Wheels */}
      <mesh position={[-0.8, 0, 1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
      <mesh position={[0.8, 0, 1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
      <mesh position={[-0.8, 0, -1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
      <mesh position={[0.8, 0, -1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
    </group>
  )
}

function MovingRoad() {
  const status = useGameStore(state => state.status);
  const isMoving = status === 'playing' || status === 'success' || status === 'menu';
  const gridRef = useRef<any>(null);

  useFrame((_state, delta) => {
    if (!gridRef.current || !isMoving) return;
    
    // Move the grid to simulate moving forward
    const speed = status === 'success' ? 40 : (status === 'menu' ? 10 : 25);
    
    gridRef.current.position.z += speed * delta;
    if (gridRef.current.position.z > 5) {
      gridRef.current.position.z -= 5;
    }
  });

  return (
    <group ref={gridRef}>
      <Grid 
        position={[0, 0, 0]} 
        args={[50, 100]} 
        cellSize={1} 
        cellThickness={1.5} 
        cellColor="#c084fc" 
        sectionSize={5} 
        sectionThickness={2.5} 
        sectionColor="#a855f7" 
        fadeDistance={40} 
        fadeStrength={1} 
      />
    </group>
  )
}

export function Scene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 4, 12], fov: 60 }}>
        <color attach="background" args={['#020617']} />
        <fog attach="fog" args={['#020617', 10, 40]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#c084fc" />
        <directionalLight position={[-10, 10, -5]} intensity={1} color="#ec4899" />
        <MovingRoad />
        <Car />
      </Canvas>
    </div>
  )
}