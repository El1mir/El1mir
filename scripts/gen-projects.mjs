#!/usr/bin/env node
/**
 * Project grid — generate assets/project-grid.svg
 *
 * Renders the "selected projects" tiles (name, role, one-line bilingual
 * tagline) in the same visual language as the star radar: dark panel,
 * #2E343B hairlines, per-project accent.
 *
 * Static content: no network access, regenerate after editing PROJECTS.
 *
 * Usage:
 *   node scripts/gen-projects.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "assets/project-grid.svg");

const PROJECTS = [
  {
    name: "KouriChat",
    slug: "KouriChat/KouriChat",
    role: "Coredev",
    zh: "接入微信 / QQ 的 LLM 角色扮演框架",
    en: "LLM role-play framework wired into WeChat & QQ",
    accent: "#7CFFCB",
  },
  {
    name: "BiliNote",
    slug: "El1mir/BiliNote",
    role: "Maintainer",
    zh: "为 B 站优化的笔记与字幕工具",
    en: "Note-taking & subtitle tooling tuned for Bilibili",
    accent: "#FF6B9D",
  },
  {
    name: "billion-context",
    slug: "ranxianglei/billion-context",
    role: "Contributor",
    zh: "上下文压缩：10 万窗口装下十亿级会话",
    en: "100K window, billion-token sessions",
    accent: "#00D4FF",
  },
  {
    name: "dsh-better-display",
    slug: "aa2246740/dsh-better-display",
    role: "Contributor",
    zh: "DeepSeek Harness 的过程与推理视图",
    en: "Process & reasoning view for DeepSeek Harness",
    accent: "#8B7CFF",
  },
];

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rough rendered width: CJK glyphs are ~1em, latin ~0.55em. */
function textWidth(text, size) {
  let units = 0;
  for (const ch of text) units += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.55;
  return units * size;
}

function render() {
  const W = 880;
  const PAD = 36;
  const GAP_X = 24;
  const GAP_Y = 24;
  const TILE_H = 170;
  const TILE_W = (W - PAD * 2 - GAP_X) / 2;
  const COLS = 2;
  const rows = Math.ceil(PROJECTS.length / COLS);
  const H = PAD * 2 + rows * TILE_H + (rows - 1) * GAP_Y;
  const USABLE = TILE_W - 44;

  const warnings = [];
  const check = (label, text, size) => {
    const w = textWidth(text, size);
    if (w > USABLE) warnings.push(`${label}: ${Math.round(w)}px > ${USABLE}px`);
  };

  const tiles = PROJECTS.map((p, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (TILE_W + GAP_X);
    const y = PAD + row * (TILE_H + GAP_Y);

    check(`${p.name} zh`, p.zh, 13.5);
    check(`${p.name} en`, p.en, 12.5);
    check(`${p.name} slug`, p.slug, 11);

    return [
      `<g>`,
      `<rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="12" fill="#0D1117" stroke="#2E343B"/>`,
      `<rect x="${x}" y="${y + 22}" width="3" height="40" rx="1.5" fill="${p.accent}"/>`,
      `<text x="${x + 24}" y="${y + 38}" font-size="18" font-weight="700" fill="#E6EDF3">${esc(p.name)}</text>`,
      `<text x="${x + 24}" y="${y + 58}" font-size="9.5" letter-spacing="1.8" fill="${p.accent}" opacity="0.9">${esc(p.role.toUpperCase())}</text>`,
      `<text x="${x + 24}" y="${y + 96}" font-size="13.5" fill="#CBD5E1">${esc(p.zh)}</text>`,
      `<text x="${x + 24}" y="${y + 119}" font-size="12.5" fill="#7D8FA6">${esc(p.en)}</text>`,
      `<line x1="${x + 24}" y1="${y + 134}" x2="${x + TILE_W - 24}" y2="${y + 134}" stroke="#1B2431"/>`,
      `<text x="${x + 24}" y="${y + 154}" font-size="11" fill="#55657A">${esc(p.slug)}</text>`,
      `</g>`,
    ].join("");
  }).join("");

  if (warnings.length) {
    console.warn("  ! text may overflow a tile:");
    for (const w of warnings) console.warn("    " + w);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" font-family="${FONT}">
<title id="t">Selected projects</title>
<desc id="d">${esc(
    PROJECTS.map((p) => `${p.name} (${p.role}): ${p.en}`).join("; ")
  )}</desc>
${tiles}
</svg>
`;
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, render(), "utf8");
console.log(`wrote ${OUT} (${PROJECTS.length} projects)`);
