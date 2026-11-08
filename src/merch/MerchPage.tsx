import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LINKS } from "../shared/links";
import ShirtStage from "./ShirtStage";
import {
  SIZES,
  SOURCE_MAX,
  isValidEmail,
  normalizeEmail,
  type Side,
  type Size,
  type WaitlistResponse,
} from "./options";

const REACTIONS: Record<Side, string> = {
  chalant: "good. now prove it.",
  nonchalant: "you picked a side on purpose. that was a chalant move.",
};

// a signature-like stroke, drawn under the side you pick
const SCRIBBLE =
  "M6 34 C 18 10, 30 44, 44 20 S 66 6, 78 28 S 102 42, 116 16 S 142 26, 156 22 S 178 12, 194 24";

type Status = "idle" | "submitting" | "added" | "already" | "error";

function readSource(): string {
  const ref = new URLSearchParams(window.location.search).get("ref") ?? "";
  return ref.trim().slice(0, SOURCE_MAX);
}

export default function MerchPage() {
  const [side, setSide] = useState<Side | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const pick = (next: Side) => {
    const first = side === null;
    setSide(next);
    if (first) {
      // first let them watch the shirt turn and their signature appear, then bring the form into view.
      // no focus, so the phone keyboard does not pop up. skip it if they already scrolled themselves
      const startY = window.scrollY;
      window.setTimeout(() => {
        if (Math.abs(window.scrollY - startY) > 40) return;
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 1900);
    }
  };

  return (
    <div className="merch">
      <header className="merch-header">
        <a className="merch-logo" href="/" aria-label="The Chalant Society home">
          The <em>Chalant</em> Society
        </a>
        <span className="merch-tag">drop 01</span>
      </header>

      <main>
        <section className="debate" aria-labelledby="debate-title">
          <h1 id="debate-title" className="visually-hidden">
            chalant vs nonchalant? pick a side.
          </h1>

          <ShirtStage side={side} />

          <p className="hand debate-kicker">settle a debate</p>
          <div className="debate-board" role="group" aria-label="pick a side">
            <SideButton value="chalant" picked={side} onPick={pick} />
            <span className="debate-vs hand" aria-hidden>
              vs
            </span>
            <SideButton value="nonchalant" picked={side} onPick={pick} />
          </div>

          <p className="hand debate-prompt" aria-live="polite">
            {side ? REACTIONS[side] : "pick a side."}
          </p>
        </section>

        <div ref={formRef} className="signup-slot">
          {side ? (
            <WaitlistForm side={side} />
          ) : (
            <p className="signup-locked hand">
              <span aria-hidden>&uarr;</span> pick a side to get on the list
            </p>
          )}
        </div>

        <section className="why" aria-labelledby="why-title">
          <h2 id="why-title" className="visually-hidden">why this shirt exists</h2>
          <p className="why-line why-lead">
            nobody is non<em>chalant</em> by choice.
          </p>
          <p className="why-line">we want to talk to the stranger next to us.</p>
          <p className="why-line">we just don't have a reason.</p>
          <p className="why-line why-last">so we put the reason on a shirt.</p>
        </section>

        <section className="faq" aria-labelledby="faq-title">
          <h2 id="faq-title" className="section-title">questions</h2>
          <details>
            <summary>when does it drop?</summary>
            <p>when the first batch is printed. the list hears first.</p>
          </details>
          <details>
            <summary>what is the chalant society?</summary>
            <p>
              a community for social courage. we do small, scary, real-world challenges together, then talk about
              them. <a href="/">see what we do</a>.
            </p>
          </details>
        </section>
      </main>

      <footer className="merch-footer">
        <a className="merch-logo" href="/">
          The <em>Chalant</em> Society
        </a>
        <nav aria-label="Connect">
          <a href={LINKS.instagram} target="_blank" rel="noreferrer">instagram</a>
          <a href={LINKS.discord} target="_blank" rel="noreferrer">discord</a>
          <a href={`mailto:${LINKS.email}?subject=Chalant%20merch`}>email</a>
        </nav>
      </footer>
    </div>
  );
}

function SideButton({ value, picked, onPick }: { value: Side; picked: Side | null; onPick: (side: Side) => void }) {
  const isPicked = picked === value;
  const isOther = picked !== null && !isPicked;
  return (
    <button
      type="button"
      className={`side side-${value}${isPicked ? " is-picked" : ""}${isOther ? " is-other" : ""}`}
      aria-pressed={isPicked}
      onClick={() => onPick(value)}
    >
      <span className="side-word">
        <span className="side-highlight" aria-hidden />
        {value}
      </span>
      <svg className="side-scribble" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden>
        <path d={SCRIBBLE} pathLength={1} />
      </svg>
    </button>
  );
}

function WaitlistForm({ side }: { side: Side }) {
  const [email, setEmail] = useState("");
  const [size, setSize] = useState<Size | null>(null);
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [emailError, setEmailError] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [source] = useState(readSource);
  const emailId = useId();
  const sizeLabelId = useId();
  const busy = useRef(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current) return;

    const normalized = normalizeEmail(email);
    const emailOk = isValidEmail(normalized);
    setEmailError(emailOk ? "" : "that email doesn't look right.");
    if (!size) {
      setSizeError(true);
      setShakeKey((key) => key + 1);
    }
    if (!emailOk || !size) return;

    busy.current = true;
    setStatus("submitting");
    try {
      const response = await fetch("/api/merch-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, side, size, source: source || undefined, company }),
      });
      const data = (await response.json().catch(() => ({ error: "bad response" }))) as WaitlistResponse;
      if (!response.ok || !("success" in data) || !data.success) throw new Error("not saved");
      setStatus(data.alreadyAdded ? "already" : "added");
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  };

  if (status === "added" || status === "already") {
    return <Success already={status === "already"} side={side} />;
  }

  const submitting = status === "submitting";

  return (
    <section className="signup" aria-labelledby="signup-title">
      <h2 id="signup-title" className="signup-title">
        the first shirt drops soon.
        <br />
        get on the list.
      </h2>

      <form className="signup-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={emailId} className="field-label">
            your email
          </label>
          <input
            id={emailId}
            className="field-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? `${emailId}-error` : undefined}
            disabled={submitting}
          />
          {emailError && (
            <p id={`${emailId}-error`} className="field-error" role="alert">
              {emailError}
            </p>
          )}
        </div>

        <div className="field">
          <p id={sizeLabelId} className="field-label">
            your size
          </p>
          <div
            key={shakeKey}
            className={`sizes${sizeError && shakeKey > 0 ? " is-shaking" : ""}`}
            role="radiogroup"
            aria-labelledby={sizeLabelId}
            aria-invalid={sizeError ? true : undefined}
          >
            {SIZES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={size === option}
                className={`size${size === option ? " is-picked" : ""}`}
                onClick={() => {
                  setSize(option);
                  setSizeError(false);
                }}
                disabled={submitting}
              >
                {option}
              </button>
            ))}
          </div>
          {sizeError && (
            <p className="field-error" role="alert">
              pick your size.
            </p>
          )}
        </div>

        {/* honeypot: hidden from people and screen readers, bots fill it */}
        <div className="honeypot" aria-hidden>
          <label>
            company
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
        </div>

        <button className="submit" type="submit" disabled={submitting}>
          {submitting ? "signing..." : "put my name on the list"}
        </button>

        {status === "error" && (
          <p className="form-error" role="alert">
            something broke on our side. try again, or{" "}
            <a href={LINKS.instagram} target="_blank" rel="noreferrer">
              dm us on instagram
            </a>
            .
          </p>
        )}
      </form>
    </section>
  );
}

function Success({ already, side }: { already: boolean; side: Side }) {
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const share = async () => {
    const url = `${window.location.origin}/merch?ref=friend`;
    const text = "chalant or nonchalant? pick a side.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "The Chalant Society", text, url });
        return;
      } catch (error) {
        // the visitor closed the share sheet: nothing to do
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt("copy this link", url);
    }
  };

  return (
    <section className="signup success" aria-labelledby="success-title">
      <h2 id="success-title" ref={headingRef} tabIndex={-1} className="success-title hand">
        you're on the list.
      </h2>
      <p className="success-note">
        {already
          ? "you were already on the list. we saved your new side and size."
          : `signed on the ${side} side. we'll email you before anyone else.`}
      </p>

      <div className="success-share">
        <p>send this to the most nonchalant friend you have.</p>
        <button type="button" className="submit" onClick={share}>
          {copied ? "link copied" : "send it to a friend"}
        </button>
      </div>

      <p className="success-links">
        <span>meanwhile:</span>
        <a href={LINKS.discord} target="_blank" rel="noreferrer">
          join the discord
        </a>
        <a href={LINKS.instagram} target="_blank" rel="noreferrer">
          follow on instagram
        </a>
      </p>
    </section>
  );
}
