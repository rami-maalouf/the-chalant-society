export const CAMERA_CLOSE = { x: 0.12, y: 0.98, z: 1.85 };
export const CAMERA_WIDE = { x: -0.82, y: 2.1, z: 7.35 };
export const CAMERA_CLOSE_TARGET = { x: 0, y: 0.98, z: -1.38 };
export const CAMERA_WIDE_TARGET = { x: 0, y: 0.32, z: -3.12 };
export const CAMERA_MIN_VISIBLE_REVEAL = 0.18;
export const CAMERA_REVEAL_SCALE = 1.08;
export const CAMERA_ORBIT_AMPLITUDE = 0.34;

export function smoothStep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPosition(reveal: number) {
  return {
    x: lerp(CAMERA_CLOSE.x, CAMERA_WIDE.x, reveal),
    y: lerp(CAMERA_CLOSE.y, CAMERA_WIDE.y, reveal),
    z: lerp(CAMERA_CLOSE.z, CAMERA_WIDE.z, reveal),
  };
}

function lerpTarget(reveal: number) {
  return {
    x: lerp(CAMERA_CLOSE_TARGET.x, CAMERA_WIDE_TARGET.x, reveal),
    y: lerp(CAMERA_CLOSE_TARGET.y, CAMERA_WIDE_TARGET.y, reveal),
    z: lerp(CAMERA_CLOSE_TARGET.z, CAMERA_WIDE_TARGET.z, reveal),
  };
}

export const CAMERA_START_POSITION = lerpPosition(CAMERA_MIN_VISIBLE_REVEAL);
export const CAMERA_START_TARGET = lerpTarget(CAMERA_MIN_VISIBLE_REVEAL);

export function sampleScrollReveal(scrollProgress: number) {
  return smoothStep(Math.min(1, scrollProgress * CAMERA_REVEAL_SCALE));
}

/** Camera position along the scroll navigation path (pathT 0 = first visible frame, 1 = wide end). */
export function sampleCameraPathPosition(pathT: number): [number, number, number] {
  const reveal = sampleScrollReveal(pathT);
  const orbit = Math.sin(reveal * Math.PI) * CAMERA_ORBIT_AMPLITUDE;

  const x =
    CAMERA_START_POSITION.x +
    (CAMERA_WIDE.x - CAMERA_START_POSITION.x) * reveal +
    orbit;
  const y = CAMERA_START_POSITION.y + (CAMERA_WIDE.y - CAMERA_START_POSITION.y) * reveal;
  const z = CAMERA_START_POSITION.z + (CAMERA_WIDE.z - CAMERA_START_POSITION.z) * reveal;

  return [x, y, z];
}

export function sampleCameraRig(
  scrollProgress: number,
  outPosition: { x: number; y: number; z: number },
  outTarget: { x: number; y: number; z: number }
) {
  const reveal = sampleScrollReveal(scrollProgress);
  const orbit = Math.sin(reveal * Math.PI) * CAMERA_ORBIT_AMPLITUDE;

  outPosition.x =
    CAMERA_START_POSITION.x +
    (CAMERA_WIDE.x - CAMERA_START_POSITION.x) * reveal +
    orbit;
  outPosition.y =
    CAMERA_START_POSITION.y + (CAMERA_WIDE.y - CAMERA_START_POSITION.y) * reveal;
  outPosition.z =
    CAMERA_START_POSITION.z + (CAMERA_WIDE.z - CAMERA_START_POSITION.z) * reveal;

  outTarget.x =
    CAMERA_START_TARGET.x + (CAMERA_WIDE_TARGET.x - CAMERA_START_TARGET.x) * reveal;
  outTarget.y =
    CAMERA_START_TARGET.y + (CAMERA_WIDE_TARGET.y - CAMERA_START_TARGET.y) * reveal;
  outTarget.z =
    CAMERA_START_TARGET.z + (CAMERA_WIDE_TARGET.z - CAMERA_START_TARGET.z) * reveal;
}
