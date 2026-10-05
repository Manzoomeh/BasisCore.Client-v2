# Host Configuration

The `host` object is the configuration contract between a page and the BasisCore Client runtime. It decides whether the page renders automatically, where AlaSQL is loaded from, which connections exist and how they are reached, which sources are available before any command runs, where user-defined components come from, and whether a service worker and Web Push are activated. The same shape (`IHostOptions`) is accepted by `$bc.setOptions()` for one runtime instance and by the `options` attribute of a `group` command for one part of the page. Use this page whenever you need a setting's exact name, default value or resolution rule.

## Where options come from

Three layers are merged, each one filling only the keys the layer above left undefined (`lodash.defaultsdeep`):

1. The options of the instance: the object passed to `$bc.setOptions()` (or `{}` when none), or, inside a `group`, the evaluated `options` attribute.
2. The global `host` variable, if it exists when `HostOptions.defaultSettings` is first read (see [Getting started](getting-started.md#the-host-object)).
3. The built-in defaults listed below.

The result is the `HostOptions` object available to every component as `context.options`. Each layer is deep-cloned before merging, so later changes to your objects are not seen by the runtime. `HostOptions.originalOptions` keeps a clone of layer 1 alone; `group` uses it to inherit instance options without re-applying the merged defaults.

## `IHostOptions`

| Name | Type | Default | Description |
|---|---|---|---|
| `debug` | `boolean` | `false` | Accepted and stored on the options object. No code path in the library reads it |
| `autoRender` | `boolean` | `true` | Run the default instance over the whole document on `load` when no wrapper was created before that moment |
| `serviceWorker` | `boolean \| string` | `false` | `true` registers `basiscore-serviceWorker.js` (relative to the page); a string is the script URL to register; `false` registers nothing |
| `settings` | `IDictionary<any>` | see next section | Default values, binding syntax and `connection.*` definitions, read through `getSetting` / `getDefault` |
| `sources` | `IDictionary<SourceData>` | none | Sources published when the context is created, before any command runs |
| `dbLibPath` | `string` | `"/alasql.min.js"` | URL that AlaSQL is loaded from on first use when the global `alasql` does not exist |
| `repositories` | `IDictionary<string>` | `{}` | Component key prefix to script URL, used by `core="component.<key>"` |
| `push` | `IPushOptions` | none | Web Push subscription settings; only used after a service worker has been registered |

Top-level keys are matched exactly (`Object.assign`): `DbLibPath` or `AutoRender` are ignored and the default applies. Unknown keys are kept on the object but have no effect.

## Default settings

`HostOptions.defaultSettings.settings` contains these keys. Any of them can be overridden in `host.settings`, `setOptions({ settings })` or a group's `options`.

| Key | Default | Read by |
|---|---|---|
| `default.binding.regex` | `/\[##([^#]*)##\]/` | Token detection in text nodes, attributes and command attributes (`ComponentCollection`, `TokenUtil`) |
| `default.binding.codeblock-regex` | `/{{((?:[^{}][{}]?)*)}}/` | Code-block detection (`{{ ... }}`) in the same places |
| `default.binding.face-regex` | `/([^@]\|^)@(?:([^@\s]+)@\|([^@\s]+))/` | `@column@` and `@column` placeholders inside `<face>` and `<layout>` templates (`ContentTemplate`) |
| `default.call.verb` | `"POST"` | HTTP method of `call` when the command has no `method` and the connection has no `verb` |
| `default.dmnid` | `""` | The `dmnid` parameter sent with every `dbsource` request |
| `default.source.verb` | `"POST"` | HTTP method of a `web` connection's data request when the connection has no `verb` |
| `default.viewcommand.groupcolumn` | `"prpid"` | Grouping column of `view` when it has no `groupcol` |
| `default.source.heartbeatverb` | `"GET"` | HTTP method of a `web` connection's heartbeat request when the connection has no `heartbeatverb` |

The three regular expressions may be given as `RegExp` literals or as strings; a string is passed to `String.prototype.match`, which compiles it. Capture group 1 must contain the token body (for the face expression, groups 2 and 3). Changing `default.binding.regex` per instance or per group lets two syntaxes coexist on one page (see the example below).

## Settings resolution: `getSetting` and `getDefault`

```ts
getSetting<T>(key: string, defaultValue: T): T
getDefault<T>(key: string, defaultValue: T = null): T   // getSetting("default." + key, defaultValue)
```

Rules, in order:

1. The key is matched against the own property names of `settings` with `Util.isEqual`, which is `localeCompare` with `sensitivity: "accent"`: case is ignored, accents are not. `Default.Source.Verb` finds `default.source.verb`.
2. Exactly one property must match. When two keys differ only in case (`default.call.verb` and `Default.Call.Verb`), neither is used and the key counts as missing.
3. A falsy value (`""`, `0`, `false`, `null`, `undefined`) counts as missing.
4. When the key is missing and `defaultValue` is anything other than `undefined` (including `null`), `defaultValue` is returned.
5. Otherwise a `ConfigNotFoundException` is thrown with the message `In 'host.settings' object, property '<key>' not configured!`.

Because `getDefault` passes `null` when no fallback is given, `getDefault("x")` returns `null` for a missing or falsy setting and never throws. `getSetting(key, undefined)` is the form that throws. `ConnectionOptionsManager.getConnection(name)` throws the same exception type for an unknown connection name.

Two visible consequences of rule 3: the built-in `default.dmnid` of `""` resolves to `null`, and the parameter is sent as the text `null`; a `default.dmnid` of `0` behaves the same way. Give `dmnid` a non-empty string or a non-zero number.

User-defined components reach the same methods through their owner (`owner.getSetting`, `owner.getDefault`), see [User-defined components](user-defined-components.md).

## Connections: `connection.<provider>.<name>`

Every `settings` key whose first segment is `connection` declares a connection. `ConnectionOptionsManager` (created once per root context, including the context of a `group` with `options`) splits the key at the first two dots:

- segment 1: `connection` (case-insensitive);
- segment 2: the provider, trimmed and lowercased: `web`, `chunkbased`, `websocket`, `local`, `rest` or `push`;
- segment 3: the connection name, kept exactly as written. The split stops after three parts, so a name cannot contain a dot (`connection.web.my.api` declares a connection named `my`).

Commands refer to a connection by that name, matched exactly and case-sensitively: `<basis core="dbsource" source="shop">` needs `connection.web.shop`, not `connection.web.Shop`. `call` uses the connection named `callcommand` unless it has its own `url`.

An unknown provider (a typo such as `connection.wbe.shop`) does not produce a clear error: no options object is created and the manager fails with a `TypeError` while the context is being built, so the whole instance stops before any command runs.

### String and object forms

| Provider | String value | Object value |
|---|---|---|
| `web` | the URL | `{ url, verb?, heartbeat?, heartbeatverb? }`; `verb` and `heartbeatverb` are `"GET"` or `"POST"` and fall back to `default.source.verb` / `default.source.heartbeatverb` |
| `chunkbased` | the URL (method `GET`) | `{ Connection, method?, body?, bodyFactory?, onClose? }`; `bodyFactory` and `onClose` are functions or the names of global functions |
| `websocket` | the URL | `{ Connection }` |
| `local` | `"<script url>\|<FunctionName>"` (exactly one `\|`, otherwise `ClientException`) | `{ Url, Function }` |
| `rest` | the URL | `{ url, verb?, heartbeat?, heartbeatverb? }`; declared but every method throws `Method not implemented` or `LoadPageAsync Method not Supported In REST API Provider.` |
| `push` | the message `type` the service worker posts | not applicable; the value is used as the key |

Examples:

```js
var host = {
  settings: {
    "connection.web.shop": "/data/products.json",
    "connection.web.callcommand": { url: "/pages/", verb: "GET", heartbeat: "/health", heartbeatverb: "GET" },
    "connection.websocket.live": "wss://example.com/stream",
    "connection.chunkbased.feed": { Connection: "/chunk/feed", method: "POST", body: { topic: "news" } },
    "connection.local.cache": "/js/cache-provider.js|loadFromCache",
    "connection.push.alerts": "alerts"
  }
};
```

Transport details, request and response formats are in [Connections](connections.md).

## `sources`

`host.sources` publishes sources into the context as soon as it is created, before commands initialize. Keys are source ids (`name.member`) and are lowercased. Each value has one of two shapes:

| Form | Value | Result |
|---|---|---|
| Array | `[{ ... }, { ... }]` | The rows, with default source options (`mergeType: replace`, no key or status field) |
| Object | `{ data: [...], options: { mergeType?, keyFieldName?, statusFieldName?, extra? } }` | The rows with the given `ISourceOptions` |

```js
var host = {
  sources: {
    "app.config": [{ theme: "light", pageSize: 20 }],
    "inlineSource.users": {
      data: [{ id: 1, name: "Sara" }, { id: 2, name: "Reza" }],
      options: { keyFieldName: "id" }
    }
  }
};
```

`[##app.config.theme##]` and `datamembername="inlinesource.users"` read these immediately. A value that is neither an array nor an object with `data` publishes a single row `{ value: undefined }`. The same sources can be replaced later with `$bc.setSource`. Inside a `group` with `options`, the `sources` of the merged options are published again into the group's own scope. See [Sources and reactivity](sources-and-reactivity.md).

## `repositories`

`repositories` maps a component key prefix to the URL of a script that defines the component class under the same global name. `core="component.<key>"` resolves `<key>` with `$bc.util.getComponentAsync`:

1. `local.<Name>`: the class is `<Name>` in the page's global scope; no repository needed.
2. `basiscore.<Name>`: the class is a built-in export on the `basiscore` global (for example `basiscore.exposer`).
3. Anything else: the full key is looked up in `repositories`; when absent, the last `.segment` is removed and the lookup repeats until a prefix matches or nothing is left. The script at that URL is loaded once with `getLibAsync` and the global named by the full key is returned.

If no prefix matches, `ClientException: '<key>' related repository setting not found` is thrown.

```js
var host = {
  repositories: {
    "shop": "/components/shop.js",            // shop.cart, shop.cart.summary, ...
    "shop.reports": "/components/reports.js"  // longer prefix wins for shop.reports.*
  }
};
```

See [User-defined components](user-defined-components.md) and [component](commands/component.md).

## `serviceWorker`

When the merged options have a truthy `serviceWorker`, `BCWrapper.run()` registers a service worker once per page:

- `true` registers `basiscore-serviceWorker.js`, resolved relative to the page URL; a string registers that URL.
- Registration happens only for the first wrapper that asks for it (a static flag); later wrappers log `Try add service worker more than one.` and skip it.
- When `navigator.serviceWorker` does not exist, the library logs an error and shows an `alert`.
- On success the library logs `Service worker from '<path>' register successfully!` and, if `push` is configured, starts the push activation below.

The repository contains a sample worker, `src/ServiceWorker/ServiceWorker.ts`, but the webpack build has no entry for it, so no worker file is shipped in `dist/`. You provide the worker yourself. A worker that posts `{ type, message }` to its clients feeds `$bc.util.addMessageHandler(type, handler)`, which is how `connection.push.<name>` connections receive data. See [Service worker and push](service-worker-and-push.md).

## `push`

`IPushOptions`:

| Name | Type | Default | Description |
|---|---|---|---|
| `applicationServerKey` | `string` | required | VAPID public key, base64url; converted to a `Uint8Array` for `pushManager.subscribe` |
| `url` | `string` | required | Endpoint that receives the subscription by `POST` as `FormData`: `endpoint`, `p256dh`, `auth` (base64) and every entry of `params` |
| `params` | `IDictionary<string>` | none | Extra form fields appended before the subscription data |
| `permissionDlg` | `string \| (show: boolean) => void` | required when permission is not yet granted | A selector whose element gets `display: block` / `display: none`, or a function called with `true` to show and `false` to hide the permission prompt |
| `permissionSubmit` | `string` | required when permission is not yet granted | Selector of the button inside the dialog; its `click` calls `Notification.requestPermission()` |

Flow after the service worker registers: if `Notification.permission` is `granted`, the existing subscription is reused or a new one is created and posted to `url`; if it is `default`, the dialog is shown and the flow continues after the button is clicked; if it is `denied`, or the browser lacks `Notification`, an error is logged and an `alert` is shown. Every failure along the way (subscribe, fetch, non-2xx response) is logged and alerted.

```js
var host = {
  serviceWorker: "/sw.js",
  push: {
    applicationServerKey: "BOr...publicVapidKey",
    url: "/push/subscribe",
    params: { userId: "42" },
    permissionDlg: "#push-dialog",
    permissionSubmit: "#push-dialog button"
  },
  settings: {
    "connection.push.alerts": "alerts"
  }
};
```

## Per-instance options: `$bc.setOptions`

`$bc.setOptions(options)` (or `wrapper.setOptions`) stores a partial `IHostOptions` until `run()`; calling it after `run()` throws `Can't set option for already builded bc object.` At `run()` the stored object is registered as `IHostOptions` for the instance and `HostOptions` computes:

```ts
merged = defaultsDeep(cloneDeep(instanceOptions), HostOptions.defaultSettings)
// where HostOptions.defaultSettings = defaultsDeep(cloneDeep(host), builtInDefaults)
```

Precedence is therefore instance options, then global `host`, then built-in defaults, key by key at every depth. `settings`, `sources` and `repositories` are merged as dictionaries, so an instance can add one connection without repeating the others. `defaultsDeep` also merges arrays element by element: an instance `sources` entry `[rowA]` over a `host` entry `[row1, row2]` yields `[rowA, row2]`, so give array-valued sources a different id per instance, or use `$bc.setSource` after `run()`.

```js
var host = { settings: { "connection.web.api": "/api/", "default.source.verb": "GET" } };
// ...
$bc.new()
  .addFragment("#reports")
  .setOptions({ settings: { "connection.web.api": "/reports-api/" } }) // other settings inherited
  .run();
```

`$bc.setOptions` applies to the default wrapper and creates it, which disables auto-render on `load`; end the chain with `.run()`.

## Per-region options: `group`

`<basis core="group" run="atclient" options="...">` gives the commands and tokens inside it their own root context (`LocalRootContext`) with their own options:

1. The `options` attribute is read as a token, so it may be a literal or a token such as `[##rep.current.options##]` that resolves to an object.
2. The resulting value is passed to `eval`. A string must evaluate to an object: the name of a global variable, or an object literal in parentheses (`options="({ settings: { 'default.dmnid': 7 } })"`). A value that is already an object is used as is.
3. The object is merged with `defaultsDeep(evaluated, context.options.originalOptions)`, where `originalOptions` are the un-merged options of the enclosing context: the wrapper's `setOptions` object for a top-level group, or the enclosing group's merged object for a nested group.
4. That object becomes the `IHostOptions` of a new `HostOptions`, which merges it over `defaultSettings` (global `host` plus built-ins) as usual.

Precedence inside the group: group `options`, then enclosing instance or group options, then global `host`, then built-in defaults. The group's context builds its own `ConnectionOptionsManager` from the merged settings and publishes the merged `sources` into its own scope. Sources that the group does not define are read from the enclosing context, and updates made outside the group are forwarded into it. A group without `options` shares the enclosing options object unchanged.

```html
<basis core="group" run="atclient" options="reportOptions">
  Updated at {cms.cms.time}
  <basis core="print" run="atclient" datamembername="report.rows">
    <face><div>@title@</div></face>
  </basis>
</basis>
<script>
  const reportOptions = {
    settings: {
      "default.binding.regex": /\{([^\{\}]*)\}/,
      "connection.web.reports": "/reports-api/"
    },
    sources: {
      "report.rows": [{ title: "Q1" }, { title: "Q2" }]
    }
  };
</script>
```

Outside the group `[##cms.cms.time##]` is the token syntax; inside it `{cms.cms.time}` is. See [group](commands/group.md).

## Examples

### A complete `host`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script>
    var host = {
      debug: false,
      autoRender: true,
      dbLibPath: "/libs/alasql.min.js",
      serviceWorker: false,
      settings: {
        "connection.web.shop": "/data/products.json",
        "connection.web.callcommand": "/fragments/",
        "default.dmnid": 1,
        "default.source.verb": "GET",
        "default.call.verb": "GET"
      },
      sources: {
        "app.config": [{ theme: "light" }]
      },
      repositories: {
        "shop": "/components/shop.js"
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
</head>
<body class="[##app.config.theme##]">
  <basis core="dbsource" run="atclient" name="shop" source="shop">
    <member name="products" sort="price desc"></member>
  </basis>
  <basis core="print" run="atclient" datamembername="shop.products">
    <layout><ul>@child</ul></layout>
    <face><li>@name@: @price@</li></face>
  </basis>
</body>
</html>
```

`sort` on the member makes the page load AlaSQL from `/libs/alasql.min.js`; the `products` source is published under `shop.products`; the `body` class is bound to the start-up source `app.config`.

### Two syntaxes on one page with `setOptions`

```html
<script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
<div id="a">Hello [##user.name.value|(guest)##]</div>
<div id="b">Hello {user.name.value|(guest)}</div>
<script>
  const a = $bc.new().addFragment("#a").run();
  const b = $bc.new().addFragment("#b")
    .setOptions({ settings: { "default.binding.regex": /\{([^\}]*)\}/ } })
    .run();
  a.setSource("user.name", "Sara");
  b.setSource("user.name", "Reza");
</script>
```

### Group options from a source row

Each repeated group gets the options stored in its row, here a different `data.test` source per group (from `example/component/collection/group/custom-options/binding`).

```html
<script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
<basis core="repeater" name="rep" datamembername="page.data" run="atclient" replace="false">
  <basis core="group" run="atclient" options="[##rep.current.options##]">
    <fieldset>
      <legend>[##rep.current.title##]</legend>
      <basis core="print" datamembername="data.test" run="atclient">
        <layout><ul>@child</ul></layout>
        <face><script type="text/template"><li>@id - @name@</li></script></face>
      </basis>
    </fieldset>
  </basis>
</basis>
<script>
  $bc.setSource("page.data", [
    { title: "Group#1", options: { sources: { "data.test": [{ id: 1, name: "Data#1" }, { id: 2, name: "Data#2" }] } } },
    { title: "Group#2", options: { sources: { "data.test": [{ id: 3, name: "Data#3" }, { id: 4, name: "Data#4" }] } } }
  ]);
</script>
```

## Pitfalls

- `host` is read once and cached when `HostOptions.defaultSettings` is first accessed (the `load` event or the first `run()`), and every option is deep-cloned. Define it before the library tag; later edits do nothing.
- Top-level keys are case-sensitive (`DbLibPath` is ignored), while `settings` keys are matched case-insensitively. Two `settings` keys that differ only in case cancel each other out.
- Falsy setting values are treated as missing. `"default.dmnid": ""` (the built-in default) and `0` both send `dmnid=null`.
- `getDefault(key)` returns `null` for a missing key; only `getSetting(key, undefined)` throws `ConfigNotFoundException`.
- Verbs are compared case-sensitively by the `web` connection: `"get"` is not `"GET"` and results in a GET request with a body, which the browser rejects. Write `"GET"` and `"POST"`.
- Connection names are matched exactly and cannot contain dots; provider names are lowercased. A misspelled provider breaks the whole instance with a `TypeError` during start-up.
- The `rest` provider is declared but all its methods throw.
- `defaultsDeep` merges arrays index by index, so an array-valued `sources` entry in `setOptions` or a group is padded with the elements of the same entry from `host`.
- A group `options` attribute holding an object literal must be wrapped in parentheses; `eval("{ ... }")` parses a block statement, not an object.
- `serviceWorker: true` expects `basiscore-serviceWorker.js` next to the page; the build does not produce this file. Failures show a browser `alert`, as do push subscription failures.
- `debug` has no effect in 2.39.6.

## Related

- [Getting started](getting-started.md)
- [Connections](connections.md)
- [Sources and reactivity](sources-and-reactivity.md)
- [Binding and tokens](binding-and-tokens.md)
- [Client-side SQL](client-side-sql.md)
- [User-defined components](user-defined-components.md)
- [Service worker and push](service-worker-and-push.md)
- [JavaScript API](javascript-api.md)
- [group](commands/group.md), [dbsource](commands/dbsource.md), [call](commands/call.md), [view](commands/view.md), [component](commands/component.md)
- [Troubleshooting](troubleshooting.md)

## Source files

- `src/options/HostOptions.ts`
- `src/options/IHostOptions.ts`
- `src/options/IContextHostOptions.ts`
- `src/options/IPushOptions.ts`
- `src/options/connection-options/ConnectionOptionsManager.ts`
- `src/options/connection-options/UrlBaseConnectionOptions.ts`
- `src/options/connection-options/WebConnectionOptions.ts`
- `src/options/connection-options/ChunkBasedConnectionOptions.ts`
- `src/options/connection-options/WebSocketConnectionOptions.ts`
- `src/options/connection-options/LocalStorageConnectionOptions.ts`
- `src/options/connection-options/RESTConnectionOptions.ts`
- `src/options/connection-options/PushConnectionOptions.ts`
- `src/context/RootContext.ts`
- `src/context/BasisCoreRootContext.ts`
- `src/context/LocalRootContext.ts`
- `src/wrapper/BCWrapper.ts`
- `src/wrapper/UtilWrapper.ts`
- `src/component/collection/GroupComponent.ts`
- `src/component/source/MemberBaseSourceComponent.ts`
- `src/exception/ConfigNotFoundException.ts`
- `src/Util.ts`
- `src/type-alias.ts`
