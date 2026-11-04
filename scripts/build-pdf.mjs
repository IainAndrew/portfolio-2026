// Renders index.html with print media in headless Chrome and writes Iain-Andrew-CV.pdf.
// Uses the Google Chrome already installed on the machine (also present on GitHub's
// Ubuntu runners). Falls back to Playwright's own Chromium if that has been installed
// with `npx playwright install chromium`.

import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = pathToFileURL(path.join(root, "index.html")).href;
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

const browser = await launch();
try {
  const page = await browser.newPage();
  await page.goto(input, { waitUntil: "load" });
  await page.evaluate(() => {
    document.querySelectorAll("details").forEach((d) => (d.open = true));
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
  });
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
}
