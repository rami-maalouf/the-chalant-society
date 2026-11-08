import { useEffect, useRef, useState } from "react";

// one tee outline, shared by the front and the back
const TEE =
  "M100,22 Q150,40 200,22 L274,58 L250,114 L230,104 L230,318 L70,318 L70,104 L50,114 L26,58 Z";

// unreadable signature scribbles. on purpose: no fake names that look like real sign-ups
const LEFT_SIGNATURES = [
  { d: "M92 112 c6 -10 10 4 16 -4 s6 10 12 2 s8 -6 14 2", rotate: -6 },
  { d: "M96 146 q8 -14 14 0 t14 -2 q4 6 10 -4", rotate: 4 },
  { d: "M90 182 c10 -12 12 8 22 -2 c4 -4 6 6 12 0 l8 -4", rotate: -3 },
  { d: "M98 222 q6 -12 12 -2 q6 10 12 -4 q4 -8 8 2", rotate: 6 },
];
const RIGHT_SIGNATURES = [
  { d: "M168 116 c8 -12 10 6 18 -4 s6 8 12 0", rotate: 5 },
  { d: "M172 150 q10 -16 16 0 t12 -4", rotate: -5 },
  { d: "M166 186 c6 -8 12 6 18 -2 s8 8 14 -2", rotate: 3 },
];

export function ShirtFront() {
  return (
    <svg className="tee" viewBox="0 0 300 340" role="img" aria-label="The front of the shirt: chalant, a line, nonchalant. Under it: pick a side, sign my back.">
      <path d={TEE} className="tee-body" />
      <path d="M100,22 Q150,62 200,22" className="tee-seam" />
      <text x="143" y="126" textAnchor="end" className="tee-word">chalant</text>
      <text x="159" y="126" textAnchor="start" className="tee-word">nonchalant</text>
      <line x1="151" y1="98" x2="151" y2="144" className="tee-divider" />
      <text x="150" y="188" textAnchor="middle" className="tee-hand">pick a side.</text>
      <text x="150" y="206" textAnchor="middle" className="tee-hand">sign my back.</text>
      <text x="150" y="300" textAnchor="middle" className="tee-handle">@thechalantsociety</text>
      <circle cx="214" cy="312" r="3.5" className="tee-loop" />
      <path d="M214,315 Q217,326 224,332" className="tee-cord" />
      <rect x="221" y="329" width="26" height="6" rx="2" className="tee-marker" transform="rotate(16 221 329)" />
      <rect x="221" y="329" width="7" height="6" rx="1.5" className="tee-marker-cap" transform="rotate(16 221 329)" />
    </svg>
  );
}

export function ShirtBack() {
  const ref = useRef<SVGSVGElement>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setSigned(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSigned(true);
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const signatures = [
    ...LEFT_SIGNATURES.map((s) => ({ ...s, side: "left" })),
    ...RIGHT_SIGNATURES.map((s) => ({ ...s, side: "right" })),
  ];

  return (
    <svg
      ref={ref}
      className={`tee tee-back${signed ? " is-signed" : ""}`}
      viewBox="0 0 300 340"
      role="img"
      aria-label="The back of the shirt: one line down the middle, with signatures on both sides."
    >
      <path d="M100,22 Q150,34 200,22 L274,58 L250,114 L230,104 L230,318 L70,318 L70,104 L50,114 L26,58 Z" className="tee-body" />
      <text x="143" y="74" textAnchor="end" className="tee-word tee-word-small">chalant</text>
      <text x="159" y="74" textAnchor="start" className="tee-word tee-word-small">nonchalant</text>
      <line x1="151" y1="58" x2="151" y2="300" className="tee-divider" />
      {signatures.map((sig, index) => (
        <path
          key={sig.d}
          d={sig.d}
          pathLength={1}
          className="tee-signature"
          style={{
            transform: `rotate(${sig.rotate}deg)`,
            transformBox: "fill-box",
            transformOrigin: "center",
            transitionDelay: `${index * 140}ms`,
          }}
        />
      ))}
      <text x="190" y="236" textAnchor="middle" className="tee-you">you?</text>
    </svg>
  );
}
