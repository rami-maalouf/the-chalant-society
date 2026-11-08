import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DESIGN_H, DESIGN_W, drawBack, drawFront, silhouettePath, type SideIndex, type Sides } from "./shirtArt";

// world units: 1 unit = 100 design px
const WORLD_W = DESIGN_W / 100;
const WORLD_H = DESIGN_H / 100;
const TEX_SCALE = 4; // texture pixels per design px
const DEPTH = 0.34; // how far the torso puffs out on each side

type ShowroomApi = {
  setIndex: (index: number) => void;
  setSides: (sides: (SideIndex | null)[]) => void;
  dispose: () => void;
};

// the slider: the active shirt in the middle, its neighbours smaller, turned in and tinted
const SPACING = 2.25; // world units from the middle to a neighbour
const SPACING_FAR = 1.4; // extra distance for shirts two or more away
const PEEK = 0.8; // how much of a neighbour stays in frame on narrow screens
const NEIGHBOUR_SCALE = 0.58;
const TINT = new THREE.Color(0xe4e0d8);
const WHITE = new THREE.Color(0xffffff);

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
  // close the edge: front and back come down to exactly zero a few pixels before the outline,
  // so along the outline the two surfaces touch and the shirt is sealed, with no slit between them.
  // the band is wider than one grid cell, so no triangle at the edge can lift off zero
  const SEAM = 4;
  for (let i = 0; i < mw * mh; i++) {
    if (!inside[i]) dist[i] = 0;
    else dist[i] = Math.min(dist[i], Math.max(0, raw[i] - SEAM) * 1.8);
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

type ShirtItem = {
  sides: Sides;
  seed: number;
  group: THREE.Group;
  materials: THREE.MeshPhysicalMaterial[];
  textures: THREE.CanvasTexture[];
  frontCanvas: HTMLCanvasElement;
  backCanvas: HTMLCanvasElement;
  backTexture: THREE.CanvasTexture;
  hit: THREE.Mesh;
  shadowMaterial: THREE.MeshBasicMaterial;
  side: SideIndex | null;
  signature: number; // 0..1, how much of the visitor's signature is drawn
  signatureStart: number;
  rot: number;
  vel: number;
  target: number;
  backDirty: boolean;
};

function createShowroom(
  container: HTMLElement,
  shirts: Sides[],
  startIndex: number,
  reducedMotion: boolean,
  onSelect: (index: number) => void,
  onReady: () => void,
): ShowroomApi {
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
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const toTexture = (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    return texture;
  };
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

  // shared by every shirt
  const geometry = buildGeometry();
  const hitGeometry = new THREE.PlaneGeometry(2.6, 3.1);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
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
  const shadowGeometry = new THREE.PlaneGeometry(2.8, 0.7);

  const items: ShirtItem[] = shirts.map((sides, index) => {
    const frontCanvas = makeCanvas();
    const backCanvas = makeCanvas();
    const frontTexture = toTexture(frontCanvas);
    const backTexture = toTexture(backCanvas);
    const frontMaterial = fabric(frontTexture);
    const backMaterial = fabric(backTexture);
    const group = new THREE.Group();
    const front = new THREE.Mesh(geometry, frontMaterial);
    // the back is the same surface turned around, so its print reads the right way from behind
    const back = new THREE.Mesh(geometry, backMaterial);
    back.rotation.y = Math.PI;
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.userData.index = index;
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -WORLD_H / 2 - 0.12;
    group.add(front, back, hit);
    scene.add(group, shadow);
    group.userData.shadow = shadow;
    return {
      sides,
      seed: index + 1,
      group,
      materials: [frontMaterial, backMaterial],
      textures: [frontTexture, backTexture],
      frontCanvas,
      backCanvas,
      backTexture,
      hit,
      shadowMaterial,
      side: null,
      signature: 0,
      signatureStart: -1,
      rot: 0,
      vel: 0,
      target: 0,
      backDirty: false,
    };
  });
  const hits = items.map((item) => item.hit);

  // state
  let active = startIndex;
  let pos = startIndex; // the slider position, eases toward `active`
  let posVel = 0;
  let dragging = false;
  let lastX = 0;
  let downX = 0;
  let downY = 0;
  let downTarget = -1; // a neighbour the pointer went down on, so a tap can select it
  let sway = reducedMotion ? 0 : 1;
  let running = false;
  let visible = true;
  let frame = 0;
  let disposed = false;
  let tick = 0;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit the whole shirt, plus a peek of each neighbour when there is more than one shirt
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const frameW = WORLD_W + 0.3 + (items.length > 1 ? PEEK * 2 : 0);
    const fitH = (WORLD_H + 0.38) / (2 * Math.tan(fov / 2));
    const fitW = frameW / (2 * Math.tan(fov / 2) * camera.aspect);
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

    // slide
    if (reducedMotion) pos = active;
    else {
      posVel = (posVel + (active - pos) * 0.08) * 0.72;
      pos += posVel;
    }
    sway += ((dragging || reducedMotion ? 0 : 1) - sway) * 0.05;

    items.forEach((item, index) => {
      if (!(dragging && index === active)) {
        item.vel = (item.vel + (item.target - item.rot) * (reducedMotion ? 1 : 0.055)) * (reducedMotion ? 0 : 0.8);
        item.rot = reducedMotion ? item.target : item.rot + item.vel;
      }

      const rel = index - pos;
      const a = Math.min(Math.abs(rel), 1);
      const dir = Math.sign(rel);
      const x = dir * (Math.abs(rel) <= 1 ? Math.abs(rel) * SPACING : SPACING + (Math.abs(rel) - 1) * SPACING_FAR);
      const scale = 1 - (1 - NEIGHBOUR_SCALE) * a;
      const focus = 1 - a; // only the middle shirt sways

      const group = item.group;
      group.visible = Math.abs(rel) < 1.9;
      group.position.set(x, Math.sin(t * 0.9 + index) * 0.035 * sway * focus - (1 - scale) * 0.4, -0.9 * a);
      group.scale.setScalar(scale);
      group.rotation.y = item.rot + Math.sin(t * 0.55) * 0.24 * sway * focus - dir * 0.5 * a;
      group.rotation.x = Math.sin(t * 0.43) * 0.035 * sway * focus;
      const shadow = group.userData.shadow as THREE.Mesh;
      shadow.visible = group.visible;
      shadow.position.set(x, -WORLD_H / 2 * scale - 0.12 - (1 - scale) * 0.4, -0.9 * a);
      shadow.scale.setScalar(scale);
      item.shadowMaterial.opacity = 1 - a * 0.6;
      for (const material of item.materials) material.color.copy(WHITE).lerp(TINT, a);

      // draw the visitor's signature once the back has turned toward the camera
      if (item.side !== null && item.signature < 1) {
        const facingBack = Math.abs(item.rot - item.target) < 0.35;
        if (facingBack && item.signatureStart < 0) item.signatureStart = now;
        if (item.signatureStart >= 0) {
          item.signature = reducedMotion ? 1 : Math.min(1, (now - item.signatureStart) / 900);
          item.backDirty = true;
        }
      }
    });

    tick++;
    for (const item of items) {
      if (item.backDirty && (tick % 2 === 0 || item.signature >= 1)) {
        drawBack(item.backCanvas, item.sides, item.seed, item.side, item.signature);
        item.backTexture.needsUpdate = true;
        item.backDirty = false;
      }
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

  // which shirt is under the pointer, if any
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const shirtAt = (event: PointerEvent): number => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hits.filter((mesh) => mesh.parent?.visible), false)[0];
    return hit ? (hit.object.userData.index as number) : -1;
  };

  // drag the middle shirt to turn it. tap a neighbour to slide it to the middle.
  // vertical swipes still scroll the page (touch-action: pan-y in css)
  const canvas = renderer.domElement;
  const onDown = (event: PointerEvent) => {
    downX = event.clientX;
    downY = event.clientY;
    const under = shirtAt(event);
    downTarget = under !== -1 && under !== active ? under : -1;
    if (downTarget !== -1) return;
    dragging = true;
    lastX = event.clientX;
    items[active].vel = 0;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) {
      if (event.pointerType === "mouse") {
        const under = shirtAt(event);
        canvas.style.cursor = under !== -1 && under !== active ? "pointer" : "";
      }
      return;
    }
    const item = items[active];
    const delta = (event.clientX - lastX) * 0.011;
    lastX = event.clientX;
    item.rot += delta;
    item.vel = delta;
  };
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    // settle on whichever face is closer after the fling
    const item = items[active];
    const landing = item.rot + item.vel * 10;
    const faces = [nearestTurn(landing, 0), nearestTurn(landing, Math.PI)];
    item.target = faces.reduce((a, b) => (Math.abs(b - landing) < Math.abs(a - landing) ? b : a));
  };
  const onUp = (event: PointerEvent) => {
    if (downTarget !== -1) {
      const tap = Math.hypot(event.clientX - downX, event.clientY - downY) < 10;
      if (tap && shirtAt(event) === downTarget) onSelect(downTarget);
      downTarget = -1;
      return;
    }
    endDrag();
  };
  const onCancel = () => {
    downTarget = -1;
    endDrag();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);

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

  // the print uses the page fonts: wait for them, or the shirts would print in a fallback font
  Promise.all([
    document.fonts.load('800 40px "Bricolage Grotesque"'),
    document.fonts.load('condensed 800 40px "Bricolage Grotesque"'),
    document.fonts.load('40px "Permanent Marker"'),
    document.fonts.load('600 20px "Instrument Sans"'),
  ])
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      for (const item of items) {
        drawFront(item.frontCanvas, item.sides);
        drawBack(item.backCanvas, item.sides, item.seed, item.side, item.signature);
        for (const texture of item.textures) texture.needsUpdate = true;
      }
      resize();
      renderer.compile(scene, camera);
      render();
      updateRunning();
      onReady();
    });

  return {
    setIndex(index) {
      active = Math.max(0, Math.min(items.length - 1, index));
    },
    setSides(sides) {
      items.forEach((item, index) => {
        const next = sides[index] ?? null;
        if (next === item.side) return;
        const changed = item.side !== null && next !== null;
        item.side = next;
        if (next === null) {
          item.target = nearestTurn(item.rot, 0);
          return;
        }
        item.target = nearestTurn(item.rot, Math.PI);
        // a new side: the signature moves over and is drawn again
        item.signature = 0;
        item.signatureStart = changed && Math.abs(item.rot - item.target) < 0.35 ? performance.now() : -1;
        item.backDirty = true;
      });
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
      canvas.removeEventListener("pointercancel", onCancel);
      for (const item of items) {
        item.materials.forEach((material) => material.dispose());
        item.textures.forEach((texture) => texture.dispose());
        item.shadowMaterial.dispose();
      }
      geometry.dispose();
      hitGeometry.dispose();
      hitMaterial.dispose();
      shadowGeometry.dispose();
      shadowTexture.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

type Shirt3DProps = {
  shirts: Sides[];
  index: number;
  sides: (SideIndex | null)[];
  onSelect: (index: number) => void;
  onReady: () => void;
};

export default function Shirt3D({ shirts, index, sides, onSelect, onReady }: Shirt3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ShowroomApi | null>(null);
  const callbacks = useRef({ onSelect, onReady });
  callbacks.current = { onSelect, onReady };
  const initialIndex = useRef(index);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const api = createShowroom(
      host,
      shirts,
      initialIndex.current,
      reduced,
      (i) => callbacks.current.onSelect(i),
      () => callbacks.current.onReady(),
    );
    apiRef.current = api;
    return () => {
      api.dispose();
      apiRef.current = null;
    };
    // the shirt list is fixed for the life of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.setIndex(index);
  }, [index]);

  useEffect(() => {
    apiRef.current?.setSides(sides);
  }, [sides]);

  return <div ref={hostRef} className="shirt3d" />;
}
