#!/usr/bin/env node
/*
 * tests/run.js - runs every test page under tests/ in headless Chromium.
 *
 *   node tests/run.js                 run everything in tests/manifest.json
 *   node tests/run.js print schema    run only the pages whose path contains one of the words
 *   node tests/run.js commands/new.html   a page not yet listed in manifest.json
 *   node tests/run.js --verbose       also print the console output of passing pages
 *   node tests/run.js --json out.json write the full results as JSON
 *   node tests/run.js --no-build      do not build dist/basiscore.js when it is missing
 *   node tests/run.js --port 8765     port of the static server (default: a free port)
 *   node tests/run.js --jobs 4        pages run in parallel (default 4)
 *   node tests/run.js --timeout 30000 per-page timeout in ms
 *
 * Requirements: Node 16+, the dev dependencies installed (`npm ci --legacy-peer-deps`)
 * and a Chromium that playwright-core can find. Any of these works:
 *   - `npx playwright-core install chromium` (downloads a matching build), or
 *   - set BC_TEST_BROWSER=/path/to/chrome, or
 *   - an installed Google Chrome / Microsoft Edge (used as a fallback).
 * The exit code is 0 when every page reports ok, 1 otherwise.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const testsDir = __dirname;

/* ---------------------------------------------------------------------- */
/* arguments                                                               */
/* ---------------------------------------------------------------------- */

const args = process.argv.slice(2);
const opts = { verbose: false, json: null, build: true, port: 0, jobs: 4, timeout: 30000, filters: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--verbose" || a === "-v") opts.verbose = true;
  else if (a === "--json") opts.json = args[++i];
  else if (a === "--no-build") opts.build = false;
  else if (a === "--port") opts.port = parseInt(args[++i], 10);
  else if (a === "--jobs") opts.jobs = Math.max(1, parseInt(args[++i], 10));
  else if (a === "--timeout") opts.timeout = parseInt(args[++i], 10);
  else if (a === "--help" || a === "-h") {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^\/\*\s?|^ \* ?/gm, ""));
    process.exit(0);
  } else opts.filters.push(a.toLowerCase());
}

/* ---------------------------------------------------------------------- */
/* build                                                                   */
/* ---------------------------------------------------------------------- */

function ensureBundle() {
  const bundle = path.join(root, "dist", "basiscore.js");
  if (fs.existsSync(bundle)) return;
  if (!opts.build) {
    console.error("dist/basiscore.js is missing; run `npm run dev:no-serve` first or drop --no-build.");
    process.exit(2);
  }
  console.log("dist/basiscore.js not found, building with `npm run dev:no-serve` ...");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npm, ["run", "dev:no-serve"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0 || !fs.existsSync(bundle)) {
    console.error("build failed");
    process.exit(2);
  }
}

/* ---------------------------------------------------------------------- */
/* static server                                                           */
/* ---------------------------------------------------------------------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".xml": "application/xml"
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      } catch (e) {
        res.writeHead(400).end("bad request");
        return;
      }
      let file = path.join(root, pathname);
      if (!file.startsWith(root)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      fs.stat(file, (err, stat) => {
        if (!err && stat.isDirectory()) {
          file = path.join(file, "index.html");
          stat = fs.existsSync(file) ? fs.statSync(file) : null;
          err = stat ? null : new Error("not found");
        }
        if (err || !stat) {
          res.writeHead(404, { "Content-Type": "text/plain" }).end("not found: " + pathname);
          return;
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
          "Cache-Control": "no-store",
          "Service-Worker-Allowed": "/"
        });
        fs.createReadStream(file).pipe(res);
      });
    });
    server.on("error", reject);
    server.listen(opts.port, "127.0.0.1", () => resolve(server));
  });
}

/* ---------------------------------------------------------------------- */
/* browser                                                                 */
/* ---------------------------------------------------------------------- */

function findExecutable(chromium) {
  if (process.env.BC_TEST_BROWSER && fs.existsSync(process.env.BC_TEST_BROWSER)) {
    return { executablePath: process.env.BC_TEST_BROWSER };
  }
  try {
    const p = chromium.executablePath();
    if (p && fs.existsSync(p)) return { executablePath: p };
  } catch (e) {
    /* fall through */
  }
  const dirs = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(require("os").homedir(), ".cache", "ms-playwright")].filter(Boolean);
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir).sort().reverse();
    for (const entry of entries) {
      const candidates = [
        path.join(dir, entry, "chrome-linux", "headless_shell"),
        path.join(dir, entry, "chrome-linux", "chrome"),
        path.join(dir, entry, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        path.join(dir, entry, "chrome-win", "chrome.exe")
      ];
      for (const c of candidates) if (fs.existsSync(c)) return { executablePath: c };
    }
  }
  return null;
}

async function launchBrowser() {
  let pw;
  try {
    pw = require("playwright-core");
  } catch (e) {
    console.error("playwright-core is not installed. Run `npm ci --legacy-peer-deps` (or `npm i -D playwright-core`).");
    process.exit(2);
  }
  const { chromium } = pw;
  const base = { headless: true, args: ["--no-sandbox", "--disable-gpu"] };
  const found = findExecutable(chromium);
  const attempts = [];
  if (found) attempts.push(Object.assign({}, base, found));
  attempts.push(Object.assign({}, base, { channel: "chrome" }));
  attempts.push(Object.assign({}, base, { channel: "msedge" }));
  attempts.push(base);
  let lastError;
  for (const options of attempts) {
    try {
      return await chromium.launch(options);
    } catch (e) {
      lastError = e;
    }
  }
  console.error("Could not start a Chromium. Install one with `npx playwright-core install chromium` or set BC_TEST_BROWSER.");
  console.error(String(lastError && lastError.message).split("\n")[0]);
  process.exit(2);
}

/* ---------------------------------------------------------------------- */
/* run one page                                                            */
/* ---------------------------------------------------------------------- */

async function runPage(browser, baseUrl, entry) {
  const context = await browser.newContext({ permissions: [] });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (m) => {
    const text = m.text();
    if (!/Welcome|follow us|version:|___|\\_|^\s*$/.test(text)) logs.push("[" + m.type() + "] " + text.slice(0, 500));
  });
  page.on("pageerror", (e) => logs.push("[pageerror] " + e.message));
  const started = Date.now();
  let result;
  try {
    await page.goto(baseUrl + "/tests/" + entry.file, { waitUntil: "load", timeout: opts.timeout });
    await page.waitForFunction(() => window.__bcTest && window.__bcTest.status === "done", null, { timeout: opts.timeout });
    result = await page.evaluate(() => window.__bcTest);
  } catch (e) {
    const partial = await page.evaluate(() => (window.bcTest ? window.bcTest.state : null)).catch(() => null);
    result = {
      ok: false,
      name: entry.title || entry.file,
      status: "aborted",
      counts: { passed: 0, failed: 0, defect: 0, fixed: 0, skipped: 0 },
      tests: partial
        ? partial.tests.map((t) => ({ kind: t.kind, name: t.name, status: t.status, error: t.error }))
        : [],
      uncaughtErrors: [e.message.split("\n")[0]].concat(partial ? partial.errors.map((x) => x.message) : [])
    };
  }
  result.file = entry.file;
  result.doc = result.doc || entry.doc;
  result.ms = Date.now() - started;
  result.logs = logs;
  await context.close();
  return result;
}

/* ---------------------------------------------------------------------- */
/* main                                                                    */
/* ---------------------------------------------------------------------- */

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(path.join(testsDir, "manifest.json"), "utf8"));
  const listed = new Set(manifest.tests.map((t) => t.file));
  const onDisk = [];
  (function walk(dir, rel) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const r = rel ? rel + "/" + name : name;
      if (fs.statSync(full).isDirectory()) {
        if (name !== "harness" && name !== "fixtures") walk(full, r);
      } else if (name.endsWith(".html") && r !== "index.html") onDisk.push(r);
    }
  })(testsDir, "");
  const unlisted = onDisk.filter((f) => !listed.has(f));
  if (unlisted.length) console.warn("warning: test pages not in tests/manifest.json: " + unlisted.join(", "));
  const missing = manifest.tests.filter((t) => !fs.existsSync(path.join(testsDir, t.file)));
  if (missing.length) console.warn("warning: manifest entries without a file: " + missing.map((t) => t.file).join(", "));
  return manifest.tests.filter((t) => fs.existsSync(path.join(testsDir, t.file)));
}

(async () => {
  ensureBundle();
  let entries = loadManifest();
  if (opts.filters.length) {
    // a filter that names an existing page (tests/x.html or x.html) runs it even when it is not in the manifest yet
    const direct = opts.filters
      .map((f) => f.replace(/^tests[\/\\]/, "").replace(/\\/g, "/"))
      .filter((f) => f.endsWith(".html") && fs.existsSync(path.join(testsDir, f)));
    entries = entries.filter((e) => opts.filters.some((f) => e.file.toLowerCase().includes(f) || (e.title || "").toLowerCase().includes(f)));
    for (const f of direct) if (!entries.some((e) => e.file.toLowerCase() === f)) entries.push({ file: f, title: f });
  }
  if (!entries.length) {
    console.error("no test pages selected");
    process.exit(2);
  }
  const server = await startServer();
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  const browser = await launchBrowser();
  console.log("running " + entries.length + " page(s) from " + baseUrl + "/tests/\n");

  const results = new Array(entries.length);
  let next = 0;
  async function worker() {
    while (next < entries.length) {
      const i = next++;
      const r = await runPage(browser, baseUrl, entries[i]);
      results[i] = r;
      printResult(r);
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.jobs, entries.length) }, worker));

  await browser.close();
  server.close();

  const totals = { pages: results.length, ok: 0, passed: 0, failed: 0, defect: 0, fixed: 0, skipped: 0, errors: 0 };
  for (const r of results) {
    if (r.ok) totals.ok++;
    for (const k of ["passed", "failed", "defect", "fixed", "skipped"]) totals[k] += (r.counts && r.counts[k]) || 0;
    totals.errors += (r.uncaughtErrors || []).length;
  }
  console.log(
    "\n" + totals.ok + "/" + totals.pages + " pages ok; " + totals.passed + " passed, " + totals.failed + " failed, " +
      totals.defect + " known defect(s), " + totals.fixed + " fixed?, " + totals.skipped + " skipped, " + totals.errors + " uncaught error(s)"
  );
  if (opts.json) {
    fs.writeFileSync(opts.json, JSON.stringify({ totals, results }, null, 2));
    console.log("results written to " + opts.json);
  }
  process.exit(totals.ok === totals.pages ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});

function printResult(r) {
  const c = r.counts;
  const head = (r.ok ? "PASS " : "FAIL ") + r.file + "  (" + c.passed + " passed, " + c.failed + " failed, " + c.defect + " defect, " + c.fixed + " fixed?, " + c.skipped + " skipped, " + r.ms + " ms)";
  console.log(head);
  for (const t of r.tests || []) {
    if (t.status === "failed" || t.status === "fixed") {
      console.log("   x " + t.name + "\n     " + String(t.error).split("\n").join("\n     "));
    } else if (opts.verbose) {
      console.log("   " + (t.status === "passed" ? "+" : t.status === "defect" ? "!" : "-") + " " + t.name + (t.reason ? " (" + t.reason + ")" : ""));
    }
    if (opts.verbose && t.notes && t.notes.length) {
      console.log("     note: " + t.notes.join("\n     note: "));
    }
  }
  if (r.uncaughtErrors && r.uncaughtErrors.length) {
    console.log("   uncaught: " + r.uncaughtErrors.join(" | "));
  }
  if ((!r.ok || opts.verbose) && r.logs && r.logs.length) {
    console.log("   console:\n     " + r.logs.slice(0, 60).join("\n     "));
  }
}
