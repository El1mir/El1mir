#!/usr/bin/env node
/**
 * Star Radar — generate assets/star-radar.svg
 *
 * Aggregates GitHub star counts for the projects El1mir contributes to and
 * renders a single self-contained SVG card (dark panel, brand palette).
 *
 * Usage:
 *   node scripts/gen-stars.mjs            # uses GITHUB_TOKEN when present
 *   GITHUB_TOKEN=xxx node scripts/gen-stars.mjs
 *
 * Data source order: GitHub REST API (token) -> repo HTML scrape (no token).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "assets/star-radar.svg");

/** Main projects: repos El1mir maintains or contributes to. */
const PROJECTS = [
  { repo: "KouriChat/KouriChat", name: "KouriChat", role: "Coredev" },
  { repo: "ranxianglei/billion-context", name: "Billion Context", role: "Contributor" },
  { repo: "aa2246740/dsh-better-display", name: "DSH Better Display", role: "Contributor" },
  { repo: "El1mir/WxConnector", name: "WxConnector", role: "Author" },
];

const ACCENTS = ["#7CFFCB", "#00D4FF", "#8B7CFF", "#FF6B9D"];
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

async function starsViaApi(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "el1mir-star-radar",
    },
  });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const json = await res.json();
  return Number(json.stargazers_count ?? 0);
}

async function starsViaHtml(repo) {
  const res = await fetch(`https://github.com/${repo}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; el1mir-star-radar)" },
  });
  if (!res.ok) throw new Error(`html ${res.status}`);
  const html = await res.text();
  const match = html.match(/"stargazerCount":(\d+)/);
  if (!match) throw new Error("stargazerCount not found");
  return Number(match[1]);
}

async function getStars(repo) {
  const attempts = TOKEN ? [starsViaApi, starsViaHtml] : [starsViaHtml];
  for (const attempt of attempts) {
    try {
      return await attempt(repo);
    } catch (err) {
      console.warn(`  ! ${repo} via ${attempt.name}: ${err.message}`);
    }
  }
  return 0;
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmt = (n) => n.toLocaleString("en-US");

function render(rows) {
  const W = 880;
  const PAD = 36;
  const HEADER = 96;
  const ROW = 52;
  const FOOTER = 52;
  const H = HEADER + rows.length * ROW + FOOTER;
  const TRACK_X = 262;
  const TRACK_W = 452;
  const COUNT_X = W - PAD;
  const total = rows.reduce((sum, r) => sum + r.stars, 0);
  const max = Math.max(...rows.map((r) => r.stars), 1);
  const updated = new Date().toISOString().slice(0, 10);

  const defs = [
    `<linearGradient id="title" x1="0" y1="0" x2="1" y2="0">`,
    `<stop offset="0%" stop-color="#7CFFCB"/><stop offset="55%" stop-color="#00D4FF"/><stop offset="100%" stop-color="#8B7CFF"/>`,
    `</linearGradient>`,
    `<linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="#7CFFCB" stop-opacity="0.10"/><stop offset="100%" stop-color="#7CFFCB" stop-opacity="0"/>`,
    `</linearGradient>`,
    ...rows.map((r, i) => {
      const c = ACCENTS[i % ACCENTS.length];
      return `<linearGradient id="bar${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${c}" stop-opacity="0.95"/><stop offset="100%" stop-color="${c}" stop-opacity="0.45"/></linearGradient>`;
    }),
  ].join("");

  const bars = rows
    .map((r, i) => {
      const top = HEADER + i * ROW;
      const c = ACCENTS[i % ACCENTS.length];
      const ratio = Math.sqrt(r.stars / max);
      const w = Math.max(r.stars > 0 ? 14 : 4, Math.round(ratio * TRACK_W));
      const labelY = top + 22;
      const roleY = top + 37;
      return [
        `<g>`,
        `<text x="${PAD}" y="${labelY}" font-size="15" font-weight="600" fill="#E6EDF3">${esc(r.name)}</text>`,
        `<text x="${PAD}" y="${roleY}" font-size="10" letter-spacing="1.2" fill="#8496AC">${esc(r.role.toUpperCase())}</text>`,
        `<rect x="${TRACK_X}" y="${top + 12}" width="${TRACK_W}" height="10" rx="5" fill="#161D27"/>`,
        `<rect x="${TRACK_X}" y="${top + 12}" width="${w}" height="10" rx="5" fill="url(#bar${i})"/>`,
        `<text x="${COUNT_X - 14}" y="${top + 23}" text-anchor="end" font-size="15" font-weight="700" fill="#E6EDF3">${fmt(r.stars)}</text>`,
        `<text x="${COUNT_X}" y="${top + 23}" text-anchor="end" font-size="12" fill="${c}">★</text>`,
        `</g>`,
      ].join("");
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" font-family="${FONT}">
<title id="t">Star radar — ${fmt(total)} stars across ${rows.length} projects</title>
<desc id="d">Star counts for the main open-source projects El1mir maintains or contributes to: ${rows
    .map((r) => `${r.name} ${fmt(r.stars)}`)
    .join(", ")}.</desc>
<defs>${defs}</defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="#0D1117" stroke="#2E343B"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="72" rx="14" fill="url(#glow)"/>
<text x="${PAD}" y="45" font-size="23" font-weight="800" letter-spacing="3.4" fill="url(#title)">STAR RADAR</text>
<text x="${PAD}" y="68" font-size="11.5" fill="#8B949E">星标雷达 · 主要参与 / 维护的开源项目</text>
<text x="${COUNT_X}" y="45" text-anchor="end" font-size="30" font-weight="800" fill="#7CFFCB">${fmt(total)}</text>
<text x="${COUNT_X}" y="68" text-anchor="end" font-size="9.5" letter-spacing="2.6" fill="#8B949E">TOTAL STARS ★</text>
<line x1="${PAD}" y1="84" x2="${W - PAD}" y2="84" stroke="#2E343B"/>
${bars}
<line x1="${PAD}" y1="${H - 40}" x2="${W - PAD}" y2="${H - 40}" stroke="#151C26"/>
<text x="${PAD}" y="${H - 20}" font-size="10" fill="#7A8AA0">Updated ${updated} · 每日由 GitHub Actions 自动刷新</text>
<text x="${COUNT_X}" y="${H - 20}" text-anchor="end" font-size="10" fill="#7A8AA0">github.com/El1mir</text>
</svg>
`;
}

const results = [];
for (const project of PROJECTS) {
  const stars = await getStars(project.repo);
  console.log(`${project.repo.padEnd(36)} ${fmt(stars)}`);
  results.push({ ...project, stars });
}
results.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, render(results), "utf8");
console.log(
  `\nwrote ${OUT} (${fmt(results.reduce((s, r) => s + r.stars, 0))} total stars)`
);
