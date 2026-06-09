import { Canvas } from "@react-three/fiber";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing";
import { useMemo } from "react";
import * as THREE from "three";
import GPGPUParticles from "./GPGPUParticles";

interface SceneProps {
  chaos: number;
  noiseStrength: number;
  noiseFrequency: number;
  returnSpeed: number;
  baseSize: number;
  interactionRadius: number;
  mouseStrength: number;
  amberColor: string;
  goldColor: string;
  standoutColor: string;
  resetSignal: number;
  scrollProgress: number;
}

function smoothStep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

// Original rig keyframes — reveal 0 was too close and the scene vanished on the hero.
const ORIGINAL_CLOSE = {
  position: new THREE.Vector3(0.12, 0.98, 1.85),
  target: new THREE.Vector3(0, 0.98, -1.38),
};

const ORIGINAL_WIDE = {
  position: new THREE.Vector3(-0.82, 2.1, 7.35),
  target: new THREE.Vector3(0, 0.32, -3.12),
};

// Where the scene first became visible (~manifesto / apathy section) on the old curve.
const MIN_VISIBLE_REVEAL = 0.18;

function sampleOriginalRig(reveal: number, outPosition: THREE.Vector3, outTarget: THREE.Vector3) {
  outPosition.lerpVectors(ORIGINAL_CLOSE.position, ORIGINAL_WIDE.position, reveal);
  outTarget.lerpVectors(ORIGINAL_CLOSE.target, ORIGINAL_WIDE.target, reveal);
}

function CameraRig({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();
  const startPosition = useMemo(() => {
    const position = new THREE.Vector3();
    sampleOriginalRig(MIN_VISIBLE_REVEAL, position, new THREE.Vector3());
    return position;
  }, []);
  const endPosition = useMemo(() => ORIGINAL_WIDE.position.clone(), []);
  const startTarget = useMemo(() => {
    const target = new THREE.Vector3();
    sampleOriginalRig(MIN_VISIBLE_REVEAL, new THREE.Vector3(), target);
    return target;
  }, []);
  const endTarget = useMemo(() => ORIGINAL_WIDE.target.clone(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const revealProgress = smoothStep(Math.min(1, scrollProgress * 1.08));
    const orbit = Math.sin(revealProgress * Math.PI) * 0.34;

    position.lerpVectors(startPosition, endPosition, revealProgress);
    position.x += orbit;
    target.lerpVectors(startTarget, endTarget, revealProgress);

    camera.position.lerp(position, 0.075);
    camera.lookAt(target);
  });

  return null;
}

export default function Scene({
  chaos,
  noiseStrength,
  noiseFrequency,
  returnSpeed,
  baseSize,
  interactionRadius,
  mouseStrength,
  amberColor,
  goldColor,
  standoutColor,
  resetSignal,
  scrollProgress,
}: SceneProps) {
  const bloomIntensity = 0.75 - smoothStep(Math.min(1, scrollProgress * 1.08)) * 0.28;

  const initialPosition = useMemo(() => {
    const position = new THREE.Vector3();
    sampleOriginalRig(MIN_VISIBLE_REVEAL, position, new THREE.Vector3());
    return position;
  }, []);

  return (
    <div id="canvas-container" className="w-full h-full relative" style={{ background: "#050508" }}>
      <Canvas
        camera={{ position: initialPosition.toArray(), fov: 42, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          logarithmicDepthBuffer: false,
        }}
      >
        <color attach="background" args={["#030305"]} />
        <ambientLight intensity={0.02} />

        <GPGPUParticles
          chaos={chaos}
          noiseStrength={noiseStrength}
          noiseFrequency={noiseFrequency}
          returnSpeed={returnSpeed}
          baseSize={baseSize}
          interactionRadius={interactionRadius}
          mouseStrength={mouseStrength}
          amberColor={amberColor}
          goldColor={goldColor}
          standoutColor={standoutColor}
          resetSignal={resetSignal}
          scrollProgress={scrollProgress}
        />

        <CameraRig scrollProgress={scrollProgress} />

        <EffectComposer>
          <Bloom
            mipmapBlur
            luminanceThreshold={0.24}
            luminanceSmoothing={0.9}
            intensity={bloomIntensity}
          />
          <Noise opacity={0.012} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
