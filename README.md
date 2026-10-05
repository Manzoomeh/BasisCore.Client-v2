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
TypeScript and bundled with webpack. The complete developer reference is in [`docs/`](docs/README.md).

## Features

A complete list of what the library can do, grouped by area. Every item below is implemented in
the 2.39.6 source; details such as attribute names are documented in the later sections.

### Runtime and page processing

- **Zero build step.** One `<script>` tag; the page is processed on `load` when `autoRender` is on,
  or on demand with `$bc.run()`.
- **Declarative commands.** `<basis core="…" run="atclient">` elements are discovered anywhere in
  the document; `core` and `run` values are matched case-insensitively.
- **Fragment processing.** `$bc.addFragment(selectorOrElement)` limits processing to part of the
  page; several independent runtime instances can run on one page with `$bc.new()`, each with its
  own options and sources.
- **Priority-ordered start-up.** Commands run in three waves (high: `call`; normal: data loaders;
  low: renderers), so loaders are started before renderers wait on them.
- **Rendered content is live.** HTML produced by any renderer is scanned again, so templates may
  contain nested commands, tokens and `bc-triggers` elements (switch off per command with
  `processRenderedContent="false"`).
- **Opt-out regions.** `bc-ignore` excludes an element and everything inside it from processing.
- **Disposal.** Re-rendered or hidden regions dispose their inner commands, remove their source
  handlers and release their local contexts.
- **Console diagnostics.** Source additions, updates, handler registration and waits are logged;
  `preview="true"` on a member and `callback` without a `method` dump a source as a table.

### Sources and reactivity

- **Named sources.** Every piece of data is a `name.member` source holding rows; ids are
  case-insensitive. Scalars become `{ value }` rows, objects become a single row.
- **Set from anywhere.** From the server (`dbsource`, `api`), from inline SQL/joins
  (`inlinesource`), from HTML inputs (`bc-triggers`), from the `host.sources` option, from
  user components, or from JavaScript with `$bc.setSource()`.
- **Automatic dependency tracking.** Tokens and commands register for the sources they read and
  re-run only when one of them is set; extra dependencies via `triggers="a.b c.d"`.
- **Wait-for-source.** A token or command that needs a source that does not exist yet waits for
  it instead of failing (`waitToGetSourceAsync`).
- **Merge strategies.** `replace` (default) or `append`; with `keyFieldName` and
  `statusFieldName`, appended rows are upserted or removed by key using row status
  `added = 0`, `edited = 1`, `deleted = 2`.
- **Row versioning.** Each row carries a version; renderers reuse the existing DOM for rows whose
  version did not change and re-render only changed rows (keyed by `keyFieldName`).
- **Built-in sources.** `cms.query` (query string), `cms.cookie`, `cms.request` (host, port) and
  `cms.cms` (start-up date and time in several formats).
- **Scoped contexts.** `group` and `repeater` create child contexts that see the parent's sources
  but keep their own; `group` can override host options for its subtree.
- **Source heartbeat hook.** A `[##source##]` token with no member resolves to whether the source
  exists, which makes `if="[##cms.user##]"` style checks possible.

### Binding and templating

- **Tokens.** `[##source.member.column##]` in text nodes and attributes; nested columns
  (`a.b.c`), fallback chains `[##a.b.c|d.e.f|(default)##]`, single value for one row and an array
  for many rows.
- **Typed attribute tokens.** Command attributes are parsed as string, integer, boolean or object
  tokens and may themselves contain tokens or code blocks.
- **Code blocks.** `{{ … }}` runs as an async JavaScript function receiving `$bc` (the context)
  and, inside faces, `$data` (the current row); usable in text, attributes and templates.
- **Face placeholders.** `@column@` or `@column` inside `<face>` templates, plus any JavaScript
  expression over the row's fields; `@child` marks where child rows go in layouts and tree faces.
- **Template wrappers.** `<script type="text/template">` protects table and select markup from the
  HTML parser; templates are parsed as XML, with SVG namespaces handled.
- **Configurable syntax.** The token, face and code-block regular expressions are host settings
  (`default.binding.*`), so the delimiters can be changed per page or per `group`.
- **Expression `if`.** `if="…"` accepts literals, tokens, comparisons and code blocks; while it
  is false the command does not run, and a `group` also removes its content from the page.

### Rendering commands

- **`print`.** Rows through `<layout>` and one or more `<face>` templates; `<else-layout>` for an
  empty result.
- **Face selection.** Faces can be restricted with `filter` (SQL `WHERE`), `rowtype="odd|even"`
  and, for hierarchical renderers, `level="1|2|end"`.
- **`list`.** Like `print`, plus `<divider rowcount="n">` inserted after every n items and
  `<incomplete>` filler for the last partial group.
- **`tree`.** Recursive parent/child rendering from flat rows (`idcol`, `parentidcol`,
  `nullvalue`), with per-level and leaf (`end`) faces.
- **`view`.** Two-level grouped rendering by `groupcol` (default
  `default.viewcommand.groupcolumn`), with level 1 and level 2 faces (level 2 output is missing in
  2.39.6, see Known issues).
- **`repeater`.** Repeats a block of arbitrary commands once per row, publishing the row as
  `<name>.current`; `replace="false"` appends instead of re-rendering.
- **`chart`.** SVG charts drawn with D3: `bar` (grouped, vertical or horizontal), `stacked`
  (vertical or horizontal), `line` (single or multi-series, numeric or string x axis), `funnel`,
  `donut` and `halfdonut`. Options: title, legend, hover tooltips, axis labels, grid lines,
  custom HTML in the donut centre (`chartContent`), label click handler, colour palette, size,
  margins, opacity, and per-type style via `chartStyle` or `style_*` attributes.
- **Lifecycle hooks on every command.** `OnProcessing` (inspect or replace the source before
  rendering), `OnRendering` (cancel with `prevent`), `OnRendered` (receives the generated nodes),
  `OnProcessed`.
- **DOM and timer events.** `events="document.click window.scroll #id.keyup timer.5000"` re-runs
  a command on DOM events or on an interval, with optional `preventDefault` and
  `stopPropagation`.

### Loading data

- **`dbsource`.** Sends the command markup (tokens resolved) and `dmnid` to a named connection and
  publishes one source per `<member>`; results map to members by position.
- **Member post-processing.** `sort="col desc"` and `postsql="SELECT … FROM [name.member]"` run
  client-side SQL on the returned rows; a `rownumber` column is added to every row.
- **`api`.** Calls any HTTP endpoint (`url`, `method`, `body`, `Content-Type`, `noCache`);
  understands the BasisCore `sources` envelope or publishes raw JSON under `name` (default
  `cms.api`). `OnProcessing` can supply its own `Response`, `OnProcessed` can reshape results.
- **`inlinesource`.** `format="sql"` runs a SQL statement over any loaded sources (tables are
  referenced as `[name.member]` and detected automatically); `format="join"` joins two sources
  (`innerjoin`, `leftjoin`, `rightjoin`) on `lefttblcol`/`righttblcol` with prefixed output
  columns.
- **`call`.** Fetches an HTML fragment (`file`, optional `url`, `method`, `pagesize`), inserts it
  and processes it; with POST, all extra attributes are sent as parameters. Fragments can be nested
  and re-fetched on triggers.
- **`callback`.** Invokes a global function with the source whenever a trigger fires.
- **`cookie`.** Writes a cookie (`name`, `value`, `max-age`, `path`), with token-bound values.
- **Connection providers** (`connection.<provider>.<name>` settings):
  `web` (XHR/fetch, GET or POST, optional heartbeat URL), `websocket` (streams server pushes,
  resends the command on re-trigger, auto-reconnects up to 5 times, honours
  `setting.keepalive=false`), `chunkbased` (incremental JSON over a streaming HTTP response, GET or
  any method with a static `body` or a `bodyFactory`, `onClose` callback), `local` (a JavaScript
  function loaded from a URL that returns table data), `push` (sources delivered through Web Push
  via the service worker). A `rest` provider is declared but not implemented.
- **Streaming sources merge live.** WebSocket, chunked and push responses carry
  `options.mergeType`, so they can append or upsert into existing sources row by row.
- **Client-side SQL.** AlaSQL is loaded on demand from `dbLibPath` only when a page uses
  `filter`, `sort`, `postsql`, `inlinesource` or the `$bc.util.source` helpers; `LocalDataBase`
  wraps an AlaSQL database persisted in `localStorage`.

### Binding plain HTML elements

- **Any element publishes a source** with `bc-triggers="event event…"`: inputs, selects, forms,
  buttons, and arbitrary elements (`unknown-html`).
- **Input types.** Text, number, range, date, time, color, checkbox (its `value` when checked,
  `bc-off-value` when unchecked), file, select, and an arbitrary `bc-value`.
- **Forms.** `bc-triggers="submit"` publishes all fields as one object (submit is prevented);
  field names starting with `_` build nested objects and arrays (`_order.items__0.qty`).
- **Merge control per element.** `bc-merge`, `bc-keyField`, `bc-statusField`; `bc-name`
  overrides the source id; a missing name publishes to `cms.unknown`.
- **Hooks on elements.** `OnProcessing` can rewrite id and value before publishing;
  `OnRendering` can veto; `if` gates publishing.

### Schema-driven forms

- **`schema` command.** Builds a complete form from a JSON question schema fetched from
  `schemaUrl` or produced by a `schemaCallback`; modes `new`, `edit` and `view`
  (`displayMode`).
- **Sections and layout.** Questions grouped into sections; `cell` column layout in the default
  skin, CSS-grid layout with `gridColumns`/`colSpan` in the `template2` skin; `rtl`/`ltr`
  direction from the schema or the `direction` attribute; `cssClass` hooks on questions and parts;
  tooltips from `help`.
- **Multi-value questions.** Add/remove row buttons for `multi` questions; per-part captions for
  multi-part questions.
- **Field types.** `text`, `textarea`, `password` (show/hide), `time`, `color`, `select`,
  `checklist`, `radio` (default or segmented template2 style), `autocomplete` and `reference`
  (single, multi and simple inline variants with a search popup), `lookup` (inline suggestions),
  `html` (external editor page in an iframe modal, communicating via `postMessage`), `upload`
  (data-URL content) and `blob` (raw `File` with upload token), `component.*` (any user-defined
  component), and an `unknown` fallback.
- **Option sources.** Fixed values or values fetched from a `link`, with `qs_*` attributes added
  as query parameters; `dependency` passes other questions' values to the lookup URL.
- **Sub-schemas.** A fixed value can embed another schema that is rendered inline and validated
  with the parent.
- **Validation.** `required`, `dataType` (`int`, `float`), `regex`, `minLength`/`maxLength`,
  `min`/`max`, file `size` and `mimes` (per-MIME size limits), plus sub-schema errors; messages
  in 16 cultures by `lid` (built-in Persian and English, others fetched from a messages API
  configured through `options`).
- **Answers as a diff.** `getAnswersAsync()` returns `added`, `edited` and `deleted` values per
  property against the loaded answer, ready to post; results and validation failures can also be
  published to `resultSourceId` / `errorResultSourceId`.
- **`schemauploader` command.** Posts the answer JSON, then uploads each `blob` file as
  `FormData` to the blob endpoint with `uploadtoken`, `blobid`, `prpid`, `part`, `usedforid` and
  `lid`; publishes `<name>.uploading` and `<name>.uploaded` progress sources; integrates with an
  optional upload scheduler service.
- **`schemalist` command.** Resolves answer rows against their schemas and renders the question
  titles.
- **Read-only rendering.** View mode renders answers with read-only controls, including download
  links for files (`filesPath`) and formatted date/time for calendar components.

### User-defined components

- **`core="component.<key>"`** loads a JavaScript class and hands it the command: `local.X` from
  the page's global scope, `basiscore.X` for built-ins, otherwise from the `repositories` map
  (longest matching prefix wins), fetched on demand by script tag.
- **Component contract.** `constructor(owner)`, optional `initializeAsync()`, `runAsync(source)`
  and `disposeAsync()`.
- **Owner API.** Read attributes as tokens, set and read sources, add triggers, replace the
  command's content, process new nodes as nested commands, access host settings, parse HTML/XML,
  store objects as globals, load external libraries, and get a dependency-injection container.
- **Built-in `exposer` component.** Stores itself under a global name and calls a method on
  every trigger, a lightweight bridge between markup and page scripts.
- **Schema components.** The same mechanism plugs custom field types into `schema` through the
  `ISchemaBaseComponent` contract (set values, validate, report added/edited/deleted values).

### Service worker and push notifications

- **Service worker registration** from `host.serviceWorker` (`true` or a script URL).
- **Web Push subscription.** Requests notification permission through a configurable dialog,
  subscribes with `applicationServerKey`, and posts `endpoint`, `p256dh` and `auth` plus custom
  params to the server.
- **Push messages as sources.** Messages relayed by the service worker are routed by type to
  `connection.push.*` connections and published as ordinary sources.

### JavaScript API and utilities

- **`$bc`**: `run`, `addFragment`, `setOptions`, `setSource`, `new`, `global`, `all`,
  `GetCommandList`, `GetCommandListByCore`, `GetComponentList`.
- **`$bc.util`**: `getLibAsync` (load a script once and resolve a global), `toNode`,
  `toHTMLElement`, `toElement` (SVG-aware XML to DOM), `cloneDeep`, `defaultsDeep`, `format`,
  `getRandomName`, `storeAsGlobal`, `addMessageHandler`, `getComponentAsync`.
- **`$bc.util.source`**: `sortAsync`, `filterAsync`, `runSqlAsync`, `data`, `new`.
- **Exported classes** on `window.basiscore`: `BasisCore`, `HostOptions`, `MergeType`,
  `EventManager`, `LocalContext`, `LocalDataBase`, every command component and the schema
  type definitions.
- **TypeScript declarations** bundled as `dist/basiscore.d.ts`.

### Configuration

- **Global `host` object** before the script tag: `debug`, `autoRender`, `serviceWorker`,
  `dbLibPath`, `settings`, `sources`, `repositories`, `push`.
- **Settings keys** for connections, default HTTP verbs, `dmnid`, view grouping column and
  binding syntax; readable from components with `getSetting` / `getDefault`.
- **Per-group overrides** with `<basis core="group" options="…">`.

### Tooling in this repository

- **Development server** with mock back ends for API, schema, blob, assets, chunked streaming and
  validation messages, plus a WebSocket demo server.
- **Over a hundred runnable example pages** covering every command and connection type.
- **AI assistant packages** under `ai/`: a skill folder plus generated rule files for Cursor,
  GitHub Copilot, Windsurf and a generic single-file reference, built by `ai/build.py`.

---

## Contents

1. [Features](#features)
2. [Install](#install)
3. [Quick start](#quick-start)
4. [Core concepts](#core-concepts)
5. [Commands](#commands)
6. [Binding plain HTML elements](#binding-plain-html-elements)
7. [Host configuration](#host-configuration)
8. [Connections and the server contract](#connections-and-the-server-contract)
9. [JavaScript API](#javascript-api)
10. [Development](#development)
11. [Known issues in 2.39.6](#known-issues-in-2396)
12. [Related projects](#related-projects)

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
merge type (`bc-merge="append"` on elements, or `{ mergeType }` in source options) to add rows
instead; when both sides have a key field, a row with an existing key replaces the old row (and a status field can mark rows for removal).

---

## Commands

Use every command as `<basis core="…" run="atclient" …>`.

| Family | Command | Purpose |
|---|---|---|
| Render | `print` | Render rows through a layout and faces |
| | `list` | Render rows as a list |
| | `view` | Render grouped data (grouped by `default.viewcommand.groupcolumn`, `prpid` by default); level 2 output is missing in 2.39.6, see Known issues |
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

The runnable pages in [`example/`](example/) show each command in use.

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

Return one entry in `sources` per `<member>`; `tableName` is the source id (`name.member`) the
rows are published under.

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
| `.GetCommandList()` · `.GetCommandListByCore(core)` | Inspect the commands an instance built |

`$bc.setSource` also starts the default instance if it has not run yet, so call it from a script
placed after the markup it feeds (for example at the end of `<body>`).

`window.basiscore` exposes the classes (`BasisCore`, `HostOptions`, `MergeType`, the command
components, `LocalDataBase` and more) for advanced use and for writing components.

---

## Development

Requirements: Node.js and npm.

```bash
npm install
npm run dev        # webpack dev server on http://localhost:3000
```

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

Found while verifying this README against the source and the published bundle:

| Issue | Effect | Work-around |
|---|---|---|
| `cms.cms` date values use a zero-based month and the day of the week (`getMonth()`, `getDay()`) | `[##cms.cms.date##]` shows e.g. `2026/08/02` on 29 September 2026 | Format dates in JavaScript until fixed |
| The web connection compares the verb case-sensitively | `"default.source.verb": "get"` sends a GET with a body, which the browser rejects | Write verbs in upper case: `"GET"` |
| An unset `default.dmnid` is sent as the text `null` | The server receives `dmnid=null` | Set `default.dmnid`, or treat `null` as empty on the server |
| The console banner says `2.39.7` | Cosmetic; the package version is 2.39.6 | — |
| `view` never renders its level 2 faces (render-cache collision) | Group headers appear with empty `@child` slots | Group rows with `print` + `OnProcessing`, or nested `print` inside a `repeater` |
| A text token re-rendered to an empty value throws `TypeError` | `[##x.y.value##]` without a fallback breaks when the source is cleared | Always add a fallback: `[##x.y.value|( )##]` |

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
