import { lazy, Suspense, useState } from "react";
import type { Side } from "./options";
import { ShirtBack, ShirtFront } from "./ShirtDrawings";

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

export default function ShirtStage({ side }: { side: Side | null }) {
  const [webgl] = useState(canUseWebGL);
  const [ready, setReady] = useState(false);

  return (
    <div className={`shirt-stage${ready ? " is-3d" : ""}`}>
      <div className="shirt-flat" aria-hidden={ready}>
        {side ? <ShirtBack /> : <ShirtFront />}
      </div>
      {webgl && (
        <Suspense fallback={null}>
          <Shirt3D side={side} onReady={() => setReady(true)} />
        </Suspense>
      )}
      <p className="shirt-hint hand" aria-hidden>
        {ready ? "drag to turn it" : " "}
      </p>
      <p className="visually-hidden">
        The shirt. The front says chalant vs nonchalant, then pick a side, sign my back. The back has a line down the
        middle, with signatures on both sides.
      </p>
    </div>
  );
}
