# Internals

This page describes how BasisCore Client is put together for people who want to read, debug or extend the library itself: the bootstrap sequence from the `<script>` tag to the first rendered command, the class hierarchy, the dependency injection tokens, the priority waves, contexts and repositories, the DOM range mechanism that replaces `<basis>` elements, the render cache, the console output, the exception types, the webpack build and the development server. Page authors do not need any of this; see [getting-started.md](getting-started.md) instead.

## Bootstrap sequence

1. **`src/index.ts`** is the single webpack entry. It imports `./tsyringe.config` (which registers every injection token), `./extension/StringExtensions` and `./extension/ElementExtensions` (prototype helpers such as `String.prototype.ToStringToken`, `Element.prototype.isBasisCore`), prints the console banner, creates `const $bc = new BCWrapperFactory()` and assigns it to `global.$bc`. It then adds a one-shot `load` listener: when `$bc.all.length == 0` (no wrapper created by page script) and `HostOptions.defaultSettings.autoRender` is true, it calls `$bc.run()`.
2. **`HostOptions.defaultSettings`** (`src/options/HostOptions.ts`) is computed once: the built-in defaults (`debug: false`, `autoRender: true`, `serviceWorker: false`, `dbLibPath: "/alasql.min.js"`, the `default.*` settings, `repositories: {}`) merged with the page-global `host` variable with `lodash.defaultsdeep`, if `host` is defined at that moment.
3. **`BCWrapperFactory`** (`src/wrapper/BCWrapperFactory.ts`) owns `all` (every wrapper created) and a lazily created `global` wrapper. `$bc.run()`, `$bc.addFragment()`, `$bc.setOptions()` and `$bc.setSource()` forward to `global`; `$bc.new()` creates an independent `BCWrapper`. `$bc.util` is a `UtilWrapper`.
4. **`BCWrapper.run()`** (`src/wrapper/BCWrapper.ts`):
   - throws `No element(s) selected for start rendering!` if `addFragment` was called but matched nothing;
   - creates a tsyringe child container from the global `container`;
   - registers `IHostOptions` (the object given to `setOptions`, or `{}`), `root.nodes` (the fragments, or `document.documentElement`) and `dc` (the child container itself);
   - resolves `"IBasisCore"`, which constructs a `BasisCore`;
   - handles `options.serviceWorker` (see [service-worker-and-push.md](service-worker-and-push.md));
   - triggers `manager` (an `EventManager<IBasisCore>`) with the new instance.
5. **`BasisCore`** (`src/BasisCore.ts`) receives a `BasisCoreRootContext`, the container (`dc`) and the nodes. It registers `root.context` (the context instance) and `context` (an alias token to `root.context`), resolves a `ComponentCollection` and calls `content.processNodesAsync(nodes)` without awaiting it. `setSource()` waits for `content.initializeTask` before publishing, so a source set from page script before the page was scanned is applied after scanning.
6. **`BasisCoreRootContext`** (`src/context/BasisCoreRootContext.ts`) is constructed by tsyringe with a `Repository`, the `ConsoleLogger`, the container and a `HostOptions` instance (built from `IHostOptions` merged with `defaultSettings`). The base `RootContext` constructor builds a `ConnectionOptionsManager` from every `connection.<provider>.<name>` key of `settings` and publishes `host.sources`. `BasisCoreRootContext` then registers `host_options`, publishes `cms.query` from the query string and `cms.cookie`, `cms.request` and `cms.cms`.
7. **`ComponentCollection.processNodesAsync`** (`src/ComponentCollection.ts`) throws `Run ComponentCollection for more than one` on a second call. It first runs `extractComponentAsync`, then `runAsync`:
   - `extractTextBaseComponents` walks every node that is not inside a `bc-ignore` element or a `<basis run="atclient">` element. Text nodes matching `default.binding.regex` or `default.binding.codeblock-regex` become `TextComponent`s (one per match; the loop re-matches the remaining text until no token is left). Attributes matching either regex become `AttributeComponent`s.
   - `extractBasisCommands` collects the outermost `<basis run="atclient">` elements (a `<basis>` nested inside another one is left to the command that renders it) and every element carrying `bc-triggers` that is not inside such a `<basis>` or a `bc-ignore` element. For each `<basis>` the token is the part of `core` before the first `.`, lower-cased (`component.foo` resolves `component`). For `bc-triggers` elements the token is the tag name when it is `form`, `input` or `select`, otherwise `unknown-html`.
   - every component's `initializeAsync()` is started while extraction runs; the collection awaits them all.
   - `runAsync` processes the three priority waves (below).

Nothing is awaited by `BasisCore`, so `$bc.run()` returns synchronously with the wrapper; use `OnRendered` callbacks, `callback` commands or `wrapper.manager` to know when work is done.

## Class hierarchy

Paths are relative to `src/`.

- `Component<TNode extends Node>` - `component/Component.ts`. Holds `node`, `context`, `priority` (default `low`), `busy`, `disposed`, the trigger handler. `addTrigger(ids)` registers `onTrigger` with the context for each source id; `onTrigger` runs `renderAsync` unless busy (or `allowMultiProcess`).
  - `TextComponent` - `component/text-base/TextComponent.ts`, priority `none`, one token inside a text node.
  - `AttributeComponent` - `component/text-base/AttributeComponent.ts`, priority `none`, one attribute value.
  - `ElementBaseComponent<TElement extends Element>` - `component/ElementBaseComponent.ts`. Reads `if`, `ignoreNullSource`, `OnRendering`, `OnRendered`, `OnProcessing`, `OnProcessed`, `triggers`, `events`, `preventDefault`, `stopPropagation`; implements the `renderAsync` pipeline (`if` evaluation, `OnRendering` with `prevent`, `runAsync`, `OnRendered`, `hideAsync`).
    - `HTMLComponent<TElement extends HTMLElement>` - `component/html-element/HTMLComponent.ts`, priority `none`; `bc-triggers`, `bc-keyField`, `bc-statusField`, `bc-merge`, `data-bc-init` marker.
      - `HTMLInputComponent` (`input`), `HTMLSelectComponent` (`select`), `HTMLFormComponent` (`form`), `HTMLIUnknownComponent` (`unknown-html`) - `component/html-element/*.ts`.
    - `CommandComponent` - `component/CommandComponent.ts`. Adds `core`, a `RangeObject` and `content` (the original child nodes as a `DocumentFragment`). Constructing it removes the `<basis>` element from the DOM.
      - `CallComponent` (`call`) - `component/collection/CallComponent.ts`, priority `high`.
      - `GroupComponent` (`group`) - `component/collection/GroupComponent.ts`.
      - `CookieComponent` (`cookie`) - `component/management/CookieComponent.ts`.
      - `CallbackComponent` (`callback`) - `component/source/CallbackComponent.ts`, priority `none`, `allowMultiProcess`.
      - `SourceComponent` (abstract) - `component/source/SourceComponent.ts`, priority `normal`.
        - `APIComponent` (`api`) - `component/source/APIComponent.ts`.
        - `MemberBaseSourceComponent<T extends Member>` (abstract) - `component/source/MemberBaseSourceComponent.ts`; `<member>` elements, `name`, `source`, `StreamPromise` handling, `allowMultiProcess`.
          - `DbSourceComponent` (`dbsource`) - `component/source/DbSourceComponent.ts`, members are `DbSourceMember`.
          - `InlineSourceComponent` (`inlinesource`) - `component/source/InlineSourceComponent.ts`, members are `SqlMember` or `JoinMember` chosen by `format`.
      - `SourceBaseComponent` (abstract) - `component/SourceBaseComponent.ts`. Reads `dataMemberName` in `processAsync`, registers it as a trigger, resolves the source in `runAsync`, applies `OnProcessing` and calls `renderSourceAsync`.
        - `RepeaterComponent` (`repeater`) - `component/collection/RepeaterComponent.ts`.
        - `ChartComponent` (`chart`) - `component/chart/ChartComponent.ts`; delegates to `BarChart`, `StackedChart`, `LineChart`, `FunnelChart`, `DonutChart`, `HalfDonutChart` (plain classes in `component/chart/`).
        - `SchemaComponent` (`schema`) - `component/renderable/schema/SchemaComponent.ts`; owns `Section`, `Question`, `QuestionContainer`, `QuestionPart` subclasses built by `QuestionPartFactory` (`component/renderable/schema/**`).
        - `SchemaListComponent` (`schemalist`) - `component/renderable/schema-list/SchemaListComponent.ts`.
        - `SchemaUploader` (`schemauploader`) - `component/renderable/SchemaUploader.ts`.
        - `RenderableComponent<TRenderResult extends FaceRenderResult>` (abstract) - `component/renderable/base/RenderableComponent.ts`; `<face>`, `<layout>`, `<else-layout>`, `processRenderedContent`, the `FaceRenderResultRepository`.
          - `PrintComponent` (`print`) and `ListComponent` (`list`) render `FaceRenderResult`.
          - `TreeComponent` (`tree`) and `ViewComponent` (`view`) render `TreeFaceRenderResult` (a result with a `@child` slot).
      - `ComponentContainer` (abstract) - `component/user-define-component/ComponentContainer.ts`; the helper surface handed to user components (`toNode`, `toElement`, `getSetting`, `setSource`, `waitToGetSourceAsync`, `storeAsGlobal`, ...).
        - `UserDefineComponent` (`component`) - `component/user-define-component/UserDefineComponent.ts`. Loads the manager class named after the `.` in `core` through `$bc.util.getComponentAsync` and constructs it with itself as the only argument. `ExposerComponent` (`component/user-define-component/component/ExposerComponent.ts`) is such a manager, not a `Component`.

Supporting hierarchies:

- Members: `Member` (abstract, `component/source/base/Member.ts`: `name`, `preview`, `sort`, `postsql`) -> `DbSourceMember`; `InMemoryMember` (abstract) -> `SqlMember`, `JoinMember`.
- Render pipeline: `RawFaceCollection`/`RawFace` (the `<face>` elements), `FaceCollection`/`Face` (faces resolved against a source), `RenderParam`, `FaceRenderResult`/`TreeFaceRenderResult`, `FaceRenderResultRepository`, templates `ContentTemplate`, `StringTemplate`, `ExpressionTemplate`, `CodeBlockTemplate` (`component/renderable/base/**`).
- Tokens: `TokenUtil` builds `ValueToken`, `ObjectToken` or `ArrayToken` subclasses for string, integer, boolean and object (`token/**`), plus `CodeBlockToken` for `{{ }}` blocks; `SourceTokenElement` and `ValueTokenElement` are the parts of a parsed token string.
- Contexts: `Context` (abstract) -> `RootContext` (abstract) -> `BasisCoreRootContext`, `LocalRootContext`; `Context` -> `LocalContext` (`context/*.ts`).
- Repositories: `Repository` implements `IContextRepository`; `LocalDataBase` implements `IDatabase` (`repository/*.ts`).
- Connections: `ConnectionOptions` (abstract) -> `UrlBaseConnectionOptions` (abstract) -> `WebConnectionOptions`, `RESTConnectionOptions`; `ConnectionOptions` -> `ChunkBasedConnectionOptions`, `WebSocketConnectionOptions`, `LocalStorageConnectionOptions`, `PushConnectionOptions`; `StreamPromise<T> extends Promise<T>` is returned by the streaming providers (`options/connection-options/*.ts`).
- Wrappers: `BCWrapperFactory` (`$bc`), `BCWrapper`, `UtilWrapper` (`$bc.util`), `SourceWrapper` (`$bc.util.source`) (`wrapper/*.ts`).
- Infrastructure: `EventManager<T>` (a `Set` of handlers; `Trigger` catches and logs handler exceptions), `Data` (a result table from a connection), `Source` (a published source with `rows`, `versions`, `mergeType`, `keyFieldName`, `statusFieldName`, `extra`), `RangeObject`, `Util`, `DataUtil`.

## Dependency injection

The library uses tsyringe. Every class marked `@injectable()` is constructed by the container; constructor parameters are resolved either by class (`HostOptions`, `BasisCoreRootContext`, `ComponentCollection`, `LocalRootContext`) or by string token with `@inject("...")`. `ConsoleLogger` is the only `@singleton()`; everything else is transient, so every `resolve` creates a new instance (in particular each context gets its own `Repository`).

### Global registrations (`src/tsyringe.config.ts`)

| Token | Implementation |
|---|---|
| `IBasisCore` | `BasisCore` |
| `ILogger` | `ConsoleLogger` |
| `IContextRepository` | `Repository` |
| `ILocalContext` | `LocalContext` |
| `print` | `PrintComponent` |
| `tree` | `TreeComponent` |
| `view` | `ViewComponent` |
| `list` | `ListComponent` (registered twice; the second registration is redundant) |
| `chart` | `ChartComponent` |
| `schema` | `SchemaComponent` |
| `schemalist` | `SchemaListComponent` |
| `schemauploader` | `SchemaUploader` |
| `cookie` | `CookieComponent` |
| `call` | `CallComponent` |
| `group` | `GroupComponent` |
| `repeater` | `RepeaterComponent` |
| `callback` | `CallbackComponent` |
| `dbsource` | `DbSourceComponent` |
| `inlinesource` | `InlineSourceComponent` |
| `input` | `HTMLInputComponent` |
| `select` | `HTMLSelectComponent` |
| `form` | `HTMLFormComponent` |
| `unknown-html` | `HTMLIUnknownComponent` |
| `api` | `APIComponent` |
| `component` | `UserDefineComponent` |

Twenty-one command tokens are registered. The `core` attribute value (lower-cased, up to the first `.`) is resolved directly against this list, so an unknown `core` fails inside tsyringe with an unregistered-token error for that element.

### Scoped registrations

| Registered by | Token | Value |
|---|---|---|
| `BCWrapper.run()` | `IHostOptions` | the options object passed to `setOptions`, or `{}` |
| `BCWrapper.run()` | `root.nodes` | `Array<Element>` to scan |
| `BCWrapper.run()` | `dc` | the wrapper's child container |
| `BasisCore` constructor | `root.context` | the `BasisCoreRootContext` |
| `BasisCore` constructor | `context` | alias of `root.context` (`useToken`) |
| `BasisCoreRootContext` constructor | `host_options` | the merged `HostOptions` instance |
| `ComponentCollection.createCommandComponent` (per command, new child container) | `element` | the `<basis>` or `bc-triggers` element |
| same | `context` | the collection's context |
| same | `dc` | the command's own child container |
| same | `parent.dc` | the collection's container |
| `GroupComponent.runAsync` (new child container per run) | `parent.context` | the group's context |
| same | `dc`, `parent.dc` | the new container and the group's container |
| same | `IHostOptions` | only when the `options` attribute is present: `eval(options)` merged over `context.options.originalOptions` |
| same | `context` | a `LocalRootContext` resolved from the new container |
| `RepeaterComponent.renderSourceAsync` (new child container per row) | `parent.context`, `dc`, `parent.dc` | as for group |
| same | `context` | a `LocalContext` resolved through `ILocalContext`, after `<name>.current` has been set on it |

`LocalContext` injects `IContextRepository`, `parent.context` and `host_options`; `LocalRootContext` injects `IContextRepository`, `parent.context` and a `HostOptions` built from the nearest `IHostOptions`. This is how `group options="..."` gets its own settings and connections while a repeater row only gets its own source scope.

## Priority and the three waves

```ts
export enum Priority { high, normal, low, none }
```

| Priority | Components |
|---|---|
| `high` | `call` |
| `normal` | `SourceComponent` subclasses: `api`, `dbsource`, `inlinesource` |
| `low` | everything else that extends `Component` without overriding: `print`, `list`, `tree`, `view`, `chart`, `schema`, `schemalist`, `schemauploader`, `cookie`, `group`, `repeater`, `component` |
| `none` | `callback`, the `bc-triggers` HTML components, `TextComponent`, `AttributeComponent` |

`ComponentCollection.runAsync` awaits `Promise.all` of `processAsync()` for every `high` component, then for every `normal` one, then for every `low` one. `none` components are never processed by a wave; they run only when one of their trigger sources is set (text and attribute tokens render their initial value in `initializeAsync`, HTML components attach their DOM listeners there). A renderer whose source is not yet available simply waits on it (`waitToGetSourceAsync`), which is why the `low` wave does not block on data.

Each nested `ComponentCollection` (inside `group`, `repeater`, or the rendered output of a `RenderableComponent` when `processRenderedContent` is on, and anything a user component passes to `processNodesAsync`) repeats the same three waves for its own nodes.

## Contexts and repositories

`Context` (`src/context/Context.ts`) wraps a `Repository` and exposes `setAsSource`/`setSource` (publish), `tryToGetSource`, `waitToGetSourceAsync`, `addOnSourceSetHandler`/`removeOnSourceSetHandler` and an `onDataSourceSet` `EventManager<ISource>` that fires after every publish. Publishing resolves pending `waitToGetSourceAsync` promises stored in `repository.resolves` and then triggers `onDataSourceSet`. `checkSourceHeartbeatAsync` throws `Method not implemented.`.

`RootContext` adds the `ConnectionOptionsManager` (`connections`), `loadDataAsync(sourceId, connectionName, params, onDataReceived)` (looks up the connection by name, throws `ConfigNotFoundException` when missing), `loadPageAsync(pageName, params, method, url)` (uses a `WebConnectionOptions` built from `url` when given, otherwise the connection named `callcommand`), `getOrLoadDbLibAsync()` (returns the global `alasql` or loads it from `dbLibPath`) and publishes `host.sources` with lower-cased ids.

- `BasisCoreRootContext`: the page root; also publishes `cms.query`, `cms.cookie`, `cms.request`, `cms.cms`.
- `LocalRootContext` (used by `group`): a root context with its own connections and repository, whose `tryToGetSource` falls back to the owner, and which subscribes to the owner's `onDataSourceSet` so sources published above are forwarded with `setSourceFromOwner`.
- `LocalContext` (used by `repeater`): no connections of its own; `loadDataAsync`, `loadPageAsync` and `getOrLoadDbLibAsync` delegate to the owner; same fallback and forwarding as `LocalRootContext`. `dispose()` unsubscribes from the owner.

`Repository` (`src/repository/Repository.ts`) keeps three maps keyed by lower-cased source id: `repository` (id -> `ISource`), `eventManager` (id -> handlers registered through `addHandler`) and `resolves` (id -> waiters). `setSource` applies the merge: with `MergeType.replace` an existing source is replaced in place (`oldSource.replace(newSource)`, so handlers keep the same object), with `MergeType.append` rows are added, or upserted/deleted by `keyFieldName` and `statusFieldName` (`DataStatus.added/edited/deleted`) when both sources define a key field. `setSourceFromOwner` deletes the local copy of that id so that lookups fall through to the owner again and re-triggers local handlers.

`LocalDataBase` (`src/repository/LocalDataBase.ts`) wraps an AlaSQL `localStorage` database (`CREATE localStorage DATABASE IF NOT EXISTS`, `ATTACH`, `CREATE TABLE` from a schema map, `executeAsync`, `executeAsTableAsync`, `dropAsync`). It is exported from `src/index.ts` for user code; no built-in command uses it.

## RangeObject

`RangeObject` (`src/RangeObject/RangeObject.ts`) is how a command owns a region of the live DOM without keeping its element there. The constructor receives a `Range` that selects the node (for `CommandComponent`, the whole `<basis>` element; for `TextComponent`, the matched token inside a text node), extracts the contents into `initialContent` (a `DocumentFragment`) and inserts two empty text nodes, `_startNode` and `_endNode`, where the node was. From then on:

- `setContent(content, append = false)` builds a range between the markers, deletes the current contents unless `append`, and inserts `content` (a `Node`, an array joined with `,`, or any value converted with `toString()` and parsed with `createContextualFragment`).
- `deleteContents()` clears the region.

Consequences worth knowing while debugging: after processing, no `<basis run="atclient">` element remains in the document (its children are in `command.content`); rendered output is bracketed by two empty text nodes; `group` re-inserts its original child nodes into the range (`fillContent`), while `print`-family commands insert freshly built nodes.

## FaceRenderResultRepository and keyed re-rendering

Every `RenderableComponent` owns a `FaceRenderResultRepository`. `RenderParam.getRenderedResultAsync(row)` computes the row key (the `keyFieldName` value when the source has one, otherwise the row object itself) and the row version (`source.getVersion(row)`, incremented by `replaceRowFromIndex` during append merges), then looks the key up in the repository. A hit with the same version is reused without re-evaluating the face template; a miss or a changed version renders the template, wraps it in a `FaceRenderResult` (or `TreeFaceRenderResult`) and stores it with `setRenderedResult`. This is what makes `append` merges cheap for `print`: unchanged rows keep their already rendered nodes, which are simply moved into the new fragment.

The repository is keyed per group name (`set(key, value, groupName = "default")`, `get(key, groupName = "default")`). `FaceCollection.renderAsync` always stores through `RenderParam.setRenderedResult`, that is in the default group, and `ViewComponent` additionally stores its level 1 results under the group name `"root"`. Because the level 1 result of a view group is therefore also cached in the default group under the group's first row, the level 2 pass over that row finds it and takes it as the row's result; this is the cause of the `view` defect described in [troubleshooting.md](troubleshooting.md).

## Logging

`ConsoleLogger` (`src/logger/ConsoleLogger.ts`, injected as `ILogger`, singleton) has four methods:

| Method | Console call |
|---|---|
| `logSource(source)` | `console.log(source)`, `console.log(JSON.stringify(source.rows, null, " "))`, `console.table(source.rows)` |
| `logError(message, exception)` | `console.error(message, exception)` |
| `logInformation(message, ...optionalParams)` | `console.info(message[, optionalParams])` |
| `logWarning(message)` | `console.warn(message)` |

Lines you will see, and where they come from:

| Line | Source | Meaning |
|---|---|---|
| banner ending in `version:2.39.7` | `src/index.ts` | library loaded (the banner version is one patch ahead of `package.json`, 2.39.6) |
| `<id> Added... N Row(s)` / `<id> Updated... N Row(s)` | `Repository.setSource` | a source was published for the first time / merged into an existing one |
| `<id> Added from owner context...` | `Repository.setSourceFromOwner` | a parent context published `<id>`; the local copy was dropped |
| `handler Added for <id>...` / `handler removed for <id>...` | `Repository.addHandler/removeHandler` | a component subscribed to / unsubscribed from `<id>` |
| `wait for <id>` | `Repository.waitToGetAsync` | something needs `<id>` and it does not exist yet; if nothing later publishes it the waiter never resolves |
| `<url> Connected` / `<url> Reconnected` | `WebSocketConnectionOptions`, `ChunkBasedConnectionOptions` (`console.log`) | stream opened |
| `Try reconnect To <url>` | `WebSocketConnectionOptions` | socket closed after an error; up to `maxRetry` (5) attempts |
| `<url> Disconnected` | both stream providers | stream closed cleanly |
| `Disconnect from <url> by client request` | `WebSocketConnectionOptions` | `loadDataAsync` called again for the same source id; the old socket is closed |
| `Disconnect from <url> by server request` | both | payload had `setting.keepalive === false` |
| `Disconnect from <url> by receiver request. maybe disposed!` | both | the consuming command returned `false` (it was disposed) |
| `Error On '<url>'` | `WebSocketConnectionOptions` | socket `error` event |
| `Error in process WebSocket received message` | `WebSocketConnectionOptions` | a message could not be parsed or delivered |
| `Invalid remain part of json <text>` | `ChunkBasedConnectionOptions` (`console.error`) | the stream ended with unparsed bytes other than `,null]` |
| `End of chunked data...` | `ChunkBasedConnectionOptions` | the stream ended with no leftover |
| `<object> loaded from <url>` / `<lib> loaded from local` / `<lib> loaded from basiscore` | `UtilWrapper.getLibAsync/getComponentAsync` | a script or component class was resolved |
| `push message receive <message>` | `PushConnectionOptions` | a service worker message with the connection's type arrived |
| `<event type>` (for example `document`, `window`, `#btn`) | `ElementBaseComponent.initializeAsync` | printed with `console.log` for every entry of an `events` attribute (and twice for `timer.*`) |
| `@child place holder not found in layout template` | `RenderableComponent.createContentAsync` | `<layout>` exists but contains no `@child` |
| `Selector '<sel>' don't refer to any element(s).` | `BCWrapper.addFragment` | `addFragment` matched nothing |
| `Try add service worker more than one.` | `BCWrapper.run` | second wrapper with `serviceWorker` on |
| `error in execute callback method '<name>'.` | `CallbackComponent` | the `method` of a `callback` threw |
| `error in dispose component` | `UserDefineComponent.disposeAsync` | a user component's `disposeAsync` threw |
| `Error in parse 'if' attribute expression in command: '<expr>'` | `ElementBaseComponent.getIfValueAsync` | `if` is not valid JavaScript |

A healthy page start therefore reads: banner, `cms.request Added...`, `cms.cms Added...` (and `cms.query`, `cms.cookie` when present), a series of `handler Added for ...` and `wait for ...` lines while renderers subscribe, then `<id> Added... N Row(s)` lines as loaders complete. A `wait for x.y` with no later `x.y Added` is the signature of a misspelled source name. `preview="true"` on a `<member>` and a `callback` command without `method` dump a source through `logSource`.

The `debug` host option is stored but not read anywhere in the library; it does not change logging.

## Exceptions

| Class (`src/exception/`) | Constructor | Message |
|---|---|---|
| `ClientException extends Error` | `(message)` | as given |
| `ConfigNotFoundException extends ClientException` | `(configFile, configKey)` | `In '<configFile>' object, property '<configKey>' not configured!` |
| `InvalidPropertyValueException extends ClientException` | `(propertyName, propertyValue)` | `InValid Data Format For '<propertyName>' Property '<propertyValue>'` |

`ConfigNotFoundException` is thrown by `ConnectionOptionsManager.getConnection` (`configFile` is `host.settings`, `configKey` is the connection name as written in `source=`, for example `In 'host.settings' object, property 'bookapi' not configured!`) and by `HostOptions.getSetting` when called without a default value; `getDefault` always passes `null` as default and never throws. `InvalidPropertyValueException` is thrown by `JoinMember` for `lefttblcol`/`righttblcol` values that do not have three dot-separated parts (`LeftDataMember`, `RightTableColumn`).

`ClientException` messages in the library:

- `Can't add fragment for already builded bc object.`, `Can't set option for already builded bc object.`, `Invalid selector`, `No element(s) selected for start rendering!` (`BCWrapper`)
- `'<key>' related repository setting not found` (`UtilWrapper.getComponentAsync`)
- `Error in load 'alasql'. 'DbLibPath' not configure properly in host object.` (`RootContext`)
- `Invalid Json Format:<json>.<error>` (`ConnectionOptions.ParseJsonString`)
- `For Local Storage Connection '<name>', Setting In Not Valid`, `LoadPageAsync Method not Supported In LocalStorage Provider.` (`LocalStorageConnectionOptions`)
- `LoadPageAsync Method not Supported In REST API Provider.` (`RESTConnectionOptions`)
- `Source attribute can't change when socket is open . Valid connection is '<name>'` (`MemberBaseSourceComponent`)
- `Error In Evaluating '<expr>': <error>` (`String.prototype.Evaluating`)

Plain `Error`s: `Run ComponentCollection for more than one`, `Command '<name>' has N member(s) but M result(s) returned from source!`, `Tree command has no root record in data member '<id>' with '<nullvalue>' value in '<column>' column that set in NullValue attribute.`, `Chart type <type> is not supported`, `WebSocket call not implemented.` (`loadPageAsync` of the websocket and chunkbased providers), `Method not implemented.` (`RESTConnectionOptions.TestConnectionAsync/loadDataAsync`, `Context.checkSourceHeartbeatAsync`), `TestConnection not support in PushConnectionOptions.`, `loadPage not support in PushConnectionOptions.`, `HTTP error! status: <n>` (`WebConnectionOptions.fetchAjax`), `HTTP <n>: <text>`, `Network error`, `Request timeout` (`WebConnectionOptions.xmlAjax`, 15 s timeout). `EventManager.Add` throws the string `handler null or is not function!`.

## Build pipeline

`webpack.config.js` exports a function of `(env, options)`:

- Two entries, both importing `./src/index.ts`: `basiscore` (file `basiscore.js`) and `basiscore.min` (file `basiscore.min.js`), each with `library: { name: "basiscore", type: "assign" }` so the bundle assigns the module exports to a global `basiscore` and `src/index.ts` assigns `$bc` itself.
- `devtool: "source-map"`, `output.clean: true` (the `dist` folder is wiped on every build).
- `optimization.minimize` is true only in production mode, and the only minimizer is `UglifyJsPlugin` with `include: /\.min\.js$/`, so `npm run rel`/`pub` produce a readable `basiscore.js` and a minified `basiscore.min.js`; in development both files are unminified.
- Loaders: `.ts` through `ts-loader` (excluding `.d.ts`), `.d.ts` through `ignore-loader`, `.css` through `style-loader` + `css-loader` (the chart and schema styles are injected as `<style>` elements at runtime), `.png` as `asset/inline` (data URIs), `.html` as `asset/source` (raw strings; `src/@types/typings.d.ts` declares `*.html` modules).
- `resolve.extensions`: `.ts .d.ts .tsx .js .jsx .css .png`.
- `CircularDependencyPlugin`: every cycle is turned into a compilation error, except cycles whose first path starts with `node_modules/d3` (d3 has internal cycles).
- `tsconfig.json`: target and module `ES2015`, decorators and decorator metadata enabled (tsyringe needs `reflect-metadata`), `strictNullChecks: false`, `declaration: true` with `outDir: "src/types"` (ignored by git as `types`).

`package.json` scripts:

| Script | Command | Notes |
|---|---|---|
| `dev` | `webpack serve --mode=development` | development server on port 3000, opens the browser |
| `dev:no-serve` | `webpack --mode=development` | one-off development build into `dist/` |
| `rel`, `pub` | `webpack --mode=production` | production build |
| `prerel`, `prepub` | `if exist dist rd /s /q dist` | Windows `cmd` syntax; fails on Linux and macOS shells |
| `postpub` | `dts-bundle-generator -o dist/basiscore.d.ts src/index.ts` | bundles the public typings referenced by `"types": "dist/basiscore.d.ts"` |
| `ws` | `node server/websocket.js` | mock WebSocket server on port 8080 |
| `cb` | `node server/chunkBased.js` | the file does not exist in the repository; the chunked mock is served by the dev server instead |

Runtime dependencies: `tsyringe`, `reflect-metadata` (listed under devDependencies but bundled), `lodash.clonedeep`, `lodash.defaultsdeep`, `d3` (charts), `pako` and `@types/pako` (listed; `pako` is used by the mock chunk server). `alasql` is a dependency so that the dev server can serve it, but it is never imported: the library loads it at runtime from `dbLibPath`.

## Development server and mock routes

`webpack serve` serves two static roots, `example/` and `node_modules/alasql/dist/` (so the default `dbLibPath` `/alasql.min.js` resolves), enables CORS, and mounts Express routers from `server/`:

| Mount | File | Routes |
|---|---|---|
| `/api` | `server/api-server.js` | `POST /api/token` (returns `{ token, Captcha: false, Captcha_id: null }` after 3 s), `POST /api/token-result` (echoes the JSON body), `POST /api/*.json` (fixed `{ "a": "12", "e": "ali", "k": 12 }`), `POST /api/*` (redirects to the same URL, which turns the request into a `GET` of the static file) |
| `/schema` | `server/schema-server.js` | `GET /schema/questions/:id` (file `server/schemas/questions/<id>.json`), `GET /schema/answers?id=` (`server/schemas/answers/<id>.json`), `GET /schema/fix-data/:prpId/:part` (from `server/schemas/data.json`), `GET /schema/autocomplete?term=` or `?fixid=`, `GET /schema/lookup` (same data), `GET /schema/html` (an HTML fragment for the `html` field type) |
| `/blob` | `server/blob-server.js` | `POST /blob/answer-json` (`{ errorid: 4, message: "successful", usedforid: ... }`), `POST /blob/answer-blob` (`{ status: "ok" }`); JSON limit 20 MB |
| `/assets` | `server/asset-server.js` | static files from `server/assets/` |
| `/chunk` | `server/chunk-server.js` | `POST /chunk/chunk-data` (a fixed array of payloads, one every 500 ms, then `null]`), `GET /chunk/chunk-stream` and `POST /chunk/chunk-stream-post` (random payloads every second until the client disconnects), `GET /chunk/chunk-stream-for-callback` (five payloads then end) |
| `/validation` | `server/validation-server.js` | `POST /validation/fa`, `POST /validation/ar` (schema validation messages keyed by `sentenceId`) |

`server/websocket.js` (`npm run ws`) listens on `ws://localhost:8080` and uses the request path as a channel: `/time` sends `stream.time` (replace) every second for 10 seconds then `keepalive: false`; `/time-remain` does the same but extends its counter when a received `command` contains `counter="n"`; `/list` appends a `user.list` row every 2 seconds. `server/test.html` is a bare WebSocket playground.

## Example directory

`example/index.html` links every page. The tree:

- `example/bc/` - wrapper API: `zero-config`, `fragment/{simple-binding,multi}`, `rendering-event/call`, `code-block/{simple,manange-array,in-face}`
- `example/component/management/cookie/`
- `example/component/collection/{group,call,repeater}/`
- `example/component/source/callback/`, `source/dbsource/{simple,web-socket,chunkBased,push}/`, `source/api/restful/`, `source/inlinesource/`
- `example/component/renderable/{print,tree,view,list,schema,schema-list,schema-uploader,expression,on-processing}/`
- `example/component/chart/*.html` (bar, stacked, line, funnel, donut, pie, half donut, half pie variants)
- `example/component/user-component/{simple,setting,options,calender,from-repository,builtin-component}/`
- `example/component/if/{simple,source-exist,binding,expression}/`
- `example/component/html-element/{simple,input,chekbox-list,form,clientside-live-filter,serverside-live-filter,svg}/`

Pages load the library as `<script src="/basiscore.js">`, which the dev server resolves from the in-memory development build.

## Examples

### Inspecting a running page

```html
<script src="/basiscore.js"></script>
<basis core="inlinesource" name="demo" run="atclient">
  <member name="rows" format="sql">select 1 as id, 'a' as title</member>
</basis>
<basis core="print" datamembername="demo.rows" run="atclient">
  <face><p>@title</p></face>
</basis>
<script>
  var host = { autoRender: false };
  window.addEventListener("load", () => {
    const wrapper = $bc.run();
    wrapper.manager.Add((bc) => {
      bc.content.initializeTask.then(() => {
        console.log(wrapper.GetCommandList().map((c) => c.core));      // ["inlinesource", "print"]
        console.log(wrapper.GetCommandListByCore("print")[0].priority); // 2 (Priority.low)
        console.log(bc.context.tryToGetSource("demo.rows")?.rows);
      });
    });
  });
</script>
```

### Two isolated runtimes on one page

```html
<div id="left"><basis core="print" datamembername="a.b" run="atclient"><face>@x</face></basis></div>
<div id="right"><basis core="print" datamembername="a.b" run="atclient"><face>@x</face></basis></div>
<script>
  var host = { autoRender: false };
  window.addEventListener("load", () => {
    const left = $bc.new().addFragment("#left").run();
    const right = $bc.new().addFragment("#right").setOptions({ settings: { "default.dmnid": 7 } }).run();
    left.setSource("a.b", [{ x: "left only" }]);
    right.setSource("a.b", [{ x: "right only" }]);
  });
</script>
```

Each `run()` creates its own child container, `BasisCore`, root context and repository, so the two `a.b` sources do not interfere.

## Pitfalls

- `BasisCore` does not await `processNodesAsync`; `$bc.run()` returns before any command has run. Use `wrapper.manager`, `bc.content.initializeTask` (resolves after extraction and `initializeAsync`, not after rendering) or `OnRendered` callbacks.
- `HostOptions.defaultSettings` is computed once and cached. Defining the global `host` after the library has read it (for example after `load`) has no effect on later wrappers' defaults; pass options with `setOptions` instead.
- `HostOptions.getSetting` treats any falsy configured value (`0`, `false`, `""`) as missing and returns the default. `default.dmnid` is `""` by default, so `getDefault("dmnid")` returns `null`, which `dbsource` sends as the string `null` on `web` connections.
- Every `resolve` of `IContextRepository` is a new `Repository`; a `group` or `repeater` scope has its own source map and only sees parent sources through the owner fallback. Setting a source inside a `group` does not propagate upward.
- `ComponentCollection.createCommandComponent` resolves the `core` token directly; an unknown `core` value throws a tsyringe resolution error during extraction and that collection's `initializeTask` rejects.
- `LocalContext.getOrLoadObjectAsync` calls itself recursively and will overflow the stack if invoked; nothing in the library calls it.
- `ComponentContainer.format(pattern, ...params)` forwards `params` as one array argument to `$bc.util.format`, so `{0}` expands to the whole array joined with commas instead of the first argument.
- `MemberBaseSourceComponent.processLoadedDataSet` starts `addDataSourceAsync` for every member with an un-awaited `forEach`; publication order between members is not guaranteed.
- The circular dependency plugin fails the build for any new import cycle you introduce between `src/` modules; use interfaces or `type-alias.ts` to break them.

## Related

- [getting-started.md](getting-started.md)
- [host-configuration.md](host-configuration.md)
- [command-attributes-and-lifecycle.md](command-attributes-and-lifecycle.md)
- [sources-and-reactivity.md](sources-and-reactivity.md)
- [connections.md](connections.md)
- [javascript-api.md](javascript-api.md)
- [user-defined-components.md](user-defined-components.md)
- [service-worker-and-push.md](service-worker-and-push.md)
- [troubleshooting.md](troubleshooting.md)

## Source files

- `src/index.ts`, `src/tsyringe.config.ts`, `src/BasisCore.ts`, `src/ComponentCollection.ts`, `src/enum.ts`
- `src/wrapper/BCWrapperFactory.ts`, `src/wrapper/BCWrapper.ts`, `src/wrapper/UtilWrapper.ts`, `src/wrapper/SourceWrapper.ts`
- `src/options/HostOptions.ts`, `src/options/IHostOptions.ts`, `src/options/connection-options/*.ts`
- `src/component/Component.ts`, `src/component/ElementBaseComponent.ts`, `src/component/CommandComponent.ts`, `src/component/SourceBaseComponent.ts`, `src/component/**`
- `src/context/Context.ts`, `src/context/RootContext.ts`, `src/context/BasisCoreRootContext.ts`, `src/context/LocalRootContext.ts`, `src/context/LocalContext.ts`
- `src/repository/Repository.ts`, `src/repository/LocalDataBase.ts`
- `src/RangeObject/RangeObject.ts`
- `src/component/renderable/base/RenderableComponent.ts`, `RenderParam.ts`, `FaceRenderResult.ts`, `TreeFaceRenderResult.ts`, `FaceRenderResultRepository.ts`, `FaceCollection.ts`
- `src/logger/ConsoleLogger.ts`, `src/logger/ILogger.ts`
- `src/exception/ClientException.ts`, `src/exception/ConfigNotFoundException.ts`, `src/exception/InvalidPropertyValueException.ts`
- `src/extension/StringExtensions.ts`, `src/extension/ElementExtensions.ts`
- `webpack.config.js`, `tsconfig.json`, `package.json`
- `server/api-server.js`, `server/schema-server.js`, `server/blob-server.js`, `server/asset-server.js`, `server/chunk-server.js`, `server/validation-server.js`, `server/websocket.js`
