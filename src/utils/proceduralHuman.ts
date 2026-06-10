import { sampleCameraRig } from "./cameraPath";

export interface FigureLayout {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  rotationY: number;
  scale: number;
  isStandout: boolean;
}

export const STANDOUT_ROWS = 128;
export const AMBIENT_ROWS = 448;
export const TEXTURE_HEIGHT = 1024;

// Fifteen scene slots: one standout plus fourteen crowd positions, all using imported scans.
export const CROWD_LAYOUTS: FigureLayout[] = [
  // 0. Standout — Math.PI counter-rotates scanned asset yaw so the face points at the camera
  { offsetX: 0, offsetY: -1.0, offsetZ: 0.0, rotationY: Math.PI, scale: 1.32, isStandout: true },
  { offsetX: -1.8, offsetY: -1.0, offsetZ: -1.5, rotationY: 0.35, scale: 1.1, isStandout: false },
  { offsetX: 1.8, offsetY: -1.0, offsetZ: -1.5, rotationY: -0.35, scale: 1.1, isStandout: false },
  { offsetX: -3.5, offsetY: -1.0, offsetZ: -2.0, rotationY: 0.55, scale: 1.08, isStandout: false },
  { offsetX: 3.5, offsetY: -1.0, offsetZ: -2.0, rotationY: -0.55, scale: 1.08, isStandout: false },
  { offsetX: -1.0, offsetY: -1.0, offsetZ: -3.4, rotationY: 0.15, scale: 1.05, isStandout: false },
  { offsetX: 1.0, offsetY: -1.0, offsetZ: -3.4, rotationY: -0.15, scale: 1.05, isStandout: false },
  { offsetX: -5.0, offsetY: -1.0, offsetZ: -3.0, rotationY: 0.7, scale: 1.0, isStandout: false },
  { offsetX: 5.0, offsetY: -1.0, offsetZ: -3.0, rotationY: -0.7, scale: 1.0, isStandout: false },
  { offsetX: -2.8, offsetY: -1.0, offsetZ: -4.8, rotationY: 0.3, scale: 0.98, isStandout: false },
  { offsetX: 2.8, offsetY: -1.0, offsetZ: -4.8, rotationY: -0.3, scale: 0.98, isStandout: false },
  { offsetX: 0.0, offsetY: -1.0, offsetZ: -5.5, rotationY: 0.0, scale: 0.95, isStandout: false },
  { offsetX: -4.5, offsetY: -1.0, offsetZ: -5.2, rotationY: 0.5, scale: 0.95, isStandout: false },
  { offsetX: 4.5, offsetY: -1.0, offsetZ: -5.2, rotationY: -0.5, scale: 0.95, isStandout: false },
  { offsetX: -6.4, offsetY: -1.0, offsetZ: -4.5, rotationY: 0.85, scale: 0.9, isStandout: false },
];

export const CROWD_ROWS_PER_FIGURE =
  (TEXTURE_HEIGHT - STANDOUT_ROWS - AMBIENT_ROWS) / (CROWD_LAYOUTS.length - 1);

const SCANNED_SOURCE_FOOT_Y = -1.12;

function getFigureRowCount(figIdx: number): number {
  return figIdx === 0 ? STANDOUT_ROWS : CROWD_ROWS_PER_FIGURE;
}

function getFigureStartRow(figIdx: number): number {
  return figIdx === 0 ? 0 : STANDOUT_ROWS + (figIdx - 1) * CROWD_ROWS_PER_FIGURE;
}

/**
 * Stars in the volume behind the camera as it pulls away from the scene.
 * Never placed between the camera and the crowd (toward the look target).
 */
function writeAmbientRetreatParticle(
  targetPositions: Float32Array,
  initialPositions: Float32Array,
  idx: number,
  pathT: number
) {
  const camera = { x: 0, y: 0, z: 0 };
  const lookTarget = { x: 0, y: 0, z: 0 };
  sampleCameraRig(pathT, camera, lookTarget);

  const nextCamera = { x: 0, y: 0, z: 0 };
  const nextLookTarget = { x: 0, y: 0, z: 0 };
  sampleCameraRig(Math.min(1, pathT + 0.04), nextCamera, nextLookTarget);

  let forwardX = lookTarget.x - camera.x;
  let forwardY = lookTarget.y - camera.y;
  let forwardZ = lookTarget.z - camera.z;
  const forwardLength = Math.hypot(forwardX, forwardY, forwardZ) || 1;
  forwardX /= forwardLength;
  forwardY /= forwardLength;
  forwardZ /= forwardLength;

  let pathX = nextCamera.x - camera.x;
  let pathY = nextCamera.y - camera.y;
  let pathZ = nextCamera.z - camera.z;
  const pathLength = Math.hypot(pathX, pathY, pathZ) || 1;
  pathX /= pathLength;
  pathY /= pathLength;
  pathZ /= pathLength;

  const retreatX = -forwardX;
  const retreatY = -forwardY;
  const retreatZ = -forwardZ;

  const scatterRadius = 4.0 + Math.random() * 8.0;
  const scatterAngle = Math.random() * Math.PI * 2.0;
  const scatterUp = (Math.random() - 0.5) * 6.0;
  const rightX = forwardZ;
  const rightZ = -forwardX;
  const rightLength = Math.hypot(rightX, rightZ) || 1;

  const behindDepth = Math.random() * 6.0;
  const alongPath = (Math.random() - 0.5) * 3.0;

  let x =
    camera.x +
    retreatX * behindDepth +
    pathX * alongPath +
    (rightX / rightLength) * Math.cos(scatterAngle) * scatterRadius;
  let y =
    camera.y + retreatY * behindDepth + pathY * alongPath + scatterUp;
  let z =
    camera.z +
    retreatZ * behindDepth +
    pathZ * alongPath +
    (rightZ / rightLength) * Math.sin(scatterAngle) * scatterRadius;

  const toParticleX = x - camera.x;
  const toParticleY = y - camera.y;
  const toParticleZ = z - camera.z;
  const towardScene =
    toParticleX * forwardX + toParticleY * forwardY + toParticleZ * forwardZ;
  if (towardScene > -0.25) {
    const push = towardScene + 0.25;
    x -= forwardX * push;
    y -= forwardY * push;
    z -= forwardZ * push;
  }

  targetPositions[idx * 4 + 0] = x;
  targetPositions[idx * 4 + 1] = y;
  targetPositions[idx * 4 + 2] = z;
  targetPositions[idx * 4 + 3] = 0.0;

  initialPositions[idx * 4 + 0] = x;
  initialPositions[idx * 4 + 1] = y;
  initialPositions[idx * 4 + 2] = z;
  initialPositions[idx * 4 + 3] = 0.0;
}

/** Slightly bias standout slot assignment toward head geometry. No jitter or size changes. */
export function densifyStandoutHead(
  sourcePositions: Float32Array,
  sourceColors: Float32Array | null,
  count: number
): { positions: Float32Array; colors: Float32Array | null } {
  const sourceCount = sourcePositions.length / 3;
  let ymin = Infinity;
  let ymax = -Infinity;

  for (let i = 0; i < sourceCount; i++) {
    const y = sourcePositions[i * 3 + 1];
    ymin = Math.min(ymin, y);
    ymax = Math.max(ymax, y);
  }

  const height = Math.max(ymax - ymin, 1e-6);
  const weights = new Float32Array(sourceCount);
  let totalWeight = 0;

  for (let i = 0; i < sourceCount; i++) {
    const height01 = (sourcePositions[i * 3 + 1] - ymin) / height;
    const weight = height01 >= 0.76 ? 1.35 : 1.0;
    weights[i] = weight;
    totalWeight += weight;
  }

  const cumulative = new Float32Array(sourceCount);
  let running = 0;
  for (let i = 0; i < sourceCount; i++) {
    running += weights[i];
    cumulative[i] = running;
  }

  const positions = new Float32Array(count * 3);
  const colors = sourceColors ? new Float32Array(count * 3) : null;

  for (let i = 0; i < count; i++) {
    const target = Math.random() * totalWeight;
    let lo = 0;
    let hi = sourceCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < target) lo = mid + 1;
      else hi = mid;
    }

    positions[i * 3 + 0] = sourcePositions[lo * 3 + 0];
    positions[i * 3 + 1] = sourcePositions[lo * 3 + 1];
    positions[i * 3 + 2] = sourcePositions[lo * 3 + 2];

    if (colors && sourceColors) {
      colors[i * 3 + 0] = sourceColors[lo * 3 + 0];
      colors[i * 3 + 1] = sourceColors[lo * 3 + 1];
      colors[i * 3 + 2] = sourceColors[lo * 3 + 2];
    }
  }

  return { positions, colors };
}

function placeImportedFigure(
  targetPositions: Float32Array,
  initialPositions: Float32Array,
  particleStart: number,
  count: number,
  layout: FigureLayout,
  sourcePositions: Float32Array,
  sourceOffset: number,
  sourceStride = 1
) {
  const sourceCount = sourcePositions.length / 3;
  const cosA = Math.cos(layout.rotationY);
  const sinA = Math.sin(layout.rotationY);

  for (let i = 0; i < count; i++) {
    const idx = particleStart + i;
    const sourceIndex = (sourceOffset + i * sourceStride) % sourceCount;
    const sourceX = sourcePositions[sourceIndex * 3 + 0];
    const sourceY = sourcePositions[sourceIndex * 3 + 1] - SCANNED_SOURCE_FOOT_Y;
    const sourceZ = sourcePositions[sourceIndex * 3 + 2];
    const rx = sourceX * cosA - sourceZ * sinA;
    const rz = sourceX * sinA + sourceZ * cosA;

    const worldX = rx * layout.scale + layout.offsetX;
    const worldY = sourceY * layout.scale + layout.offsetY;
    const worldZ = rz * layout.scale + layout.offsetZ;
    const standoutFlag = layout.isStandout ? 1.0 : 0.0;

    targetPositions[idx * 4 + 0] = worldX;
    targetPositions[idx * 4 + 1] = worldY;
    targetPositions[idx * 4 + 2] = worldZ;
    targetPositions[idx * 4 + 3] = standoutFlag;

    const initRadius = 4.0 + Math.random() * 8.0;
    const initAngle = Math.random() * Math.PI * 2.0;
    const initHeight = (Math.random() - 0.5) * 6.0;

    initialPositions[idx * 4 + 0] = Math.cos(initAngle) * initRadius;
    initialPositions[idx * 4 + 1] = initHeight;
    initialPositions[idx * 4 + 2] = Math.sin(initAngle) * initRadius;
    initialPositions[idx * 4 + 3] = standoutFlag;
  }
}

/**
 * Generates initial and target coordinate datasets for the massive 524,288 GPGPU particle grid.
 * We pack positions into the 512 x 1024 Float32Array texture structure.
 * Target contains imported RenderPeople scan positions for all fifteen figures, plus a dispersed
 * ambient field behind the scroll camera as it pulls away from the scene.
 */
export function generateCrowdTextures(
  width: number,
  height: number,
  options: {
    standoutPositions?: Float32Array | null;
    scannedCrowdPositions?: Array<Float32Array | null>;
  } = {}
): {
  targetPositions: Float32Array;
  initialPositions: Float32Array;
} {
  const size = width * height; // 512 * 1024 = 524,288 particles
  const targetPositions = new Float32Array(size * 4);
  const initialPositions = new Float32Array(size * 4);

  const crowdSlots = options.scannedCrowdPositions ?? [];
  const fallbackSource =
    crowdSlots.find((positions): positions is Float32Array => Boolean(positions?.length)) ?? null;

  for (let figIdx = 0; figIdx < CROWD_LAYOUTS.length; figIdx++) {
    const layout = CROWD_LAYOUTS[figIdx];
    const startRow = getFigureStartRow(figIdx);
    const numRows = getFigureRowCount(figIdx);
    const particleStart = startRow * width;
    const count = numRows * width;
    const standoutPositions =
      figIdx === 0 && options.standoutPositions?.length === count * 3
        ? options.standoutPositions
        : null;
    const crowdSource =
      figIdx === 0
        ? standoutPositions ?? fallbackSource
        : crowdSlots[figIdx - 1] ?? fallbackSource;

    if (!crowdSource) {
      continue;
    }

    const sourceCount = crowdSource.length / 3;
    const sourceOffset = figIdx === 0 ? 0 : (figIdx * 7919) % sourceCount;
    const sourceStride = figIdx === 0 ? 1 : 17 + figIdx * 8;

    placeImportedFigure(
      targetPositions,
      initialPositions,
      particleStart,
      count,
      layout,
      figIdx === 0 && standoutPositions ? standoutPositions : crowdSource,
      sourceOffset,
      sourceStride
    );
  }

  const ambientStartRow = getFigureStartRow(CROWD_LAYOUTS.length);
  const ambientCount = AMBIENT_ROWS * width;
  let ambientIndex = 0;

  for (let row = ambientStartRow; row < height; row++) {
    for (let col = 0; col < width; col++) {
      writeAmbientRetreatParticle(
        targetPositions,
        initialPositions,
        row * width + col,
        ambientCount <= 1 ? 0 : ambientIndex / (ambientCount - 1)
      );
      ambientIndex += 1;
    }
  }

  return { targetPositions, initialPositions };
}
