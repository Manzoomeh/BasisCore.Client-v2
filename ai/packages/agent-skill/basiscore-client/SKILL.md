---
name: basiscore-client
description: Write and debug browser-side BasisCore — the BasisCore.js library (v2.39.6, npm package "basiscore") that renders `<basis>` commands in the page. Covers the `run="atclient"` activation rule, the 21 client commands (print, list, view, tree, chart, schema, schemalist, schemauploader, inlinesource, dbsource, api, cookie, call, group, repeater, callback, input, select, form, unknown-html, component), `[##source.member.column##]` tokens, `@column@` faces and `{{ }}` code blocks, sources and triggers, merge strategies, `bc-*` element binding, host configuration and connections, and the `data-bc-*` DOM markers. Use for "BasisCore.js", "basiscore client", "atclient", "$bc.setSource", "bc-triggers", "data-bc-", "why doesn't my basis command run", or any browser-rendered BasisCore task. Not for server-rendered `.bc` pages.
license: MIT
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

Attribute tables, children and per-command caveats: `references/commands.md`.

## Binding

- `[##source.member.column##]` — a value from a source; a scalar for one row, an array for several.
- `[##a.b.c|x.y.z|(default)##]` — fallback chain; the first non-empty part wins.
- `@column@` in `<face>` — a field of the current row. `@child` in `<layout>` — where rows go.
- `{{ return … }}` — JavaScript run as `AsyncFunction("$bc", "$data", …)`.
- A token without a column (`[##filter.keyword##]`) is an existence check, not the value. Inputs
  publish `[{ value }]`, so read them as `[##filter.keyword.value##]`.

Details, built-in sources, global attributes and merge strategies: `references/binding.md`.

## `data-bc-*` markers

`data-bc-*` attributes are markers the schema runtime writes on the HTML it generates (questions,
parts, uploads, autocomplete, validation state). They are useful for CSS and debugging; they are
not something you author. Inventory and host configuration keys: `references/dom-attributes.md`.

## Verified pitfalls (checked against the 2.39.6 source)

- **Merge types are numbers.** `MergeType` has only `replace = 0` and `append = 1`
  (`src/enum.ts`). A string such as `mergeType: "append"` in source options or in a server
  response matches neither branch of `Repository.setSourceEx`, and the source is **not stored**.
  Use `basiscore.MergeType.append` or `1`. `push` and `join` are not merge types (`join` is an
  `inlinesource` member format). `bc-merge="append"` on elements is parsed and is fine.
- **`MergeType` members are lower case:** `basiscore.MergeType.append`;
  `basiscore.MergeType.Append` is `undefined` and silently means replace.
- **Row status values are numbers too:** `added = 0`, `edited = 1`, `deleted = 2`. `DataStatus`
  is not exported on `window.basiscore`; use the numbers.
- **`dbsource` maps results by position.** Results are assigned to `<member>` elements in order
  and published as `name.member`; `tableName` in the response is ignored. The number of results
  must equal the number of members, or it throws
  `Command '<name>' has X member(s) but Y result(s) returned from source!`.
  The `api` command is different: it publishes each `sources[i]` under its `options.tableName`,
  or the whole JSON under `name` (default `cms.api`) when there is no `sources` envelope.
- **`host.sources` accepts an array of rows, or `{ data, options }`** — not `{ rows: [...] }`.
- **Write `<member>` with an explicit closing tag.** HTML does not self-close
  `<member … />`; the following members end up nested inside it.
- **`bc-triggers` calls `preventDefault()`** on its events: `click` on a checkbox stops it
  toggling; use `change`.
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
- **`web` connections send no cookies** (`credentials: "omit"`); pass what the server needs in
  the command's attributes or the URL.
- **An unknown provider in a `connection.<provider>.<name>` key stops the whole page** from
  being processed. Valid providers: `web`, `rest`, `websocket`, `chunkbased`, `local`, `push`.
- **Token values written into text are inserted as HTML,** not as plain text.
- **AlaSQL** is loaded on demand from `host.dbLibPath` (default `/alasql.min.js`) for face
  `filter`, member `sort`/`postsql`, `inlinesource` joins and `$bc.util.source` SQL helpers.

## Known bugs in 2.39.6

Fixed in https://github.com/Manzoomeh/BasisCore.Client-v2/pull/93 (not yet released):

- `cms.cms` `date`/`date2`/`date3` use a zero-based month and the weekday instead of the day.
- A lower-case verb (`"default.source.verb": "get"`) on a `web` connection sends a GET with a body,
  which the browser rejects. Write verbs in upper case.
- An unset `default.dmnid` is sent to the server as the text `null`.

Not fixed yet:

- `view` renders the level-1 face of each group, but the level-2 rows never appear in `@child`.
  Use `tree` (a parent row per group) or nested `print` instead.

## Working rules

- There is no static validator for client markup. Say that output follows the documented rules,
  not that it "passes validation".
- Never invent ids (`schemaid`, `propertyid`, `dmnid`) or source names. Ask, or leave a clearly
  marked placeholder.
- Some documented behaviours are unverified in the source (listed in `references/binding.md`
  under "Documented gaps"). Check there before relying on them.
