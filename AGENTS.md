# AGENTS.md

Instructions for AI coding agents working in this repository or writing pages that use the
library it produces. Human contributors are welcome to read it too.

## What this repository is

- **BasisCore Client** (`BasisCore.js`), the browser side of the BasisCore web programming
  language. Version **2.39.6**, npm package `basiscore`, licence ISC.
- A page author writes `<basis core="…" run="atclient">` commands in plain HTML. The library
  loads data into named *sources*, binds it with `[##source.member.column##]` tokens, renders
  `<face>` templates, and re-renders only the commands that depend on a source that changed.
- TypeScript, bundled with webpack 5 into `dist/basiscore.js` and `dist/basiscore.min.js`.
  Dependency injection uses `tsyringe`. Charts use `d3`. Client-side SQL uses `alasql`, which is
  loaded on demand from `host.dbLibPath`.
- This is a **separate runtime** from the server-side BasisCore engine. A `<basis>` element
  without `run="atclient"` belongs to the server and the browser ignores it silently.

## Read the documentation first

The complete developer reference is in [`docs/`](docs/README.md). It is written from the
TypeScript source and the runnable examples, and every statement in it was checked against
`src/`. Use it instead of guessing:

| Task | Read |
| --- | --- |
| Any page that uses the library | `docs/getting-started.md`, `docs/binding-and-tokens.md`, `docs/sources-and-reactivity.md` |
| A specific command (`print`, `dbsource`, `schema`, …) | `docs/commands/<core>.md` |
| Attributes shared by all commands (`if`, `triggers`, `events`, `On*` hooks) | `docs/command-attributes-and-lifecycle.md` |
| `bc-triggers` on inputs, selects and forms | `docs/html-element-binding.md` |
| The `host` object and `connection.*` settings | `docs/host-configuration.md`, `docs/connections.md` |
| Schema-driven forms | `docs/commands/schema.md` and `docs/schema/*.md` |
| Writing a component (`core="component.…"`) | `docs/user-defined-components.md` |
| `$bc`, `$bc.util`, exported classes | `docs/javascript-api.md` |
| Something does not render or throws | `docs/troubleshooting.md` |
| Changing the library itself | `docs/internals.md` |
| Seeing a feature work, or copying a complete page that is known to run | `tests/<group>/<page>.html` (see `tests/README.md`; every documentation page has one) |

A compact version of the same rules, packaged for assistant tools, lives in
[`ai/skill/basiscore-client/`](ai/skill/basiscore-client/SKILL.md). When you change behaviour
documented there, update the skill and run `python ai/build.py` so `ai/packages/` stays in sync.

## Repository map

| Path | Content |
| --- | --- |
| `src/index.ts` | Entry point: creates the global `$bc`, registers the `load` auto-render listener, exports the public classes as `window.basiscore` |
| `src/tsyringe.config.ts` | The IoC registry. **Every command name (`core`) is registered here**; a command that is not registered does not exist |
| `src/component/` | Command implementations: `renderable/` (print, list, view, tree, schema…), `source/` (dbsource, inlinesource, api, callback), `collection/` (call, group, repeater), `html-element/` (input, select, form, unknown-html), `chart/`, `user-define-component/`, `management/` (cookie) |
| `src/context/`, `src/repository/`, `src/data/` | Sources, contexts and the merge algorithm |
| `src/token/`, `src/extension/` | Token parsing and the `String`/`Element` prototype extensions |
| `src/options/` | `HostOptions` defaults and the connection providers (`web`, `websocket`, `chunkbased`, `local`, `push`, `rest`) |
| `src/wrapper/` | The `$bc` API (`BCWrapperFactory`, `BCWrapper`, `UtilWrapper`, `SourceWrapper`) |
| `example/` | Runnable demo pages for every command and connection type, served by the dev server. They are the manual test bed |
| `server/` | Mock back ends mounted by the dev server (`/api`, `/schema`, `/blob`, `/assets`, `/chunk`, `/validation`) and a standalone WebSocket demo (`npm run ws`) |
| `docs/` | The developer reference |
| `tests/` | Functional test pages, one per documentation page, plus the harness (`tests/harness/`), the headless runner (`tests/run.js`), the browser runner (`tests/index.html`) and static fixtures |
| `ai/` | Skill package for assistant tools and its build script |

## Build, run, verify

```bash
npm ci --legacy-peer-deps   # plain `npm ci` fails: uglifyjs-webpack-plugin declares a webpack 4 peer dependency
npm run dev                 # webpack dev server with the examples and mock back ends on http://localhost:3000
npm run dev:no-serve        # development build only (fast check that the TypeScript compiles)
npm run rel                 # production build to dist/
npm run pub                 # production build plus bundled typings dist/basiscore.d.ts
npm run ws                  # WebSocket demo server on port 8080
npm test                    # functional tests in headless Chromium (once: npx playwright-core install chromium)
node tests/run.js print     # only the pages whose path contains the word; --verbose prints every assertion
```

- Verify a change by running `npm run dev:no-serve` (it must end with `compiled successfully`)
  and `npm test` (every page must print `PASS`). The test pages are the executable form of the
  documentation: when you change a behaviour, update the matching page in `docs/` and the test
  page in `tests/` together, and add a case for what you changed. A `bcTest.defect` case that
  reports `FIXED?` means a documented defect has been repaired: update
  `docs/troubleshooting.md`, `README.md` and the list below, then turn the case into
  `bcTest.test`. Say which pages you ran.
- `prerel` and `prepub` use the Windows `rd` command. On Linux or macOS delete `dist/` yourself.
- `npm run cb` points at `server/chunkBased.js`, which does not exist; the chunk endpoints are
  served by `server/chunk-server.js` inside the dev server.
- `dist/`, `src/types/` and `node_modules/` are ignored by git. Do not commit build output.

## Conventions when changing the library

- Commands are classes decorated with `@injectable()` whose constructor takes
  `@inject("element") element`, `@inject("context") context` and, when needed,
  `@inject("dc") container`. Register a new command in `src/tsyringe.config.ts` and export its
  class from `src/index.ts`.
- Renderers extend `RenderableComponent`; data loaders extend `SourceComponent` or
  `MemberBaseSourceComponent`; anything that reads a `datamembername` extends
  `SourceBaseComponent`. Read `docs/internals.md` for the hierarchy before adding a class.
- Asynchronous methods end in `Async`. HTML templates are imported as strings from `assets/*.html`
  and CSS from `assets/*.css`.
- Attribute names are read from the DOM, which lower-cases them. Compare attribute names
  case-insensitively and document attributes in the case the examples use.
- Keep behaviour, documentation and tests together: a change to an attribute, default or error
  message must update the matching page in `docs/`, the test page in `tests/` and the skill in
  `ai/skill/`.
- Commit messages follow the existing style: a type prefix and a short imperative summary, for
  example `fix: …`, `feat(connection): …`, `docs: …`, `chore: …`.
- Do not bump `version` in `package.json` or edit the console banner in `src/index.ts` unless the
  task is a release.

## Rules for writing BasisCore client markup

These are the mistakes agents make most often. Each one is enforced by the source and proven by
a page under `tests/`; the page named after each rule shows the working form.

1. **Add `run="atclient"` to every `<basis>` element you expect the browser to run.** Without it
   nothing happens and nothing is logged.
2. **Only the 21 registered commands exist:** `print`, `list`, `view`, `tree`, `chart`,
   `schema`, `schemalist`, `schemauploader`, `dbsource`, `inlinesource`, `api`, `cookie`, `call`,
   `group`, `repeater`, `callback`, `input`, `select`, `form`, `unknown-html`, `component`. The
   last five of the input family are not written as `<basis>` tags: `input`, `select`, `form`
   and `unknown-html` are the runtime behind plain elements carrying `bc-triggers`, and
   `component` is written as `core="component.<key>"`.
3. **Tokens:** `[##source.member.column##]` reads a value; `[##a.b.c|x.y.z|(default)##]` is a
   fallback chain; `[##source.member##]` without a column is an existence check that yields
   `"true"` or `"false"`, not the data. An input publishes `[{ value }]`, so read it as
   `[##name.value##]`. A token in a **command attribute** waits until its source exists, so seed
   the source (`host.sources`) or give the token a fallback; a token on a multi-row source joins
   the values with commas. Every text token that can become empty needs a fallback (see the known
   bugs below). The two kinds of trigger side by side (`tests/commands/print.html`):

   ```html
   <label>name: <input name="filter.name" bc-triggers="keyup change" /></label>   <!-- DOM events -->
   <p>Name contains: [##filter.name.value|( )##]</p>
   <basis core="print" datamembername="local.print" run="atclient" triggers="filter.name">   <!-- source ids -->
     <face filter="name like '%[##filter.name.value##]%'">
       <script type="text/template"><li>@name@</li></script>
     </face>
   </basis>
   <!-- host.sources: { "filter.name": [{ value: "" }] }  the face filter waits for a missing source, so seed it -->
   ```
4. **Faces: always write the closed form `@column@`.** The open form `@column` ends only at the
   next whitespace or `@`, so `<li>@name</li>` compiles `name</li>…` as the expression and the
   face fails with a `SyntaxError`; `<span>@question:</span>` and `@answer,` fail the same way.
   `@child` marks the row slot inside `<layout>` and the child slot of a `tree`/`view` level face.
   Faces have no `|(default)` fallback; a fallback is a JavaScript expression without spaces,
   `@(mark??'none')@`. Any `<tr>`, `<td>`, `<option>`, `<img>` or other markup the HTML parser
   would move or rewrite must be wrapped in `<script type="text/template">…</script>`, and the
   template must be well-formed XML (`<br />`, `&amp;`).
5. **Code blocks** `{{ return … }}` run as `AsyncFunction("$bc", "$data")`. Inside a block
   `$bc` is the command's *context* (with `tryToGetSource`, `waitToGetSourceAsync`,
   `setAsSource`), not the global wrapper (`window.$bc.util` for the utilities). Dependencies
   are tracked only for the single-quoted form `$bc.waitToGetSourceAsync('a.b')`; with double
   quotes the block renders once and never updates. A block in page text that awaits a source
   nobody has published stalls every command of that runtime until the source exists; use
   `$bc.tryToGetSource('a.b')` with a `null` check instead. Script text is scanned for tokens
   and blocks too: put `bc-ignore` on a `<script>` that quotes the token syntax.
6. **Merge types are numbers.** `MergeType.replace = 0`, `MergeType.append = 1`; row status is
   `added = 0`, `edited = 1`, `deleted = 2`. There is no `push` or `join` merge type (`join` is an
   `inlinesource` member format and needs `jointype`). A string `mergeType` in source options is
   not stored. An append keeps the stored source's `keyFieldName`/`statusFieldName`; only a
   replace overwrites them.
7. **`dbsource` maps results to `<member>` elements by position** and publishes `name.member`
   (lower-cased). The count must match or it throws. Extra attributes of the command travel to
   the server inside `command`, and a streaming connection keeps the command's own run short, so
   tokens that read the result need fallbacks (`tests/foundations/connections-websocket.html`):

   ```html
   <form name="test.counter" bc-triggers="submit"><input type="number" name="value" value="10" /><input type="submit" /></form>
   <basis core="dbsource" source="simple" name="stream" run="atclient"
          counter="[##test.counter.value|(10)##]" triggers="test.counter">
     <member name="time"></member>
   </basis>
   <span>[##stream.time.hh|(00)##]:[##stream.time.mm|(00)##]</span>
   ```

   The `api` command is different: it publishes each `sources[i]` under its `options.tableName`,
   or the whole JSON under `name` (default `cms.api`).
8. **`bc-triggers` takes DOM event names** (`keyup change`, `submit`, `click`), never source ids.
   `triggers` on a `<basis>` command takes source ids. A `callback` is never run on load; it runs
   on each later publication of a trigger, and for DOM `events` the row is the `Event` itself
   (`args.source.rows[0]`), while `timer.*` rows are `{ value: intervalId }`.
9. **Face `filter` is a raw AlaSQL `WHERE` clause** over column names (`filter="inStock = 1"`),
   and needs `alasql` reachable at `host.dbLibPath` (default `/alasql.min.js`). `rownumber`
   exists only on sources published by a member, not on sources set from JavaScript.
10. **These attributes are passed to `eval`:** `group options`, `callback method`, and the
    `schema` attributes `options`, `callback` and `schemaCallback`. Reference a global
    (`options="myOptions"`, `method="onSaved"`) or wrap an object literal in parentheses:
    `options="({ validationErrors: { required: 111 }, messagesApi: '/validation' })"`. A bare
    `{ a: 1 }` is a block statement to `eval` and fails silently (the form never renders). No
    attribute getter evaluates JavaScript: to hand an object from a face row to a component, store
    it as a global and pass the name (`tests/commands/component.html`):

    ```html
    <basis core="component.local.MyWidget" run="atclient"
           options="{{ return window.$bc.util.storeAsGlobal($data.options); }}"></basis>
    <!-- in the class: const options = window[await this.owner.getAttributeValueAsync("options")]; -->
    ```
11. **Write HTTP verbs in upper case** (`"default.source.verb": "GET"`). In 2.39.6 a lower-case
    verb on a `web` connection sends a GET with a body, which the browser rejects. A complete
    `host.settings` with every connection form (`tests/foundations/connections-web.html`):

    ```js
    var host = { settings: {
      "connection.web.bookapi": "/data/book.json",                  // string form, verb from default.source.verb
      "connection.web.posted": { url: "/db/posted", verb: "POST" }, // object form
      "connection.web.callcommand": "/pages/",                      // used by <basis core="call" file="…">; ends with "/"
      "default.source.verb": "GET",
      "default.dmnid": 2668                                         // otherwise the server receives dmnid=null
    } };
    ```
12. **`host` must be defined before the script tag** and `host.sources` takes an array of rows
    or `{ data, options }`, never `{ rows }`. `$bc.addFragment` and `$bc.setOptions` throw once
    the instance has run, and `wrapper.setSource` on a `$bc.new()` wrapper must come after
    `.run()`.
13. **Schema forms hand their result over through sources** (`tests/schema/answers-and-submission.html`):

    ```html
    <button data-btn-save>Save</button>
    <basis core="schema" run="atclient" schemaCallback="loadSchema" displayMode="new"
           button="[data-btn-save]" resultSourceId="form.result" errorResultSourceId="form.error"></basis>
    <basis core="callback" run="atclient" triggers="form.result" method="onSaved"></basis>
    <basis core="callback" run="atclient" triggers="form.error" method="onInvalid"></basis>
    <script>
      async function loadSchema(context, paramUrl) { return schemaObject; } // the schema itself, never a { sources } envelope
      function onSaved(args)   { const result = args.source.rows[0]; }    // IUserActionResult: lid, schemaId, usedForId, properties[]
      function onInvalid(args) { /* args.source.rows[0] is always { value: true } */ }
    </script>
    ```

    `button` is a document-wide CSS selector read once; nothing is published when nothing
    changed. Files in `blob` parts are `File` objects that `JSON.stringify` turns into `{}`: send
    the result with `<basis core="schemauploader" datamembername="form.result" name="up" url="…" blob="…">`
    (two-phase: JSON answer first, the response must contain `usedforid`, then the files).
14. **Never invent identifiers.** `dmnid`, `schemaId`, `prpId`, connection names and source
    names come from the user or the server. Leave a clearly marked placeholder if unknown.
15. **There is no static validator for client markup**, but there are runnable pages. Say that
    output follows the documented rules and, when you can run a browser, prove it the way
    `tests/` does; do not claim it "passes validation". Prefer adapting a page from `tests/` or
    `example/`.

## Known bugs in 2.39.6

Documented in `docs/troubleshooting.md` (with source locations) and reproduced as
`bcTest.defect` cases in `tests/`; do not "fix" a page around them silently, mention them.

- `cms.cms` date values use a zero-based month and the weekday instead of the day of the month.
- `WebConnectionOptions.fetchAjax` compares the verb case-sensitively (see rule 11).
- An unset `default.dmnid` is sent to the server as the text `null`.
- The console banner prints `2.39.7` although the package version is `2.39.6`.
- The `rest` connection provider is declared but every method throws.
- `call` with `GET` sends no parameters (`file`, `pagesize` are dropped); use `POST`.
- `view` never renders its level 2 faces (a render-cache collision); only the group headers appear.
- A text token re-rendered to an empty value throws a `TypeError`; always give text tokens a fallback.
- `wrapper.setSource()` on a `$bc.new()` wrapper that has not run yet discards the data; call `.run()` first.
- `level` on a `print` or `list` face throws; it exists for `tree` and `view` only.
- A `{{ }}` block awaiting a missing source stalls every command of its runtime (rule 5).
- A column name containing `-` is evaluated as a subtraction in tokens and can yield `NaN`.
- An `inlinesource` join member without `jointype` throws and blocks rendering.
- A `group` toggled with `if` brings back dead tokens and republishes `host.sources` on show; a
  `group` re-run through `triggers` renders its nested commands into a detached fragment (the
  visible output freezes). Use `if` for show/hide and avoid `triggers` on a group.
- `StreamPromise` (the object a streaming `dbsource` keeps) cannot be awaited or chained.
- A `chunkbased` stream closed with `keepalive: false` always logs `Invalid remain part of json ,`.
- Chart tooltips: hovering a vertical `stacked` segment or the fifth slice of a donut throws.
- Schema: `schemauploader noCache="true"` throws; a pre-filled `time` part is always reported as
  edited; `ReadOnlyDate` throws without a saved value; the `html` dialog throws on its second open;
  the simple search controls throw `ReferenceError` instead of a `required` error for an empty
  required dependency.

## Scope and safety

- Do not change the public markup contract (command names, attribute names, token syntax, server
  response envelope) without an explicit request; pages in production depend on it.
- Do not edit `ai/packages/` by hand; it is generated by `ai/build.py`.
- Do not add dependencies for convenience; the bundle is shipped to browsers as a single file.
- Keep documentation in English and free of tool or vendor names.
