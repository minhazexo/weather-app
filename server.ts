import { join, normalize, extname, resolve, sep } from "path";

const root = import.meta.dir;
const args = Bun.argv.slice(2);
const REQUESTED_PORT = Number(process.env.PORT ?? 8000);
// Explicit IPv4 loopback by default: avoids localhost -> ::1 vs 127.0.0.1
// ambiguity on Windows and avoids the 0.0.0.0 firewall prompt.
// Override with HOST=0.0.0.0 for LAN access.
const HOST = process.env.HOST ?? "127.0.0.1";

// `bun run dev` passes --open (see package.json). `bun run start` does not.
// Escape hatches for CI / tests: --no-open, NO_OPEN=1, BUN_OPEN=0
const SHOULD_OPEN =
  args.includes("--open") &&
  !args.includes("--no-open") &&
  process.env.NO_OPEN !== "1" &&
  process.env.BUN_OPEN !== "0";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function safeJoinPath(urlPath: string): string | null {
  try {
    const decoded = decodeURIComponent(urlPath.split("?")[0]);
    // Normalize and strip leading slashes so join stays inside root
    const normalized = normalize(decoded).replace(/^(\.\.[\/\\])+/, "");
    const stripped = normalized.replace(/^[/\\]+/, "");
    const full = resolve(join(root, stripped));
    const rootWithSep = resolve(root) + sep;
    if (full !== resolve(root) && !full.startsWith(rootWithSep)) return null;
    return full;
  } catch {
    return null;
  }
}

function contentTypeFor(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

async function serveFile(
  filePath: string,
  req: Request
): Promise<Response | null> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;

  const headers: Record<string, string> = {
    "Content-Type": contentTypeFor(filePath),
  };

  // Never cache HTML + service worker, cache everything else briefly
  // so edits show up instantly during `bun run dev`.
  if (filePath.endsWith(".html") || filePath.endsWith("sw.js")) {
    headers["Cache-Control"] = "no-cache";
  } else {
    headers["Cache-Control"] = "public, max-age=3600";
  }

  if (filePath.endsWith("sw.js")) {
    headers["Service-Worker-Allowed"] = "/";
  }

  if (req.method === "HEAD") {
    return new Response(null, { headers });
  }
  return new Response(file, { headers });
}

function fetchHandler(req: Request): Promise<Response> {
  return (async () => {
    const url = new URL(req.url);

    // Only serve GET/HEAD for this static app
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let pathname = url.pathname;

    // `/` -> `/index.html`
    if (pathname === "/") pathname = "/index.html";

    const filePath = safeJoinPath(pathname);
    if (!filePath) return new Response("Forbidden", { status: 403 });

    // 1. Try exact file match
    const direct = await serveFile(filePath, req);
    if (direct) return direct;

    // 2. Directory -> its index.html (e.g. `/assets/` )
    try {
      const indexInDir = join(filePath, "index.html");
      const fromDir = await serveFile(indexInDir, req);
      if (fromDir) return fromDir;
    } catch {
      // ignore
    }

    // 3. SPA fallback: if browser navigation, serve root index.html
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      const fallback = await serveFile(join(root, "index.html"), req);
      if (fallback) return fallback;
    }

    return new Response("Not Found", { status: 404 });
  })();
}

function openBrowser(url: string): void {
  try {
    const platform = process.platform;
    if (platform === "win32") {
      // `start "" <url>` — empty title arg is required
      Bun.spawn(["cmd", "/c", "start", "", url], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } else if (platform === "darwin") {
      Bun.spawn(["open", url], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } else {
      Bun.spawn(["xdg-open", url], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
  } catch (err) {
    console.warn(
      `Could not open browser automatically: ${err}\nOpen this URL manually: ${url}`
    );
  }
}

// Proactively probe ports first: on some platforms (Windows) a duplicate
// Bun.serve bind doesn't throw, so try/catch alone isn't a reliable
// port-busy signal. Probing with Bun.connect works cross-platform.
async function tryProbe(hostname: string, port: number): Promise<boolean> {
  try {
    const socket = await Bun.connect({
      hostname,
      port,
      socket: {
        data() {},
        open() {},
        close() {},
        error() {},
      },
    });
    try {
      socket.end();
    } catch {
      // ignore close errors
    }
    await Bun.sleep(10);
    return true;
  } catch {
    return false;
  }
}

async function isPortTaken(port: number): Promise<boolean> {
  // Probe every plausible loopback so we never miss a server bound to
  // a different resolution of localhost (::1 vs 127.0.0.1) or 0.0.0.0.
  const candidates =
    HOST === "0.0.0.0" || HOST === "localhost"
      ? ["127.0.0.1", "::1"]
      : [HOST];
  for (const hostname of candidates) {
    if (await tryProbe(hostname, port)) return true;
  }
  return false;
}

// Try requested port, then next 10 ports if busy (common dev UX)
async function listen(portStart: number) {
  let lastError: unknown = null;
  for (let port = portStart; port < portStart + 10; port++) {
    if (await isPortTaken(port)) {
      lastError = new Error(`address in use: ${port}`);
      continue;
    }
    try {
      const server = Bun.serve({
        port,
        hostname: HOST,
        fetch: fetchHandler,
        development: process.env.NODE_ENV !== "production",
      });
      return { server, portWasBusy: port !== portStart };
    } catch (err) {
      lastError = err;
      const msg = String(err);
      // Only retry on address-in-use, otherwise rethrow immediately
      if (!msg.includes("EADDRINUSE") && !msg.includes("address in use")) {
        throw err;
      }
    }
  }
  throw lastError;
}

const startedAt = performance.now();
const { server, portWasBusy } = await listen(REQUESTED_PORT);
const url = `http://localhost:${server.port}/`;

console.log(`\n  SkyLens Weather Dashboard`);
console.log(`  ➜  Local:   ${url}`);
console.log(`  ➜  Serving: ${root}`);
if (portWasBusy) {
  console.log(
    `  ⚠  Port ${REQUESTED_PORT} was busy, using ${server.port} instead`
  );
}
console.log(`  ➜  Press Ctrl+C to stop\n`);

if (SHOULD_OPEN) {
  // Small delay so "Local:" line prints before the browser steals focus
  setTimeout(() => openBrowser(url), 300);
  console.log(`  Opening browser... (use --no-open to skip)\n`);
} else {
  console.log(
    `  Tip: 'bun run dev' opens the browser automatically.\n`
  );
}

console.log(`  Ready in ${(performance.now() - startedAt).toFixed(0)} ms`);
