import { CROWD_SLOT_ASSETS, POSED_CROWD_ASSETS } from "../utils/crowdAssets";
import { densifyStandoutHead, generateCrowdTextures } from "../utils/proceduralHuman";

interface CrowdTextureWorkerRequest {
  width: number;
  height: number;
  renderPeopleMesh: string;
}

const ASSET_ID = "rp_posedplus_00068_18";

function getRenderPeopleAssetPaths(meshVariant: string) {
  const variant = meshVariant === "300k" ? "300k" : "100k";
  const basePath = `/private-assets/renderpeople/${ASSET_ID}_${variant}_standout`;

  return {
    positionPath: `${basePath}.bin`,
    colorPath: `${basePath}_color.bin`,
  };
}

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<CrowdTextureWorkerRequest>) => void) | null;
  postMessage: (message: unknown, transfer: Transferable[]) => void;
};

async function loadFloatAsset(path: string, expectedFloatCount: number): Promise<Float32Array | null> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    const values = new Float32Array(buffer);
    return values.length === expectedFloatCount ? values : null;
  } catch {
    return null;
  }
}

workerScope.onmessage = async (event: MessageEvent<CrowdTextureWorkerRequest>) => {
  const { width, height, renderPeopleMesh } = event.data;
  const standoutParticleCount = width * 128;
  const crowdFigureParticleCount = width * 64;
  const { positionPath, colorPath } = getRenderPeopleAssetPaths(renderPeopleMesh);
  const crowdLoads = await Promise.all(
    POSED_CROWD_ASSETS.map(async (assetId) => [
      assetId,
      await loadFloatAsset(
        `/private-assets/renderpeople-crowd/${assetId}.bin`,
        crowdFigureParticleCount * 3
      ),
    ] as const)
  );
  const crowdAssetMap = new Map<string, Float32Array | null>(crowdLoads);
  const [standoutPositions, particleColors] = await Promise.all([
    loadFloatAsset(positionPath, standoutParticleCount * 3),
    loadFloatAsset(colorPath, standoutParticleCount * 3),
  ]);
  const scannedCrowdPositions = CROWD_SLOT_ASSETS.map(
    (assetId) => crowdAssetMap.get(assetId) ?? null
  );
  const standoutForScene = standoutPositions
    ? densifyStandoutHead(standoutPositions, particleColors, standoutParticleCount)
    : null;

  const { targetPositions, initialPositions } = generateCrowdTextures(width, height, {
    standoutPositions: standoutForScene?.positions ?? standoutPositions,
    scannedCrowdPositions,
  });

  const message = {
    targetPositions,
    initialPositions,
    particleColors: standoutForScene?.colors ?? particleColors ?? undefined,
    usedScannedStandout: Boolean(standoutPositions),
  };
  const transfer = [targetPositions.buffer, initialPositions.buffer] as Transferable[];
  const colorsToTransfer = standoutForScene?.colors ?? particleColors;
  if (colorsToTransfer) {
    transfer.push(colorsToTransfer.buffer);
  }

  workerScope.postMessage(
    message,
    transfer
  );
};

export {};
