// Pulls Good + Bad Habit Log rows from Notion and writes data.json.
// Every checkbox column is treated as a habit, so renaming or adding
// habits in Notion needs no code change.
//
// Env: NOTION_TOKEN (required), GOOD_DB, BAD_DB (optional overrides).
import { writeFile } from "node:fs/promises";

const TOKEN = process.env.NOTION_TOKEN;
const GOOD = process.env.GOOD_DB || "7f91f85f-9864-4a7b-bf31-c42be64e499f"; // ✅ Good Habit Log (data source)
const BAD = process.env.BAD_DB || "7c3ecdd1-8cb1-475a-993d-dd2f41d33595"; // 🔴 Bad Habit Log (data source)

if (!TOKEN) {
  console.error("NOTION_TOKEN is missing");
  process.exit(1);
}

async function notion(path, body, version) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": version,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || res.status), { status: res.status });
  return json;
}

async function queryAll(id) {
  const rows = [];
  let cursor;
  // Newer API addresses data sources; fall back to the classic database endpoint.
  let route = { path: `data_sources/${id}/query`, version: "2025-09-03" };
  do {
    let page;
    try {
      page = await notion(route.path, { page_size: 100, start_cursor: cursor }, route.version);
    } catch (e) {
      if (cursor || route.version !== "2025-09-03") throw e;
      route = { path: `databases/${id}/query`, version: "2022-06-28" };
      page = await notion(route.path, { page_size: 100 }, route.version);
    }
    rows.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return rows;
}

export function transform(rows) {
  const habits = new Set();
  const days = {};
  for (const row of rows) {
    const props = row.properties || {};
    const date = Object.values(props).find((p) => p.type === "date")?.date?.start?.slice(0, 10);
    for (const [name, p] of Object.entries(props)) {
      if (p.type !== "checkbox") continue;
      habits.add(name);
      if (date && p.checkbox) {
        days[date] ??= [];
        if (!days[date].includes(name)) days[date].push(name);
      }
    }
    if (date) days[date] ??= [];
  }
  return { habits: [...habits], days };
}

// data.json is served publicly by GitHub Pages, so bad habits stay out
// unless explicitly opted in.
const includeBad = process.env.INCLUDE_BAD === "1";
const [good, bad] = await Promise.all([queryAll(GOOD), includeBad ? queryAll(BAD).catch(() => []) : []]);
const data = { generated: new Date().toISOString(), good: transform(good) };
if (includeBad) data.bad = transform(bad);
await writeFile(new URL("../data.json", import.meta.url), JSON.stringify(data, null, 1));
console.log(`Synced ${good.length} good rows${includeBad ? `, ${bad.length} bad rows` : ""}`);
