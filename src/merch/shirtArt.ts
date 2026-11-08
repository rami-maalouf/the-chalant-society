// the shirt artwork, drawn in code. used by the 3d shirt (as textures) and nowhere else.
// design space is 300 x 340, the same as the flat svg drawings.

import type { Side } from "./options";

export const DESIGN_W = 300;
export const DESIGN_H = 340;

const INK = "#121110";
const COTTON = "#fbfbf9";
const AMBER = "#c46a00";

// the front neckline dips lower than the back one, like a real tee
function teePath(neckDepth: number): Path2D {
  const p = new Path2D();
  p.moveTo(104, 24);
  p.quadraticCurveTo(150, neckDepth, 196, 24);
  p.lineTo(272, 60);
  p.quadraticCurveTo(266, 90, 252, 117);
  p.lineTo(230, 106);
  p.lineTo(233, 318);
  p.quadraticCurveTo(150, 326, 67, 318);
  p.lineTo(70, 106);
  p.lineTo(48, 117);
  p.quadraticCurveTo(34, 90, 28, 60);
  p.closePath();
  return p;
}

export const FRONT_NECK = 62;
export const BACK_NECK = 34;

// the outline used for the 3d volume: the back outline, which covers both
export function silhouettePath(): Path2D {
  return teePath(BACK_NECK);
}

type Ctx = CanvasRenderingContext2D;

function prepare(canvas: HTMLCanvasElement, neckDepth: number): Ctx {
  const ctx = canvas.getContext("2d")!;
  const scale = canvas.width / DESIGN_W;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, DESIGN_W, DESIGN_H);

  const shape = teePath(neckDepth);
  ctx.save();
  ctx.clip(shape);

  // cotton, with a faint knit so it reads as fabric up close
  ctx.fillStyle = COTTON;
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = INK;
  for (let x = 0; x < DESIGN_W; x += 1.1) ctx.fillRect(x, 0, 0.35, DESIGN_H);
  ctx.globalAlpha = 1;
  return ctx;
}

function finish(ctx: Ctx, neckDepth: number) {
  const shape = teePath(neckDepth);

  // stitch lines: hem, sleeve cuffs, collar rib
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 0.7;
  ctx.setLineDash([2.2, 1.8]);
  ctx.beginPath();
  ctx.moveTo(68, 311);
  ctx.quadraticCurveTo(150, 319, 232, 311);
  ctx.moveTo(266, 76);
  ctx.lineTo(247, 110);
  ctx.moveTo(34, 76);
  ctx.lineTo(53, 110);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#e6e2d8";
  ctx.beginPath();
  ctx.moveTo(104, 24);
  ctx.quadraticCurveTo(150, neckDepth, 196, 24);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  // the marker outline, so the shirt matches the drawn style of the page
  // a light edge only: front and back read as one piece of fabric, not two halves
  ctx.strokeStyle = "#a8a397";
  ctx.lineWidth = 0.8;
  ctx.lineJoin = "round";
  ctx.stroke(shape);
}

function fitFont(ctx: Ctx, text: string, font: (size: number) => string, maxWidth: number, start: number): number {
  let size = start;
  ctx.font = font(size);
  while (ctx.measureText(text).width > maxWidth && size > 4) {
    size -= 0.5;
    ctx.font = font(size);
  }
  return size;
}

const block = (size: number) => `800 ${size}px "Bricolage Grotesque", "Arial Narrow", sans-serif`;
const marker = (size: number) => `${size}px "Permanent Marker", "Marker Felt", cursive`;

function condensed(ctx: Ctx) {
  // bricolage has a width axis; ask for the condensed cut where the browser supports it
  if ("fontStretch" in ctx) (ctx as Ctx & { fontStretch: string }).fontStretch = "condensed";
}

export function drawFront(canvas: HTMLCanvasElement) {
  const ctx = prepare(canvas, FRONT_NECK);
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  condensed(ctx);

  // chalant  vs  nonchalant, across the chest
  const y = 124;
  const gap = 6;
  const vsSize = 17;
  ctx.font = marker(vsSize);
  const vsWidth = ctx.measureText("vs").width;
  const wordSize = fitFont(
    ctx,
    "chalantnonchalant",
    block,
    146 - vsWidth - gap * 2,
    34,
  );
  ctx.font = block(wordSize);
  const left = ctx.measureText("chalant").width;
  const right = ctx.measureText("nonchalant").width;
  const total = left + gap + vsWidth + gap + right;
  let x = 150 - total / 2;
  ctx.fillText("chalant", x, y);
  x += left + gap;
  ctx.save();
  ctx.font = marker(vsSize);
  ctx.translate(x + vsWidth / 2, y - wordSize * 0.28);
  ctx.rotate(-0.12);
  ctx.textAlign = "center";
  ctx.fillText("vs", 0, vsSize * 0.35);
  ctx.restore();
  x += vsWidth + gap;
  ctx.font = block(wordSize);
  ctx.fillText("nonchalant", x, y);

  ctx.textAlign = "center";
  ctx.font = marker(12);
  ctx.fillText("pick a side.", 150, 164);
  ctx.fillText("sign my back.", 150, 182);

  ctx.font = `600 6px "Instrument Sans", sans-serif`;
  ctx.globalAlpha = 0.7;
  ctx.fillText("@thechalantsociety", 150, 296);
  ctx.globalAlpha = 1;

  finish(ctx, FRONT_NECK);
}

// a cursive-looking scribble: a looping cycloid with a wobble, seeded so it never changes
function scribble(seed: number, x0: number, y0: number, width: number): { x: number; y: number }[] {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const loops = 3 + Math.floor(rand() * 3);
  const r = 4.2 + rand() * 2.6;
  const tilt = (rand() - 0.5) * 0.18;
  const points: { x: number; y: number }[] = [];
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = t * Math.PI * 2 * loops;
    const x = x0 + t * width - r * 0.9 * Math.sin(w);
    const y = y0 - r * Math.cos(w) * (0.7 + 0.3 * Math.sin(t * 5 + seed)) + t * width * tilt;
    points.push({ x, y });
  }
  // a little underline flick on some names
  if (rand() > 0.45) {
    const end = points[points.length - 1];
    for (let i = 1; i <= 14; i++) {
      const t = i / 14;
      points.push({ x: end.x - t * width * 0.9, y: end.y + 6 + Math.sin(t * Math.PI) * 1.5 });
    }
  }
  return points;
}

function strokePoints(ctx: Ctx, points: { x: number; y: number }[], progress = 1) {
  const count = Math.max(2, Math.floor(points.length * progress));
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < count; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

// the strangers who already signed. left side = chalant, right side = nonchalant
const SIGNED = {
  chalant: [
    { seed: 11, x: 82, y: 100, w: 54 },
    { seed: 23, x: 88, y: 136, w: 46 },
    { seed: 37, x: 80, y: 172, w: 56 },
    { seed: 41, x: 90, y: 208, w: 44 },
  ],
  nonchalant: [
    { seed: 53, x: 162, y: 104, w: 52 },
    { seed: 67, x: 168, y: 144, w: 46 },
    { seed: 79, x: 160, y: 184, w: 54 },
  ],
};

const VISITOR_SLOT: Record<Side, { x: number; y: number; w: number }> = {
  chalant: { x: 82, y: 250, w: 56 },
  nonchalant: { x: 162, y: 228, w: 56 },
};

export function drawBack(canvas: HTMLCanvasElement, visitorSide: Side | null, progress: number) {
  const ctx = prepare(canvas, BACK_NECK);
  ctx.fillStyle = INK;
  condensed(ctx);

  ctx.font = block(16);
  ctx.textAlign = "right";
  ctx.fillText("chalant", 143, 72);
  ctx.textAlign = "left";
  ctx.fillText("nonchalant", 157, 72);

  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(150, 54);
  ctx.quadraticCurveTo(151.2, 180, 150, 298);
  ctx.stroke();

  ctx.lineWidth = 1.7;
  ctx.lineJoin = "round";
  for (const [side, list] of Object.entries(SIGNED)) {
    for (const sig of list) {
      ctx.globalAlpha = side === "chalant" ? 0.86 : 0.8;
      strokePoints(ctx, scribble(sig.seed, sig.x, sig.y, sig.w));
    }
  }
  ctx.globalAlpha = 1;

  if (visitorSide && progress > 0) {
    const slot = VISITOR_SLOT[visitorSide];
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2.4;
    strokePoints(ctx, scribble(97, slot.x, slot.y, slot.w), progress);
    if (progress >= 1) {
      ctx.fillStyle = AMBER;
      ctx.font = marker(10);
      ctx.textAlign = "left";
      ctx.fillText("you", slot.x + slot.w * 0.35, slot.y + 24);
    }
  }

  finish(ctx, BACK_NECK);
}
