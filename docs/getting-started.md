# Getting Started

BasisCore Client (BasisCore.js, npm package `basiscore`) is the browser side of the BasisCore web programming language. You add one `<script>` tag, write declarative `<basis>` commands and `[##source.member.column##]` tokens in plain HTML, and the library loads data, binds it into the page and re-renders only what depends on data that changed. This page covers installation, the start-up sequence, how a page is scanned, the `$bc` entry point, AlaSQL loading, and the layout and build scripts of the repository. Use it before any other page in this reference.

## Install

### From a CDN

```html
<script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
```

### From npm

```bash
npm install basiscore
```

The package entry is `dist/basiscore.js` (`main` in `package.json`); `dist/basiscore.min.js` is the minified build and both ship with source maps. Type definitions are declared as `dist/basiscore.d.ts`; that file is produced by `npm run pub` (see [Build scripts](#build-scripts)). Serve one of the bundles from your site and reference it with a classic `<script>` tag. The bundle is a webpack `assign` library, so it is not an ES module and is not meant to be `import`ed.

### The two globals

Loading the bundle defines two globals:

| Global | What it is | Defined by |
|---|---|---|
| `$bc` | The runtime entry point: an instance of `BCWrapperFactory` with `run`, `addFragment`, `setOptions`, `setSource`, `new`, `global`, `all` and `util` | `src/index.ts` (`global.$bc = $bc`) |
| `basiscore` | The module exports: `$bc` again, plus the classes `BasisCore`, `BCWrapperFactory`, `HostOptions`, `MergeType`, `EventManager`, `LocalContext`, `LocalDataBase`, every command component class (`PrintComponent`, `DbSourceComponent`, ...) and `exposer` | `webpack.config.js` (`library: { name: "basiscore", type: "assign" }`) |

`basiscore.$bc === $bc`. Page scripts normally use `$bc`; `basiscore` is for enum values such as `basiscore.MergeType.append` and for writing user-defined components (`core="component.basiscore.<Name>"` resolves against this global).

On load the library prints a console banner. The banner says `version:2.39.7`; the package version is 2.39.6.

## Start-up sequence

### The `host` object

Configuration comes from a global variable named `host` (see [Host configuration](host-configuration.md)). It is read by `HostOptions.defaultSettings`, a lazily computed static value: the first time it is accessed, the library checks `typeof host != "undefined"`, deep-merges `host` over the built-in defaults with `lodash.defaultsdeep` and caches the result for the rest of the page's life.

The first access happens at one of two moments, whichever comes first:

- the `window` `load` event (the auto-render check reads `HostOptions.defaultSettings.autoRender`), or
- the first explicit `run()` (including the implicit run performed by `$bc.setSource`), which constructs a `HostOptions`.

So `host` must exist before `load` fires or before your first `$bc` call. Declaring it in a `<script>` placed before the library tag is the simplest way to guarantee that and is the recommended layout:

```html
<script>
  var host = {
    settings: {
      "connection.web.shop": "/data/products.json",
      "default.source.verb": "GET"
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
```

`var`, `let` and `const` all work because a top-level declaration in a classic script is visible to `typeof host` from other scripts. A declaration inside `<script type="module">` is not global and is not seen. Changing `host` after it has been read has no effect: the merged copy is cached and every option value is deep-cloned.

### `autoRender` and the load listener

`src/index.ts` registers one `load` listener:

```ts
const loadListener = (_) => {
  window.removeEventListener("load", loadListener);
  if ($bc.all.length == 0 && HostOptions.defaultSettings.autoRender) {
    $bc.run();
  }
};
window.addEventListener("load", loadListener);
```

Consequences:

- With no `host` or `autoRender: true` (the default), the whole document (`document.documentElement`) is processed once the page has loaded. This is the zero-configuration mode.
- `autoRender: false` means nothing runs until you call `$bc.run()` (or `$bc.setSource`, which runs the default instance first).
- Auto-render is also skipped when `$bc.all` is not empty at `load`. `$bc.all` receives an entry every time a wrapper is created, and `$bc.global`, `$bc.addFragment`, `$bc.setOptions`, `$bc.setSource` and `$bc.new()` all create one. So a page that calls `$bc.setOptions({...})` or `$bc.addFragment("#app")` before `load` and does not call `.run()` renders nothing.
- `$bc.setSource(...)` called from an inline script runs the default instance immediately, before `load`. Only the markup already parsed at that point is scanned, which is why the example pages put such scripts at the end of `<body>`.

### Only `run="atclient"` is processed

A `<basis>` element is a client-side command only when `Element.prototype.isBasisCore()` returns true, which requires the tag name `basis` and a `run` attribute equal to `atclient`. The comparison uses `String.prototype.isEqual` (`localeCompare` with accent sensitivity), so `run="AtClient"` and `<Basis ... run="ATCLIENT">` are accepted. A `<basis>` element without `run="atclient"` is left untouched: no error, no output, and its content is still scanned for tokens like any other element. The value of `core` is lowercased and cut at the first dot before it is looked up, so `core="Print"` and `core="component.local.Foo"` resolve to the `print` and `component` command types.

The registered `core` values are: `print`, `tree`, `view`, `list`, `chart`, `schema`, `schemalist`, `schemauploader`, `cookie`, `call`, `group`, `repeater`, `callback`, `dbsource`, `inlinesource`, `input`, `select`, `form`, `unknown-html`, `api` and `component` (`src/tsyringe.config.ts`). The last five are created from plain HTML elements rather than written as `<basis>` tags (see below). A `core` value that is not registered fails when the command is created.

## How a page is scanned

`BasisCore` hands the root nodes (the fragments you added, or `document.documentElement`) to `ComponentCollection.processNodesAsync`, which performs two walks over every root and then runs the commands in priority order.

### Walk 1: text and attribute tokens

`extractTextBaseComponents` visits every node:

- A text node whose content matches `default.binding.regex` (`[##...##]`) or `default.binding.codeblock-regex` (`{{...}}`) produces one `TextComponent` per match. Each token is wrapped in its own DOM `Range`, so several tokens in one text node update independently.
- For an element that is not a client command, every attribute whose value matches one of the two expressions produces an `AttributeComponent`. The whole attribute value is treated as one token string (text parts, tokens and code blocks mixed).
- Elements with `bc-ignore` are skipped together with their whole subtree. Comment nodes are skipped.
- The inside of a `<basis run="atclient">` element is not visited: the command owns its content and renders it itself. Tokens in a command's own attributes are still resolved, by the command, when it reads them.

### Walk 2: commands and `bc-triggers` elements

`findRootLevelComponentNode` visits every element:

- A `<basis run="atclient">` element goes to the command list and its children are not searched. Nested commands inside a `group`, `repeater`, `print` face and so on are created by the parent command when it renders its content.
- Any other element that has a `bc-triggers` attribute (`isBasisTag()`) goes to the tag list, and the search continues into its children. A `form`, `input` or `select` element becomes the command type of the same name; any other element becomes `unknown-html`. These elements need no `run` attribute. See [HTML element binding](html-element-binding.md).
- `bc-ignore` stops the search for that subtree.

For every element found, a child dependency container is created with the element registered as `element` and the component is resolved by its `core` name.

### Initialization, priorities and triggers

All components are initialized concurrently (`initializeAsync`: attribute tokens are parsed, `triggers`, `events`, `if` and the `On*` hooks are read, tokens render their first value). Then the collection runs the commands in three waves, each wave awaiting the previous one:

| Priority | Components | Why |
|---|---|---|
| `high` | `call` | Fragments are fetched first so that the commands they contain can be created |
| `normal` | `dbsource`, `inlinesource`, `api` (everything extending `SourceComponent`) | Data loaders start before renderers |
| `low` | Every other command (`print`, `list`, `view`, `tree`, `chart`, `schema`, `schemalist`, `schemauploader`, `group`, `repeater`, `cookie`, `component`) | Renderers wait for their sources |
| `none` | Text and attribute tokens, `bc-triggers` elements, `callback` | Not run by the collection; they act on initialization and whenever one of their sources is set |

A renderer that needs a source that does not exist yet waits for it (`waitToGetSourceAsync`) instead of failing. After the first run, everything is driven by sources: when a source is set, every component registered for its id re-runs. See [Sources and reactivity](sources-and-reactivity.md) and [Command attributes and lifecycle](command-attributes-and-lifecycle.md).

### Sources and tokens in one minute

- A source is `name.member` plus rows. Ids are lowercased on creation and on lookup, so `Shop.Products` and `shop.products` are the same source.
- `$bc.setSource(id, data)` turns an array into rows, an object into a single row and a scalar into one row `{ value }`.
- `[##shop.products.name##]` reads column `name`; one row gives a value, several rows give an array. `[##user.name.value|(guest)##]` falls back to `guest` when the value is empty.
- `<basis core="print" datamembername="shop.products">` renders rows through `<layout>` (with `@child`) and `<face>` templates (with `@column@`).
- Four sources exist from the start: `cms.query` (query string, only when there is one), `cms.cookie` (only when `document.cookie` is non-empty), `cms.request` (`requestId: -1`, `hostip`, `hostport`) and `cms.cms` (`date`, `time`, `date2`, `time2`, `date3` at start-up).

Details: [Binding and tokens](binding-and-tokens.md).

## The `$bc` entry point

`$bc` is a `BCWrapperFactory`. It owns a lazily created default wrapper (`$bc.global`) and forwards `addFragment`, `setOptions`, `run` and `setSource` to it. `$bc.new()` creates an additional, independent `BCWrapper`; every wrapper ever created is listed in `$bc.all`.

| Member | Returns | Behaviour |
|---|---|---|
| `$bc.run()` | wrapper | Builds the default instance over the added fragments, or over `document.documentElement` when none were added. A second call does nothing. Throws `No element(s) selected for start rendering!` when `addFragment` was called but matched nothing |
| `$bc.addFragment(selector)` / `$bc.addFragment(element)` | wrapper | Adds the elements matched by `document.querySelectorAll(selector)` (all of them), or the given `Element`, as processing roots. Logs a warning when the selector matches nothing. Throws `Can't add fragment for already builded bc object.` after `run()` |
| `$bc.setOptions(options)` | wrapper | Stores a partial `IHostOptions` for the next `run()`; the stored object is merged over the global `host` and the defaults. Throws after `run()` |
| `$bc.setSource(id, data, options?)` | wrapper | Runs the default instance if needed, then creates or updates a source. Dependent commands re-run |
| `$bc.new()` | new wrapper | A separate runtime with its own sources, options and fragments |
| `$bc.global` | wrapper | The default wrapper, created on first access |
| `$bc.all` | `IBCWrapper[]` | Every wrapper created on this page |
| `$bc.util` | `UtilWrapper` | Helpers: `getLibAsync`, `toNode`, `toHTMLElement`, `toElement`, `cloneDeep`, `defaultsDeep`, `format`, `getRandomName`, `storeAsGlobal`, `addMessageHandler`, `getComponentAsync`, and `util.source` (`sortAsync`, `filterAsync`, `runSqlAsync`, `data`, `new`) |

Members available on a wrapper (`$bc.global`, or the object returned by `$bc.new()`), not on `$bc` itself:

| Member | Behaviour |
|---|---|
| `.run()`, `.addFragment()`, `.setOptions()`, `.setSource()` | As above, for this wrapper. `.setSource` on a wrapper that has not run yet only runs it; the data passed in that first call is not published |
| `.basiscore` | The `BasisCore` instance after `run()` (`null` before); exposes `.context` |
| `.manager` | An `EventManager`; handlers added with `.manager.Add(fn)` are called with the `BasisCore` instance when `run()` builds it |
| `.GetCommandList()` | Every command component the instance created |
| `.GetCommandListByCore(core)` | The commands with that `core` attribute value (exact match on the attribute as written) |
| `.GetComponentList()` | Every component, including text and attribute tokens |
| `.elementList` | The fragments added (`null` until the first `addFragment`) |

The three `Get*` methods fail with a `TypeError` when called before `run()`.

The full API is in [JavaScript API](javascript-api.md).

## AlaSQL on demand

Client-side SQL (face `filter`, member `sort` and `postsql`, `inlinesource` SQL and joins, `$bc.util.source.*`) is executed by AlaSQL, which is not part of the bundle. `RootContext.getOrLoadDbLibAsync()` returns the global `alasql` when it already exists; otherwise it calls `$bc.util.getLibAsync("alasql", options.dbLibPath)`, which appends `<script src="<dbLibPath>">` to `<head>` (or reuses an existing script tag with that exact `src`) and resolves when it has loaded. If `dbLibPath` is empty the call throws `Error in load 'alasql'. 'DbLibPath' not configure properly in host object.`

The default is `host.dbLibPath = "/alasql.min.js"`. Host the file at that path, point `dbLibPath` elsewhere, or include AlaSQL yourself with a script tag before any SQL feature runs. Pages that use no SQL feature never load it. The development server serves `node_modules/alasql/dist` at the site root, so the default path works there. See [Client-side SQL](client-side-sql.md).

## Project layout

| Path | Contents |
|---|---|
| `src/index.ts` | Entry point: console banner, `$bc` global, `load` listener, module exports |
| `src/tsyringe.config.ts` | Dependency-injection registrations; maps every `core` name to its class |
| `src/BasisCore.ts`, `src/ComponentCollection.ts` | One runtime instance; scanning, creation and priority execution of components |
| `src/wrapper/` | The public API: `BCWrapperFactory` (`$bc`), `BCWrapper`, `UtilWrapper`, `SourceWrapper` |
| `src/options/` | `HostOptions`, `IHostOptions`, `IPushOptions` and `connection-options/` (one class per connection provider) |
| `src/context/` | Contexts: `BasisCoreRootContext` (page root, built-in `cms.*` sources), `LocalRootContext` (a `group` with options), `LocalContext` (child scopes) |
| `src/repository/` | Source storage, merge logic, handler registration, `LocalDataBase` |
| `src/data/` | `Source`, `Data`, row versioning |
| `src/token/` | Token parsing: value, object, array and code-block tokens for string, integer, boolean and object types |
| `src/component/` | Commands: `renderable/` (print, list, view, tree, schema), `source/` (dbsource, inlinesource, api, callback), `collection/` (call, group, repeater), `html-element/` (form, input, select, unknown-html), `management/` (cookie), `chart/`, `user-define-component/`, `text-base/` (tokens) |
| `src/extension/` | `Element.prototype` and `String.prototype` helpers (`isBasisCore`, `isBasisTag`, `isIgnoreTag`, `ToStringToken`, ...) |
| `src/event/`, `src/exception/`, `src/logger/`, `src/RangeObject/`, `src/Util.ts`, `src/enum.ts`, `src/type-alias.ts` | Event manager, exceptions, console logger, DOM range wrapper, utilities, enums and shared types |
| `src/ServiceWorker/ServiceWorker.ts` | A sample push service worker (not part of the webpack build) |
| `src/types/` | Generated declaration files |
| `example/` | Runnable demo pages, one folder per feature; `example/index.html` lists them |
| `server/` | Mock back ends used by the development server |

## Build scripts

From `package.json`:

| Script | Command | Does |
|---|---|---|
| `npm run dev` | `webpack serve --mode=development` | Development build and dev server on `http://localhost:3000`, opens the browser |
| `npm run dev:no-serve` | `webpack --mode=development` | Development build only |
| `npm run rel` | `webpack --mode=production` | Production build to `dist/` (`prerel` first removes `dist`) |
| `npm run pub` | `webpack --mode=production` then `dts-bundle-generator -o dist/basiscore.d.ts src/index.ts` | Production build plus bundled type definitions (`prepub` removes `dist`) |
| `npm run ws` | `node server/websocket.js` | WebSocket demo server |
| `npm run cb` | `node server/chunkBased.js` | Chunked-stream demo server |

The webpack configuration builds two entries from `src/index.ts`: `basiscore.js` and `basiscore.min.js` (UglifyJS is applied to `.min.js` files in production mode only), both with source maps, and fails the build on circular imports outside D3. The dev server serves `example/` and `node_modules/alasql/dist` as static roots and mounts the mock routes `/api`, `/schema`, `/blob`, `/assets`, `/chunk` and `/validation` from `server/`. The `prerel` and `prepub` hooks use the Windows command `if exist dist rd /s /q dist`; on Linux or macOS delete `dist` yourself.

## Examples

### Zero configuration

No `host`, no script: the whole document is processed on `load` and the token is resolved from the built-in `cms.cms` source (adapted from `example/bc/zero-config`).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
  <title>Zero Config</title>
</head>
<body>
  Time is [##cms.cms.time2##]
</body>
</html>
```

### A first page: token, input, print and dbsource

Save this file and put `data/products.json` next to it; open it through a static web server. Typing in the input updates the greeting, the team list renders from JavaScript data, and the product table renders from the server response.

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
  <!-- 1. A plain input publishes a source; a token reads it. -->
  <label>Your name: <input name="user.name" bc-triggers="keyup" /></label>
  <p>Hello, [##user.name.value|(guest)##]!</p>

  <!-- 2. A source set from JavaScript, rendered by print. -->
  <basis core="print" run="atclient" datamembername="team.members">
    <layout><ul>@child</ul></layout>
    <face><li>@name@ - @role@</li></face>
  </basis>

  <!-- 3. Data loaded from a connection, rendered as a table. -->
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

What happens: the `dbsource` named `shop` sends `command` and `dmnid` to the `shop` connection and publishes one source per `<member>` under `shop.products`; the second `print` waits for that source and renders it. `<script type="text/template">` protects `<table>` and `<tr>` from the HTML parser. The `$bc.setSource` call at the end of `<body>` runs the default instance right away, so the `load` listener does nothing afterwards.

### Fragments and several instances

Two independent runtimes on one page, each with its own fragment, options and source values (from `example/bc/fragment/multi`). Because wrappers exist before `load`, auto-render is skipped and the rest of the document is not processed.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
  <title>Multi Section</title>
</head>
<body>
  <div id="section-1">
    Time is (local) : [##data.time.hh|(00)##]:[##data.time.mm|(00)##]:[##data.time.ss|(00)##]
  </div>
  <div class="section-2">
    Time is (UTC) : {data.time.hh|(00)}:{data.time.mm|(00)}:{data.time.ss|(00)}
  </div>

  <script>
    const bc = $bc.new().addFragment("#section-1").run();
    setInterval(() => {
      const d = new Date();
      bc.setSource("data.time", { hh: d.getHours(), mm: d.getMinutes(), ss: d.getSeconds() });
    }, 1000);

    const bc2 = $bc
      .new()
      .addFragment(".section-2")
      .setOptions({ settings: { "default.binding.regex": /\{([^\}]*)\}/ } })
      .run();
    setInterval(() => {
      const d = new Date();
      bc2.setSource("data.time", { hh: d.getUTCHours(), mm: d.getUTCMinutes(), ss: d.getUTCSeconds() });
    }, 2000);
  </script>
</body>
</html>
```

### Manual start with `autoRender: false`

```html
<script>
  var host = { autoRender: false };
</script>
<script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>

<div id="app">
  <basis core="print" run="atclient" datamembername="app.items">
    <face><div>@title@</div></face>
  </basis>
</div>

<script>
  $bc.addFragment("#app").run();
  $bc.setSource("app.items", [{ title: "First" }, { title: "Second" }]);
</script>
```

## Pitfalls

- A `<basis>` element without `run="atclient"` is silently ignored by the browser. This is the most common reason a command "does nothing".
- `$bc.setOptions(...)`, `$bc.addFragment(...)`, `$bc.global` and `$bc.new()` all create a wrapper before `load`, which disables auto-render (`$bc.all.length == 0` is then false). Always finish such chains with `.run()`.
- `$bc.setSource` runs the default instance at once. Called from a script in `<head>` it scans an incomplete document; put it at the end of `<body>` or after `run()`.
- `wrapper.setSource(...)` on a wrapper returned by `$bc.new()` that has not run yet only calls `run()` and drops the data. Call `.run()` first, or use `$bc.setSource`, which publishes the data after running.
- `host` is read once, at the first `defaultSettings` access, and cached. Changes to the object afterwards, or a `host` declared after the `load` event, have no effect.
- `addFragment` with a selector that matches nothing logs a warning and leaves an empty fragment list; the following `run()` throws `No element(s) selected for start rendering!`.
- `addFragment` and `setOptions` throw after `run()`; create a new wrapper with `$bc.new()` for another region.
- `GetCommandList`, `GetCommandListByCore` and `GetComponentList` exist on wrappers (`$bc.global.GetCommandList()`), not on `$bc`.
- Table and `<select>` markup inside `<layout>` or `<face>` must be wrapped in `<script type="text/template">`, otherwise the HTML parser moves `<tr>`, `<td>` and `<option>` elements out of the template before the library sees them.
- `cms.cms` date values are built with `getMonth()` (zero-based) and `getDay()` (day of week), so `date`, `date2` and `date3` are wrong; `time` and `time2` are correct.
- HTTP verbs in settings must be upper case (`"GET"`, `"POST"`): the web connection compares them case-sensitively and sends a body with a lower-case `"get"`, which the browser rejects.
- The console banner reports `2.39.7` for the 2.39.6 package.

## Related

- [Host configuration](host-configuration.md)
- [Binding and tokens](binding-and-tokens.md)
- [Command attributes and lifecycle](command-attributes-and-lifecycle.md)
- [Sources and reactivity](sources-and-reactivity.md)
- [Connections](connections.md)
- [Client-side SQL](client-side-sql.md)
- [JavaScript API](javascript-api.md)
- [HTML element binding](html-element-binding.md)
- [print](commands/print.md), [dbsource](commands/dbsource.md), [group](commands/group.md)
- [Internals](internals.md)
- [Troubleshooting](troubleshooting.md)

## Source files

- `src/index.ts`
- `src/BasisCore.ts`
- `src/ComponentCollection.ts`
- `src/tsyringe.config.ts`
- `src/wrapper/BCWrapperFactory.ts`
- `src/wrapper/BCWrapper.ts`
- `src/wrapper/UtilWrapper.ts`
- `src/options/HostOptions.ts`
- `src/context/RootContext.ts`
- `src/context/BasisCoreRootContext.ts`
- `src/extension/ElementExtensions.ts`
- `src/component/Component.ts`
- `src/component/text-base/TextComponent.ts`
- `src/component/text-base/AttributeComponent.ts`
- `src/enum.ts`
- `package.json`
- `webpack.config.js`
