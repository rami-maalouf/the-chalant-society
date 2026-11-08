import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Side } from "./options";
import { DESIGN_H, DESIGN_W, drawBack, drawFront, silhouettePath } from "./shirtArt";

// world units: 1 unit = 100 design px
const WORLD_W = DESIGN_W / 100;
const WORLD_H = DESIGN_H / 100;
const TEX_SCALE = 4; // texture pixels per design px
const DEPTH = 0.34; // how far the torso puffs out on each side

type ShirtApi = {
  setSide: (side: Side | null) => void;
  dispose: () => void;
};

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = DESIGN_W * TEX_SCALE;
  canvas.height = DESIGN_H * TEX_SCALE;
  return canvas;
}

// the volume of the shirt: an oval cross-section across the body, thinner sleeves,
// and edges that close smoothly at the hem and shoulders
function buildGeometry(): THREE.PlaneGeometry {
  const mw = DESIGN_W;
  const mh = DESIGN_H;
  const mask = document.createElement("canvas");
  mask.width = mw;
  mask.height = mh;
  const mctx = mask.getContext("2d")!;
  mctx.fillStyle = "#fff";
  mctx.fill(silhouettePath());
  const alpha = mctx.getImageData(0, 0, mw, mh).data;
  const inside = (x: number, y: number) => alpha[(y * mw + x) * 4 + 3] > 127;

  // distance to the outline along the row (dx), half the width of that row's run (rx),
  // and distance to the outline along the column (dy)
  const dx = new Float32Array(mw * mh);
  const rx = new Float32Array(mw * mh);
  const dy = new Float32Array(mw * mh);
  for (let y = 0; y < mh; y++) {
    let x = 0;
    while (x < mw) {
      if (!inside(x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (x < mw && inside(x, y)) x++;
      const end = x;
      for (let i = start; i < end; i++) {
        dx[y * mw + i] = Math.min(i - start, end - 1 - i) + 0.5;
        rx[y * mw + i] = (end - start) / 2;
      }
    }
  }
  for (let x = 0; x < mw; x++) {
    let y = 0;
    while (y < mh) {
      if (!inside(x, y)) {
        y++;
        continue;
      }
      const start = y;
      while (y < mh && inside(x, y)) y++;
      const end = y;
      for (let i = start; i < end; i++) dy[i * mw + x] = Math.min(i - start, end - 1 - i) + 0.5;
    }
  }

  const segX = 150;
  const segY = 170;
  const geometry = new THREE.PlaneGeometry(WORLD_W, WORLD_H, segX, segY);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const heights = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const px = Math.min(mw - 1, Math.max(0, Math.round(uv.getX(i) * (mw - 1))));
    const py = Math.min(mh - 1, Math.max(0, Math.round((1 - uv.getY(i)) * (mh - 1))));
    const k = py * mw + px;
    if (!inside(px, py)) continue;
    // an oval across each run: full depth on the body, thinner on the sleeves
    const radius = rx[k];
    const u = 1 - dx[k] / radius;
    const across = Math.sqrt(Math.max(0, 1 - u * u));
    const runDepth = DEPTH * Math.min(1, radius / 80) ** 0.6;
    const close = Math.min(1, Math.sqrt(dy[k] / 16));
    heights[i] = runDepth * across * close;
  }

  // soften the field so the fabric has no creases from the pixel grid
  const cols = segX + 1;
  const rows = segY + 1;
  for (let pass = 0; pass < 3; pass++) {
    const copy = heights.slice();
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        if (copy[i] === 0) continue;
        heights[i] =
          (copy[i] * 4 + copy[i - 1] + copy[i + 1] + copy[i - cols] + copy[i + cols]) / 8;
      }
    }
  }

  for (let i = 0; i < pos.count; i++) {
    const h = heights[i];
    if (h === 0) continue;
    const x = pos.getX(i);
    const y = pos.getY(i);
    // a few soft folds, stronger toward the hem, like a shirt that has been worn
    const lower = THREE.MathUtils.smoothstep(-y, -0.6, 1.6);
    const folds =
      0.012 * Math.sin(x * 7.5 + y * 2.2) * lower +
      0.008 * Math.sin(y * 11 - x * 3.1) +
      0.006 * Math.sin((x + y) * 17) * lower;
    pos.setZ(i, h + folds * (h / DEPTH));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createShirt(container: HTMLElement, reducedMotion: boolean, onReady: () => void): ShirtApi {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "shirt3d-canvas";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e3d6, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-2.5, 3, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff4e2, 0.55);
  fill.position.set(3, 0.5, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(0, 1, -4);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  const frontCanvas = makeCanvas();
  const backCanvas = makeCanvas();
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const toTexture = (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    return texture;
  };
  const frontTexture = toTexture(frontCanvas);
  const backTexture = toTexture(backCanvas);

  const fabric = (map: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({
      map,
      alphaTest: 0.5,
      alphaToCoverage: true,
      side: THREE.DoubleSide,
      roughness: 0.95,
      sheen: 0.35,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(0xffffff),
    });

  const geometry = buildGeometry();
  const frontMaterial = fabric(frontTexture);
  const backMaterial = fabric(backTexture);
  const shirt = new THREE.Group();
  const front = new THREE.Mesh(geometry, frontMaterial);
  // the back is the same surface turned around, so its print reads the right way from behind
  const back = new THREE.Mesh(geometry, backMaterial);
  back.rotation.y = Math.PI;
  shirt.add(front, back);
  scene.add(shirt);

  // a soft shadow on the floor under the shirt
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 256;
  shadowCanvas.height = 64;
  const sctx = shadowCanvas.getContext("2d")!;
  const gradient = sctx.createRadialGradient(128, 32, 4, 128, 32, 120);
  gradient.addColorStop(0, "rgba(18,17,16,0.22)");
  gradient.addColorStop(1, "rgba(18,17,16,0)");
  sctx.fillStyle = gradient;
  sctx.fillRect(0, 0, 256, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 0.7),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -WORLD_H / 2 - 0.12;
  scene.add(shadow);

  // state
  let side: Side | null = null;
  let signature = 0; // 0..1, how much of the visitor's signature is drawn
  let signatureStart = -1;
  let rot = 0;
  let vel = 0;
  let target = 0;
  let dragging = false;
  let lastX = 0;
  let sway = reducedMotion ? 0 : 1;
  let running = false;
  let visible = true;
  let frame = 0;
  let disposed = false;
  let backDirty = false;
  let tick = 0;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit the whole shirt, with room to turn
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitH = (WORLD_H + 0.38) / (2 * Math.tan(fov / 2));
    const fitW = (WORLD_W + 0.3) / (2 * Math.tan(fov / 2) * camera.aspect);
    camera.position.set(0, 0.1, Math.max(fitH, fitW));
    camera.lookAt(0, -0.05, 0);
    camera.updateProjectionMatrix();
  };

  const nearestTurn = (value: number, face: number) =>
    face + Math.round((value - face) / (Math.PI * 2)) * Math.PI * 2;

  const render = () => {
    frame = 0;
    if (disposed) return;
    const now = performance.now();
    const t = now / 1000;

    if (!dragging) {
      vel = (vel + (target - rot) * (reducedMotion ? 1 : 0.055)) * (reducedMotion ? 0 : 0.8);
      rot = reducedMotion ? target : rot + vel;
    }
    sway += ((dragging || reducedMotion ? 0 : 1) - sway) * 0.05;

    shirt.rotation.y = rot + Math.sin(t * 0.55) * 0.24 * sway;
    shirt.rotation.x = Math.sin(t * 0.43) * 0.035 * sway;
    shirt.position.y = Math.sin(t * 0.9) * 0.035 * sway;

    // draw the visitor's signature once the back has turned toward the camera
    if (side && signature < 1) {
      const facingBack = Math.abs(rot - target) < 0.35;
      if (facingBack && signatureStart < 0) signatureStart = now;
      if (signatureStart >= 0) {
        signature = reducedMotion ? 1 : Math.min(1, (now - signatureStart) / 900);
        backDirty = true;
      }
    }
    tick++;
    if (backDirty && (tick % 2 === 0 || signature >= 1)) {
      drawBack(backCanvas, side, signature);
      backTexture.needsUpdate = true;
      backDirty = false;
    }

    renderer.render(scene, camera);
    if (running) frame = requestAnimationFrame(render);
  };

  const start = () => {
    if (running || disposed) return;
    running = true;
    frame = requestAnimationFrame(render);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(frame);
  };
  const updateRunning = () => (visible && document.visibilityState === "visible" ? start() : stop());

  // drag to turn. vertical swipes still scroll the page (touch-action: pan-y in css)
  const canvas = renderer.domElement;
  const onDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    vel = 0;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) return;
    const delta = (event.clientX - lastX) * 0.011;
    lastX = event.clientX;
    rot += delta;
    vel = delta;
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    // settle on whichever face is closer after the fling
    const landing = rot + vel * 10;
    const faces = [nearestTurn(landing, 0), nearestTurn(landing, Math.PI)];
    target = faces.reduce((a, b) => (Math.abs(b - landing) < Math.abs(a - landing) ? b : a));
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (!running) render();
  });
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateRunning();
  });
  intersection.observe(container);
  document.addEventListener("visibilitychange", updateRunning);

  // the print uses the page fonts: wait for them, or the shirt would print in a fallback font
  Promise.all([
    document.fonts.load('800 40px "Bricolage Grotesque"'),
    document.fonts.load('condensed 800 40px "Bricolage Grotesque"'),
    document.fonts.load('40px "Permanent Marker"'),
    document.fonts.load('600 20px "Instrument Sans"'),
  ])
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      drawFront(frontCanvas);
      drawBack(backCanvas, side, signature);
      frontTexture.needsUpdate = true;
      backTexture.needsUpdate = true;
      resize();
      renderer.compile(scene, camera);
      render();
      updateRunning();
      onReady();
    });

  return {
    setSide(next) {
      if (next === side) return;
      const changed = side !== null && next !== null;
      side = next;
      if (!next) {
        target = nearestTurn(rot, 0);
        return;
      }
      target = nearestTurn(rot, Math.PI);
      // a new side: the signature moves over and is drawn again
      signature = 0;
      signatureStart = changed && Math.abs(rot - target) < 0.35 ? performance.now() : -1;
      backDirty = true;
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", updateRunning);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      geometry.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      frontTexture.dispose();
      backTexture.dispose();
      shadowTexture.dispose();
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

export default function Shirt3D({ side, onReady }: { side: Side | null; onReady: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ShirtApi | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const api = createShirt(host, reduced, () => readyRef.current());
    apiRef.current = api;
    return () => {
      api.dispose();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setSide(side);
  }, [side]);

  return <div ref={hostRef} className="shirt3d" />;
}
