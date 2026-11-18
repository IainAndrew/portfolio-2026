// A tiny static server for local preview. No dependencies.
// Serves public/ with directory → index.html resolution, matching how the
// site is served in production (Cloudflare Workers static assets).
//
//   node scripts/serve.mjs          → http://localhost:8000
//   PORT=3000 node scripts/serve.mjs
//   LIVE=1 node scripts/serve.mjs   → reload open pages when public/ changes

import http from "node:http";
import { createReadStream, statSync, watch } from "node:fs";
import { createGzip } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const live = Boolean(process.env.LIVE);
const clients = new Set();
const RELOAD_SNIPPET = `<script>new EventSource("/__live").onmessage=()=>location.reload()</script>`;
const compressible = /^(?:text\/|application\/(?:json|xml)|image\/svg)/;

if (live) {
  watch(root, { recursive: true }, () => {
    for (const client of clients) client.write("data: reload\n\n");
  });
}

function etagFor(stat) {
  return `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
}

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (live && url.pathname === "/__live") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
      clients.add(res);
      return;
    }
    let pathname = decodeURIComponent(url.pathname);
    let file = path.normalize(path.join(root, pathname));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    try {
      let stat = statSync(file);
      if (stat.isDirectory()) {
        if (!pathname.endsWith("/")) {
          res.writeHead(301, { Location: pathname + "/" }).end();
          return;
        }
        file = path.join(file, "index.html");
        stat = statSync(file);
      }
      const type = types[path.extname(file).toLowerCase()] || "application/octet-stream";
      const etag = etagFor(stat);
      if (req.headers["if-none-match"] == etag) {
        res.writeHead(304, { ETag: etag }).end();
        return;
      }
      const gzip = compressible.test(type) && /gzip/.test(req.headers["accept-encoding"] || "");
      const headers = {
        "Content-Type": type,
        "Content-Length": stat.size,
        "Cache-Control": "no-cache",
        ETag: etag,
      };
      if (gzip) headers["Content-Encoding"] = "gzip";
      res.writeHead(200, headers);
      let body = createReadStream(file);
      if (live && type.startsWith("text/html")) {
        body.on("end", () => res.write(RELOAD_SNIPPET));
      }
      if (gzip) body = body.pipe(createGzip());
      body.pipe(res);
    } catch {
      // Same as production: unknown paths get public/404.html with a 404 status.
      try {
        const page = path.join(root, "404.html");
        res.writeHead(404, { "Content-Type": types[".html"], "Content-Length": statSync(page).size, "Cache-Control": "no-store" });
        createReadStream(page).pipe(res);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      }
    }
  });
}

export function listen(port = 0) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await listen(Number(process.env.PORT) || 8000);
  console.log(`Serving ${root} at ${url}`);
}
