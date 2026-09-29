# BasisCore Client

[![npm](https://img.shields.io/npm/v/basiscore.svg)](https://www.npmjs.com/package/basiscore)

**BasisCore.js** is the browser side of the BasisCore web programming language. You write
declarative `<basis>` commands in plain HTML, and the library loads data, binds it into the page,
and re-renders only what depends on data that changed. No build step, no framework, one
`<script>` tag.

- **Declarative data binding.** `[##source.member.column##]` tokens anywhere in the page and
  `@column@` placeholders inside templates.
- **Reactive sources.** Every piece of data is a named *source*. Commands that depend on a source
  re-run when it changes.
- **21 commands** for rendering (lists, trees, views, charts), loading data (HTTP, REST,
  WebSocket, chunked streams, local storage), composing fragments, and building forms from
  schemas.
- **Plain HTML inputs publish data** with one attribute (`bc-triggers`), with no event wiring.
- **Client-side SQL** over loaded data, powered by AlaSQL: filter, sort, join.

This repository is version **2.39.6** of the client (`npm` package `basiscore`). It is written in
TypeScript and bundled with webpack.

---

## Contents

For in-depth reference, see the **[developer guide](docs/README.md)**.

1. [Install](#install)
2. [Quick start](#quick-start)
3. [Core concepts](#core-concepts)
4. [Commands](#commands)
5. [Binding plain HTML elements](#binding-plain-html-elements)
6. [Host configuration](#host-configuration)
7. [Connections and the server contract](#connections-and-the-server-contract)
8. [JavaScript API](#javascript-api)
9. [Development](#development)
10. [Known issues in 2.39.6](#known-issues-in-2396)
11. [Related projects](#related-projects)

---

## Install

**From a CDN**

```html
<script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
```

**From npm**

```bash
npm install basiscore
```

Serve `node_modules/basiscore/dist/basiscore.min.js` (or `basiscore.js` with a source map) from
your site. The bundle defines two globals: `$bc`, the runtime, and `basiscore`, the exported
classes. Type definitions ship as `dist/basiscore.d.ts`.

**AlaSQL (only when you use SQL features).** Face `filter`, member `sort` / `postsql`, join
members and `$bc` SQL helpers load [AlaSQL](https://github.com/AlaSQL/alasql) on demand from
`host.dbLibPath` (default `/alasql.min.js`). Host the file there or point `dbLibPath` elsewhere.
Pages that do not use these features never load it.

---

## Quick start

Save this as an HTML file, put a `data/products.json` next to it, and open it through any static
web server:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script>
    var host = {
      settings: {
        "connection.web.shop": "/data/products.json",
        "default.source.verb": "GET"
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
</head>
<body>
  <!-- 1. A token, resolved from a source. -->
  <label>Your name: <input name="user.name" bc-triggers="keyup" /></label>
  <p>Hello, [##user.name.value|(guest)##]!</p>

  <!-- 2. A source set from JavaScript, rendered by print. -->
  <basis core="print" run="atclient" datamembername="team.members">
    <layout><ul>@child</ul></layout>
    <face><li>@name@ — @role@</li></face>
  </basis>

  <!-- 3. Data loaded from a server, rendered as a table. -->
  <basis core="dbsource" run="atclient" name="shop" source="shop">
    <member name="products"></member>
  </basis>
  <basis core="print" run="atclient" datamembername="shop.products">
    <layout><script type="text/template"><table>@child</table></script></layout>
    <face><script type="text/template"><tr><td>@name@</td><td>@price@</td></tr></script></face>
  </basis>

  <script>
    $bc.setSource("team.members", [
      { name: "Sara", role: "Designer" },
      { name: "Reza", role: "Developer" }
    ]);
  </script>
</body>
</html>
```

`data/products.json`:

```json
{
  "sources": [
    {
      "options": { "tableName": "shop.products" },
      "data": [
        { "id": 1, "name": "Notebook", "price": 12 },
        { "id": 2, "name": "Pen", "price": 2 }
      ]
    }
  ]
}
```

Typing in the input updates the greeting, the team list renders from JavaScript data, and the
product table renders from the server response. This page was tested with the published 2.39.6
bundle.

---

## Core concepts

### Only `run="atclient"` runs in the browser

A `<basis>` element is processed by the browser **only** when it has `run="atclient"` (case is
ignored). Without it, the element belongs to the server-side BasisCore engine and the browser
leaves it alone — with no error and no output. This is the most common reason a command "does
nothing".

### Sources

All data lives in named **sources**. A source id has the form `name.member`: a `dbsource` named
`shop` with a member `products` publishes `shop.products`. A source holds rows (an array of
objects). You can also create sources yourself with `$bc.setSource(id, data)`.

Built-in sources:

| Source | Contains |
|---|---|
| `cms.query` | URL query-string values |
| `cms.cookie` | Browser cookies |
| `cms.request` | Current location: host name, URL and similar |
| `cms.cms` | Date and time at start-up: `date`, `time`, `date2`, `time2`, `date3` |

### Tokens

```
[##source.member.column##]           a value from a source
[##source.member.column|(default)##] with a fallback, used when the value is empty
```

A token resolves to a single value when the source has one row, and to an array when it has
several. Tokens work in text and in attributes, including attributes of other commands.

### Layouts, faces and code blocks

Renderable commands take a `<layout>` and one or more `<face>` templates:

| Syntax | Where | Meaning |
|---|---|---|
| `@child` | layout | Where the rendered rows go |
| `@column@` | face | A field of the current row |
| `{{ return ... }}` | face, attributes | JavaScript; receives `$bc` and `$data` (the current row) |

When a template contains elements that are only valid inside a table (`<tr>`, `<td>`) or a
`<select>`, wrap it in `<script type="text/template">…</script>`; otherwise the browser's HTML
parser moves or drops those elements before BasisCore sees them.

A face can have a `filter` (SQL `WHERE` syntax, uses AlaSQL) to render only matching rows.

### Triggers

A command re-runs when a source it depends on changes. Renderable commands depend on their
`datamembername` automatically; add more with `triggers="source.a source.b"`. This is how inputs,
loaders and renderers stay in sync without event code.

### Merging

When a source is set again, the new rows **replace** the old ones by default. Use the `append`
merge type (`bc-merge="append"` on elements, or `{ mergeType: basiscore.MergeType.append }` in
source options — the numeric value `1` in server responses) to add rows instead; when both sides have a key field, a row with an existing key replaces the old row (and a status field can mark rows for removal).

---

## Commands

Use every command as `<basis core="…" run="atclient" …>`.

| Family | Command | Purpose |
|---|---|---|
| Render | `print` | Render rows through a layout and faces |
| | `list` | Render rows as a list |
| | `view` | Render grouped data (grouped by `default.viewcommand.groupcolumn`, `prpid` by default); see known issues |
| | `tree` | Render parent/child rows as a tree |
| | `chart` | Bar, line, pie, donut, funnel and stacked charts (D3) |
| | `schemalist` | Render a list of schema-driven records |
| Data | `dbsource` | Load one or more members from a connection |
| | `inlinesource` | Define data inline in the page, including SQL over other sources |
| | `api` | Call an HTTP API and publish the response as a source |
| Composition | `call` | Load an HTML fragment from the server and run it |
| | `group` | Group commands; show, hide or re-run them together; scope options |
| | `repeater` | Repeat a block of commands once per row |
| Forms | `schema` | Build a form from a question schema, validate it, collect answers |
| | `input` · `select` · `form` · `unknown-html` | The runtime behind the `bc-triggers` element binding |
| Side effects | `callback` | Call a JavaScript function when sources change |
| | `cookie` | Set a browser cookie |
| | `schemauploader` | Upload files for schema-driven forms |
| Extension | `component` | Load a user-defined component (`core="component.<key>"`) |

Attributes available on most commands:

| Attribute | Meaning |
|---|---|
| `name` | The source id this command publishes (data commands) |
| `datamembername` | The source this command renders |
| `triggers` | Extra source ids that make the command run again |
| `if` | Run only when the expression is true |
| `events` | DOM events that re-run the command |
| `OnProcessing` · `OnProcessed` · `OnRendering` · `OnRendered` | Names of global functions called around processing |

The runnable pages in [`example/`](example/) show each command in use, and the
[developer guide](docs/README.md) documents every command in detail.

---

## Binding plain HTML elements

Any element with `bc-triggers` publishes its value as a source — no `<basis>` tag needed:

```html
<input name="filter.name" bc-triggers="keyup change" />
<select name="filter.city" bc-triggers="change">…</select>
<form name="order" bc-triggers="submit">…</form>   <!-- publishes all fields; submit is prevented -->
```

| Attribute | Meaning |
|---|---|
| `bc-triggers` | DOM events that publish the value (required) |
| `bc-name` | Source id; otherwise `name` is used |
| `bc-value` | Publish this value instead of the element's value |
| `bc-off-value` | Value of an unchecked checkbox (default `off`) |
| `bc-merge` | `replace` (default) or `append` |
| `bc-keyField` · `bc-statusField` | Key and status fields for merging |
| `bc-ignore` | Exclude an element (and its content) from BasisCore processing |

An input's value is published as the column `value`: read it with `[##filter.name.value##]`.

---

## Host configuration

Configure the runtime with a global `host` object defined **before** the script tag:

```html
<script>
  var host = {
    debug: false,
    autoRender: true,
    dbLibPath: "/libs/alasql.min.js",
    settings: {
      "connection.web.api": "https://example.com/api/",
      "default.dmnid": 1,
      "default.source.verb": "POST"
    },
    sources: {
      "app.config": [{ theme: "light" }]
    }
  };
</script>
<script src="…/basiscore.min.js"></script>
```

| Key | Default | Meaning |
|---|---|---|
| `autoRender` | `true` | Process the page on `load` |
| `debug` | `false` | Debug output |
| `dbLibPath` | `/alasql.min.js` | Where AlaSQL is loaded from |
| `settings` | see below | Connections and defaults |
| `sources` | — | Sources available from the start |
| `repositories` | — | Where user-defined components are loaded from |
| `serviceWorker` | `false` | Service worker registration (`true` or a script URL) |
| `push` | — | Web push options |

Useful `settings` keys:

| Key | Default | Meaning |
|---|---|---|
| `connection.<provider>.<name>` | — | A named connection (next section) |
| `default.dmnid` | `""` | Domain id sent with data requests |
| `default.source.verb` | `POST` | HTTP method for `dbsource` requests — write it in **upper case** |
| `default.call.verb` | `POST` | HTTP method for `call` requests |
| `default.source.heartbeatverb` | `GET` | Method for connection heartbeats |
| `default.viewcommand.groupcolumn` | `prpid` | Grouping column of `view` |
| `default.binding.regex` · `default.binding.face-regex` · `default.binding.codeblock-regex` | built in | The token, face and code-block syntaxes |

`<basis core="group" options="…">` can override options for the commands inside it.

---

## Connections and the server contract

A connection is declared as `connection.<provider>.<name>` and used by name
(`<basis core="dbsource" source="<name>">`, `<basis core="call">` uses `callcommand`).

| Provider | Transport |
|---|---|
| `web` | HTTP request/response |
| `rest` | REST-style HTTP |
| `websocket` | WebSocket stream |
| `chunkbased` | Chunked HTTP stream |
| `local` | Browser local storage |
| `push` | Web push |

The simplest form is a URL string: `"connection.web.shop": "https://example.com/shop"`.

**What a `web` connection sends for a `dbsource`.** Two parameters: `command` (the `<basis>`
element's HTML, with tokens already resolved) and `dmnid`. With `POST` they are sent as
`application/x-www-form-urlencoded`; with `GET`, as the query string.

**What it expects back:**

```json
{
  "setting": { "keepalive": false },
  "sources": [
    {
      "options": { "tableName": "shop.products", "keyFieldName": null, "mergeType": 0 },
      "data": [ { "id": 1, "name": "Notebook" } ]
    }
  ]
}
```

Return one entry in `sources` per `<member>`, **in the same order**: `dbsource` maps the results to
its members by position and publishes them as `name.member` (for example `shop.products`). A
different number of results than members is an error. `tableName` is not used by `dbsource`; it is
the source id for the `api` command, which publishes every entry of a `sources` envelope under its
`tableName` (or the whole JSON under its `name` when there is no envelope).

`call` fetches `connection.web.callcommand` + the `file` attribute and inserts the returned HTML
into the page.

---

## JavaScript API

| Member | Purpose |
|---|---|
| `$bc.setSource(id, data, options?)` | Create or update a source; dependent commands re-run |
| `$bc.run()` | Process the page (runs automatically on `load` when `autoRender` is on) |
| `$bc.addFragment(selectorOrElement)` | Limit processing to part of the page; chain `.run()` |
| `$bc.setOptions(options)` | Options for the next `run()` |
| `$bc.new()` | A separate runtime instance with its own sources |
| `$bc.global` · `$bc.all` | The default instance and every instance created |
| `$bc.util` | Helpers: `getLibAsync`, `toNode`, `toElement`, `format`, `cloneDeep`, `getRandomName` and others |
| `$bc.global.GetCommandList()` · `.GetCommandListByCore(core)` | Inspect the commands an instance built (instance methods, not on `$bc` itself) |

Automatic rendering happens on `window` `load` only when no instance has been created yet.
`$bc.setSource` starts the default instance immediately, so call it from a script placed after the
markup it feeds (for example at the end of `<body>`). `addFragment` and `setOptions` must be called
before that instance runs; afterwards they throw.

`window.basiscore` exposes the classes (`BasisCore`, `HostOptions`, `MergeType`, the command
components, `LocalDataBase` and more) for advanced use and for writing components.

---

## Development

Requirements: Node.js and npm.

```bash
npm install --legacy-peer-deps
npm run dev        # webpack dev server on http://localhost:3000
```

`--legacy-peer-deps` is needed because `uglifyjs-webpack-plugin` still declares a webpack 4 peer
dependency.

The dev server serves the library and the pages in [`example/`](example/), plus mock back ends
under `/api`, `/schema`, `/blob`, `/assets`, `/chunk` and `/validation` (see [`server/`](server/)).
`npm run ws` and `npm run cb` start the WebSocket and chunk-stream demo servers.

| Script | Does |
|---|---|
| `npm run dev` | Development build and dev server |
| `npm run dev:no-serve` | Development build only |
| `npm run rel` | Production build: `dist/basiscore.js` and `dist/basiscore.min.js` with source maps |
| `npm run pub` | Production build plus the bundled type definitions `dist/basiscore.d.ts` |

`prerel` and `prepub` clean `dist` with a Windows command (`rd`); on Linux or macOS remove `dist`
yourself before building. Publishing steps are in [`help.txt`](help.txt).

Source layout: `src/component` (commands), `src/context` (sources and contexts),
`src/options` (host options and connections), `src/token` (token parsing), `src/wrapper`
(the `$bc` API).

---

## Known issues in 2.39.6

Found while verifying this README against the source and the published bundle. The first three
are fixed in [#93](https://github.com/Manzoomeh/BasisCore.Client-v2/pull/93) and will disappear
with the next release:

| Issue | Effect | Work-around |
|---|---|---|
| `cms.cms` date values use a zero-based month and the day of the week (`getMonth()`, `getDay()`) | `[##cms.cms.date##]` shows e.g. `2026/08/02` on 29 September 2026 | Format dates in JavaScript until fixed |
| The web connection compares the verb case-sensitively | `"default.source.verb": "get"` sends a GET with a body, which the browser rejects | Write verbs in upper case: `"GET"` |
| An unset `default.dmnid` is sent as the text `null` | The server receives `dmnid=null` | Set `default.dmnid`, or treat `null` as empty on the server |
| `view` renders the level-1 face of each group but not the level-2 rows | Grouped details are missing | Use `tree` or nested `print` |
| The console banner says `2.39.7` | Cosmetic; the package version is 2.39.6 | — |

---

## Related projects

- [BasisCore.Server.Edge](https://github.com/Manzoomeh/BasisCore.Server.Edge) — Python edge
  service for BasisCore back ends
- [BasisCore.Server.Node](https://github.com/Manzoomeh/BasisCore.Server.Node) — the BasisCore web
  server and server-side render engine
- [basispanel-module](https://github.com/Manzoomeh/basispanel-module) — building BasisPanel
  modules, whose widgets use this library

---

## License

ISC, as declared in [`package.json`](package.json). © Manzoomeh Negaran.
