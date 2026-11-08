// adds every shirt's item and sides as options in the "Chalant Merch Waitlist" notion database.
// notion rejects a sign-up whose option does not exist yet, so run this after adding a shirt:
//   bun run merch:sync
// it only adds missing options. it never removes or renames anything.

import { SHIRTS } from "../src/merch/options";

const key = process.env.NOTION_API_KEY;
const dataSource = process.env.NOTION_MERCH_DATASOURCE_ID;
if (!key || !dataSource) {
  console.error("set NOTION_API_KEY and NOTION_MERCH_DATASOURCE_ID (bun reads .env.local)");
  process.exit(1);
}

const url = `https://api.notion.com/v1/data_sources/${dataSource}`;
const headers = {
  Authorization: `Bearer ${key}`,
  "Notion-Version": "2025-09-03",
  "Content-Type": "application/json",
};

type Option = { id?: string; name: string; color?: string };

const response = await fetch(url, { headers });
if (!response.ok) {
  console.error("could not read the database:", response.status, await response.text());
  process.exit(1);
}
const schema = (await response.json()) as { properties: Record<string, { select?: { options: Option[] } }> };

const wanted: Record<string, string[]> = {
  Item: SHIRTS.map((shirt) => shirt.item),
  Side: [...new Set(SHIRTS.flatMap((shirt) => [...shirt.sides]))],
};

const patch: Record<string, { select: { options: Option[] } }> = {};
for (const [property, names] of Object.entries(wanted)) {
  const existing = schema.properties[property]?.select?.options ?? [];
  const missing = names.filter((name) => !existing.some((option) => option.name === name));
  if (missing.length === 0) continue;
  // send the existing options back unchanged, plus the new ones
  patch[property] = {
    select: { options: [...existing.map(({ id, name, color }) => ({ id, name, color })), ...missing.map((name) => ({ name }))] },
  };
  console.log(`${property}: adding ${missing.join(", ")}`);
}

if (Object.keys(patch).length === 0) {
  console.log("notion already has every shirt option");
  process.exit(0);
}

const update = await fetch(url, { method: "PATCH", headers, body: JSON.stringify({ properties: patch }) });
if (!update.ok) {
  console.error("could not update the database:", update.status, await update.text());
  process.exit(1);
}
console.log("done");
