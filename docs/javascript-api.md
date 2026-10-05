# JavaScript API

BasisCore Client is driven from markup, but every page also gets a small JavaScript surface: the `$bc` global for starting the engine and publishing sources, `$bc.util` for DOM, library-loading and source helpers, the `basiscore` global that exposes the library's classes and enums, and the `IContext` object handed to callbacks, hooks, code blocks and user-defined components. This page documents each of them as implemented in `src/wrapper/`, `src/index.ts`, `src/context/` and `src/event/`. Use it when you publish data from scripts, wire callbacks, lazy-load libraries, write user-defined components, or need the TypeScript typings.

## `$bc` - the wrapper factory

`src/index.ts` creates one `BCWrapperFactory` and assigns it to `window.$bc`. The factory manages *wrappers* (`BCWrapper`), each of which owns one independent BasisCore engine with its own root context, repository and host options.

| Member | Type | Description |
|---|---|---|
| `global` | `IBCWrapper` | The default wrapper, created lazily by `new()` on first access. |
| `all` | `IBCWrapper[]` | Every wrapper created through `new()` (including `global`). |
| `new()` | `() => IBCWrapper` | Creates a wrapper, appends it to `all`, returns it. |
| `addFragment(selector \| element)` | `=> IBCWrapper` | `global.addFragment(...)`. |
| `setOptions(options)` | `=> IBCWrapper` | `global.setOptions(...)`. |
| `run()` | `=> IBCWrapper` | `global.run()`. |
| `setSource(id, data, options?)` | `=> IBCWrapper` | `this.run().setSource(id, data, options)`: runs the global wrapper if it has not run yet, then publishes. |
| `util` | `IUtilWrapper` | The helper namespace, see below. |

### Auto-run

On the window `load` event the library runs `$bc.run()` when **both** `$bc.all.length == 0` and `host.autoRender` (default `true`) hold. Any wrapper created before `load` (through `$bc.new()`, `$bc.global`, `$bc.addFragment`, `$bc.setOptions` or `$bc.setSource`) disables the automatic run. `$bc.setSource` and `$bc.run` run the engine themselves, but a lone `$bc.global` or `$bc.setOptions(...)` call does not: you must call `run()` afterwards.

## `BCWrapper` instances

```js
const bc = $bc.new().addFragment("#section-1").setOptions({ settings: {...} }).run();
bc.setSource("data.time", { hh: 10, mm: 5, ss: 0 });
```

| Member | Description |
|---|---|
| `addFragment(selector: string)` / `addFragment(element: Element)` | Adds root node(s) to process. A selector that matches nothing logs `console.warn("Selector '...' don't refer to any element(s).")` and is otherwise ignored. Anything that is neither a string nor an `Element` throws `ClientException("Invalid selector")`. Throws `ClientException("Can't add fragment for already builded bc object.")` after `run()`. Returns the wrapper. |
| `setOptions(options: Partial<IHostOptions>)` | Stores the options object (a second call replaces, does not merge). Throws `ClientException("Can't set option for already builded bc object.")` after `run()`. Returns the wrapper. Defaults and the global `host` object are merged in by `HostOptions` at run time, see [host-configuration](host-configuration.md). |
| `run()` | Builds the engine once. If `addFragment` was called but matched nothing, throws `ClientException("No element(s) selected for start rendering!")`. If `addFragment` was never called, `document.documentElement` is used. Creates a child dependency container, registers `IHostOptions`, `root.nodes` and `dc`, resolves `BasisCore` (which creates the `BasisCoreRootContext` and starts processing the nodes), registers the service worker when `options.serviceWorker` is set (only the first wrapper on the page does this; later ones log a warning), and fires `manager.Trigger(basiscore)`. A second `run()` is a no-op. Returns the wrapper. |
| `setSource(id, data, options?)` | **If the wrapper has not run yet, this only calls `run()`; the data is discarded.** Otherwise it calls `basiscore.setSource(...)`, which waits for the component extraction (`content.initializeTask`) to finish and then calls `context.setAsSource(id, data, options)`. Publication is therefore asynchronous with respect to the caller. Returns the wrapper. The factory-level `$bc.setSource` avoids the data loss because it runs first and then calls this method on the already running wrapper. |
| `basiscore` | The `IBasisCore` instance (`null` before `run()`), with `context` (the `BasisCoreRootContext`), `setSource`, `GetCommandList`, `GetCommandListByCore`, `GetComponentList`. |
| `manager` | `EventManager<IBasisCore>`. Handlers added before `run()` are called once with the built engine. Handlers added after `run()` never fire. |
| `elementList` | The root elements collected by `addFragment` (`null` until the first call). |
| `GetCommandList()` | All root-level `CommandComponent` instances, that is the `<basis>` commands. HTML elements with `bc-triggers` are `HTMLComponent`s (not `CommandComponent`s) and are only returned by `GetComponentList()`. Only components of the root collection are listed; components created inside `group`, `repeater`, `call` or rendered content are not. |
| `GetCommandListByCore(core)` | `GetCommandList()` filtered by the raw `core` attribute value with `==` (case-sensitive, full value such as `"component.bc.watermark"`). |
| `GetComponentList()` | All root-level components, including the `bc-triggers` HTML components and the `[##...##]` text and attribute components. |

The three `Get*` methods dereference `basiscore` and throw if the wrapper has not run.

### Several engines on one page

```html
<div id="section-1">Local: [##data.time.hh|(00)##]:[##data.time.mm|(00)##]</div>
<div class="section-2">UTC: {data.time.hh|(00)}:{data.time.mm|(00)}</div>

<script>
  const bc = $bc.new().addFragment("#section-1").run();
  setInterval(() => {
    const d = new Date();
    bc.setSource("data.time", { hh: d.getHours(), mm: d.getMinutes() });
  }, 1000);

  const bc2 = $bc.new()
    .addFragment(".section-2")
    .setOptions({ settings: { "default.binding.regex": /\{([^\}]*)\}/ } })
    .run();
  setInterval(() => {
    const d = new Date();
    bc2.setSource("data.time", { hh: d.getUTCHours(), mm: d.getUTCMinutes() });
  }, 2000);
</script>
```

Each wrapper has its own repository, so the two `data.time` sources never meet.

## `$bc.util`

`UtilWrapper` (`src/wrapper/UtilWrapper.ts`). All methods are synchronous unless named `...Async`.

### `getLibAsync(objectName, url): Promise<any>`

Loads a script once and resolves with the global it defines.

1. Evaluates `typeof(objectName)` (inside `try`, so a dotted name whose root is undefined counts as `"undefined"`). If the type is anything but `"undefined"`, resolves immediately with `eval(objectName)`; no script is added.
2. Otherwise looks for an existing `<script src="url">`. If none exists, creates one (`type="text/javascript"`) and appends it to `<head>`. Concurrent callers with the same `url` therefore share one script element.
3. Attaches `load` and `error` listeners to that element. On `load`, logs `"<objectName> loaded from <url>"` and resolves with `eval(objectName)`; on `error`, rejects with the error event.

If a matching script element already exists and has already finished loading while the global is still undefined (for example the file defines a different name), the promise never settles.

```js
const alasql = await $bc.util.getLibAsync("alasql", "/alasql.min.js");
```

### `toNode(rawHtml): DocumentFragment`

`document.createRange().createContextualFragment(rawHtml)`: HTML parsing rules, forgiving, any number of root nodes, text preserved. Used by `call` to insert returned pages and by `tree` for child containers.

### `toHTMLElement(rawXml): HTMLElement`

Parses the string with `DOMParser` as `application/xml` and rebuilds it with `document.createElement(tagName)` (HTML namespace), copying attributes. Text nodes are trimmed and dropped when empty; a `<textarea>` gets its `innerHTML` copied verbatim. Requires well-formed XML with a single root. On a parse error nothing is thrown: the result contains the parser's `<parsererror>` element. Some browsers return it as the root (`result.tagName === "parsererror"`); Chromium-based browsers keep the partially parsed root (or `<html>` when no root could be read) and insert `<parsererror>` into it, so check `result.tagName === "parsererror" || result.querySelector("parsererror")`.

### `toElement(rawXml): Element`

Same parsing as `toHTMLElement`, but elements are created with `document.createElementNS`: the SVG namespace inside an `<svg>` subtree, the XHTML namespace elsewhere. This is the converter the renderers use for `<face>` and `<layout>` templates, which is why templates must be well-formed XML (`<br />`, quoted attributes, `&amp;`) and why whitespace-only text between tags disappears.

| Helper | Parser | Root nodes | Namespaces | Whitespace text |
|---|---|---|---|---|
| `toNode` | HTML | many (fragment) | HTML | kept |
| `toHTMLElement` | XML | one | always HTML | trimmed, empty dropped |
| `toElement` | XML | one | SVG under `<svg>`, XHTML otherwise | trimmed, empty dropped |

### `getComponentAsync(context, key): Promise<any>`

Resolves the constructor of a user-defined component (used by `<basis core="component.<key>">`):

| `key` | Resolution |
|---|---|
| `local.<expr>` | `eval("<expr>")` (the part after the first dot); logs `"<expr> loaded from local"`. |
| `basiscore.<name>` | `eval("basiscore.<name>")`, i.e. an export of the `basiscore` global such as `basiscore.exposer`. |
| anything else | Walks `context.options.repositories` starting with the full key and stripping the last dot segment on every miss (`a.b.c`, then `a.b`, then `a`). The first hit's URL is passed to `getLibAsync(key, url)` with the **full** key as `objectName`, so the script must define the global path `a.b.c`. |

A falsy result or no repository hit throws `ClientException("'<key>' related repository setting not found")`.

### `storeAsGlobal(data, name?, prefix?, postfix?): string`

`Reflect.set(window, name ?? getRandomName(prefix, postfix), data)` and returns the name used. The `exposer` component uses it to publish itself under the `Component` attribute's name.

### `getRandomName(prefix?, postfix?): string`

Returns `` `${prefix ?? ""}_${Date.now()}_${Math.random().toString(36).substring(2)}_${postfix ?? ""}` ``, for example `_1700000000000_k3j9x1_`.

### `format(pattern, ...params): string`

Replaces every `{n}` with `params[n]` when that parameter is not `undefined`; placeholders without a parameter are left as is.

```js
$bc.util.format("{0} of {1} ({2})", 3, 10); // "3 of 10 ({2})"
```

### `cloneDeep(obj)` and `defaultsDeep(data, defaults)`

Thin wrappers over `lodash.clonedeep` and `lodash.defaultsdeep`. `defaultsDeep` clones `data` first, then fills missing (undefined) properties recursively from `defaults`; neither argument is mutated. User-defined components use it to merge user settings over their defaults.

### `addMessageHandler(messageType, handler): boolean`

Registers a handler for messages posted by the service worker. The `UtilWrapper` constructor creates the handler map only when `"serviceWorker" in navigator`; after the window `load` event it listens to `navigator.serviceWorker` `message` events and dispatches `event.data.message` to the handlers registered for `event.data.type`. Returns `false` (and registers nothing) when service workers are not supported, `true` otherwise, including when the same function was already registered. See [service-worker-and-push](service-worker-and-push.md).

### `$bc.util.source`

`SourceWrapper` (`src/wrapper/SourceWrapper.ts`). The `...Async` methods load AlaSQL through `context.getOrLoadDbLibAsync()` (`host.dbLibPath`, default `/alasql.min.js`) and run a query against `source.rows`; see [client-side-sql](client-side-sql.md).

| Method | Returns | SQL executed |
|---|---|---|
| `new(id, data, options?)` | `ISource` (`new Source(...)`) | - |
| `data(id, data, options?)` | `Data` | - |
| `sortAsync(source, sort, context)` | new `Source` with the same id and `cloneOptions()` | `SELECT * FROM ? order by ${sort}` |
| `filterAsync(source, filter, context)` | `any[]` (rows, not a source); returns `source.rows` unchanged when `filter` is empty | `SELECT * FROM ? [${source.id}] where ${filter}` |
| `runSqlAsync(source, sql, context)` | new `Source` with the same id and `cloneOptions()` | `sql` with every `[source.id]` (case-insensitive) replaced by `?` |
| `isNullOrEmpty(str)` | `boolean` | - |

`new` is on the concrete class but omitted from the `ISourceWrapper` interface; it is still callable as `$bc.util.source.new(...)`.

```js
// OnProcessing hook of a print command
async function sortAndFilter(args) {
  const sql = `SELECT * FROM [${args.source.id}] WHERE id > 3 ORDER BY name`;
  args.source = await $bc.util.source.runSqlAsync(args.source, sql, args.context);
}
```

## The `basiscore` global

The bundle is built as a webpack library named `basiscore` (`type: "assign"`), so `window.basiscore` holds the exports of `src/index.ts`:

| Export | What it is |
|---|---|
| `$bc` | the same `BCWrapperFactory` as `window.$bc` |
| `BCWrapperFactory`, `BasisCore`, `HostOptions`, `LocalContext`, `LocalDataBase`, `EventManager` | runtime classes |
| `MergeType` | the enum used in `ISourceOptions` (`basiscore.MergeType.replace`, `basiscore.MergeType.append`) |
| `exposer` | `ExposerComponent`, used as `core="component.basiscore.exposer"` |
| `UserDefineComponent`, `APIComponent`, `CallbackComponent`, `CallComponent`, `ChartComponent`, `CookieComponent`, `DbSourceComponent`, `GroupComponent`, `HTMLFormComponent`, `HTMLInputComponent`, `HTMLIUnknownComponent`, `HTMLSelectComponent`, `ListComponent`, `PrintComponent`, `RepeaterComponent`, `SchemaComponent`, `TreeComponent`, `ViewComponent` | component classes |
| `IDependencyContainer`, `IQuestionSchema`, `IUserActionResult` | TypeScript-only types; `undefined` at run time |

`Priority` and `DataStatus` are not exported.

```js
$bc.setSource("user.list", rows, { keyFieldName: "id", mergeType: basiscore.MergeType.append });
const events = new basiscore.EventManager();
```

## `IContext`

The context is what page code receives as `args.context` (callbacks and `OnProcessing`/`OnRendering`/`OnRendered`/`OnProcessed` hooks), as `this.context` through the owner object of a user-defined component, and as the `$bc` parameter of a `{{ ... }}` code block.

| Member | Description |
|---|---|
| `options: IContextHostOptions` | The effective host options: `settings`, `sources`, `repositories`, `dbLibPath`, `debug`, `serviceWorker`, `push`, plus `getDefault(key, default = null)` (reads `settings["default." + key]`, case-insensitively), `getSetting(key, default)` (throws `ConfigNotFoundException` when the key is missing and `default` is `undefined`), and `originalOptions` (the options as passed, before defaults). |
| `logger: ILogger` | `logSource(source)`, `logError(message, error)`, `logInformation(message, ...params)`, `logWarning(message)`; the default implementation writes to the console. |
| `tryToGetSource(id)` | Stored source or `undefined`; child contexts fall back to their owner. |
| `waitToGetSourceAsync(id)` | Existing source, or a promise for the next publication of that id. |
| `setAsSource(id, data, options?, preview?)` | Creates a `Source` and publishes it. |
| `setSource(source, preview?)` | Publishes an existing `ISource`. |
| `addOnSourceSetHandler(id, handler)` / `removeOnSourceSetHandler(id, handler)` | Subscribe to or unsubscribe from publications of `id`. |
| `loadDataAsync(sourceId, connectionName, parameters, onDataReceived)` | Sends `parameters` to the named connection and calls `onDataReceived(Data[])` for each result set; returns `true` from the callback to keep a streaming connection open. See [connections](connections.md). |
| `loadPageAsync(pageName, parameters, method?, url?)` | Fetches a page through the `callcommand` connection (or `url`) and returns its text. |
| `getOrLoadDbLibAsync()` | Returns the `alasql` global, loading it from `options.dbLibPath` when needed; throws `ClientException` when `dbLibPath` is empty and AlaSQL is not present. |
| `checkSourceHeartbeatAsync(id)` | Declared but throws `Method not implemented.`. |

Merge semantics, propagation between contexts and the handler contract are described in [sources-and-reactivity](sources-and-reactivity.md).

### Code blocks

A `{{ ... }}` token is compiled to `async function ($bc, $data) { try { <code> } catch (e) { console.error(e); return e; } }`. Inside it `$bc` is the **context**, not the wrapper factory, so `await $bc.waitToGetSourceAsync('cms.form')` and `$bc.tryToGetSource('x')` work there. `$data` is the current row when the block is used as a face template. A `null` or `undefined` result renders as `""`. The token scanner also records every `$bc.waitToGetSourceAsync('id')` / `$bc.tryToGetSource('id')` literal in the block as a source dependency. See [binding-and-tokens](binding-and-tokens.md).

### Callback argument shapes

| Where | Argument |
|---|---|
| `callback` `method`, `OnProcessing` of source-based commands | `{ context, node, source }` (`SourceCallbackArgument`; assign `args.source` to replace the source that gets rendered) |
| `OnRendering` | `{ context, node, source, prevent }` (set `prevent = true` to skip rendering) |
| `OnRendered` | `{ context, node, source, result }` |
| `OnProcessing` / `OnProcessed` of `input`, `select`, `form` | `{ context, node, id, value }` (`id` and `value` can be reassigned before publication) |
| `OnProcessing` / `OnProcessed` of `api` | `{ context, node, request, response }` and `{ context, node, request, response, results: Data[] }` |

## `EventManager<T>`

`src/event/EventManager.ts`, exported as `basiscore.EventManager`. A `Set`-backed multicast delegate.

| Method | Behaviour |
|---|---|
| `Add(handler)` | Throws the string `"handler null or is not function!"` when `handler` is not a function. Adds it and returns it; returns `null` when the same function was already present. |
| `Remove(handler)` | Removes and returns the handler, or `null` when it was not present. |
| `Trigger(args?)` | Calls every handler in insertion order inside `try/catch`; an exception is written with `console.error` and the remaining handlers still run. |

The repository uses one `EventManager<ISource>` per source id, each `Context` exposes `onDataSourceSet: EventManager<ISource>`, and `BCWrapper.manager` is an `EventManager<IBasisCore>`.

## User-defined component API

A class loaded through `getComponentAsync` is constructed with `new Manager(owner)` where `owner: IUserDefineComponent` wraps the `<basis core="component.…">` element. Besides `context`-like methods (`setSource(id, data, options?, preview?)`, `tryToGetSource`, `waitToGetSourceAsync`, `addTrigger(ids)`, `getDefault`, `getSetting`) it offers `node`, `content`, `range`, `triggers`, `priority`, `dc`, `getAttributeValueAsync`, `getAttributeBooleanValueAsync`, `getAttributeToken`, `setContent(node)`, `processNodesAsync(nodes)`, `toNode`, `toHTMLElement`, `storeAsGlobal`, `getRandomName`, `format`, `getLibAsync`, `disposeAsync`, `disposed`, `manager` and `onInitialized`. The manager may implement `initializeAsync()`, `runAsync(source?)` and `disposeAsync()`. See [user-defined-components](user-defined-components.md).

## `LocalDataBase`

`basiscore.LocalDataBase` (`src/repository/LocalDataBase.ts`) wraps an AlaSQL `localStorage` database: `new LocalDataBase(databaseName, () => schemas)` where `schemas` is a `Map<tableName, { column: "TYPE", ... }>` used to create the tables the first time the database is created. `executeAsync(sql, params?)` returns the AlaSQL result, `executeAsTableAsync(sql, params?)` returns `[columnNames, ...rowArrays]`, `dropAsync()` drops the database. It requires the `alasql` global to be loaded already (it does not call `getOrLoadDbLibAsync`). Details in [client-side-sql](client-side-sql.md).

## TypeScript typings

`package.json` declares `"types": "dist/basiscore.d.ts"`. The file is generated by `dts-bundle-generator -o dist/basiscore.d.ts src/index.ts` as the `postpub` step of `npm run pub`, so it is present in the published npm package and in a local `dist/` after a production build, but it is not committed to the repository. With the package installed:

```ts
import { MergeType, EventManager } from "basiscore";
```

The `$bc` and `basiscore` globals themselves are not declared; declare them in your project (`declare const $bc: import("basiscore").BCWrapperFactory;`).

## Examples

### Publish a ticking source and react in a callback

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Simple binding</title>
</head>
<body>
  <div>Time is [##data.time.hh|(00)##]:[##data.time.mm|(00)##]:[##data.time.ss|(00)##]</div>

  <basis core="callback" run="atclient" triggers="data.time" method="onTime"></basis>

  <script>
    function setTimeSource() {
      const d = new Date();
      $bc.setSource("data.time", { hh: d.getHours(), mm: d.getMinutes(), ss: d.getSeconds() });
    }
    setTimeSource();           // runs the global wrapper and publishes
    setInterval(setTimeSource, 1000);

    function onTime(args) {
      console.log(args.source.id, args.source.rows[0]);
    }
  </script>
</body>
</html>
```

### Lazy-load a library and derive a source

```html
<basis core="print" datamembername="inlinesource.print1" run="atclient" OnProcessing="filter">
  <face><li>@id@ - @name@</li></face>
</basis>

<script>
  const host = {
    dbLibPath: "/alasql.min.js",
    sources: {
      "inlinesource.print1": [
        { id: 1, name: "data#1" }, { id: 2, name: "data#2" }, { id: 5, name: "data#5" }
      ]
    }
  };

  async function filter(args) {
    const rows = await $bc.util.source.filterAsync(args.source, "id > 1", args.context);
    args.source = $bc.util.source.new("inlinesource.print1", rows);
  }
</script>
```

### Timer-driven callback

```html
<basis core="callback" run="atclient" events="timer.1000" method="timerCallback"></basis>
<script>
  let count = 5;
  function timerCallback(arg) {
    const timerId = arg.source.rows[0].value;
    if (--count <= 0) {
      clearInterval(timerId);
    }
  }
</script>
```

### Loading a user-defined component from a repository

```html
<script>
  const host = {
    repositories: {
      "bc.watermark": "https://example.com/basiscore.watermark.component.js"
    }
  };
</script>
<basis core="component.bc.watermark" run="atclient" wm-element="#main-svg"></basis>
```

`getComponentAsync(context, "bc.watermark")` finds the `bc.watermark` repository entry and expects the script to define `window.bc.watermark`.

## Pitfalls

- `wrapper.setSource(...)` on a wrapper that has not run only runs it; the data is lost. Call `.run()` first (or use `$bc.setSource`, which does).
- Accessing `$bc.global` or calling `$bc.setOptions(...)` before the `load` event disables auto-run without starting the engine; finish with `.run()`.
- `setOptions` replaces the previously stored options object; it does not merge.
- `addFragment` with a selector that matches nothing leaves `elementList` empty, and the subsequent `run()` throws `No element(s) selected for start rendering!`.
- `BCWrapper.setSource` publishes after `initializeTask` resolves; code that calls `tryToGetSource` right after `setSource` does not see the source yet. Use `waitToGetSourceAsync` or a `callback`.
- `GetCommandList*` only see the root collection; commands rendered by `call`, `group`, `repeater` or inside rendered faces are not returned.
- `GetCommandListByCore` compares the attribute text exactly: `core="Print"` is not found by `GetCommandListByCore("print")`.
- Inside `{{ }}` code blocks `$bc` is the context, so `$bc.setSource(...)` does not exist there; use `$bc.setAsSource(...)`.
- `getLibAsync` and `getComponentAsync` resolve names with `eval`; the `objectName` must be a valid JavaScript expression (a dotted global path), and the loaded script must define exactly that path.
- `toHTMLElement` and `toElement` do not throw on malformed XML; the result is, or contains, a `<parsererror>` element (where it sits depends on the browser).
- `$bc.util.source.filterAsync` returns a row array, while `sortAsync` and `runSqlAsync` return a `Source`.
- `runSqlAsync` expects the table to be referenced as `[source.id]` in the SQL; any other table name is passed to AlaSQL unchanged and fails.
- `IDependencyContainer`, `IQuestionSchema` and `IUserActionResult` are listed in the exports but are types only; `basiscore.IQuestionSchema` is `undefined`.

## Related

- [sources-and-reactivity](sources-and-reactivity.md) - merge algorithm, contexts, handlers
- [host-configuration](host-configuration.md) - `host` object, `setOptions`, `autoRender`, `dbLibPath`, `repositories`
- [binding-and-tokens](binding-and-tokens.md) - `[##...##]` and `{{ }}` tokens
- [command-attributes-and-lifecycle](command-attributes-and-lifecycle.md) - `OnProcessing`, `OnRendering`, `OnRendered`, `OnProcessed`, `triggers`, `events`
- [user-defined-components](user-defined-components.md) - writing `component.*` managers
- [client-side-sql](client-side-sql.md) - AlaSQL, `LocalDataBase`
- [connections](connections.md) - `loadDataAsync`, `loadPageAsync`
- [service-worker-and-push](service-worker-and-push.md) - `serviceWorker` option, `addMessageHandler`
- [callback](commands/callback.md), [component](commands/component.md)
- [getting-started](getting-started.md)

## Source files

- `src/index.ts`
- `src/wrapper/BCWrapperFactory.ts`, `src/wrapper/IBCWrapperFactory.ts`, `src/wrapper/BCWrapper.ts`, `src/wrapper/IBCWrapper.ts`, `src/wrapper/IBCUtil.ts`
- `src/wrapper/UtilWrapper.ts`, `src/wrapper/IUtilWrapper.ts`, `src/wrapper/SourceWrapper.ts`, `src/wrapper/ISourceWrapper.ts`
- `src/BasisCore.ts`, `src/IBasisCore.ts`, `src/ComponentCollection.ts`
- `src/context/IContext.ts`, `src/context/Context.ts`, `src/context/RootContext.ts`
- `src/event/EventManager.ts`, `src/event/IEvent.ts`, `src/event/IEventManager.ts`, `src/event/EventHandler.ts`
- `src/token/CodeBlockToken.ts`, `src/CallbackArgument.ts`
- `src/component/user-define-component/IUserDefineComponent.ts`, `src/component/user-define-component/UserDefineComponent.ts`, `src/component/user-define-component/component/ExposerComponent.ts`
- `src/repository/LocalDataBase.ts`, `src/repository/IDatabase.ts`
- `src/options/HostOptions.ts`, `src/options/IHostOptions.ts`, `src/options/IContextHostOptions.ts`
- `webpack.config.js`, `package.json`
