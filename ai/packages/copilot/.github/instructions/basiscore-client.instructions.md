---
applyTo: "**/*.html,**/*.htm,**/*.bc,**/*.inc"
---

# BasisCore client — BasisCore.js v2.39.6

The browser library renders `<basis>` commands in the page. It shares the token syntax with the
server-side BasisCore engine but is a **separate runtime** with its own command set and its own
activation rule. Source: https://github.com/Manzoomeh/BasisCore.Client-v2

## The activation rule — get this wrong and nothing happens

A `<basis>` element is processed by the browser **only** when its `run` attribute is `atclient`
(compared case-insensitively):

```html
<basis core="print" run="atclient" datamembername="db.list">
  <face>…</face>
</basis>
```

Without `run="atclient"` the browser builds nothing for that node — no error, no output. Such a
command belongs to the server-side engine. Calling `$bc.run()` does not change this.

## Commands

21 commands:

| family | commands |
| --- | --- |
| renderable | `print` `list` `view` `tree` `chart` `schemalist` |
| source | `dbsource` `inlinesource` `api` |
| collection | `call` `group` `repeater` |
| input | `schema` `input` `select` `form` `unknown-html` |
| side-effect | `cookie` `callback` `schemauploader` |
| component | `component` |

`input`, `select`, `form` and `unknown-html` are not written as `<basis>` tags: they are the
runtime behind plain HTML elements that carry `bc-triggers`.

Attribute tables, children and per-command caveats: `docs/ai/basiscore-client-reference.md`.

## Binding

- `[##source.member.column##]` — a value from a source; a scalar for one row, an array for several.
- `[##a.b.c|x.y.z|(default)##]` — fallback chain; the first non-empty part wins.
- `@column@` in `<face>` — a field of the current row; always the closed form, because the open
  form `@column` runs to the next whitespace and `<li>@name</li>` fails to compile. Faces have no
  `|(default)`; a fallback is a spaceless expression, `@(mark??'none')@`. `@child` in `<layout>` — where rows go.
- `{{ return … }}` — JavaScript run as `AsyncFunction("$bc", "$data", …)`.
- A token without a column (`[##filter.keyword##]`) is an existence check, not the value. Inputs
  publish `[{ value }]`, so read them as `[##filter.keyword.value##]`.

Details, built-in sources, global attributes and merge strategies: `docs/ai/basiscore-client-reference.md`.

## `data-bc-*` markers

`data-bc-*` attributes are markers the schema runtime writes on the HTML it generates (questions,
parts, uploads, autocomplete, validation state). They are useful for CSS and debugging; they are
not something you author. Inventory and host configuration keys: `docs/ai/basiscore-client-reference.md`.

## Verified pitfalls (checked against the 2.39.6 source)

- **Merge types are numbers.** `MergeType` has only `replace = 0` and `append = 1`
  (`src/enum.ts`). A string such as `mergeType: "append"` in source options or in a server
  response matches neither branch of `Repository.setSourceEx`, and the source is **not stored**.
  Use `basiscore.MergeType.append` or `1`. `push` and `join` are not merge types (`join` is an
  `inlinesource` member format). `bc-merge="append"` on elements is parsed and is fine.
- **Row status values are numbers too:** `added = 0`, `edited = 1`, `deleted = 2`. `DataStatus`
  is not exported on `window.basiscore`; use the numbers.
- **`dbsource` maps results by position.** Results are assigned to `<member>` elements in order
  and published as `name.member`; `tableName` in the response is ignored. The number of results
  must equal the number of members, or it throws
  `Command '<name>' has X member(s) but Y result(s) returned from source!`.
  The `api` command is different: it publishes each `sources[i]` under its `options.tableName`,
  or the whole JSON under `name` (default `cms.api`) when there is no `sources` envelope.
- **`host.sources` accepts an array of rows, or `{ data, options }`** — not `{ rows: [...] }`.
- **`bc-triggers` takes DOM event names** (`keyup change`, `submit`), never source ids.
- **`$bc.addFragment(...)` after the page has run throws** "Can't add fragment for already builded
  bc object".
- **HTML lowercases attribute names.** `style_marginX` becomes `style_marginx` and is ignored;
  `qs_rKey` sends `rkey`. Use lower-case keys where the runtime reads the attribute name.
- **`events` selectors:** `#id.click` and `input[type='text'].keyup` work; a leading-dot class
  selector such as `.btn.click` does not bind.
- **`schema` `errorResultSourceId`** receives the boolean `true` only when validation fails; it is
  not an error list.
- **`call` with a non-POST method** sends only `fileNames` and `siteSize`; POST forwards the other
  attributes with lower-cased names.
- **`callback` handlers are not awaited;** handle async errors yourself.
- **Templates with table or select rows** (`<tr>`, `<td>`, `<option>`) must be wrapped in
  `<script type="text/template">…</script>`, or the HTML parser drops them.
- **Face `filter` is a raw AlaSQL `WHERE` clause over column names:** `filter="inStock = 1"`,
  not `filter="@inStock@ = 1"`.
- **`group options="…"` is passed to `eval`.** Reference a global object (`options="myOptions"`)
  or wrap an object literal in parentheses; a bare `{ … }` is parsed as a block and fails.
- **`inlinesource` join members need `jointype`** (for example `innerjoin`, `leftjoin`); there is
  no default.
- **Bar charts categorise by `group`,** so a simple bar chart needs `group="<category column>"`
  as well as `y`.
- **Code blocks track dependencies only for single-quoted calls:**
  `$bc.waitToGetSourceAsync('a.b')` re-renders when `a.b` changes; the double-quoted form does not.
  These helpers exist inside `{{ }}` code blocks, not on the global `$bc`.
- **`GetCommandList()` / `GetCommandListByCore()`** are on an instance (`$bc.global`), not on `$bc`.
- **Auto-render runs on `load` only if no instance exists yet;** calling `$bc.new()`,
  `$bc.setSource()` or `$bc.run()` earlier replaces it.
- **`schemalist` is minimal in 2.39.6:** it renders question titles and ignores faces.
- **AlaSQL** is loaded on demand from `host.dbLibPath` (default `/alasql.min.js`) for face
  `filter`, member `sort`/`postsql`, `inlinesource` joins and `$bc.util.source` SQL helpers.

## Known bugs in 2.39.6

The first three are fixed in https://github.com/Manzoomeh/BasisCore.Client-v2/pull/93 (not yet
released). All of them are reproduced by `bcTest.defect` cases under `tests/` in the repository
and described with their source location in `docs/troubleshooting.md`.

- `cms.cms` `date`/`date2`/`date3` use a zero-based month and the weekday instead of the day.
- A lower-case verb (`"default.source.verb": "get"`) on a `web` connection sends a GET with a body,
  which the browser rejects. Write verbs in upper case.
- An unset `default.dmnid` is sent to the server as the text `null`.
- `view` never renders its level 2 faces; only the group headers appear.
- A text token re-rendered to an empty value throws a `TypeError`; give text tokens a fallback.
- `wrapper.setSource()` on a `$bc.new()` wrapper that has not run discards the data.
- `call` with `GET` sends no parameters; the `rest` connection provider throws on every method.
- A `{{ }}` block that awaits a source nobody has published stalls every command of its runtime.
- A column name containing `-` is evaluated as a subtraction in tokens.
- An `inlinesource` join member without `jointype` throws and blocks rendering.
- A `group` toggled with `if` brings back dead tokens; re-running a visible group through
  `triggers` freezes its output.
- Chart tooltips throw on vertical `stacked` segments and on the fifth donut slice.
- Schema: `schemauploader noCache="true"` throws; a pre-filled `time` part is always reported as
  edited; `ReadOnlyDate` throws without a saved value; the `html` dialog throws on its second open.

## Working rules

- There is no static validator for client markup. Say that output follows the documented rules,
  not that it "passes validation".
- The repository ships one runnable, self-checking page per documentation page under `tests/`
  (`npm test`). Copy from them; they are known to run.
- Never invent ids (`schemaid`, `propertyid`, `dmnid`) or source names. Ask, or leave a clearly
  marked placeholder.
- Some documented behaviours are unverified in the source (listed in `docs/ai/basiscore-client-reference.md`
  under "Documented gaps"). Check there before relying on them.

## Full reference

For every attribute table, read `docs/ai/basiscore-client-reference.md`.
