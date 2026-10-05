# Functional tests

Runnable browser pages that prove the statements of the developer reference in [`docs/`](../docs/README.md).
There is one test page per documentation page. Each page is at the same time:

- a complete, working BasisCore page a developer (or an assistant tool) can copy from, and
- a test: the page asserts the observable results the documentation describes and reports
  pass/fail in the page itself.

No server is needed. Requests made with `fetch` (`dbsource`, `api`, schema answers, uploads)
are answered by the mock back end in [`harness/mock/`](harness/mock/README.md), static files
come from [`fixtures/`](fixtures/), and pages that need a WebSocket or a service worker bring
their own small fake or worker file.

## Run the tests

### Headless, from the command line

```bash
npm ci --legacy-peer-deps            # once; installs playwright-core with the other dev dependencies
npx playwright-core install chromium # once; downloads a Chromium build (or set BC_TEST_BROWSER=/path/to/chrome)
npm test                             # builds dist/basiscore.js when missing, runs every page, exit code 1 on failure
```

Useful variants (`node tests/run.js --help` lists them all):

```bash
node tests/run.js print schema          # only pages whose path contains one of the words
node tests/run.js commands/new.html     # a page not yet listed in manifest.json
node tests/run.js --verbose             # also print every passing test and the console of each page
node tests/run.js --json results.json   # machine-readable results
```

### In a browser

Serve the repository root with any static server, for example `python -m http.server 8000`
(the dev server of `npm run dev` serves `example/` only and does not reach `tests/`), build
the bundle once with `npm run dev:no-serve`, then open:

- `http://localhost:8000/tests/` - the runner page: lists every test page with a link to its
  documentation, runs them one by one in a frame and collects the results;
- `http://localhost:8000/tests/commands/print.html` - a single page: the report panel at the top
  shows each assertion; the sections below are the live markup under test.

## How a test page is built

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>print</title>
  <link rel="stylesheet" href="/tests/harness/bc-test.css" />
  <script src="/tests/harness/bc-test.js"></script>           <!-- 1. harness first: it records uncaught errors -->
  <script src="/tests/harness/mock/BasisCore_Mock_1.js"></script> <!-- 2. only when fetch must be answered -->
  <script> BasisCoreMock.route({ url: "/db", method: "POST", response: () => ({ sources: [...] }) }); </script>
  <script> const host = { settings: { "connection.web.db": "/db" } }; </script> <!-- 3. host before the library -->
  <script src="/dist/basiscore.js"></script>                   <!-- 4. the bundle built from this repository -->
</head>
<body data-doc="docs/commands/print.md">
  <main>
    <h1>print</h1>
    <p class="intro">What this page proves.</p>
    <section class="case" id="case-basic">
      <h2>Faces, layout and else-layout</h2>
      <basis core="print" run="atclient" datamembername="inlineSource.print"> ... </basis>
    </section>
  </main>
  <script>
    bcTest.test("one face per row", async (t) => {
      const rows = await t.waitFor(() => t.$$("#case-basic span.row"), (l) => l.length === 4);
      t.equal(t.text(rows[0]), "1 ( name is:qamsari )");
    });
  </script>
</body>
</html>
```

The library starts on the window `load` event and the harness starts right after it, so tests
wait for asynchronous results with `t.waitFor`, `t.waitForText`, `t.waitForSource` or
`t.waitForConsole` instead of assuming they are already there.

### Harness API (`window.bcTest`)

| Call | Meaning |
| --- | --- |
| `bcTest.test(name, async (t) => {...}, { timeout })` | A test; passes when the function resolves without a failed assertion (default timeout 15 s). |
| `bcTest.defect(name, async (t) => {...})` | A **known defect** of this version: the function asserts the defective behaviour. When the assertion stops holding the test is reported as "FIXED?" and fails the page, so the documentation (`docs/troubleshooting.md`, `README.md`, `AGENTS.md`) gets updated. |
| `bcTest.skip(name, reason)` | Reported, not run (needs a user gesture, a real push server, ...). |
| `bcTest.allowError(/regex/)` | An uncaught error matching the pattern is expected and does not fail the page. |
| `t.ok`, `t.equal`, `t.notEqual`, `t.deepEqual`, `t.match`, `t.notMatch`, `t.includes`, `t.throws`, `await t.rejects`, `t.fail` | Assertions. |
| `t.$(sel)`, `t.$$(sel)`, `t.text(el)`, `t.html(el)` | DOM access (`t.text` collapses whitespace). |
| `t.click(el)`, `t.fire(el, type)`, `t.setValue(el, value, events)` | User actions; `setValue` assigns `value` and fires `input`, `keyup` and `change` by default. |
| `await t.waitFor(fn, predicate, { timeout })`, `await t.waitForText(el, textOrRegex)`, `await t.waitForConsole(/re/)`, `await t.waitForError(/re/)`, `await t.sleep(ms)` | Waiting. |
| `t.source("a.b")`, `t.rows("a.b")`, `await t.waitForSource("a.b", predicate)` | Read a published source through `$bc.global.basiscore.context`. |
| `t.consoleMessages(/re/)`, `t.errors(/re/)`, `t.note(text)` | Inspect the library's log lines and the recorded uncaught errors; add a note to the report. |

A page is **ok** when no test failed, no `bcTest.defect` turned out to be fixed and no uncaught
error occurred that is not covered by `bcTest.allowError`. The result is shown in the page,
exposed as `window.__bcTest`, posted to the parent window (used by `tests/index.html`) and
written to the console as one `[bc-test] {...}` line (used by `tests/run.js`).

## Adding a test page

1. Create `tests/<group>/<slug>.html` from the skeleton above (`group` is `foundations`,
   `commands` or `schema`; `slug` is the documentation file name). Static files go under
   `tests/fixtures/<slug>/`.
2. Reproduce the documentation's example markup faithfully and assert the observable result it
   describes: rendered DOM, source rows, console lines, request bodies seen by the mock
   (`BasisCoreMock.state().log`).
3. Run `node tests/run.js <group>/<slug>.html --verbose` until it prints `PASS`, twice.
4. Add the page to `tests/manifest.json` (`file`, `doc`, `title`). The runner warns about pages
   that are on disk but not in the manifest.
5. When a documented statement turns out to be false, check `src/` to see which side is wrong
   and fix the documentation, not the assertion. Undocumented defects become `bcTest.defect`
   tests plus an entry in `docs/troubleshooting.md`.

## Documentation to test page map

<!-- map:start -->
<!-- map:end -->
