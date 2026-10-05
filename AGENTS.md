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
| `ai/` | Skill package for assistant tools and its build script |

## Build, run, verify

```bash
npm ci --legacy-peer-deps   # plain `npm ci` fails: uglifyjs-webpack-plugin declares a webpack 4 peer dependency
npm run dev                 # webpack dev server with the examples and mock back ends on http://localhost:3000
npm run dev:no-serve        # development build only (fast check that the TypeScript compiles)
npm run rel                 # production build to dist/
npm run pub                 # production build plus bundled typings dist/basiscore.d.ts
npm run ws                  # WebSocket demo server on port 8080
```

- There is **no automated test suite**. Verify a change by running `npm run dev:no-serve` (it
  must end with `compiled successfully`) and by opening the relevant page under `example/` in
  the dev server. Say which pages you checked.
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
- Keep behaviour and documentation together: a change to an attribute, default or error message
  must update the matching page in `docs/` and the skill in `ai/skill/`.
- Commit messages follow the existing style: a type prefix and a short imperative summary, for
  example `fix: …`, `feat(connection): …`, `docs: …`, `chore: …`.
- Do not bump `version` in `package.json` or edit the console banner in `src/index.ts` unless the
  task is a release.

## Rules for writing BasisCore client markup

These are the mistakes agents make most often. Each one is enforced by the source.

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
   `[##name.value##]`.
4. **Faces:** `@column@` (or `@column`) inside `<face>`, `@child` inside `<layout>`. Any
   `<tr>`, `<td>`, `<option>` or other markup the HTML parser would move must be wrapped in
   `<script type="text/template">…</script>`.
5. **Code blocks** `{{ return … }}` run as `AsyncFunction("$bc", "$data")`. Inside a block
   `$bc` is the command's *context* (with `tryToGetSource`, `waitToGetSourceAsync`,
   `setAsSource`), not the global wrapper. Dependencies are tracked only for the single-quoted
   form `$bc.waitToGetSourceAsync('a.b')`.
6. **Merge types are numbers.** `MergeType.replace = 0`, `MergeType.append = 1`; row status is
   `added = 0`, `edited = 1`, `deleted = 2`. There is no `push` or `join` merge type (`join` is an
   `inlinesource` member format). A string `mergeType` in source options is not stored.
7. **`dbsource` maps results to `<member>` elements by position** and publishes `name.member`.
   The count must match or it throws. The `api` command is different: it publishes each
   `sources[i]` under its `options.tableName`, or the whole JSON under `name` (default `cms.api`).
8. **`bc-triggers` takes DOM event names** (`keyup change`, `submit`), never source ids.
   `triggers` on a `<basis>` command takes source ids.
9. **Face `filter` is a raw AlaSQL `WHERE` clause** over column names (`filter="inStock = 1"`),
   and needs `alasql` reachable at `host.dbLibPath` (default `/alasql.min.js`).
10. **`group options="…"` and `callback method="…"` are passed to `eval`.** Reference a global
    (`options="myOptions"`) or wrap an object literal in parentheses.
11. **Write HTTP verbs in upper case** (`"default.source.verb": "GET"`). In 2.39.6 a lower-case
    verb on a `web` connection sends a GET with a body, which the browser rejects.
12. **`host` must be defined before the script tag** and `host.sources` takes an array of rows
    or `{ data, options }`, never `{ rows }`. `$bc.addFragment` and `$bc.setOptions` throw once
    the instance has run.
13. **Never invent identifiers.** `dmnid`, `schemaId`, `prpId`, connection names and source
    names come from the user or the server. Leave a clearly marked placeholder if unknown.
14. **There is no static validator for client markup.** Say that output follows the documented
    rules; do not claim it "passes validation". Prefer adapting a page from `example/`.

## Known bugs in 2.39.6

Documented in `docs/troubleshooting.md`; do not "fix" a page around them silently, mention them.

- `cms.cms` date values use a zero-based month and the weekday instead of the day of the month.
- `WebConnectionOptions.fetchAjax` compares the verb case-sensitively (see rule 11).
- An unset `default.dmnid` is sent to the server as the text `null`.
- The console banner prints `2.39.7` although the package version is `2.39.6`.
- The `rest` connection provider is declared but every method throws.

## Scope and safety

- Do not change the public markup contract (command names, attribute names, token syntax, server
  response envelope) without an explicit request; pages in production depend on it.
- Do not edit `ai/packages/` by hand; it is generated by `ai/build.py`.
- Do not add dependencies for convenience; the bundle is shipped to browsers as a single file.
- Keep documentation in English and free of tool or vendor names.
