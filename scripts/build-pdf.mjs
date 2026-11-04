// Renders /cv/ with print media in headless Chrome and writes Iain-Andrew-CV.pdf.
// Serves the repository over a local port first, because the site uses
// root-relative URLs (/styles.css, /assets/...). Uses the Google Chrome already
// installed on the machine (also present on GitHub's Ubuntu runners); falls back
// to Playwright's own Chromium if that has been installed with
// `npx playwright install chromium`.

import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listen } from "./serve.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "Iain-Andrew-CV.pdf");

async function launch() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch (chromeError) {
    try {
      return await chromium.launch();
    } catch {
      throw chromeError;
    }
  }
}

const { server, url } = await listen();
const browser = await launch();
try {
  const page = await browser.newPage();
  await page.goto(`${url}/cv/`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print", colorScheme: "light" });
  await page.pdf({
    path: output,
    format: "A4",
    preferCSSPageSize: true,
    printBackground: false,
    displayHeaderFooter: false,
    tagged: true,
  });
  console.log(`Wrote ${path.relative(root, output)}`);
} finally {
  await browser.close();
  server.close();
}
