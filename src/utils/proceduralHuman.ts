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

function writeDispersedParticle(
  targetPositions: Float32Array,
  initialPositions: Float32Array,
  idx: number,
  isStandout: boolean
) {
  const initRadius = 4.0 + Math.random() * 8.0;
  const initAngle = Math.random() * Math.PI * 2.0;
  const initHeight = (Math.random() - 0.5) * 6.0;
  const x = Math.cos(initAngle) * initRadius;
  const y = initHeight;
  const z = Math.sin(initAngle) * initRadius;
  const standoutFlag = isStandout ? 1.0 : 0.0;

  targetPositions[idx * 4 + 0] = x;
  targetPositions[idx * 4 + 1] = y;
  targetPositions[idx * 4 + 2] = z;
  targetPositions[idx * 4 + 3] = standoutFlag;

  initialPositions[idx * 4 + 0] = x;
  initialPositions[idx * 4 + 1] = y;
  initialPositions[idx * 4 + 2] = z;
  initialPositions[idx * 4 + 3] = standoutFlag;
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

    if (layout.isStandout) {
      initialPositions[idx * 4 + 0] = worldX;
      initialPositions[idx * 4 + 1] = worldY;
      initialPositions[idx * 4 + 2] = worldZ;
    } else {
      const initRadius = 4.0 + Math.random() * 8.0;
      const initAngle = Math.random() * Math.PI * 2.0;
      const initHeight = (Math.random() - 0.5) * 6.0;

      initialPositions[idx * 4 + 0] = Math.cos(initAngle) * initRadius;
      initialPositions[idx * 4 + 1] = initHeight;
      initialPositions[idx * 4 + 2] = Math.sin(initAngle) * initRadius;
    }
    initialPositions[idx * 4 + 3] = standoutFlag;
  }
}

/**
 * Generates initial and target coordinate datasets for the massive 524,288 GPGPU particle grid.
 * We pack positions into the 512 x 1024 Float32Array texture structure.
 * Target contains imported RenderPeople scan positions for all fifteen figures, plus a trailing
 * ambient field of dispersed particles that never converge into body shapes.
 * Initial contains a dispersed dark-gold starry vacuum so figure particles fly in on load.
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

  const scannedCrowdSources =
    options.scannedCrowdPositions?.filter(
      (positions): positions is Float32Array => Boolean(positions?.length)
    ) ?? [];
  const fallbackSource = scannedCrowdSources[0] ?? null;

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
        : scannedCrowdSources[(figIdx - 1) % scannedCrowdSources.length] ?? fallbackSource;

    if (!crowdSource) {
      for (let i = 0; i < count; i++) {
        writeDispersedParticle(targetPositions, initialPositions, particleStart + i, layout.isStandout);
      }
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
  for (let row = ambientStartRow; row < height; row++) {
    for (let col = 0; col < width; col++) {
      writeDispersedParticle(targetPositions, initialPositions, row * width + col, false);
    }
  }

  return { targetPositions, initialPositions };
}
