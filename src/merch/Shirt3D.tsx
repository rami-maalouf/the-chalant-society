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

// exact euclidean distance transform (felzenszwalb), one dimension at a time
function edt1d(f: Float32Array, n: number, out: Float32Array, v: Int32Array, z: Float32Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    out[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

// distance from every inside pixel to the nearest outline point, in design px
function distanceField(inside: Uint8Array, w: number, h: number): Float32Array {
  const BIG = 1e10;
  const grid = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = inside[i] ? BIG : 0;
  const n = Math.max(w, h);
  const f = new Float32Array(n);
  const out = new Float32Array(n);
  const v = new Int32Array(n);
  const z = new Float32Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, out, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = out[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, out, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(out[x]);
  }
  return grid;
}

// the volume of the shirt, as one piece: the depth at any point depends only on how far it is
// from the outline, so the body, shoulders and sleeves flow into each other with no seams
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
  const inside = new Uint8Array(mw * mh);
  for (let i = 0; i < mw * mh; i++) inside[i] = alpha[i * 4 + 3] > 127 ? 1 : 0;
  const raw = distanceField(inside, mw, mh);
  // blur the field: a raw distance field has sharp ridges down the middle of each part,
  // which would show as creases. three box passes are close to a gaussian
  const dist = raw.slice();
  const tmp = new Float32Array(mw * mh);
  const radius = 9;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < mh; y++) {
      let acc = 0;
      for (let x = -radius; x <= radius; x++) acc += dist[y * mw + Math.min(mw - 1, Math.max(0, x))];
      for (let x = 0; x < mw; x++) {
        tmp[y * mw + x] = acc / (radius * 2 + 1);
        acc += dist[y * mw + Math.min(mw - 1, x + radius + 1)] - dist[y * mw + Math.max(0, x - radius)];
      }
    }
    for (let x = 0; x < mw; x++) {
      let acc = 0;
      for (let y = -radius; y <= radius; y++) acc += tmp[Math.min(mh - 1, Math.max(0, y)) * mw + x];
      for (let y = 0; y < mh; y++) {
        dist[y * mw + x] = acc / (radius * 2 + 1);
        acc += tmp[Math.min(mh - 1, y + radius + 1) * mw + x] - tmp[Math.max(0, y - radius) * mw + x];
      }
    }
  }
  // keep the true distance right at the edge, so the outline still closes cleanly
  for (let i = 0; i < mw * mh; i++) {
    if (!inside[i]) dist[i] = 0;
    else if (raw[i] < 6) dist[i] = Math.min(dist[i], raw[i] * 1.6);
  }

  const segX = 150;
  const segY = 170;
  const geometry = new THREE.PlaneGeometry(WORLD_W, WORLD_H, segX, segY);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const heights = new Float32Array(pos.count);

  // bilinear sample, so the surface does not step from pixel to pixel
  const sample = (u: number, v: number) => {
    const x = Math.min(mw - 1.001, Math.max(0, u * (mw - 1)));
    const y = Math.min(mh - 1.001, Math.max(0, (1 - v) * (mh - 1)));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = x - x0;
    const ty = y - y0;
    const a = dist[y0 * mw + x0];
    const b = dist[y0 * mw + x0 + 1];
    const c = dist[(y0 + 1) * mw + x0];
    const d = dist[(y0 + 1) * mw + x0 + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };

  for (let i = 0; i < pos.count; i++) {
    const d = sample(uv.getX(i), uv.getY(i));
    if (d <= 0) continue;
    // rounds over quickly at the edge, then keeps rising slowly toward the middle of the body
    const t = Math.min(d / 64, 1);
    heights[i] = DEPTH * Math.sin((t * Math.PI) / 2) ** 0.7;
  }

  // soften the field so the fabric has no creases from the pixel grid
  const cols = segX + 1;
  const rows = segY + 1;
  for (let pass = 0; pass < 4; pass++) {
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
