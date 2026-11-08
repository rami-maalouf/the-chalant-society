# The Chalant Society website: revamp + merch waitlist

developer brief. written 2026-11-08 for whoever builds this. owner: Rami Maalouf (chalant@ramimaalouf.com).

## 1. summary

Two jobs, in this order:

1. **ship a waitlist page for the first Chalant Society shirt** at `/merch`. The visitor picks a side ("chalant" or "nonchalant"), enters an email, and the entry goes into Rami's existing Notion waitlist database.
2. **revamp the home page** at `/`. The content is out of date and the screenshots show visible layout bugs (section 6).

The waitlist ships first. Rami wears the prototype shirt at events now, and people need a page to go to.

Live site: https://chalant.orbitlabs.studio (Vercel). This repo is the source: the live JS bundle contains the same copy as `src/App.tsx` at commit `1d6543d` (2026-06-20).

## 2. the product: the debate shirt

A white tee. The front says **chalant | nonchalant** with a vertical line between the two words. Under it: "pick a side. sign my back." Strangers sign their name on the back, on the side they pick, with a fabric marker that hangs from a loop on the hem.

Why it exists: the shirt gives a stranger an obvious reason to start a conversation. The wearer's ask ("wanna settle a debate?") is a small act of courage, and so is the stranger's signature. Every signature, even on the "nonchalant" side, is a chalant act. That joke is the brand.

Status: Rami is testing a hand-made prototype. There is no price, no supplier, no ship date and no photo yet. The waitlist measures demand, and the required size field tells Rami how many of each size to print. **The page shows no price and no photos** (Rami's decision, 2026-11-08). Photos come later.

## 3. what exists today

### 3.1 the site (this repo)

| item | value |
|---|---|
| stack | React 19, Vite 6, TypeScript, Tailwind 4, Three.js via @react-three/fiber |
| pages | one page, `src/App.tsx` (337 lines), anchor links only, no router |
| background | a fixed WebGL particle crowd (`src/components/Scene.tsx`, `GPGPUParticles.tsx`), scroll drives the camera |
| fonts | Instrument Sans (body, display), Crimson Pro (serif headings), Bricolage Grotesque (logo), from Google Fonts in `index.html` |
| colors | background `#030305`, text `#f5f2ea`, amber/gold accents (`#ff7b00` selection, `#a84f08`, `#b88616` in the scene) |
| hosting | Vercel project `the-chalant-society` (team `rami-m`, id `prj_aEja6WBMh0MPjIjly2yX69pRaZGL`), preset Vite, connected to GitHub `rami-maalouf/the-chalant-society`. **a push to `main` deploys to production**; other branches get preview URLs. no env vars set yet. no `vercel.json` in the repo |
| backend | none |

### 3.2 the waitlist pattern in Rami's other repos

Four of Rami's repos have a waitlist form that writes to a shared Notion database ("Twilight waitlist") with almost the same Vercel edge function:

| repo | file | dedupe | email validation |
|---|---|---|---|
| `web/twilight-landing` | `api/waitlist.ts` | no | no |
| `web/serendipity-landing` | `api/waitlist.ts` | yes | yes |
| `audora/apps/eloq-landing` | `api/waitlist.ts` | yes | yes |
| `react-native/calendar-metrics/apps/web` | `src/routes/api/waitlist.ts` | yes | yes |

Copy the **serendipity** version (`web/serendipity-landing/api/waitlist.ts`) as the starting point, then change it as described in section 5.3. Twilight is a Vite + Vercel project like this one, so the `api/` folder works the same way here.

**The merch waitlist does not use the shared database.** It has its own database (section 3.3), because it needs fields the app waitlists do not have (side, size, item).

Env vars for this project:

```
NOTION_API_KEY=                     # the notion integration secret ("Audora waitlist" integration). never in client code
NOTION_MERCH_DATASOURCE_ID=         # d9c77736-985d-44f1-96f7-87f8309dd76b
```

The API key is the same one the other landing pages use. It is in `web/twilight-landing/.env.local` on Rami's Mac. Do not commit it. Set both values in Vercel for Production and Preview.

### 3.3 the Notion database: "Chalant Merch Waitlist"

Created 2026-11-08 as a top-level private page in Rami's Notion workspace.

- database: https://app.notion.com/p/716ed579e9374132a6b622e4d7ccdf65
- data source id: `d9c77736-985d-44f1-96f7-87f8309dd76b`

| property | type | values | notes |
|---|---|---|---|
| Email | title | lowercased email | |
| Item | select | `chalant \| nonchalant tee` | the merch item. new items get a new option |
| Side | select | `chalant`, `nonchalant` | the side the visitor picked |
| Size | select | XS, S, M, L, XL, XXL | **required** on the form |
| Source | rich_text | max 50 chars | the `?ref=` value, for example `shirt-qr`, `instagram`, an event name |
| Signed up | created_time | automatic | Notion sets it. the API does not write it |

One row per email **per item**. A second sign-up with the same email for the same item updates that row (the visitor may change their size or side). It does not create a new row.

**Access:** the Notion integration "Audora waitlist" must be connected to this database before the API can write to it. In Notion: open the database, `...` menu, Connections, add "Audora waitlist". Until then the API returns `object_not_found` (checked 2026-11-08).

## 4. scope

### in scope

- `/merch` page (section 5)
- `api/waitlist.ts` edge function (section 5.3)
- shared shell for both pages: header, footer, favicon, social share tags
- home page fixes and content updates (section 6)
- project hygiene (section 7)

### out of scope (later)

- payments, a store, checkout
- accounts or logins
- showing signer names on the site (needs moderation)
- a live tally of chalant vs nonchalant votes (phase 3, section 9)
- the "chatgpt | claude" shirt. it uses two companies' brand names, so Rami checks the rules before he sells it

## 5. the `/merch` page

The route is `/merch` (Rami's decision, 2026-11-08). The name leaves room for more items later. For now the page has one item, the debate shirt, so it reads as a single-product page, not a store grid. When a second item comes, the page becomes a list of items, and each item keeps the same pick-a-side form.

### 5.1 concept: the page is the shirt

The home page is dark. The shirt page is the **white shirt**: an off-white page (`#fbfbf9`), black block type, and handwriting in marker. A visitor who scanned a QR code on the street sees the same object they just saw on a person.

Keep the brand link: the logo, and the word *chalant* in the italic amber style from the home page (`.chalant-word`).

Suggested handwriting font: Permanent Marker (Google Fonts). Use it only for signatures and small notes, never for body text.

### 5.2 layout and states

Mobile first. Most visitors arrive from a QR code on a phone, often on mobile data. Design at 390 px wide, then scale up.

All copy below is a **draft**. Rami approves the final words.

**Section A: the debate (above the fold on a phone)**

```
            the chalant society

        chalant  |  nonchalant
                 |
            pick a side.

  [  chalant  ]        [ nonchalant ]
```

- Two large buttons, one per side, at least 56 px tall.
- On tap, the chosen side gets a marker scribble animation (about 600 ms, an SVG stroke). Respect `prefers-reduced-motion`: no animation, show the result.
- Then one line of reaction copy appears:
  - chalant: "good. now prove it."
  - nonchalant: "you picked a side on purpose. that was a chalant move."
- Then the form slides in under it (Section B). The visitor can change the side at any time.

**Section B: the form**

```
  the first shirt drops soon. get on the list.

  [ email                              ]
  your size        XS  S  M  L  XL  XXL
  [        put my name on the list        ]
```

- Email field: `type="email"`, `autocomplete="email"`, `inputmode="email"`.
- Size: one row of chips. **Required.** One tap selects. Tapping another chip moves the selection. Add a small "size guide" link only when the supplier and the cut are known; until then the chips are enough.
- Hidden honeypot field named `company`, off screen, `tabindex="-1"`, `autocomplete="off"`.
- Read `?ref=` from the URL on load and send it as `source`.

**Form states** (each one needs a design and a screenshot check):

| state | what the visitor sees |
|---|---|
| idle | the form. button enabled only after a side is picked, a size is picked and the email field is not empty |
| no size | if the visitor taps the button with no size, the size row shakes once and shows "pick your size." no request is sent |
| invalid email | inline message under the field: "that email doesn't look right." no request is sent |
| submitting | button text "signing...", button disabled, so a double tap sends one request only |
| success, new | the form is replaced by: "you're on the list." plus the share block below |
| success, already on the list | same screen, with the line "you were already on the list. we saved your new side and size." |
| server or network error | message under the button: "something broke on our side. try again, or dm us on instagram." with a retry and the Instagram link. keep the typed email |

**Share block (success state only)**

- "send this to the most nonchalant friend you have."
- A button that uses the Web Share API, with a "copy link" fallback. The shared link is `https://chalant.orbitlabs.studio/merch?ref=friend`.
- Secondary links: Discord (`https://discord.gg/wJJS9nqs7E`) and Instagram (`https://www.instagram.com/thechalantsociety/`).

**Section C: how the shirt works** (three short steps)

1. wear it.
2. ask a stranger: "wanna settle a debate?"
3. they sign your back. you just had a conversation you wouldn't have had.

**No photos for now** (Rami's decision, 2026-11-08). Draw the shirt instead: a simple SVG of the front and the back, in the same style as the page (black lines on off-white, marker handwriting for the signatures). Section 10 shows the layout. The back drawing can fill with example signatures as the visitor scrolls. Build the image slot so a real photo can replace the drawing later with no layout change.

**Section D: why** (one short paragraph, Rami writes it)

The idea to carry: nobody is nonchalant by choice. People want to talk to each other but follow a script. The shirt gives a stranger a reason to break it.

**Section E: small FAQ**

- when does it ship? "when the first batch is printed. the list hears first."
- no price question in the FAQ, and no price anywhere on the page (Rami's decision, 2026-11-08).
- what is the chalant society? one line plus a link to `/`.

**Footer**: the same footer as the home page (after its fix in section 6.1).

### 5.3 the API: `api/waitlist.ts`

Start from `web/serendipity-landing/api/waitlist.ts`. Keep `runtime: "edge"`. Then change it:

1. **Write to the merch database** (`NOTION_MERCH_DATASOURCE_ID`), with the properties in section 3.3. No `App`, `Platform` or `Date` fields: those belong to the shared app database. `Signed up` is automatic.
2. **Dedupe by email and item.** Query for a row with the same Email and the same Item. If it exists, update its Side, Size and Source and return `alreadyAdded: true`. If not, create the row.
3. **Do not send raw error messages to the browser.** The serendipity code returns `error.message` from Notion. Log it on the server with `console.error`, and return a generic message.
4. **Validate every field against a fixed list.** `side` must be `chalant` or `nonchalant`. `size` must be one of the six sizes. Both are required. `source` is trimmed and cut to 50 characters.
5. **Honeypot.** If `company` has a value, return a fake success and write nothing.
6. **Limit email length** to 254 characters.

Sketch (not tested; the developer owns the final code):

```ts
import { Client } from "@notionhq/client";

export const config = { runtime: "edge" };

const ITEM = "chalant | nonchalant tee";
const SIDES = ["chalant", "nonchalant"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid request" }, 400);
  }

  // honeypot: bots fill the hidden field, people never see it
  if (body.company) return json({ success: true, alreadyAdded: false });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "use a valid email address" }, 400);
  }
  if (typeof body.side !== "string" || !SIDES.includes(body.side)) {
    return json({ error: "pick a side" }, 400);
  }
  if (typeof body.size !== "string" || !SIZES.includes(body.size)) {
    return json({ error: "pick your size" }, 400);
  }
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 50) : "";

  const apiKey = process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_MERCH_DATASOURCE_ID;
  if (!apiKey || !dataSourceId) {
    console.error("merch waitlist: notion env vars missing");
    return json({ error: "server configuration error" }, 500);
  }

  const notion = new Client({ auth: apiKey });
  const choices = {
    Side: { select: { name: body.side } },
    Size: { select: { name: body.size } },
    ...(source ? { Source: { rich_text: [{ text: { content: source } }] } } : {}),
  };

  try {
    const existing = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        and: [
          { property: "Email", title: { equals: email } },
          { property: "Item", select: { equals: ITEM } },
        ],
      },
      page_size: 1,
    });

    if (existing.results.length > 0) {
      // same person, same item: keep one row, take their latest side and size
      await notion.pages.update({ page_id: existing.results[0].id, properties: choices });
      return json({ success: true, alreadyAdded: true });
    }

    await notion.pages.create({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: {
        Email: { title: [{ text: { content: email } }] },
        Item: { select: { name: ITEM } },
        ...choices,
      },
    });
    return json({ success: true, alreadyAdded: false });
  } catch (error) {
    console.error("merch waitlist: notion error", error);
    return json({ error: "could not save your email. try again." }, 502);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

Known limits, acceptable for v1:

- Two submits at the same moment with the same email can create two rows. The disabled button makes this rare.
- No IP rate limit. The honeypot and validation are enough at this size. Add Vercel firewall rules if spam appears.

### 5.4 how to add the route

Use a **Vite multi-page build**, not a client router:

- `index.html` stays the home page.
- new `merch/index.html` with its own entry, `src/merch/main.tsx`.
- list both in `build.rollupOptions.input` in `vite.config.ts`.

Why: the merch page must **not** load Three.js or the 5.7 MB of crowd model files in `public/private-assets/`. A phone on the street needs the page in about 2 seconds. Separate entries keep the bundles apart, and Vercel serves `/merch` as a static file with no rewrite rules.

Move the shared parts (header, footer, `DiscordIcon`, links, design tokens) into `src/shared/` so both pages use the same code.

Add `@notionhq/client` as a dependency (twilight and serendipity use `^5.6.0`).

## 6. home page revamp

### 6.1 visual bugs (seen in screenshots at 1280x800 and 390x844, 2026-11-08)

| # | bug | where | fix |
|---|---|---|---|
| 1 | the header pill is transparent. headings scroll under it and the two overlap | "The weekly challenges & discord" card heading, "see it in action" kicker | give the header a dark background with blur (`backdrop-filter`), or hide it on scroll down and show it on scroll up |
| 2 | body text sits on top of the bright particle figure and is hard to read | hero subcopy, both offering cards, the closer line "you just need one room where effort is celebrated" (half hidden behind the figure) | a solid or strongly blurred background behind each text block, or keep text columns away from the figure. check contrast with a tool, target WCAG AA (4.5:1) |
| 3 | the footer is not aligned with the page. its content starts at x=0, the rest of the page starts at the 128 px container edge | footer, desktop | apply the same container padding as `.page-container` |
| 4 | the closer heading breaks with "up?" alone on the second line | "Are you chalant enough to show up?" | `text-wrap: balance` on headings |
| 5 | the "apply for coaching" button is half covered by the figure | closer section | same fix as bug 2 |
| 6 | no favicon (`/favicon.ico` returns 404) | browser tab | add favicon and apple-touch-icon |
| 7 | no Open Graph or Twitter tags. a shared link shows no image or title card | `index.html` | add `og:title`, `og:description`, `og:image` (1200x630), `twitter:card`. make one share image per page |
| 8 | the 3D scene is heavy. our automated browser could not take a screenshot within 15 seconds while the scene ran | whole page | test on a mid-range phone. add a lighter particle count on mobile, and a still image for `prefers-reduced-motion` and for devices without WebGL 2 |

After each fix, take screenshots at 390, 768 and 1280 px wide and compare them with the bug list.

### 6.2 content updates

Rami decides each one. The current copy and what changed:

| section | today | what changed | needs from Rami |
|---|---|---|---|
| hero subcopy | "we run weekly rejection-therapy challenges in the real world" | the society moved from Calgary to Toronto. meetups in Toronto are not weekly yet, and the format is still open | the current cadence and city line |
| hero headline | "You've been trained to be nonchalant" | Rami's newest wording of the same idea: "nobody is nonchalant by choice" | keep or change |
| "meetup schedule" button | links to Instagram | there is no events calendar link yet | a Luma (or other) calendar URL, or remove the button |
| coaching card | "one-on-one coaching for real social fear" | a planned rebrand repositions coaching around tailored personal systems (communication, focus, planning) | keep the current copy or the new offer |
| featured video | "How to be socially courageous" (`XDG9ZwgZG7o`) | a newer video exists: "the truth about rejection therapy content creators" (`aCPnV_i6MUw`, Aug 2026) | which video |
| social proof | none | the Discord had 180+ members in Oct 2025 | today's member count, if he wants a number on the page |
| new section | none | the shirt | a short teaser block ("the first shirt: pick a side") that links to `/merch` |

## 7. project hygiene

- Delete `metadata.json` and the Gemini lines in `.env.example`. They are leftovers from Google AI Studio and the site does not use Gemini. Replace `.env.example` with the two Notion variables.
- README: switch commands to `bun` (Rami uses bun for every JS project), remove "No API key or backend service is required", document the env vars and `vercel dev` for testing the API locally.
- `public/private-assets/` holds RenderPeople 3D model files, and they are publicly downloadable from the live site (for example `/private-assets/renderpeople/rp_posedplus_00068_18_300k_standout.bin` returns 200). Rami confirms that the RenderPeople license allows this (open question 9).
- Keep `bun run lint` (`tsc --noEmit`) passing. Add `bun run build` to the checks before deploy.

## 8. acceptance criteria

The `/merch` page is done when:

1. on a 390 px wide phone, the two side buttons are visible without scrolling
2. picking a side and a size, entering an email and submitting creates one row in "Chalant Merch Waitlist" with Email, Item, Side, Size, Source (if `?ref=` was present), and an automatic Signed up time
3. the button does nothing useful until a side and a size are picked: tapping it with no size shows "pick your size." and sends no request
4. submitting the same email again for the same item shows the "already on the list" state, updates Side and Size on the existing row, and creates no new row
5. a double tap on the button sends one request
6. an invalid email shows the inline message and sends no request
7. with the network off, the error state appears and the typed email stays in the field
8. the page loads no Three.js code and no files from `/private-assets/` (check the network tab)
9. on a throttled "Fast 4G" profile, the page is usable in under 2 seconds
10. sharing the link in iMessage or Instagram shows a share card with an image
11. the Notion API key never appears in the client bundle (search the built `dist/` files)
12. the page shows no price and no photo

The home page is done when bugs 1 to 8 in section 6.1 are fixed and checked with screenshots at 390, 768 and 1280 px, and Rami approves the copy in section 6.2.

## 9. phases

| phase | contents | why this order |
|---|---|---|
| 1 | `/merch` page, API, favicon, share tags, hygiene (the Notion database already exists) | Rami needs the page while he tests the shirt at events |
| 2 | home page bug fixes and content updates, the shirt teaser section | content depends on Rami's answers in section 6.2 |
| 3 (later) | a live tally on `/merch` ("214 chalant, 37 nonchalant"), read from Notion and cached for 60 seconds | only worth it once the list has real numbers. Notion allows about 3 requests per second, so the tally must be cached |

## 10. reference: the shirt

Decided 2026-11-08: the **front** says "chalant vs nonchalant" with no line. The **back** has the line down the middle, and strangers sign on their side.

```
FRONT                               BACK
+----------------------------+      +----------------------------+
| chalant  vs  nonchalant    |      |   chalant  |  nonchalant   |
|                            |      |   ~~~~     |    ~~~~       |
|      pick a side.          |      |   ~~~~     |    ~~~~       |
|      sign my back.         |      |   ~~~~     |               |
|                            |      |            |               |
|   @thechalantsociety    o~ |      |            |               |
+----------------------------+      +----------------------------+
                          marker on a loop at the hem
```

The `/merch` page shows this shirt in 3D (`src/merch/Shirt3D.tsx`, artwork in `src/merch/shirtArt.ts`). It is built in code, with no outside 3D model. When a visitor picks a side, the shirt turns to the back and their signature is drawn in amber on that side. Phones without WebGL 2 see the flat drawing (`src/merch/ShirtDrawings.tsx`).

## 11. open questions for Rami

Decided on 2026-11-08:

- the route is `/merch`
- no price on the page
- no photos for now; drawings until a photo exists
- size is required
- the merch waitlist has its own Notion database (section 3.3)
- the Vercel project is `rami-m/the-chalant-society`, and Rami's Vercel CLI on his Mac is logged in to it

Still open:

1. connect the "Audora waitlist" integration to the "Chalant Merch Waitlist" database in Notion (one click, section 3.3)
2. does the domain stay `chalant.orbitlabs.studio`? (`chalantsociety.com` belongs to an unrelated ski brand)
3. ship date, and is the marker included? (until then the copy says "the list hears first")
4. the content answers in section 6.2
5. final copy for sections 5.2 A to E (the drafts above are placeholders)
6. does the RenderPeople license allow public hosting of the model files?
