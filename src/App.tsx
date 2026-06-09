import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, Calendar, MessageCircle, Mail } from "lucide-react";

const Scene = lazy(() => import("./components/Scene"));

const SIMULATION = {
  chaos: 0,
  noiseStrength: 0,
  noiseFrequency: 0.18,
  returnSpeed: 1.9,
  baseSize: 0.026,
  interactionRadius: 2.1,
  mouseStrength: 3.2,
  amberColor: "#a84f08",
  goldColor: "#b88616",
  standoutColor: "#d8c6a2",
  resetSignal: 0,
};

function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = scrollableHeight <= 0 ? 0 : window.scrollY / scrollableHeight;
      setProgress(Math.min(1, Math.max(0, nextProgress)));
    };

    const requestUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return progress;
}

export default function App() {
  const scrollProgress = useScrollProgress();

  return (
    <main className="min-h-screen bg-[#030305] text-[#f5f2ea] selection:bg-[#ff7b00] selection:text-black">
      <div className="fixed inset-0 z-0 bg-[#030305]">
        <Suspense fallback={null}>
          <Scene {...SIMULATION} scrollProgress={scrollProgress} />
        </Suspense>
      </div>

      {/* Scrims only where copy lives — keep the upper field clear for the face close-up */}
      <div className="fixed inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_90%_65%_at_20%_92%,rgba(3,3,5,0.94)_0%,rgba(3,3,5,0.42)_38%,transparent_68%)]" />
      <div className="fixed inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_55%_50%_at_50%_50%,rgba(3,3,5,0.55)_0%,transparent_70%)] md:opacity-0" />
      <div className="grain-overlay" />

      <div className="relative z-10">
        <header className="site-header">
          <a className="site-mark" href="#top" aria-label="The Chalant Society home">
            The Chalant Society
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a className="nav-link" href="#in-action">in action</a>
            <a className="nav-link" href="#community">the community</a>
            <a className="nav-link" href="#coaching">1-on-1 coaching</a>
          </nav>
          <div className="flex items-center gap-4">
            <a className="header-cta" href="https://discord.gg/chalant" target="_blank" rel="noreferrer">
              <MessageCircle size={13} />
              <span>Join Discord</span>
            </a>
          </div>
        </header>

        <section id="top" className="section-frame section-hero">
          <div className="page-container">
            {/* <p className="eyebrow">courage · charisma · care · curiosity</p> */}
            <h1 className="hero-title">
              you&apos;ve been trained to be nonchalant.
            </h1>
            <p className="hero-subcopy">
              the chalant society is a community for social courage. we run weekly rejection-therapy challenges in the real world, then debrief and hold each other accountable on discord, so you are no longer held back by your irrational social fears.
            </p>
            <div className="cta-row">
              <a className="primary-cta" href="https://discord.gg/chalant" target="_blank" rel="noreferrer">
                <MessageCircle size={18} />
                join the discord
                <ArrowRight size={18} />
              </a>
              <a className="secondary-cta" href="#coaching">
                explore 1-on-1 coaching
              </a>
            </div>
          </div>
        </section>

        <section id="manifesto" className="section-frame section-content">
          <div className="page-container statement-block">
            {/* <p className="section-kicker">the manifesto</p> */}
            <h2>
              apathy is an armor.
              <br />
              it is also a cage.
            </h2>
            <div className="spoken-copy">
              <p>say less. want less. risk less.</p>
              <p>pretend you did not care, so rejection has nowhere to land.</p>
              <p>we call it being cool. we call it being calm. but it is just rehearsed fear.</p>
              <p>being <em>chalant</em> is the cure. it means caring on purpose, trying in public, taking up space, and showing up with absolute presence.</p>
            </div>
          </div>
        </section>

        <section id="community" className="section-frame section-content">
          <div className="page-container">
            <h2 className="section-title-large">two ways to practice being chalant</h2>
            
            <div className="offerings-grid">
              {/* Card 1: The Community & Meetups (Priority 1) */}
              <div className="offering-card">
                <div className="card-content">
                  <h3>the weekly challenges & discord</h3>
                  <p>
                    step outside your comfort zone as a team. we organize weekly, filmed group challenges (inspired by rejection therapy) to shatter social anxiety and build presence in public spaces.
                  </p>
                  <p>
                    our discord is the 24/7 clubhouse where being chalant is the norm. share your wins, find accountability, and join a crew of courage-builders.
                  </p>
                </div>
                <div className="card-actions">
                  <a className="primary-cta" href="https://discord.gg/chalant" target="_blank" rel="noreferrer">
                    <MessageCircle size={18} />
                    enter the discord
                    <ArrowRight size={18} />
                  </a>
                  <a className="secondary-cta" href="https://www.instagram.com/thechalantsociety/" target="_blank" rel="noreferrer">
                    <Calendar size={18} />
                    meetup schedule
                  </a>
                </div>
              </div>

              {/* Card 2: 1-on-1 Coaching (Priority 2) */}
              <div id="coaching" className="offering-card">
                <div className="card-content">
                  <h3>tailored systems & expansion coaching</h3>
                  <p>
                    stop holding yourself back. i work 1-on-1 with select individuals to design custom systems for communication, focus, and time management—grounded in real-world experiments.
                  </p>
                  <p>
                    together, we run personalized comfort-zone expansions to take your social leadership, charisma, and clarity to the next level.
                  </p>
                </div>
                <div className="card-actions">
                  <a className="primary-cta" href="https://cal.com/rami-maalouf/chalant-discovery" target="_blank" rel="noreferrer">
                    <Calendar size={18} />
                    schedule a call
                    <ArrowRight size={18} />
                  </a>
                  <a className="secondary-cta" href="mailto:ramimaalouf.me@gmail.com?subject=Chalant%20Society%20Coaching%20Inquiry">
                    <Mail size={18} />
                    inquire via email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-frame min-h-[84vh] justify-center">
          <div className="three-cs" aria-label="The three C's">
            <span>courage</span>
            <span>charisma</span>
            <span>care</span>
          </div>
        </section>

        <section id="show-up" className="section-frame section-closer">
          <div className="page-container invitation">
            {/* <p className="section-kicker">the invitation</p> */}
            <h2>are you chalant enough to show up?</h2>
            <p>
              you do not need to become fearless. you just need one room where effort is celebrated, and a group of people willing to go first.
            </p>
            <div className="cta-row">
              <a className="primary-cta" href="https://discord.gg/chalant" target="_blank" rel="noreferrer">
                <MessageCircle size={18} />
                join the community
                <ArrowRight size={18} />
              </a>
              <a className="secondary-cta" href="mailto:ramimaalouf.me@gmail.com?subject=Chalant%20Society%20Coaching%20Inquiry">
                <Mail size={18} />
                apply for coaching
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
