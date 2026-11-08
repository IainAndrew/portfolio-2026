// Renders the social images: the Open Graph cards in public/assets/og/ and the
// LinkedIn cover banners. Each image is a small HTML page drawn with the site's
// own fonts and paper textures, screenshotted by headless Chrome. No
// dependencies. Needs macOS (Google Chrome in /Applications, and `sips` to turn
// the OG screenshots into JPEGs).
//
//   node scripts/images.mjs                 → everything
//   node scripts/images.mjs og              → only the OG cards
//   node scripts/images.mjs og-experience   → one image (matches by prefix)
//   node scripts/images.mjs linkedin        → only the LinkedIn covers
//
// Output:
//   public/assets/og/<page>.jpg          1200×630, dark, one per page
//   linkedin-cover/linkedin-cover-{light,dark}[@2x].png
//                                        1584×396 and 3168×792. The folder is
//                                        gitignored; upload the files by hand.
//
// To change the role or tagline everywhere, edit ROLE and PLACE below and
// rerun. When a page is added, add it to PAGES. Social sites cache previews,
// so after deploying, refresh them with LinkedIn's Post Inspector.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROLE = "Software Engineer";
const PLACE = "Dublin, Ireland";
const PAGES = [
  // chapter numeral and title as in each page's header; home has neither.
  { slug: "home" },
  { slug: "about", chapter: "I", title: "About" },
  { slug: "experience", chapter: "II", title: "Experience" },
  { slug: "how-i-work", chapter: "III", title: "How I work" },
  { slug: "contact", chapter: "IV", title: "Contact" },
];

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(repo, "public");
const ogDir = path.join(pub, "assets", "og");
const coverDir = path.join(repo, "linkedin-cover");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const JPEG_QUALITY = 70;

const colours = {
  dark: { bg: "#111", fg: "#d4a24a", paper: "paper-dark.svg" },
  light: { bg: "#e4e2d7", fg: "#111", paper: "paper.svg" },
};

// Shared page styles: the site's display face (Gothic Marriage) in capitals
// for names and titles, Day Roman in letter-spaced capitals for everything else.
const base = (mode, w, h) => {
  const c = colours[mode];
  return `
  @font-face { font-family: GM; src: url(file://${pub}/assets/fonts/GothicMarriage.woff2); }
  @font-face { font-family: DR; src: url(file://${pub}/assets/fonts/DayRoman.woff2); font-weight: 100 900; }
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; }
  body {
    background: ${c.bg} url(file://${pub}/assets/${c.paper}) repeat;
    background-size: 800px 800px;
    color: ${c.fg};
    font-family: DR;
    -webkit-font-smoothing: antialiased;
  }
  .display { font-family: GM; text-transform: uppercase; line-height: 1; }
  .caps { text-transform: uppercase; letter-spacing: 0.14em; }
  .dot { display: inline-block; margin: 0 0.9em; }`;
};

const dot = `<span class="dot">·</span>`;

// The OG cards: name over role and place on the home page; elsewhere the
// chapter numeral, the page title, and name over role. URL along the bottom.
function ogCard({ chapter, title }) {
  const w = 1200, h = 630;
  const body = chapter
    ? `<div class="chapter">${chapter}</div>
       <div class="display title">${title}</div>
       <div class="caps line">Iain Andrew${dot}${ROLE}</div>`
    : `<div class="display title name">Iain Andrew</div>
       <div class="caps line">${ROLE}${dot}${PLACE}</div>`;
  return { w, h, html: `<style>${base("dark", w, h)}
    .stack { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding-bottom: 40px; }
    .chapter { font-size: 30px; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 24px; }
    .title { font-size: 130px; margin-bottom: 30px; }
    .title.name { font-size: 132px; margin-bottom: 44px; }
    .line { font-size: 35px; }
    .url { position: absolute; left: 0; right: 0; bottom: 56px; text-align: center; font-size: 28px; }
  </style>
  <div class="stack">${body}</div>
  <div class="caps url">iainandrew.com</div>` };
}

// The LinkedIn cover: set right of centre, since the profile photo covers the
// bottom left of the banner.
function linkedinCover(mode) {
  const w = 1584, h = 396;
  return { w, h, html: `<style>${base(mode, w, h)}
    .block { position: absolute; left: 470px; top: 60px; }
    .name { font-size: 157px; margin-left: -4px; }
    .line { font-size: 33px; margin-top: 28px; }
    .url { font-size: 25px; margin-top: 22px; }
  </style>
  <div class="block">
    <div class="display name">Iain Andrew</div>
    <div class="caps line">${ROLE}${dot}${PLACE}</div>
    <div class="caps url">iainandrew.com</div>
  </div>` };
}

const work = mkdtempSync(path.join(tmpdir(), "images-"));

function screenshot({ w, h, html }, png, scale = 1) {
  const page = path.join(work, "page.html");
  writeFileSync(page, `<!doctype html><meta charset="utf-8">${html}`);
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    `--force-device-scale-factor=${scale}`, `--window-size=${w},${h}`,
    "--virtual-time-budget=3000", // lets the web fonts load before the shot
    `--screenshot=${png}`, `file://${page}`,
  ], { stdio: "ignore" });
}

const jobs = [
  ...PAGES.map((p) => [`og-${p.slug}`, () => {
    const png = path.join(work, `${p.slug}.png`);
    screenshot(ogCard(p), png);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(JPEG_QUALITY),
      png, "--out", path.join(ogDir, `${p.slug}.jpg`)], { stdio: "ignore" });
  }]),
  ...["light", "dark"].flatMap((mode) => [1, 2].map((scale) => {
    const name = `linkedin-cover-${mode}${scale === 2 ? "@2x" : ""}`;
    return [name, () => screenshot(linkedinCover(mode), path.join(coverDir, `${name}.png`), scale)];
  })),
];

const only = process.argv[2];
mkdirSync(ogDir, { recursive: true });
mkdirSync(coverDir, { recursive: true });
try {
  for (const [name, run] of jobs) {
    if (only && !name.startsWith(only)) continue;
    run();
    console.log(`✓ ${name}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
