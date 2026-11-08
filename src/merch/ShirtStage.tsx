import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Shirt } from "./options";
import { DESIGN_H, DESIGN_W, drawBack, drawFront, type SideIndex, type Sides } from "./shirtArt";

// three.js loads in its own chunk, after the page and the form already work
const Shirt3D = lazy(() => import("./Shirt3D"));

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

// the same artwork as the 3d shirt, flat. shown until the 3d shirt is ready, and on phones without webgl
function FlatShirt({ sides, seed, side }: { sides: Sides; seed: number; side: SideIndex | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      document.fonts.load('800 40px "Bricolage Grotesque"'),
      document.fonts.load('40px "Permanent Marker"'),
    ])
      .catch(() => undefined)
      .then(() => {
        const canvas = ref.current;
        if (cancelled || !canvas) return;
        if (side === null) drawFront(canvas, sides);
        else drawBack(canvas, sides, seed, side, 1);
      });
    return () => {
      cancelled = true;
    };
  }, [sides, seed, side]);
  return <canvas ref={ref} className="shirt-flat-canvas" width={DESIGN_W * 2} height={DESIGN_H * 2} />;
}

type Props = {
  shirts: readonly Shirt[];
  index: number;
  sides: (SideIndex | null)[];
  onSelect: (index: number) => void;
};

export default function ShirtStage({ shirts, index, sides, onSelect }: Props) {
  const [webgl] = useState(canUseWebGL);
  const [ready, setReady] = useState(false);
  const shirt = shirts[index];
  const words = useMemo(() => shirts.map((s) => s.sides as Sides), [shirts]);
  const many = shirts.length > 1;
  const name = (s: Shirt) => `${s.sides[0]} vs ${s.sides[1]}`;

  const go = (next: number) => {
    if (next >= 0 && next < shirts.length && next !== index) onSelect(next);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") go(index - 1);
    else if (event.key === "ArrowRight") go(index + 1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      className={`shirt-carousel${many ? " has-many" : ""}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="shirts"
      tabIndex={many ? 0 : undefined}
      onKeyDown={many ? onKeyDown : undefined}
    >
      <div className={`shirt-stage${ready ? " is-3d" : ""}`}>
        <div className="shirt-flat" aria-hidden={ready}>
          <FlatShirt sides={words[index]} seed={index + 1} side={sides[index]} />
        </div>
        {webgl && (
          <Suspense fallback={null}>
            <Shirt3D shirts={words} index={index} sides={sides} onSelect={go} onReady={() => setReady(true)} />
          </Suspense>
        )}
      </div>

      <p className="visually-hidden" aria-live="polite">
        shirt {index + 1} of {shirts.length}: {name(shirt)}. The front says {name(shirt)}, then pick a side, sign my
        back. The back has a line down the middle, with signatures on both sides.
      </p>

      {many && (
        <div className="carousel-nav">
          <button
            type="button"
            className="carousel-arrow"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label={index > 0 ? `previous shirt: ${name(shirts[index - 1])}` : "previous shirt"}
          >
            <span aria-hidden>&larr;</span>
          </button>
          <div className="carousel-label">
            <p className="carousel-name">{name(shirt)}</p>
            <div className="carousel-dots">
              {shirts.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`carousel-dot${i === index ? " is-active" : ""}`}
                  onClick={() => go(i)}
                  aria-label={`shirt ${i + 1}: ${name(s)}`}
                  aria-current={i === index ? "true" : undefined}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            className="carousel-arrow"
            onClick={() => go(index + 1)}
            disabled={index === shirts.length - 1}
            aria-label={index < shirts.length - 1 ? `next shirt: ${name(shirts[index + 1])}` : "next shirt"}
          >
            <span aria-hidden>&rarr;</span>
          </button>
        </div>
      )}

      <p className="shirt-hint hand" aria-hidden>
        {ready ? (many ? "drag to turn it. tap the others to switch" : "drag to turn it") : " "}
      </p>
    </div>
  );
}
