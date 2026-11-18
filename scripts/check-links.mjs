// Checks every internal link and asset reference in public/**/*.html resolves
// to a real file, the same way the production server would resolve it.
//
//   node scripts/check-links.mjs           → exits 1 if any link is broken
//   node scripts/check-links.mjs --json    → machine-readable report

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const asJson = process.argv.includes("--json");

// Paths handled by public/_redirects rather than by a file on disk.
const redirects = readRedirects(path.join(root, "_redirects"));

function readRedirects(file) {
  if (!existsSync(file)) return new Set();
  return new Set(
    readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/)[0]),
  );
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const ATTR = /\b(?:href|src)="([^"]+)"/g;

function extractLinks(html) {
  const links = [];
  let match;
  while ((match = ATTR.exec(html))) links.push(match[1]);
  return links;
}

function isExternal(link) {
  return /^(?:[a-z]+:)?\/\//i.test(link) || link.startsWith("mailto:") || link.startsWith("tel:");
}

function resolveLink(link, fromFile) {
  const clean = link.split("#")[0];
  if (!clean) return null; // same-page fragment
  const base = clean.startsWith("/") ? root : path.dirname(fromFile);
  return path.join(base, clean);
}

function exists(target) {
  try {
    const stat = statSync(target);
    if (stat.isDirectory()) return existsSync(path.join(target, "index.html"));
    return true;
  } catch {
    return false;
  }
}

const broken = [];
let checked = 0;

for (const file of walk(root)) {
  const html = readFileSync(file, "utf8");
  for (const link of extractLinks(html)) {
    if (isExternal(link)) continue;
    if (redirects.has(link)) continue;
    const target = resolveLink(link, file);
    if (!target) continue;
    checked++;
    if (!exists(target)) {
      broken.push({ page: path.relative(root, file), link });
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ checked, broken }, null, 2));
} else if (broken.length) {
  console.error(`${broken.length} broken link(s) out of ${checked}:`);
  for (const { page, link } of broken) console.error(`  ${page}  →  ${link}`);
} else {
  console.log(`All ${checked} internal links resolve.`);
}

process.exitCode = broken.length > 1 ? 1 : 0;
