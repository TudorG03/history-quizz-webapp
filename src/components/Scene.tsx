import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

const LAMBO_URL = 'https://raw.githubusercontent.com/Timvla/Car-configurator/master/Website/Lambo.glb';
useGLTF.preload(LAMBO_URL);

// --- Custom Shader Magic for the Endless Curve ---
const globalUniforms = { uCurve: { value: 0 } };

function patchMaterial(mat: THREE.Material) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurve = globalUniforms.uCurve;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       uniform float uCurve;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
       vec4 mvPosition = vec4( transformed, 1.0 );
       #ifdef USE_INSTANCING
         mvPosition = instanceMatrix * mvPosition;
       #endif
       mvPosition = modelViewMatrix * mvPosition;

       // Curve the world! The further away (negative Z), the more it shifts on X.
       float zDist = mvPosition.z; 
       if (zDist < 0.0) {
         mvPosition.x += uCurve * (zDist * zDist) * 0.008;
       }
       gl_Position = projectionMatrix * mvPosition;
      `
    );
  };
  return mat;
}

function patchBuildingMaterial(mat: THREE.Material) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurve = globalUniforms.uCurve;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       uniform float uCurve;
       varying vec3 vPos;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vPos = position;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
       vec4 mvPosition = vec4( transformed, 1.0 );
       #ifdef USE_INSTANCING
         mvPosition = instanceMatrix * mvPosition;
       #endif
       mvPosition = modelViewMatrix * mvPosition;

       float zDist = mvPosition.z; 
       if (zDist < 0.0) {
         mvPosition.x += uCurve * (zDist * zDist) * 0.008;
       }
       gl_Position = projectionMatrix * mvPosition;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vPos;
       
       float hash(vec3 p) {
         return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
       }
      `
    );
    
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       
       vec3 gridPos = floor(vPos * vec3(1.5, 0.6, 1.5));
       vec3 gridFract = fract(vPos * vec3(1.5, 0.6, 1.5));
       
       float winX = step(0.2, gridFract.x) * step(gridFract.x, 0.8);
       float winY = step(0.2, gridFract.y) * step(gridFract.y, 0.8);
       float winZ = step(0.2, gridFract.z) * step(gridFract.z, 0.8);
       
       float isFace = max(winX * winY, winZ * winY);
       
       float noise = hash(gridPos);
       float windowOn = step(0.5, noise);
       
       vec3 windowColor = vec3(1.0, 0.6, 0.1) * 3.0;
       totalEmissiveRadiance += isFace * windowOn * windowColor;
      `
    );
  };
  return mat;
}

// Pre-patched shared materials
const mats = {
  asphalt: patchMaterial(new THREE.MeshStandardMaterial({ color: "#2d2f33", roughness: 0.9, metalness: 0.1 })),
  grass: patchMaterial(new THREE.MeshStandardMaterial({ color: "#d4a373", roughness: 1 })),
  line: patchMaterial(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 })),
  trunk: patchMaterial(new THREE.MeshStandardMaterial({ color: "#8b5a2b", roughness: 0.9 })),
  leaf: patchMaterial(new THREE.MeshStandardMaterial({ color: "#228b22", roughness: 0.8, side: THREE.DoubleSide })),
  building: patchBuildingMaterial(new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.8, metalness: 0.5 }))
};

function CurveController() {
  const status = useGameStore(state => state.status);
  const lastAnswer = useGameStore(state => state.lastAnswer);
  
  useFrame((_state, delta) => {
    let target = 0;
    if (status === 'success') {
      // 'a' (Left) -> target -1 (curves left via mvPosition.x += negative)
      // 'b' (Right) -> target 1 (curves right via mvPosition.x += positive)
      target = lastAnswer === 'a' ? -1 : 1; 
    }
    
    // Smoothly lerp the global curve value
    globalUniforms.uCurve.value = THREE.MathUtils.lerp(globalUniforms.uCurve.value, target, delta * 4);
  });
  return null;
}

function RealisticCar() {
  const meshRef = useRef<THREE.Group>(null);
  const status = useGameStore(state => state.status);
  const lastAnswer = useGameStore(state => state.lastAnswer);
  const { scene } = useGLTF(LAMBO_URL);
  
  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    
    let targetX = 0;
    let targetZ = 0;
    let targetRotZ = 0;
    let targetRotY = 0;

    if (status === 'crashed') {
      targetRotZ = 0; // No more flipping
      targetZ = 1; // Brake slightly
    } else if (status === 'success') {
      targetZ = -1.5; // speed boost
      // Steer into the turn
      targetRotY = lastAnswer === 'a' ? 0.6 : -0.6;
      // Slight body roll
      targetRotZ = lastAnswer === 'a' ? -0.1 : 0.1;
    }

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, delta * 5);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, delta * 5);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotZ, delta * 5);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, delta * 10);
  });

  return (
    <group ref={meshRef} position={[0, 0.5, 3]}>
      {/* We use a clone so we don't mutate the cached scene */}
      {/* Scale might need adjustment based on the model size, typically cars need to be scaled around 1.5 or so, maybe rotation is needed to face away */}
      <primitive object={scene.clone()} scale={1.5} position={[0, -0.5, 0]} rotation={[0, 0, 0]} />
    </group>
  )
}

function LaneLines() {
  const groupRef = useRef<THREE.Group>(null);
  const status = useGameStore(state => state.status);
  const isMoving = status === 'playing' || status === 'success' || status === 'menu';
  
  const lines = Array.from({ length: 15 });

  useFrame((_state, delta) => {
    if (!groupRef.current || !isMoving) return;
    const speed = status === 'success' ? 50 : (status === 'menu' ? 10 : 30);
    
    groupRef.current.children.forEach((child) => {
      child.position.z += speed * delta;
      if (child.position.z > 5) {
        child.position.z -= 60;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {lines.map((_, i) => (
        <mesh key={i} position={[0, 0.01, -i * 4]} material={mats.line}>
          <boxGeometry args={[0.2, 0.02, 2]} />
        </mesh>
      ))}
    </group>
  )
}

function Highway() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={mats.asphalt}>
        <planeGeometry args={[12, 200, 10, 100]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow material={mats.grass}>
        <planeGeometry args={[200, 200, 20, 100]} />
      </mesh>
      <LaneLines />
    </group>
  )
}

function SinglePalmTree({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 2, 0]} castShadow material={mats.trunk}>
        <cylinderGeometry args={[0.2, 0.3, 4, 8]} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, 4, 0]} rotation={[0, (i * Math.PI * 2) / 5, Math.PI / 4]} castShadow material={mats.leaf}>
          <planeGeometry args={[1.5, 3]} />
        </mesh>
      ))}
    </group>
  )
}

function PalmTrees() {
  const groupRef = useRef<THREE.Group>(null);
  const status = useGameStore(state => state.status);
  const isMoving = status === 'playing' || status === 'success' || status === 'menu';

  const trees = useRef(Array.from({ length: 20 }).map((_, i) => ({
    x: i % 2 === 0 ? -8 - Math.random()*2 : 8 + Math.random()*2,
    z: -80 + (i * 4),
    rotY: Math.random() * Math.PI
  })));

  useFrame((_state, delta) => {
    if (!groupRef.current || !isMoving) return;
    const speed = status === 'success' ? 50 : (status === 'menu' ? 10 : 30);
    
    groupRef.current.children.forEach((child) => {
      child.position.z += speed * delta;
      if (child.position.z > 10) {
        child.position.z -= 80; 
      }
    });
  });

  return (
    <group ref={groupRef}>
      {trees.current.map((t, i) => (
        <SinglePalmTree key={i} position={[t.x, 0, t.z]} rotation={[0, t.rotY, 0]} />
      ))}
    </group>
  );
}

function Cityscape() {
  const groupRef = useRef<THREE.Group>(null);
  const status = useGameStore(state => state.status);
  const isMoving = status === 'playing' || status === 'success' || status === 'menu';
  
  const buildings = useRef(Array.from({ length: 40 }).map((_, i) => ({
    x: (i % 2 === 0 ? -1 : 1) * (20 + Math.random() * 30),
    z: -150 + (i * 4),
    w: 4 + Math.random() * 6,
    h: 15 + Math.random() * 40,
    d: 4 + Math.random() * 6
  })));

  useFrame((_state, delta) => {
    if (!groupRef.current || !isMoving) return;
    const speed = status === 'success' ? 50 : (status === 'menu' ? 10 : 30);
    
    groupRef.current.children.forEach((child) => {
      child.position.z += speed * delta;
      if (child.position.z > 20) {
        child.position.z -= 160; 
      }
    });
  });

  return (
    <group ref={groupRef}>
      {buildings.current.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 1, b.z]} material={mats.building} castShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
        </mesh>
      ))}
    </group>
  );
}

function Sun() {
  const sunMat = useRef(new THREE.ShaderMaterial({
    uniforms: {
      color1: { value: new THREE.Color('#ffaa00') },
      color2: { value: new THREE.Color('#ff0055') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      void main() {
        // Gradient from bottom to top
        vec3 col = mix(color2, color1, vUv.y);
        
        // Synthwave horizontal stripes (thicker at bottom)
        float linePhase = fract(vUv.y * 15.0);
        // Cut out stripes in the lower half
        float isStriped = step(0.5, vUv.y) + (1.0 - step(0.5, vUv.y)) * step(0.4 * (1.0 - vUv.y), linePhase);
        
        // Glow boost
        vec3 finalColor = col * isStriped * 3.0; // Boost for Bloom effect
        gl_FragColor = vec4(finalColor, isStriped);
      }
    `,
    transparent: true,
  }));

  return (
    <group position={[0, 30, -200]}>
      {/* Sun Mesh facing the camera */}
      <mesh>
        <circleGeometry args={[60, 64]} />
        <primitive object={sunMat.current} attach="material" />
      </mesh>
      {/* Intense PointLight emanating from the sun */}
      <pointLight color="#ff8800" intensity={10000} distance={500} decay={2} castShadow />
    </group>
  )
}

export function Scene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 3, 10], fov: 60 }} shadows>
        <Suspense fallback={null}>
          <color attach="background" args={['#ff7b00']} />
          <fog attach="fog" args={['#ff7b00', 40, 120]} />
          <Environment preset="sunset" />
          
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={2} 
            castShadow 
            color="#ffecd1"
          />
          
          <Sun />
          <CurveController />
          <Highway />
          <Cityscape />
          <PalmTrees />
          <RealisticCar />
          
          <EffectComposer>
            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}