import { Canvas } from "@react-three/fiber";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing";
import { useMemo } from "react";
import * as THREE from "three";
import {
  CAMERA_START_POSITION,
  sampleCameraRig,
  sampleScrollReveal,
} from "../utils/cameraPath";
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

function CameraRig({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    sampleCameraRig(scrollProgress, position, target);
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
  const bloomIntensity = 0.75 - sampleScrollReveal(scrollProgress) * 0.28;

  const initialPosition = useMemo(
    () => new THREE.Vector3(CAMERA_START_POSITION.x, CAMERA_START_POSITION.y, CAMERA_START_POSITION.z),
    []
  );

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
