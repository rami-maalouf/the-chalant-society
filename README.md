# The Chalant Society

Website for The Chalant Society: a community and coaching project around rejection therapy, social courage, charisma, and care.

The home page is a scroll story: one person breaks the script, gets rejected, goes again, and the courage spreads to the whole room. The earlier home page at `/crowd` uses a fixed WebGL particle-crowd background as the central metaphor: one standout figure surrounded by a crowd. Foreground copy scrolls over the scene while the camera slowly pulls back to reveal the wider social context.

## Stack

- React 19
- Vite 6
- TypeScript
- Three.js
- @react-three/fiber
- @react-three/drei
- @react-three/postprocessing
- Tailwind CSS

## Pages

- `/` (`index.html`): the home page, a scroll story drawn in one SVG, then coaching and community. It is plain HTML with one inline script: no React, no Three.js, no bundle. Share links: `/#coaching`, `/#doors`, `/#community`
- `/crowd` (`crowd.html`, `src/App.tsx`): the earlier home page with the WebGL particle crowd. Search engines do not index it
- `/merch` (`merch.html`, `src/merch/`): the waitlist for the first shirt. It loads no Three.js crowd, so it stays fast on phones
- `api/merch-waitlist.ts`: a Vercel edge function that saves a sign-up to the "Chalant Merch Waitlist" Notion database

Each page is its own Vite entry, so `/` never loads the code of `/crowd` or `/merch`.

The developer brief for this work is `docs/revamp-and-merch-waitlist.md`.

To add a shirt to `/merch`, follow section 10b of that brief. After changing the shirt list, run `bun run merch:sync` so Notion accepts the new shirt.

## Requirements

- [Bun](https://bun.sh)
- A browser with WebGL 2 support and floating-point or half-float color buffer render targets (`/crowd` only)

## Environment

Copy `.env.example` to `.env.local` and fill in `NOTION_API_KEY`. The same two variables are set in the Vercel project.

## Run Locally

```bash
bun install
bun run dev
```

The dev server runs on port 3000. It serves `/merch` and runs the files in `api/` the same way Vercel does, so the waitlist form works locally against the real Notion database.

## Scripts

```bash
bun run dev      # start the development server
bun run build    # build the production bundle
bun run preview  # preview the production build locally (no api routes)
bun run lint     # run typescript without emitting files
bun run clean    # remove generated build artifacts
```

## Project Structure

```text
src/
  App.tsx                         # Website foreground, copy, CTAs, scroll progress
  components/
    Scene.tsx                     # React Three Fiber canvas and scroll-driven camera rig
    GPGPUParticles.tsx            # GPGPU simulation setup and particle render loop
  shaders/
    simulationShader.ts           # Position simulation and curl-noise motion
    renderShader.ts               # Particle rendering, coloring, sizing, alpha
  utils/
    proceduralHuman.ts            # Procedural crowd and figure target generation
  workers/
    crowdTextureWorker.ts         # Off-main-thread particle texture generation
```

## Build

```bash
bun run build
```

The production build is emitted to `dist/`.
