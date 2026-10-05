# Troubleshooting

This page lists the symptoms you are most likely to meet while building a page with BasisCore Client, the exact console message when there is one, the cause in the library, and the fix. Messages are quoted as the 2.39.6 source emits them so you can search the console for them. Known defects of this version are listed at the end; they are facts about the shipped code, not configuration mistakes.

## Quick reference

| Symptom | Cause | Fix |
|---|---|---|
| A `<basis>` command does nothing, no log line | missing or misspelled `run="atclient"` | add `run="atclient"` (value is case-insensitive, attribute must be present) |
| Rows of a `<face>` inside a `<table>` vanish or render outside the table | the HTML parser moved `<tr>`/`<td>` out of the unknown `<basis>`/`<face>` elements | wrap the template in `<script type="text/template">` |
| Output contains a `parsererror` element | a template is not well-formed XML | close every tag (`<br />`, `<input ... />`), escape `&` as `&amp;` |
| `Error in load 'alasql'. 'DbLibPath' not configure properly in host object.` | `dbLibPath` set to an empty value | set `host.dbLibPath` to the AlaSQL script URL |
| A script error for `/alasql.min.js` and SQL members never publish | AlaSQL is not served at `dbLibPath` | serve `alasql.min.js` at that path or change `dbLibPath` |
| `Command 'x' has N member(s) but M result(s) returned from source!` | the server returned a different number of `sources` than `<member>` elements | one `sources` entry per member, in member order |
| `In 'host.settings' object, property 'x' not configured!` | `source="x"` (or `call` without `url`, which needs `callcommand`) names a connection that is not in `host.settings` | add `connection.<provider>.x` to `settings` |
| `Can't add fragment for already builded bc object.` | `addFragment` after `run()` | call `addFragment` before `run()` or use `$bc.new()` |
| `Can't set option for already builded bc object.` | `setOptions` after `run()` | same |
| `No element(s) selected for start rendering!` | every `addFragment` selector matched nothing | fix the selector or call `addFragment` after the elements exist |
| `Tree command has no root record in data member '...' with '0' value in 'parentid' column that set in NullValue attribute.` | no row has the root marker in the parent column | set `nullvalue`, `parentidcol`, `idcol` to match the data |
| `Source attribute can't change when socket is open . Valid connection is 'x'` | a `dbsource` on a stream connection re-ran with a different `source` | keep `source` constant while the stream is open |
| `Chart type X is not supported` | `chartType` is not one of the six implemented types | use `bar`, `stacked`, `line`, `funnel`, `donut` or `halfdonut` |
| `'x' related repository setting not found` | a `component.x` core has no matching `repositories` entry and is not `local.` or `basiscore.` | add `host.repositories["x"]` (or a prefix of it) |
| `@child place holder not found in layout template` (warning) | `<layout>` without `@child` | put `@child` where rows should go |
| `Invalid remain part of json <text>` | a chunked stream ended with unparsed bytes | end the stream with `null]` after a complete JSON object |
| `wait for x.y` with no later `x.y Added...` | nothing publishes that source id | check `name`/`member` spelling; ids are `name.member`, lower-cased |
| `HTTP 404: ...` or `Request timeout` from `call` | wrong `file`/`url`, or the server took longer than 15 s | fix the path; the timeout is fixed |
| A `GET` `dbsource` fails with a `TypeError` about a request body | `verb`/`default.source.verb` written in lower case | write `"GET"` in upper case |
| Server receives `dmnid=null` | `default.dmnid` not set | set `default.dmnid` in `settings` |
| A `view` shows group headers but no rows under them | render-cache collision in `view` (defect of this version) | see *Known defects*; group with `print` + `OnProcessing` or `repeater` instead |
| `TypeError: Cannot read properties of null (reading 'toString')` after a source update | a text token re-rendered to an empty value | add a fallback: `[##x.y.value|( )##]` |
| `TypeError: Cannot read properties of undefined (reading 'some')` | `level` attribute on a `print`/`list` face | remove `level`; it exists for `tree` and `view` only |

## Command does nothing

Only `<basis>` elements with a `run` attribute equal to `atclient` (compared case-insensitively) are processed; `Element.prototype.isBasisCore` checks `nodeName == "BASIS"` and `run` equals `atclient`. A `<basis core="print">` without `run`, or with `run="server"`, is left in the DOM untouched and nothing is logged. Likewise a `core` whose first segment is not one of the 21 registered tokens is not silently ignored: the container throws during extraction and the whole collection stops initializing, so a typo in `core` breaks every command in the same scope.

```html
<basis core="print" datamembername="db.list" run="atclient">
  <face><p>@title</p></face>
</basis>
```

## Table rows disappear

The browser parses the page before BasisCore runs. Inside `<table>`, elements it does not expect (`<basis>`, `<face>`) are moved out of the table (foster parenting) and `<tr>`/`<td>` left behind end up in the wrong place, so the template the library reads is not what you wrote. `Element.prototype.getXMLTemplate` treats a `<face>` (or `<layout>`, `<divider>`, `<incomplete>`, `<else-layout>`) whose only child is `<script type="text/template">` specially: the template is taken from the script, where the HTML parser never interprets it.

```html
<table>
  <basis core="print" datamembername="db.list" run="atclient">
    <layout>
      <script type="text/template">
        <thead><tr><th>Id</th><th>Name</th></tr></thead>
        <tbody>@child</tbody>
      </script>
    </layout>
    <face>
      <script type="text/template">
        <tr><td>@id</td><td>@name</td></tr>
      </script>
    </face>
  </basis>
</table>
```

Templates are parsed as XML by `$bc.util.toElement`, so they must be well-formed: `<br />` not `<br>`, closed `<input />`, `&amp;` for `&`. When parsing fails, `toElement` returns the browser's `parsererror` document and its content (the parser's error text) ends up in the output instead of the rendered rows.

## AlaSQL not found

SQL features (`inlinesource` with `format="sql"` or `format="join"`, `postsql`, `sort`, `filter` on faces, `$bc.util.source.*Async`) call `RootContext.getOrLoadDbLibAsync`. If a global `alasql` already exists it is used. Otherwise:

- if `dbLibPath` is empty, `ClientException`: `Error in load 'alasql'. 'DbLibPath' not configure properly in host object.`
- otherwise a `<script src="<dbLibPath>">` is appended to `<head>` and the promise rejects with the script's `error` event if it fails to load. The default path is `/alasql.min.js`; the development server serves it from `node_modules/alasql/dist`, a production site must host the file itself (or include AlaSQL before `basiscore.js`).

```html
<script src="/lib/alasql.min.js"></script>
<script src="/basiscore.js"></script>
<script>var host = { dbLibPath: "/lib/alasql.min.js" };</script>
```

## Member count mismatch

`MemberBaseSourceComponent.processLoadedDataSet` compares the number of `<member>` elements with the number of `sources` entries in the response and throws `Command '<name>' has <N> member(s) but <M> result(s) returned from source!`. Members are matched by position, not by `tableName`. The same check runs for every message of a `websocket`, `chunkbased` or `push` connection.

## Connection not configured

`ConnectionOptionsManager.getConnection(name)` throws `ConfigNotFoundException` with the bare connection name: `In 'host.settings' object, property 'bookapi' not configured!`. The key in `settings` must be `connection.<provider>.<name>` where `<provider>` is one of `web`, `chunkbased`, `websocket`, `local`, `rest`, `push` (case-insensitive) and `<name>` is exactly what the `source` attribute says (case-sensitive). A `call` command without a `url` attribute looks up the connection named `callcommand`.

```js
var host = {
  settings: {
    "connection.web.bookapi": "data/book.json",
    "connection.web.callcommand": "/pages/",
  },
};
```

`HostOptions.getSetting` throws the same exception type for other keys only when called without a default; the built-in `getDefault` calls always pass `null`, so missing `default.*` keys never throw.

## Wrapper errors

`BCWrapper` throws `ClientException` for calls in the wrong order:

- `Can't add fragment for already builded bc object.` and `Can't set option for already builded bc object.`: `run()` (or `setSource()`, which runs if needed) has already built the instance. Configure first, run second, or create a second runtime with `$bc.new()`.
- `No element(s) selected for start rendering!`: `addFragment` was called but matched nothing (each failed selector also logs `Selector '<sel>' don't refer to any element(s).`). With no `addFragment` at all the whole document is processed.
- `Invalid selector`: `addFragment` received something that is neither a string nor an `Element`.

## Tree has no root record

`TreeComponent` filters rows whose `parentidcol` (default `parentid`) equals `nullvalue` (default `"0"`) to find roots and throws `Tree command has no root record in data member '<id>' with '<nullvalue>' value in '<column>' column that set in NullValue attribute.` when none match. `DataUtil.ApplySimpleFilter` compares with `==`, so the default `"0"` matches both the number `0` and the string `"0"`; the literal `nullvalue="null"` is special-cased to match rows whose parent column is `null`.

## Source attribute changed while a stream is open

A `dbsource` on a `websocket` or `chunkbased` connection keeps a `StreamPromise`. When the command re-runs (a trigger fired) while the stream is open, it sends the new parameters on the existing stream instead of reconnecting, and throws `Source attribute can't change when socket is open . Valid connection is '<name>'` if the `source` attribute now resolves to a different connection. Do not bind `source` to a token that changes.

## Unsupported chart type

`ChartComponent.createChart` switches on `chartType`: `bar`, `stacked`, `line`, `funnel`, `donut`, `halfdonut`. Anything else throws `Chart type <type> is not supported`. There is no `pie` type: the pie and half-pie example pages use `chartType="donut"` and `chartType="halfdonut"` with an `innerRadiusDistance` style value.

## Repository setting not found

`$bc.util.getComponentAsync` resolves `core="component.<key>"`: `local.<expr>` evaluates `<expr>`, `basiscore.<name>` evaluates the exported class, otherwise `host.repositories[<key>]` is tried, then the key with its last `.` segment removed, and so on. If nothing matches: `'<key>' related repository setting not found`.

## Layout without `@child`

When a `<layout>` exists but contains no `@child`, `RenderableComponent` logs the warning `@child place holder not found in layout template` and renders the layout without any rows.

## Chunked stream ends with leftover data

`ChunkBasedConnectionOptions` parses the response as a JSON array streamed one object at a time (`[{...},{...},null]`). When the stream closes with unparsed text other than `,null]`, it logs `Invalid remain part of json <text>` and reports `withError: true` to the `onClose` callback. Make sure the server writes complete objects followed by `,` and terminates with `null]`.

## Known defects in 2.39.6

### `cms.cms` dates are wrong

`BasisCoreRootContext.addRequestRelatedSources` builds `cms.cms.date`, `date2`, `date3` from `d.getMonth()` (0-based, so January is `00`) and `d.getDay()` (day of week 0-6, not day of month). Only `time` and `time2` are correct. Compute dates in JavaScript and publish them with `$bc.setSource` if you need them.

### HTTP verb is compared case-sensitively for data loads

`WebConnectionOptions.fetchAjax` (used by `dbsource` over `web` connections) tests `method === "GET"`. A lower-case `"get"` in `verb` or `default.source.verb` therefore takes the POST branch, attaches a body and `Content-Type` to a `GET` request, and `fetch` rejects with a `TypeError`. `call` is not affected (`xmlAjax` upper-cases the method). The shipped `example/component/source/dbsource/simple/index.html` sets `'default.source.verb': 'get'` and fails for this reason. Write verbs in upper case.

### `dmnid` is sent as the string `null`

`default.dmnid` defaults to `""`; `HostOptions.getSetting` treats a falsy value as missing and returns the `null` default, and `dbsource` puts that into the request parameters. `URLSearchParams.append("dmnid", null)` serializes it as `dmnid=null`, and the stream providers serialize `"dmnid": null`. Set `default.dmnid` explicitly.

### Console banner says 2.39.7

`src/index.ts` prints `version:2.39.7` while `package.json` is `2.39.6`. There is no `$bc` property that exposes the version; rely on the package version.

### `rest` connection provider is not implemented

`RESTConnectionOptions.TestConnectionAsync` and `loadDataAsync` throw `Method not implemented.`; `loadPageAsync` throws `LoadPageAsync Method not Supported In REST API Provider.`. A `connection.rest.*` entry is parsed without error but any command using it fails. Use `web` for request/response data and `api` for arbitrary HTTP.

### `call` with `GET` sends no parameters

`WebConnectionOptions.xmlAjax` builds the query string for `GET` and then discards it (the code that would append it to the URL is commented out), so `file`, `pagesize` and the computed `fileNames`/`siteSize` never reach a `GET` endpoint except through the URL path (`<connection url><file>`). Use the default `POST`, or put parameters into the `url` attribute yourself.

### Chart SVG is appended to `document.body` first

`ChartComponent.createChart` appends the new `<svg>` to `document.body` while drawing and only then moves it into the command's range with `setContent`. Between those two steps the chart is briefly a direct child of `<body>`; CSS rules that match `body > svg` or `MutationObserver`s on `body` will see it there.

### `events` attribute writes to the console

`ElementBaseComponent.initializeAsync` runs `console.log(type.toLowerCase())` for each entry of an `events` attribute (and a second time for `timer.<ms>` entries). These lines are not controlled by any option.

### `bc-key` is not an attribute

Nothing in the library reads `bc-key`. The key field for `bc-triggers` elements is `bc-keyField` (with `bc-statusField` and `bc-merge`); for commands it is the `keyFieldName` option of the source.

### Streaming providers cannot be used by `call`

`WebSocketConnectionOptions.loadPageAsync` and `ChunkBasedConnectionOptions.loadPageAsync` both throw `WebSocket call not implemented.`; `PushConnectionOptions.loadPageAsync` throws `loadPage not support in PushConnectionOptions.`; `LocalStorageConnectionOptions.loadPageAsync` throws `LoadPageAsync Method not Supported In LocalStorage Provider.`. Only `web` connections (and the `url` attribute) work with `call`.

### Push flow needs the permission dialog selectors

With `host.push` set and notification permission still `"default"`, `BCWrapper.tryActiveNotification` evaluates `permissionDlg`; when it is undefined the call `dlg(true)` throws `TypeError` inside an async function and the subscription silently never happens. Always set `permissionDlg` and `permissionSubmit` (see [service-worker-and-push.md](service-worker-and-push.md)).

### `view` never renders its level 2 faces

`view` renders the level 1 face of every group but the `@child` slot stays empty: no level 2 row appears, and nothing is logged. The cause is a collision in the render cache. `FaceCollection.renderAsync` stores every rendered result in the default group of the `FaceRenderResultRepository` under the row's key, so the level 1 result of a group is cached under the group's **first row**. When the level 2 pass reaches that same row it finds the entry, takes the level 1 result as the row's own result and moves its nodes into the children fragment. The live range that marks the `@child` slot is dragged along into a detached wrapper, the fragment with all level 2 nodes is inserted there, and only the level 1 nodes make it back into the page. Observed with the shipped `view/simpe` and `view/dynamic` examples and with one- and multi-row groups, with and without `keyFieldName`. Until this is fixed, render grouped data with a `print` whose `OnProcessing` groups the rows, or with nested `print` commands inside a `repeater`.

### A text token whose value becomes empty throws

`TextComponent.renderAsync` writes the token value with `RangeObject.setContent(content)`, which calls `content.toString()`. When a bound source is re-published with an empty or `null` value (an `<input>` cleared by the user, `$bc.setSource("x.y", "")`), a token such as `[##x.y.value##]` without a fallback resolves to `null` and the render throws `TypeError: Cannot read properties of null (reading 'toString')`. The first render is safe because it writes `value ?? ""`. Attribute tokens do not throw but write the text `null`. Give every text token that can become empty a fallback: `[##x.y.value|( )##]`. The shipped `clientside-live-filter` and `serverside-live-filter` examples throw this error when their sources are seeded with `""`.

### `BCWrapper.setSource` on an instance that has not run drops the data

`wrapper.setSource(id, data)` on a wrapper returned by `$bc.new()` that has not been run only calls `run()`; the data is never published. The factory method `$bc.setSource` is not affected because it runs first and then publishes. Call `.run()` before `.setSource()` on your own wrappers.

### `level` on a `print` or `list` face throws

`FaceCollection.renderAsync` dereferences the current level set, which only `tree` and `view` provide. A `<face level="1">` under `print` or `list` fails with `TypeError: Cannot read properties of undefined (reading 'some')`.

### Chart rendering issues

All in `src/component/chart/`:

- Every render with `hover="true"` appends a new `div#tooltip` to `document.body`; old ones are never removed.
- `style_*` attribute names are lower-cased by the DOM, so only lower-case style keys (`width`, `height`, `opacity`, `thickness`) can be set this way; their values stay strings.
- `stacked`: the `thickness` style key is ignored (operator precedence in `settingThickness || horizontal ? ... : ...`); vertical bars get the title `NaN`; the horizontal axis labels contain a hard-coded Persian word; `grid` and `onLabelClick` are not implemented.
- `donut` and `halfdonut`: the slice stroke uses `color[d.index]` without wrapping, so the fifth slice onward has `stroke="undefined"`; `axisLabel="true"` appends text inside `<path>` elements, which browsers do not render; `chartContent` is mispositioned unless `innerRadiusDistance` is set explicitly.
- `line`: `onLabelClick` is bound whenever `axisLabel="true"`, so clicking a tick without that attribute throws; the y domain starts at the data minimum, not at zero.
- `funnel`: shapes and labels are offset by an extra `marginX`.

### Other defects found in the source

- `Source.addRows` (append without key fields) writes the new version entries past the end of the array, so appended rows have `undefined` versions; a later `replace` turns them into `NaN` and those rows re-render on every pass.
- Row versions are positional: after a `replace` of a keyed source, a key that moved to a position whose counter equals its cached version is reused with stale DOM.
- `append` with `keyFieldName` but no `statusFieldName` pushes duplicate rows into the source while the renderer hides them.
- `FaceRenderResultRepository` never evicts entries; rows removed from a source stay cached for the life of the component.
- `events` listeners and `timer.*` intervals are never removed on dispose, and event-driven renders bypass the busy and disposed checks.
- A one-segment token (`[##name##]`) throws while the token is built; `Context.checkSourceHeartbeatAsync` throws `Method not implemented.`.
- `cms.cookie` keeps the leading space of every cookie name after the first and cuts values at the first `=`.
- `HostOptions.getSetting` treats falsy values as missing, and two `settings` keys that differ only in case cancel each other out.
- A misspelled connection provider (`connection.websockets.x`) throws a `TypeError` inside `ConnectionOptionsManager` during start-up; connection names are cut at the third dot.
- `lodash.defaultsdeep` merges arrays index by index, so array-valued `host.sources` entries bleed into `setOptions` and `group` sources with the same id.
- Re-triggering a `dbsource` on an open `chunkbased` stream throws (`StreamPromise.send` calls `send()` on a stream reader); `chunkbased` has no reconnect and leaves its promise pending on a transport error.
- `call` and `group` do not dispose the component collection of a previous run until the command itself is disposed; `repeater` rows inside a `group` use the root options, not the group's.
- `ComponentContainer.format` forwards its parameters as one array, so `owner.format("{0}-{1}", a, b)` yields `"a,b-{1}"`.
- `LocalContext.getOrLoadObjectAsync` calls itself recursively (unused by the library).
- `serviceWorker: true` targets `basiscore-serviceWorker.js`, which the build never produces; `$bc.util.addMessageHandler` attaches its listener only on the window `load` event.
- `schemauploader` with `noCache="true"` throws before posting; the `sub-schema` validation type has no message text, so a failing nested form rejects the submission without marking the parent part; `select` lists need an item with `id: 0` to allow "no selection"; an unknown `viewType` makes a form impossible to submit.
- The shipped `example/component/source/dbsource/web-socket/demo` page puts `datamembername` on a `callback`, which ignores it.

### Repository and build scripts

- `prerel` and `prepub` are `if exist dist rd /s /q dist`, Windows `cmd` syntax. On Linux and macOS `npm run rel`/`pub` fail in the pre-script; run `webpack --mode=production` directly (webpack's `output.clean` already empties `dist`).
- `npm run cb` runs `node server/chunkBased.js`, which does not exist. The chunked mock routes live in `server/chunk-server.js` and are mounted under `/chunk` by `npm run dev`.
- `example/component/source/dbsource/chunkBased/simple/example.html` contains unresolved git conflict markers (`<<<<<<< Updated upstream`, `=======`, `>>>>>>> Stashed changes` around lines 285 to 541) and does not run as shipped.
- `src/tsyringe.config.ts` registers the `list` token twice; harmless.
- `host.debug` is accepted but never read.

## Examples

### A page that triggers and then fixes the three most common errors

```html
<!DOCTYPE html>
<html>
<head>
  <script src="/basiscore.js"></script>
</head>
<body>
  <!-- 1. without run="atclient" this element is ignored -->
  <basis core="dbsource" source="bookapi" name="book" run="atclient">
    <member name="list" />
  </basis>

  <!-- 2. text/template keeps the <tr> inside the table -->
  <table>
    <basis core="print" datamembername="book.list" run="atclient">
      <face>
        <script type="text/template">
          <tr><td>@id</td><td>@title</td></tr>
        </script>
      </face>
    </basis>
  </table>

  <script>
    var host = {
      dbLibPath: "/alasql.min.js",
      settings: {
        // 3. the connection name must match source="bookapi"
        "connection.web.bookapi": { url: "/api/books", verb: "POST" },
        "default.dmnid": 2668,
      },
    };
  </script>
</body>
</html>
```

The server must answer `POST /api/books` with one `sources` entry for the single `<member>`:

```json
{ "sources": [ { "options": { "tableName": "book.list" }, "data": [ { "id": 1, "title": "A" } ] } ] }
```

### Reading the console

Expected sequence for the page above: the banner, `cms.request Added... 1 Row(s)`, `cms.cms Added... 1 Row(s)`, `handler Added for book.list...`, `wait for book.list`, then `book.list Added... 1 Row(s)`. If the last line never appears, open the network tab: the request to `/api/books` either failed or returned a shape the member check rejected (look for `Command 'book' has 1 member(s) but ...`).

## Pitfalls

- Source ids are lower-cased everywhere (`Source` constructor, `Repository`), but connection names in `settings` are case-sensitive after the `connection.<provider>.` prefix.
- HTML attribute names are lower-cased by the DOM; the library reads them case-insensitively (`getAttribute("dataMemberName")` works), but attribute values such as `source="BookApi"` are not normalised.
- A `low` priority renderer that waits for a source that never arrives keeps a pending promise forever; the only trace is the `wait for <id>` line.
- Errors thrown inside source handlers (for example the member count mismatch during a push or socket message) are caught by `EventManager.Trigger` and written with `console.error`; the page keeps running with stale data.
- `alert()` is used for every service worker and push failure; in automated tests the dialog blocks the page.

## Related

- [getting-started.md](getting-started.md)
- [host-configuration.md](host-configuration.md)
- [connections.md](connections.md)
- [client-side-sql.md](client-side-sql.md)
- [command-attributes-and-lifecycle.md](command-attributes-and-lifecycle.md)
- [html-element-binding.md](html-element-binding.md)
- [service-worker-and-push.md](service-worker-and-push.md)
- [internals.md](internals.md)
- [commands/dbsource.md](commands/dbsource.md)
- [commands/call.md](commands/call.md)
- [commands/tree.md](commands/tree.md)
- [commands/chart.md](commands/chart.md)
- [commands/component.md](commands/component.md)

## Source files

- `src/extension/ElementExtensions.ts` (`isBasisCore`, `getTemplate`, `getXMLTemplate`)
- `src/wrapper/BCWrapper.ts`, `src/wrapper/UtilWrapper.ts`
- `src/context/RootContext.ts`, `src/context/BasisCoreRootContext.ts`
- `src/options/HostOptions.ts`, `src/options/connection-options/ConnectionOptionsManager.ts`, `src/options/connection-options/WebConnectionOptions.ts`, `src/options/connection-options/RESTConnectionOptions.ts`, `src/options/connection-options/ChunkBasedConnectionOptions.ts`, `src/options/connection-options/WebSocketConnectionOptions.ts`, `src/options/connection-options/PushConnectionOptions.ts`, `src/options/connection-options/LocalStorageConnectionOptions.ts`
- `src/component/ElementBaseComponent.ts`, `src/component/source/MemberBaseSourceComponent.ts`, `src/component/collection/CallComponent.ts`
- `src/component/renderable/TreeComponent.ts`, `src/component/renderable/ViewComponent.ts`, `src/component/renderable/base/RenderableComponent.ts`, `src/component/renderable/base/RenderParam.ts`
- `src/component/chart/ChartComponent.ts`
- `src/component/html-element/HTMLComponent.ts`
- `src/exception/*.ts`, `src/event/EventManager.ts`
- `src/index.ts`, `src/tsyringe.config.ts`, `package.json`
- `example/component/source/dbsource/simple/index.html`, `example/component/source/dbsource/chunkBased/simple/example.html`
