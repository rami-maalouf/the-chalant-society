import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, Calendar, Instagram, Linkedin, Mail, Youtube } from "lucide-react";
import DiscordIcon from "./components/DiscordIcon";

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

const PILLARS = [
  {
    name: "Courage",
    tagline: "try in public",
    description:
      "show up before you feel ready. take the shot, ask the question, and let rejection land where it may.",
  },
  {
    name: "Charisma",
    tagline: "presence that lands",
    description:
      "warmth without performance. make people feel seen without shrinking yourself to stay safe.",
  },
  {
    name: "Care",
    tagline: "show the care",
    description:
      "we're not afraid to show that we care—on this site, in the discord, in how we debrief. no ironic distance, just honest investment.",
  },
  {
    name: "Curiosity",
    tagline: "stay open",
    description:
      "ask what you actually want to know. trade rehearsed indifference for genuine wonder.",
  },
] as const;

const FEATURED_ACT = {
  youtubeVideoId: "XDG9ZwgZG7o",
  youtubeUrl: "https://youtu.be/XDG9ZwgZG7o",
  title: "A Chalant act — The Chalant Society",
} as const;

const FOOTER_LINKS = {
  instagram: "https://www.instagram.com/thechalantsociety/",
  linkedin: "https://www.linkedin.com/in/rami-m",
  email: "chalant@ramimaalouf.com",
  discord: "https://discord.gg/wJJS9nqs7E",
  youtube: FEATURED_ACT.youtubeUrl,
  coaching: "https://cal.com/rami-maalouf/chalant-discovery",
} as const;

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
            The <em className="chalant-word">Chalant</em> Society
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a className="nav-link" href="#in-action">in action</a>
            <a className="nav-link" href="#community">the community</a>
            <a className="nav-link" href="#coaching">1-on-1 coaching</a>
          </nav>
          <div className="flex items-center gap-4">
            <a className="header-cta" href={FOOTER_LINKS.discord} target="_blank" rel="noreferrer">
              <DiscordIcon size={13} />
              <span>Join Discord</span>
            </a>
          </div>
        </header>

        <section id="top" className="section-frame section-hero">
          <div className="page-container">
            {/* <p className="eyebrow">courage · charisma · care · curiosity</p> */}
            <h1 className="hero-title">
              You&apos;ve been trained
              <br />
              to be nonchalant
            </h1>
            <p className="hero-subcopy">
              The <em className="chalant-word">Chalant</em> Society is a community for social courage. we run weekly rejection-therapy challenges in the real world, then debrief and hold each other accountable on discord, so you are no longer held back by your irrational social fears.
            </p>
            <div className="cta-row">
              <a className="primary-cta" href={FOOTER_LINKS.discord} target="_blank" rel="noreferrer">
                <DiscordIcon size={18} />
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
              Apathy is an armor.
              <br />
              it is also a cage
            </h2>
            <div className="spoken-copy">
              <p>say less. want less. risk less.</p>
              <p>pretend you did not care, so rejection has nowhere to land.</p>
              <p>we call it being cool. we call it being calm. but it is just rehearsed fear.</p>
              <p>being <em className="chalant-word">chalant</em> is the cure. it means caring on purpose, trying in public, taking up space, and showing up with absolute presence.</p>
            </div>
          </div>
        </section>

        <section id="community" className="section-frame section-content">
          <div className="page-container">
            <h2 className="section-title-large">
              Two ways to practice being <em className="chalant-word">chalant</em>
            </h2>

            <div className="offerings-grid">
              <div className="offering-card">
                <div className="card-content">
                  <h3>The weekly challenges & discord</h3>
                  <p>
                    step outside your comfort zone as a team. we organize weekly, filmed group challenges (inspired by rejection therapy) to shatter social anxiety and build presence in public spaces.
                  </p>
                  <p>
                    our discord is the 24/7 clubhouse where being <em className="chalant-word">chalant</em> is the norm. share your wins, find accountability, and join a crew of courage-builders.
                  </p>
                </div>
                <div className="card-actions">
                  <a className="primary-cta" href={FOOTER_LINKS.discord} target="_blank" rel="noreferrer">
                    <DiscordIcon size={18} />
                    enter the discord
                    <ArrowRight size={18} />
                  </a>
                  <a className="secondary-cta" href="https://www.instagram.com/thechalantsociety/" target="_blank" rel="noreferrer">
                    <Calendar size={18} />
                    meetup schedule
                  </a>
                </div>
              </div>

              <div id="coaching" className="offering-card">
                <div className="card-content">
                  <h3>one-on-one coaching for real social fear</h3>
                  <p>
                    work with rami on the specific fears holding you back: freezing in meetings, dodging networking, staying quiet when you should speak up. each session is built around your goals, not a generic script.
                  </p>
                  <p>
                    we pair coaching with real social challenges that expand your comfort zone in controlled, supportive ways. debrief what happened, track your wins between sessions, and practice until acting with conviction feels normal.
                  </p>
                </div>
                <div className="card-actions">
                  <a className="primary-cta" href="https://cal.com/rami-maalouf/chalant-discovery" target="_blank" rel="noreferrer">
                    <Calendar size={18} />
                    schedule a call
                    <ArrowRight size={18} />
                  </a>
                  <a className="secondary-cta" href={`mailto:${FOOTER_LINKS.email}?subject=Chalant%20Society%20Coaching%20Inquiry`}>
                    <Mail size={18} />
                    inquire via email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pillars" className="section-frame section-content">
          <div className="page-container">
            <p className="section-kicker">what we practice</p>
            <h2 className="section-title-large">The four c&apos;s</h2>
            <p className="pillars-intro">
              nonchalance is the default. these are the muscles we train together—on camera, in discord, and out in the world.
            </p>
            <div className="pillars-grid" aria-label="Our four pillars">
              {PILLARS.map((pillar, index) => (
                <article key={pillar.name} className="pillar-card">
                  <span className="pillar-index">0{index + 1}</span>
                  <h3 className="pillar-name">{pillar.name}</h3>
                  <p className="pillar-tagline">{pillar.tagline}</p>
                  <p className="pillar-description">{pillar.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="in-action" className="section-frame section-content">
          <div className="page-container chalant-act">
            <div className="chalant-act-header">
              <p className="section-kicker">see it in action</p>
              <h2 className="section-title-large">From hesitation to action</h2>
              <p className="chalant-act-intro">
                the story behind a real <em className="chalant-word">chalant</em> act—and what it took to show up anyway.
              </p>
            </div>
            <div className="video-embed">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${FEATURED_ACT.youtubeVideoId}?rel=0&modestbranding=1`}
                title={FEATURED_ACT.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </section>

        <section id="show-up" className="section-frame section-closer">
          <div className="page-container invitation">
            {/* <p className="section-kicker">the invitation</p> */}
            <h2>
              Are you <em className="chalant-word">chalant</em> enough to show up?
            </h2>
            <p>
              you do not need to become fearless. you just need one room where effort is celebrated, and a group of people willing to go first.
            </p>
            <div className="cta-row">
              <a className="primary-cta" href={FOOTER_LINKS.discord} target="_blank" rel="noreferrer">
                <DiscordIcon size={18} />
                join the community
                <ArrowRight size={18} />
              </a>
              <a className="secondary-cta" href={`mailto:${FOOTER_LINKS.email}?subject=Chalant%20Society%20Coaching%20Inquiry`}>
                <Mail size={18} />
                apply for coaching
              </a>
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <div className="page-container site-footer-inner">
            <div className="site-footer-top">
              <a className="site-mark" href="#top">
                The <em className="chalant-word">Chalant</em> Society
              </a>
              <nav className="site-footer-links" aria-label="Connect">
                <a href={FOOTER_LINKS.instagram} target="_blank" rel="noreferrer">
                  <Instagram size={16} aria-hidden />
                  instagram
                </a>
                <a href={FOOTER_LINKS.linkedin} target="_blank" rel="noreferrer">
                  <Linkedin size={16} aria-hidden />
                  linkedin
                </a>
                <a href={`mailto:${FOOTER_LINKS.email}?subject=Chalant%20Society%20Inquiry`}>
                  <Mail size={16} aria-hidden />
                  email
                </a>
                <a href={FOOTER_LINKS.discord} target="_blank" rel="noreferrer">
                  <DiscordIcon size={16} />
                  discord
                </a>
                <a href={FOOTER_LINKS.youtube} target="_blank" rel="noreferrer">
                  <Youtube size={16} aria-hidden />
                  youtube
                </a>
              </nav>
            </div>
            <div className="site-footer-bottom">
              <nav className="site-footer-nav" aria-label="Site">
                <a href="#in-action">in action</a>
                <a href="#community">the community</a>
                <a href="#coaching">1-on-1 coaching</a>
                <a href={FOOTER_LINKS.coaching} target="_blank" rel="noreferrer">
                  book a call
                </a>
              </nav>
              <p className="site-footer-copy">
                © {new Date().getFullYear()} The <em className="chalant-word">Chalant</em> Society
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
