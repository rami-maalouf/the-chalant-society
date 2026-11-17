// playful, hand-drawn takes on the claude and chatgpt marks, built from geometry.
// one source for both the 3d shirt print (canvas) and the page (svg). drawn in a 100 x 100 box.

export type LogoId = "claude" | "chatgpt";

const rad = (deg: number) => (deg * Math.PI) / 180;
const f = (n: number) => n.toFixed(2);

// claude: a chunky orange starburst. twelve uneven rays with round tips around a solid core
function spark(): string {
  let s = 7;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const parts: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = i * 30 + (rand() - 0.5) * 9;
    const length = 35 + rand() * 11;
    const base = 8.5;
    const tip = 5.6;
    const at = (r: number, side: number) => {
      const ca = Math.cos(rad(a));
      const sa = Math.sin(rad(a));
      return [50 + r * ca - side * sa, 50 + r * sa + side * ca];
    };
    const [b1x, b1y] = at(4, -base);
    const [t1x, t1y] = at(length, -tip);
    const [t2x, t2y] = at(length, tip);
    const [b2x, b2y] = at(4, base);
    parts.push(
      `M${f(b1x)} ${f(b1y)} L${f(t1x)} ${f(t1y)} A${tip} ${tip} 0 0 1 ${f(t2x)} ${f(t2y)} L${f(b2x)} ${f(b2y)} Z`,
    );
  }
  parts.push("M38 50 A12 12 0 1 1 62 50 A12 12 0 1 1 38 50 Z");
  return parts.join(" ");
}

// chatgpt: six rounded links in a woven hexagonal pinwheel. each link is drawn in two halves,
// all first halves, then all second halves, so every link goes over one neighbour and under the other
function knotHalves(): { under: string[]; over: string[] } {
  const length = 52;
  const width = 30;
  const offset = 21;
  const tilt = 30;
  const under: string[] = [];
  const over: string[] = [];
  for (let k = 0; k < 6; k++) {
    const angle = k * 60;
    const cx = 50 + offset * Math.cos(rad(angle));
    const cy = 50 + offset * Math.sin(rad(angle));
    const axis = rad(angle + 90 + tilt);
    const r = width / 2;
    const half = length / 2 - r;
    const ca = Math.cos(axis);
    const sa = Math.sin(axis);
    const point = (x: number, y: number) => [cx + x * ca - y * sa, cy + x * sa + y * ca];
    for (const sign of [-1, 1]) {
      const [ax, ay] = point(0, -r * sign);
      const [bx, by] = point(half * sign, -r * sign);
      const [cx2, cy2] = point(half * sign, r * sign);
      const [dx, dy] = point(0, r * sign);
      const d = `M${f(ax)} ${f(ay)} L${f(bx)} ${f(by)} A${r} ${r} 0 0 1 ${f(cx2)} ${f(cy2)} L${f(dx)} ${f(dy)}`;
      (sign < 0 ? under : over).push(d);
    }
  }
  return { under, over };
}

export const CLAUDE_ORANGE = "#d97757";
export const LOGO_INK = "#121110";

export const LOGOS = {
  claude: { kind: "fill", d: spark(), color: CLAUDE_ORANGE, tilt: 8 },
  chatgpt: { kind: "weave", ...knotHalves(), color: LOGO_INK, ink: 6, halo: 11, tilt: -6 },
} as const;

// draw a logo into a canvas, centred at cx, cy, `size` wide. `halo` is the colour behind it (the cotton)
export function drawLogo(
  ctx: CanvasRenderingContext2D,
  id: LogoId,
  cx: number,
  cy: number,
  size: number,
  halo: string,
) {
  const logo = LOGOS[id];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad(logo.tilt));
  ctx.scale(size / 100, size / 100);
  ctx.translate(-50, -50);
  if (logo.kind === "fill") {
    ctx.fillStyle = logo.color;
    ctx.fill(new Path2D(logo.d));
  } else {
    ctx.lineJoin = "round";
    for (const layer of [logo.under, logo.over]) {
      for (const d of layer) {
        const path = new Path2D(d);
        ctx.strokeStyle = halo;
        ctx.lineWidth = logo.halo;
        ctx.lineCap = "butt";
        ctx.stroke(path);
        ctx.strokeStyle = logo.color;
        ctx.lineWidth = logo.ink;
        ctx.lineCap = "round";
        ctx.stroke(path);
      }
    }
  }
  ctx.restore();
}
