import { Client } from "@notionhq/client";
import {
  SHIRTS,
  SOURCE_MAX,
  findShirt,
  isSideOf,
  isSize,
  isValidEmail,
  normalizeEmail,
  type WaitlistResponse,
} from "../src/merch/options";

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "invalid request" }, 400);
  }

  // honeypot: bots fill the hidden field, people never see it. pretend it worked
  if (typeof body.company === "string" && body.company.length > 0) {
    return json({ success: true, alreadyAdded: false });
  }

  // older clients sent no shirt: that was always the first one
  const shirt = body.shirt === undefined ? SHIRTS[0] : findShirt(body.shirt);
  if (!shirt) return json({ error: "unknown shirt" }, 400);
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return json({ error: "use a valid email address" }, 400);
  if (!isSideOf(shirt, body.side)) return json({ error: "pick a side" }, 400);
  if (!isSize(body.size)) return json({ error: "pick your size" }, 400);
  const source = typeof body.source === "string" ? body.source.trim().slice(0, SOURCE_MAX) : "";

  const apiKey = process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_MERCH_DATASOURCE_ID;
  if (!apiKey || !dataSourceId) {
    console.error("merch waitlist: NOTION_API_KEY or NOTION_MERCH_DATASOURCE_ID is missing");
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
          { property: "Item", select: { equals: shirt.item } },
        ],
      },
      page_size: 1,
    });

    const row = existing.results[0];
    if (row) {
      // same person, same item: keep one row and take their latest side and size
      await notion.pages.update({ page_id: row.id, properties: choices });
      return json({ success: true, alreadyAdded: true });
    }

    await notion.pages.create({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: {
        Email: { title: [{ text: { content: email } }] },
        Item: { select: { name: shirt.item } },
        ...choices,
      },
    });
    return json({ success: true, alreadyAdded: false });
  } catch (error) {
    // log the real error for us, show a plain one to the visitor
    console.error("merch waitlist: notion error", error);
    return json({ error: "could not save your email. try again." }, 502);
  }
}

function json(data: WaitlistResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
