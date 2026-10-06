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

## Patterns used by the pages

- **Several runtimes on one page.** A case whose command must reject or wait forever (a member
  count mismatch, a missing connection, a token on a source that never arrives) lives in its own
  `<section bc-ignore>` and is started inside the test with
  `$bc.new().addFragment("#that-section").run()`, so the default runtime's rendering wave is never
  blocked. `bc-ignore` goes on the container, not on the `<basis>` element itself (an ignored root
  element is skipped by the new runtime too).
- **Observing requests.** The mock log (`BasisCoreMock.state().log`) holds the path, method and
  status only; a route that must expose its body or query stores `ctx` in a page-level array.
  `call` and the `web` provider's page loads use `XMLHttpRequest`, which the mock does not see:
  those pages serve files from `tests/fixtures/` or wrap `XMLHttpRequest.prototype.open`/`send`.
- **Streams.** WebSocket pages define a fake `window.WebSocket` before the library loads;
  `chunkbased` pages wrap `window.fetch` for one URL and answer with a `ReadableStream`; `push`
  pages dispatch `MessageEvent`s on `navigator.serviceWorker`.
- **Schema forms.** The schema JSON is returned by a global `schemaCallback` function or by a mock
  route; answers, lookups and uploads are mock routes. Files are created with `new File(...)` and
  set on inputs through a `DataTransfer`.
- **Fresh browser context per page.** Cookies, service worker registrations and storage do not leak
  between pages; a page that needs `cms.cookie` writes `document.cookie` before the library loads.

## Documentation to test page map

<!-- map:start -->
| Documentation page | Test page(s) | Tests |
| --- | --- | --- |
| [`docs/getting-started.md`](../docs/getting-started.md) | [`foundations/getting-started-autorender.html`](foundations/getting-started-autorender.html)<br />[`foundations/getting-started.html`](foundations/getting-started.html) | 2 passed<br />7 passed |
| [`docs/host-configuration.md`](../docs/host-configuration.md) | [`foundations/host-configuration.html`](foundations/host-configuration.html) | 17 passed, 1 known defect(s) |
| [`docs/binding-and-tokens.md`](../docs/binding-and-tokens.md) | [`foundations/binding-and-tokens.html`](foundations/binding-and-tokens.html) | 17 passed, 1 known defect(s) |
| [`docs/sources-and-reactivity.md`](../docs/sources-and-reactivity.md) | [`foundations/sources-and-reactivity.html`](foundations/sources-and-reactivity.html) | 19 passed, 1 known defect(s) |
| [`docs/command-attributes-and-lifecycle.md`](../docs/command-attributes-and-lifecycle.md) | [`foundations/command-attributes-and-lifecycle.html`](foundations/command-attributes-and-lifecycle.html) | 21 passed, 2 known defect(s) |
| [`docs/html-element-binding.md`](../docs/html-element-binding.md) | [`foundations/html-element-binding.html`](foundations/html-element-binding.html) | 22 passed, 1 known defect(s) |
| [`docs/connections.md`](../docs/connections.md) | [`foundations/connections-chunkbased.html`](foundations/connections-chunkbased.html)<br />[`foundations/connections-local.html`](foundations/connections-local.html)<br />[`foundations/connections-push.html`](foundations/connections-push.html)<br />[`foundations/connections-web.html`](foundations/connections-web.html)<br />[`foundations/connections-websocket.html`](foundations/connections-websocket.html) | 12 passed, 1 known defect(s)<br />7 passed<br />8 passed, 1 skipped<br />13 passed, 1 known defect(s)<br />11 passed, 1 known defect(s) |
| [`docs/client-side-sql.md`](../docs/client-side-sql.md) | [`foundations/client-side-sql-localdb.html`](foundations/client-side-sql-localdb.html)<br />[`foundations/client-side-sql-no-dblib.html`](foundations/client-side-sql-no-dblib.html)<br />[`foundations/client-side-sql.html`](foundations/client-side-sql.html) | 4 passed<br />5 passed<br />10 passed |
| [`docs/javascript-api.md`](../docs/javascript-api.md) | [`foundations/javascript-api-autorun.html`](foundations/javascript-api-autorun.html)<br />[`foundations/javascript-api.html`](foundations/javascript-api.html) | 2 passed<br />20 passed, 1 known defect(s) |
| [`docs/user-defined-components.md`](../docs/user-defined-components.md) | [`foundations/user-defined-components.html`](foundations/user-defined-components.html) | 15 passed, 1 known defect(s), 1 skipped |
| [`docs/service-worker-and-push.md`](../docs/service-worker-and-push.md) | [`foundations/service-worker-and-push-default.html`](foundations/service-worker-and-push-default.html)<br />[`foundations/service-worker-and-push-denied.html`](foundations/service-worker-and-push-denied.html)<br />[`foundations/service-worker-and-push-dialog.html`](foundations/service-worker-and-push-dialog.html)<br />[`foundations/service-worker-and-push-repost.html`](foundations/service-worker-and-push-repost.html)<br />[`foundations/service-worker-and-push-subscribe.html`](foundations/service-worker-and-push-subscribe.html)<br />[`foundations/service-worker-and-push.html`](foundations/service-worker-and-push.html) | 3 passed<br />4 passed, 1 skipped<br />4 passed, 1 skipped<br />4 passed<br />5 passed, 1 skipped<br />12 passed, 2 skipped |
| [`docs/internals.md`](../docs/internals.md) | [`foundations/internals.html`](foundations/internals.html) | 14 passed |
| [`docs/troubleshooting.md`](../docs/troubleshooting.md) | [`foundations/troubleshooting-dblibpath.html`](foundations/troubleshooting-dblibpath.html)<br />[`foundations/troubleshooting.html`](foundations/troubleshooting.html) | 3 passed<br />18 passed, 22 known defect(s), 3 skipped |
| [`docs/commands/print.md`](../docs/commands/print.md) | [`commands/print.html`](commands/print.html) | 8 passed |
| [`docs/commands/list.md`](../docs/commands/list.md) | [`commands/list.html`](commands/list.html) | 11 passed, 1 known defect(s) |
| [`docs/commands/view.md`](../docs/commands/view.md) | [`commands/view.html`](commands/view.html) | 7 passed, 3 known defect(s) |
| [`docs/commands/tree.md`](../docs/commands/tree.md) | [`commands/tree.html`](commands/tree.html) | 14 passed |
| [`docs/commands/chart.md`](../docs/commands/chart.md) | [`commands/chart.html`](commands/chart.html) | 18 passed, 7 known defect(s) |
| [`docs/commands/schema.md`](../docs/commands/schema.md) | [`commands/schema.html`](commands/schema.html) | 15 passed |
| [`docs/commands/schemalist.md`](../docs/commands/schemalist.md) | [`commands/schemalist.html`](commands/schemalist.html) | 7 passed |
| [`docs/commands/schemauploader.md`](../docs/commands/schemauploader.md) | [`commands/schemauploader.html`](commands/schemauploader.html) | 9 passed, 1 known defect(s) |
| [`docs/commands/inlinesource.md`](../docs/commands/inlinesource.md) | [`commands/inlinesource.html`](commands/inlinesource.html) | 14 passed, 1 known defect(s) |
| [`docs/commands/dbsource.md`](../docs/commands/dbsource.md) | [`commands/dbsource.html`](commands/dbsource.html) | 12 passed, 3 known defect(s) |
| [`docs/commands/api.md`](../docs/commands/api.md) | [`commands/api.html`](commands/api.html) | 11 passed |
| [`docs/commands/cookie.md`](../docs/commands/cookie.md) | [`commands/cookie.html`](commands/cookie.html) | 8 passed |
| [`docs/commands/call.md`](../docs/commands/call.md) | [`commands/call.html`](commands/call.html) | 8 passed, 1 known defect(s), 1 skipped |
| [`docs/commands/group.md`](../docs/commands/group.md) | [`commands/group.html`](commands/group.html) | 11 passed, 1 known defect(s) |
| [`docs/commands/repeater.md`](../docs/commands/repeater.md) | [`commands/repeater.html`](commands/repeater.html) | 6 passed |
| [`docs/commands/callback.md`](../docs/commands/callback.md) | [`commands/callback.html`](commands/callback.html) | 13 passed |
| [`docs/commands/input.md`](../docs/commands/input.md) | [`commands/input.html`](commands/input.html) | 15 passed, 1 known defect(s) |
| [`docs/commands/select.md`](../docs/commands/select.md) | [`commands/select.html`](commands/select.html) | 9 passed |
| [`docs/commands/form.md`](../docs/commands/form.md) | [`commands/form-codeblock.html`](commands/form-codeblock.html)<br />[`commands/form.html`](commands/form.html) | 2 passed, 2 known defect(s)<br />10 passed, 1 known defect(s) |
| [`docs/commands/unknown-html.md`](../docs/commands/unknown-html.md) | [`commands/unknown-html.html`](commands/unknown-html.html) | 12 passed |
| [`docs/commands/component.md`](../docs/commands/component.md) | [`commands/component.html`](commands/component.html) | 16 passed |
| [`docs/schema/schema-json-contract.md`](../docs/schema/schema-json-contract.md) | [`schema/schema-json-contract.html`](schema/schema-json-contract.html) | 12 passed, 1 known defect(s) |
| [`docs/schema/field-types.md`](../docs/schema/field-types.md) | [`schema/field-types.html`](schema/field-types.html) | 10 passed, 2 known defect(s) |
| [`docs/schema/validation.md`](../docs/schema/validation.md) | [`schema/validation.html`](schema/validation.html) | 8 passed |
| [`docs/schema/lookup-and-autocomplete.md`](../docs/schema/lookup-and-autocomplete.md) | [`schema/lookup-and-autocomplete.html`](schema/lookup-and-autocomplete.html) | 11 passed |
| [`docs/schema/file-upload.md`](../docs/schema/file-upload.md) | [`schema/file-upload.html`](schema/file-upload.html) | 11 passed |
| [`docs/schema/html-field-and-dialogs.md`](../docs/schema/html-field-and-dialogs.md) | [`schema/html-field-and-dialogs.html`](schema/html-field-and-dialogs.html) | 12 passed, 1 skipped |
| [`docs/schema/answers-and-submission.md`](../docs/schema/answers-and-submission.md) | [`schema/answers-and-submission.html`](schema/answers-and-submission.html) | 11 passed |
| [`docs/schema/dom-markers.md`](../docs/schema/dom-markers.md) | [`schema/dom-markers.html`](schema/dom-markers.html) | 14 passed |
| [`docs/schema/displaying-answers.md`](../docs/schema/displaying-answers.md) | [`schema/displaying-answers.html`](schema/displaying-answers.html) | 4 passed |
<!-- map:end -->
