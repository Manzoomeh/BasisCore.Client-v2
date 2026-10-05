# Connections

A connection is a named transport that BasisCore Client uses to talk to a server or to a local data function. Connections are declared in `host.settings` with keys of the form `connection.<provider>.<name>` and are consumed by two commands: `dbsource` loads sources through `loadDataAsync`, and `call` loads HTML fragments through `loadPageAsync`. Six providers are registered: `web` (plain HTTP), `websocket`, `chunkbased` (HTTP streaming), `local` (a JavaScript function), `push` (service worker messages) and `rest` (declared, not implemented). This page documents the naming rules, the shared contract, the server response envelope, each provider in detail and how to write a server for `dbsource`.

## Declaring connections

`ConnectionOptionsManager` is created once per root context from `host.settings`. It walks every key of `settings`, splits it on `.` into at most three parts and keeps the keys whose first part is `connection`:

| Part | Rule |
|---|---|
| `connection` | Compared case-insensitively (`Connection.web.x` also works). |
| `<provider>` | Trimmed and lowercased: `chunkBased`, `ChunkBased` and `chunkbased` are the same provider. |
| `<name>` | Kept exactly as written (case preserved, not trimmed). This is the value that `source="..."` on `dbsource` must match. |

```javascript
var host = {
  settings: {
    "connection.web.bookapi": "data/book.json",
    "connection.web.callcommand": "call/",
    "connection.websocket.live": "ws://localhost:8080/time",
    "connection.chunkBased.feed": { Connection: "/chunk/chunk-stream-post", method: "POST" },
    "connection.local.cache": "/js/local-provider.js|getTables",
    "connection.push.alerts": "test"
  }
};
```

Rules that follow from the implementation:

- The key is split with `split(".", 3)`, so a name that itself contains a dot is cut: `connection.web.a.b` registers a connection named `a`.
- Lookup is by exact name (`Map.get`). `source="BookApi"` does not find `connection.web.bookapi`.
- A connection name that is not registered throws `ConfigNotFoundException`: `In 'host.settings' object, property '<name>' not configured!`.
- A provider that is not one of the six listed below is not handled by the `switch`, and the manager then dereferences an undefined object. The page fails during startup with a `TypeError`, so a typo in the provider segment breaks the whole host, not just that connection.
- Connections are built eagerly when the context is created. Constructor-time errors (for example an invalid `local` setting) therefore surface at startup.

## Who uses a connection

| Command | Method called | Connection used |
|---|---|---|
| `dbsource` | `loadDataAsync` | The connection named by the `source` attribute. |
| `call` | `loadPageAsync` | The connection named `callcommand`, or an ad-hoc `web` connection built from the `url` attribute. |

`inlinesource` and `api` do not use connections. `RootContext.loadDataAsync` and `RootContext.loadPageAsync` are the only two entry points; child contexts forward to the root.

### What `dbsource` sends

`MemberBaseSourceComponent.loadDataAsync` builds one parameter object for every request:

```javascript
{
  command: "<basis core=\"dbsource\" ...>...</basis>",  // outerHTML with all tokens resolved
  dmnid: <value of default.dmnid>
}
```

`command` is the serialized markup of the `dbsource` element after `[##...##]` tokens in attributes and content have been replaced, so the server receives the resolved filter values. `dmnid` is `default.dmnid` from settings; when it is not configured the value is `null`, which `fetchAjax` serializes as the string `null` in the form body or query string, and which the WebSocket and chunk providers send as JSON `null`.

### How results are mapped to members

The provider hands back an array of `Data` objects. `processLoadedDataSet` requires the array to have exactly as many items as there are `<member>` elements and throws otherwise:

```
Command 'book' has 2 member(s) but 1 result(s) returned from source!
```

Mapping is positional: the first source in the response goes to the first member, and so on. The published source id is `<dbsource name>.<member name>` lowercased. The `tableName` the server sends is stored on the intermediate `Data` object but does not decide the published name. Each member then applies `postsql` and `sort` (through AlaSQL), adds `rownumber`, and publishes a `Source` carrying the response `options`.

## The `ConnectionOptions` contract

Every provider extends the abstract class `ConnectionOptions` (`src/options/connection-options/ConnectionOptions.ts`):

| Member | Signature | Purpose |
|---|---|---|
| `Name` | `string` | The `<name>` part of the setting key. |
| `TestConnectionAsync` | `(context) => Promise<boolean>` | Connectivity probe. The library itself never calls it in this version; `IContext.checkSourceHeartbeatAsync`, the only place that refers to heartbeats, throws `Method not implemented.`. |
| `loadDataAsync` | `(context, sourceId, parameters, onDataReceived) => Promise<void>` | Load one or more sources. `onDataReceived(Data[])` returns `boolean`; returning `false` tells a streaming provider to stop. Streaming providers return a `StreamPromise`. |
| `loadPageAsync` | `(context, pageName, parameters, method?) => Promise<string>` | Load raw HTML for `call`. Only `web` implements it. |
| `ParseJsonString` | `(json) => ParsedData` | Parses a JSON string and calls `ConvertObject`. Throws `ClientException` `Invalid Json Format:...`. Not used by any built-in provider. |
| `ConvertObject` | `(obj) => ParsedData` | Converts the column-array table format into `{ Setting, Tables: [{Key, Value}] }`. Used by the `local` provider. |

### The column-array table format (`ConvertObject`)

`ConvertObject` expects an object whose keys are table names and whose values are arrays where the first element is the list of column names and every following element is a row of values. The optional `_` key is copied to `Setting` and skipped as a table.

```json
{
  "_": { "anything": "optional settings" },
  "list": [
    ["id", "name", "age"],
    [1, "ali", 30],
    [2, "sara", 25]
  ],
  "type": [
    ["id", "Name"],
    [1, "book"]
  ]
}
```

`shift()` is called on each table array to remove the header row, so the input object is mutated. Column names are used as written (case preserved).

### `StreamPromise`

`WebSocketConnectionOptions` and `ChunkBasedConnectionOptions` return a `StreamPromise<void>` (`src/options/connection-options/StreamPromise.ts`), a `Promise` subclass with:

| Member | Description |
|---|---|
| `connectionName` | The connection `Name` the stream was opened on. |
| `isOpen` | `true` while the provider has a live socket (or stream reader) registered for the source id. |
| `send(parameters)` | Calls `send(JSON.stringify(parameters))` on the live socket. |

`MemberBaseSourceComponent` keeps the `StreamPromise` of the first load. When the command is triggered again and `isOpen` is `true`, it does not open a new connection: it calls `send(params)` with the freshly resolved `command`. If the `source` attribute now resolves to a different connection it throws `ClientException`: `Source attribute can't change when socket is open . Valid connection is '<name>'`. A `StreamPromise` is not awaited by `dbsource`, so the command finishes its own run before any data arrives.

## Server response envelope

The `web`, `websocket`, `chunkbased` and `push` providers all consume the same JSON envelope, typed in `src/type-alias.ts`:

```typescript
interface IServerResponse<T> {
  setting?: { keepalive?: boolean };
  sources: Array<IServerResponseSource<T>>;
}
interface IServerResponseSource<T> {
  data?: Array<T>;
  options: IServerResponseSourceOptions;
}
interface IServerResponseSourceOptions extends ISourceOptions {
  tableName: string;
  extra?: any;
}
interface ISourceOptions {
  mergeType?: MergeType;      // 0 = replace, 1 = append
  keyFieldName?: string;
  statusFieldName?: string;
  extra?: any;
}
```

A complete response for a `dbsource` with two members:

```json
{
  "setting": { "keepalive": true },
  "sources": [
    {
      "options": { "tableName": "book.list", "mergeType": 0, "keyFieldName": null, "statusFieldName": null },
      "data": [ { "id": 1, "BookName": "Web Design", "Price": 14000, "Count": 1 } ]
    },
    {
      "options": { "tableName": "book.Type", "mergeType": 0 },
      "data": [ { "id": 1, "Name": "site" }, { "id": 2, "Name": "design" } ]
    }
  ]
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `setting.keepalive` | boolean | undefined | Streaming providers only. `false` (explicitly present and falsy) makes the client close the socket or stop reading the stream after processing the frame. `web` ignores it. |
| `sources[].data` | array or object | | Rows. An array is used as is; a single object becomes a one-row table; a scalar becomes `[{ value }]`. |
| `sources[].options.tableName` | string | | Required for `web`, `websocket` and `chunkbased` (`x.options.tableName` is read without a null check). `push` falls back to `cms.no-name`. |
| `sources[].options.mergeType` | number | `0` (replace) | `0` replaces the existing source, `1` appends or upserts. Must be numeric. |
| `sources[].options.keyFieldName` | string | undefined | Column that identifies a row for upsert and delete in append mode. |
| `sources[].options.statusFieldName` | string | undefined | Column holding the row status in append mode: `0` added, `1` edited, `2` deleted (`DataStatus`). |
| `sources[].options.extra` | any | undefined | Opaque value stored on the published `Source.extra` and carried through `cloneOptions()`. The library does not interpret it. |

### How `options` drive merging

`Repository.setSourceEx` applies the options of the incoming source against the source already published under the same id:

- `mergeType == 0` (replace): the existing rows are replaced in place and every row version is incremented. The new options (`mergeType`, `keyFieldName`, `statusFieldName`, `extra`) overwrite the old ones.
- `mergeType == 1` (append), no `keyFieldName` on both old and new source: the new rows are added to the end.
- `mergeType == 1` with `keyFieldName` on both: each new row is inspected. Its status is `statusFieldName` if configured, otherwise `0` (added). Added rows are pushed; for edited (`1`) and deleted (`2`) rows the old row with the same key is replaced or removed. A row whose key is not found is ignored unless its status is added.
- The first publication of an id stores the source as is, whatever the merge type.

The comparison is `==` against the numeric enum, so a string such as `"replace"` or `"append"` matches neither branch and the source is never stored in the repository, although the "Added" log line is still written. Always send numbers.

The `websocket.js` mock server shows the two common patterns: a clock that replaces one row every second (`mergeType: 0`) and a user list that appends one row every two seconds (`mergeType: 1`).

## Provider comparison

| Provider | Transport | Setting shape | `dbsource` (`loadDataAsync`) | `call` (`loadPageAsync`) | Streaming | Reconnect |
|---|---|---|---|---|---|---|
| `web` | `fetch` (data) and `XMLHttpRequest` (pages) | string URL or `{ url, verb, heartbeat, heartbeatverb }` | yes, one response per request | yes (only provider) | no | n/a |
| `websocket` | `WebSocket` | string URL or `{ Connection }` | yes, envelope per message | throws | yes | up to 5 attempts after an error |
| `chunkbased` | `fetch` with streaming body | string URL or `{ Connection, method, body, bodyFactory, onClose }` | yes, envelopes per chunk | throws | yes | none (`maxRetry` declared, unused) |
| `local` | in-page JavaScript function | `"url|FunctionName"` or `{ Url, Function }` | yes, column-array result | throws | no | n/a |
| `push` | service worker `message` events | message type string | yes, subscribes to future messages | throws | yes (event driven) | n/a |
| `rest` | none | same as `web` | throws | throws | no | n/a |

## `web` provider

Class: `WebConnectionOptions` (extends `UrlBaseConnectionOptions`).

### Setting

| Name | Type | Default | Description |
|---|---|---|---|
| string form | `string` | | The URL. `verb`, `heartbeat` and `heartbeatverb` stay undefined. |
| `url` | `string` | | Base URL for data requests, and prefix for page names in `call`. |
| `verb` | `"GET"` or `"POST"` | `default.source.verb` (`POST`) for data | HTTP method for `loadDataAsync`. Not consulted by `call`, which always passes its own method. |
| `heartbeat` | `string` | undefined | URL probed by `TestConnectionAsync`. |
| `heartbeatverb` | `"GET"` or `"POST"` | `default.source.heartbeatverb` (`GET`) | Method used for the heartbeat probe. |

### `loadDataAsync` (`fetchAjax`)

1. Method is `Verb ?? default.source.verb`.
2. If the method is exactly the string `"GET"`, the parameters (`command`, `dmnid`) are appended as a query string, using `&` when the URL already contains `?`. For any other value the parameters are sent as an `application/x-www-form-urlencoded` body.
3. `fetch` is called with `credentials: "omit"`, so cookies are never sent, even to the same origin.
4. A non-2xx response throws `Error("HTTP error! status: <n>")`.
5. The response text is parsed with `JSON.parse` and `sources` is mapped to `Data(tableName, data, options)`. `setting` is ignored; there is no keepalive handling because the request is complete.

The comparison in step 2 is case-sensitive. `"default.source.verb": "get"` is not equal to `"GET"`, so a body is attached and the browser rejects the request (`fetch` does not allow a body on GET). Write `GET` in upper case.

`loadDataAsync` returns a plain `Promise`, so a `dbsource` on a `web` connection awaits it and sends a new request on every trigger.

### `loadPageAsync` (`xmlAjax`)

Used by `call`. The request URL is `${url}${pageName ?? ""}` (plain concatenation, no slash is inserted). The method is `method ?? verb ?? default.call.verb`, uppercased.

- `XMLHttpRequest` with `timeout = 15000` ms.
- `GET`: parameters are collected but not sent; the code that would append them as a query string is commented out with a TODO. A GET `call` therefore reaches the server without `fileNames` or `siteSize`.
- `POST`, `PUT`, `PATCH`: parameters are sent as an `application/x-www-form-urlencoded` body; entries whose value is `null` or `undefined` are skipped.
- Any method other than `GET` gets the `Content-Type` header.
- Resolves with `responseText` on 2xx; rejects with `Error("HTTP <status>: <responseText or Error>")`, `Error("Network error")` or `Error("Request timeout")`.

### `TestConnectionAsync`

If `heartbeat` is set, performs one `xmlAjax` request to it with `heartbeatverb ?? default.source.heartbeatverb` and resolves `true` on success, `false` on any failure. Without `heartbeat` it resolves `true`. Nothing in the library calls this method in the current version.

### `callcommand` and the `url` attribute

`RootContext.loadPageAsync(pageName, parameters, method, url)` picks the provider:

- with a `url` argument, it creates `new WebConnectionOptions(url, url)` on the fly (name and URL are both the raw URL, `verb` undefined);
- otherwise it calls `connections.getConnection("callcommand")`. Without `connection.web.callcommand` in settings, `call` fails with `ConfigNotFoundException`.

`CallComponent` resolves `method` from its `method` attribute or `default.call.verb` (`POST` by default) and uppercases it. For `POST` it sends every attribute of the element except `core`, `run`, `file`, `method` and `pagesize`, keyed by the lowercased attribute name with its token-resolved value. For other methods it builds `{ fileNames, siteSize }`, which `xmlAjax` then drops for GET. The returned HTML is inserted in place of the command and processed for nested `<basis>` commands.

## `websocket` provider

Class: `WebSocketConnectionOptions`.

### Setting

| Name | Type | Default | Description |
|---|---|---|---|
| string form | `string` | | WebSocket URL (`ws://` or `wss://`). |
| `Connection` | `string` | | Same URL in object form. No other property is read. |
| `maxRetry` | number | `5` | Fixed in the class; not configurable. |

### Lifecycle of `loadDataAsync`

1. If a socket is already registered for this `sourceId` (the `dbsource` name) it is closed first, logging `Disconnect from <url> by client request`.
2. A `StreamPromise` is returned and `new WebSocket(url)` is opened.
3. `onopen`: the socket is stored in `activeSockets` under the source id, `<url> Connected` (or `Reconnected`) is logged, and the parameters are sent as the first frame: `{"command":"<markup>","dmnid":...}`. The server must expect this frame; `websocket.js` parses `data.command` with a regular expression to read the `counter` attribute.
4. `onmessage`: the frame is parsed as `IServerResponse`.
   - If `setting.keepalive` is present and falsy, `Disconnect from <url> by server request` is logged and the socket is closed. Sources in the same frame are still processed before the close event fires.
   - If `sources` is non-empty, it is mapped to `Data` and passed to `onDataReceived`. When the receiver returns `false` (the `dbsource` was disposed), `Disconnect from <url> by receiver request. maybe disposed!` is logged and the socket is closed.
   - A parse or processing error is logged as `Error in process WebSocket received message` and the socket stays open.
5. `onerror`: `Error On '<url>'` is logged and the error is remembered.
6. `onclose`: the socket is removed from `activeSockets`. If an error preceded the close, `Try reconnect To <url>` is logged and, while the attempt counter is below `maxRetry`, a new socket is opened. The counter counts every attempt including the first and is never reset, so one `loadDataAsync` makes at most five connection attempts in total; after that the `StreamPromise` rejects with the last error. A close without a prior error resolves the promise and logs `<url> Disconnected`.

There is no application-level ping. `TestConnectionAsync` resolves `true` without doing anything. `loadPageAsync` throws `Error("WebSocket call not implemented.")`.

### Sending new parameters on an open socket

When a `dbsource` bound to a WebSocket connection is triggered again while the socket is open, `MemberBaseSourceComponent` calls `StreamPromise.send(params)` instead of opening a second socket. The server receives another `{command, dmnid}` frame on the same connection. The `send-data` example uses this to extend a countdown from a form:

```html
<form name="test.counter" bc-triggers="submit">
  <input type="number" name="value" min="5" max="30" value="10" />
  <input type="submit" />
</form>
<basis core="dbsource" source="simple" counter="[##test.counter.value|(10)##]"
       name="stream" run="atclient" triggers="test.counter">
  <member name="time" />
</basis>
```

## `chunkbased` provider

Class: `ChunkBasedConnectionOptions`. The server keeps one HTTP response open and writes JSON envelopes into it over time; the client reads the body as a stream and publishes each envelope as soon as it can be parsed.

### Setting

| Name | Type | Default | Description |
|---|---|---|---|
| string form | `string` | | URL, requested with `GET` and no body. |
| `Connection` | `string` | | URL in object form. |
| `method` | `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD` | `GET` | HTTP method. |
| `body` | object | undefined | Static JSON body for non-GET methods. |
| `bodyFactory` | function or string | undefined | `(context, sourceId, parameters) => object`. Wins over `body`. A string is passed through `eval` and must evaluate to a function (for example the name of a global function). |
| `onClose` | function or string | undefined | `({ withError, context }) => void`, called once when the stream ends. A string is `eval`'d like `bodyFactory`. |
| `maxRetry` | number | `5` | Declared on the class, never read. There is no reconnect. |

### Request

- `GET`: no body. The `command` and `dmnid` parameters are not sent at all (they are not appended to the URL either). Use the string form only when the server does not need them.
- Any other method: body is `JSON.stringify(bodyFactory(...))` when `bodyFactory` is set, otherwise `JSON.stringify(body)` when `body` is truthy, otherwise `JSON.stringify(parameters)`. `Content-Type: application/json` is always set.
- The response status is not checked. A 404 or 500 body is read as a stream like any other.

### Reading the stream

The reader loop decodes chunks with `TextDecoder` into a `remain` buffer and calls `extractNextJSON(remain, validMinPosition)`:

1. Find the first `{` and the last `}` in the buffer.
2. While the last `}` is after the first `{` and at or beyond `validMinPosition`, try `JSON.parse("[" + candidate + "]")` on the text between them. On success return the resulting array of envelopes and the position just after the `}`.
3. On `SyntaxError` (the candidate is incomplete), move to the previous `}` and try again. Other errors are written with `console.error`.
4. Return `null` when nothing parses; the buffer is kept for the next chunk.

`validMinPosition` is the buffer length before the new chunk was appended, so only candidates that end inside freshly received bytes are tried. On the final read it is lowered by 50 characters so the tail of the stream can be parsed. Wrapping in `[...]` is why envelopes must be top-level objects separated by commas: `{...},{...},{...}`. A leading `[` and the separating commas are skipped because extraction starts at the first `{`.

For every extracted envelope:

- `setting.keepalive` present and falsy: `Disconnect from <url> by server request` is logged and the loop ends after this chunk.
- `sources`: mapped to `Data` and passed to `onDataReceived`; a `false` return logs `Disconnect from <url> by receiver request. maybe disposed!` and ends the loop.

When the loop ends, whatever is left in `remain` must be empty or exactly `,null]`. Otherwise `Invalid remain part of json` is written with `console.error` and `withError` becomes `true`; on success `End of chunked data...` is written. Then the reader is removed from `activeFetch`, the `StreamPromise` resolves, `<url> Disconnected` is logged and `onClose({ withError, context })` runs if configured. The reader is not cancelled explicitly when the client decides to stop, so the server notices the end of the connection only when the browser releases it.

Errors thrown by `fetch` itself or by `reader.read()` (network failure, aborted response) are not caught: the `StreamPromise` never settles, `onClose` is not called and the `activeFetch` entry remains.

### Server side

Routes from `server/chunk-server.js`, mounted at `/chunk` by the development server (`webpack.config.js`):

```javascript
router.get("/chunk-stream", async function (req, res) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.write("[");
  const interval = setInterval(() => {
    const chunk = JSON.stringify(generateRandomData()) + ",";
    res.write(chunk);
  }, 1000);
  req.on("close", () => {
    clearInterval(interval);
    res.write("null]");
    res.end();
  });
});

function generateRandomData() {
  return {
    sources: [
      {
        options: { tableName: "user.list", mergeType: 1 },
        data: [{ id: id++, age: Math.floor(Math.random() * 80) + 10,
                 name: Math.random().toString(36).substring(7) }],
      },
    ],
  };
}
```

`/chunk-stream-post` is the same route for `POST`; `/chunk-stream-for-callback` stops after five envelopes and writes `null]`; `/chunk-data` (`POST`) replays a fixed array of envelopes every 500 ms. The whole response is therefore one valid JSON array: `[` + `{...},` repeated + `null]`.

## `local` provider

Class: `LocalStorageConnectionOptions`. The "server" is a JavaScript function loaded into the page.

### Setting

| Name | Type | Default | Description |
|---|---|---|---|
| string form | `"url|FunctionName"` | | Exactly two parts separated by `|`; anything else throws `ClientException` `For Local Storage Connection '<name>', Setting In Not Valid` at startup. |
| `Url` | `string` | | Script URL in object form. |
| `Function` | `string` | | Name (or dotted path) of the function, evaluated in global scope. |

### Behavior

- On first use the function is loaded with `$bc.util.getLibAsync(FunctionName, Url)`: if `typeof FunctionName` is already defined nothing is loaded; otherwise a `<script src="Url">` is appended to `<head>` (an existing script element with the same `src` is reused) and the function is `eval`'d once the script fires `load`. The result is cached on the connection.
- `loadDataAsync` calls `Function(parameters)` with the `{ command, dmnid }` object, awaits the result and converts it with `ConvertObject`. Each table becomes `Data(tableName, rows)` without options, so every published source uses replace semantics. The number of tables must match the number of members.
- `TestConnectionAsync` loads the script and resolves `true` when a function name is configured.
- `loadPageAsync` throws `ClientException` `LoadPageAsync Method not Supported In LocalStorage Provider.`.

```javascript
// /js/local-provider.js
async function getTables(parameters) {
  // parameters.command is the resolved dbsource markup, parameters.dmnid the default dmnid
  return {
    list: [
      ["id", "name", "age"],
      [1, "ali", 30],
      [2, "sara", 25]
    ]
  };
}
```

## `push` provider

Class: `PushConnectionOptions`. Data arrives through the service worker instead of a request.

### Setting

| Name | Type | Default | Description |
|---|---|---|---|
| value | `string` | | The message `type` to listen for. |

### Behavior

- The constructor calls `$bc.util.addMessageHandler(type, processMessage)`. `UtilWrapper` listens to `navigator.serviceWorker` `message` events after `window` `load` and dispatches on `event.data.type`, passing `event.data.message` to the handlers. When the browser has no `serviceWorker` support, `addMessageHandler` returns `false` and nothing is registered.
- A message is expected to be an `IServerResponse`. `push message receive` is written to the console; when `sources` is present each entry becomes `Data(options?.tableName ?? "cms.no-name", data, options)` and every receiver registered through `loadDataAsync` is called. Return values of receivers are ignored, so a disposed `dbsource` keeps receiving until the page unloads (its own `disposed` check prevents publishing).
- `loadDataAsync` only adds the receiver and resolves immediately; the `dbsource` completes without data. Each trigger of the `dbsource` adds another receiver, so a `push` `dbsource` should not use `triggers`.
- `TestConnectionAsync` throws `Error("TestConnection not support in PushConnectionOptions.")` and `loadPageAsync` throws `Error("loadPage not support in PushConnectionOptions.")`.

The service worker must post the payload to the page with `client.postMessage(...)`. With the example worker (`example/component/source/dbsource/push/simple/basiscore-serviceWorker.js`), which forwards `e.data.json()` unchanged, the push payload sent by the server is:

```json
{
  "type": "test",
  "message": {
    "sources": [
      { "options": { "tableName": "stream.time", "mergeType": 0 },
        "data": [ { "hh": 10, "mm": 20, "ss": 30, "remain": 5 } ] }
    ]
  }
}
```

Registration of the worker and the push subscription (`host.serviceWorker`, `host.push`) are described in [service-worker-and-push.md](service-worker-and-push.md).

## `rest` provider

Class: `RESTConnectionOptions`. It accepts the same setting shape as `web` (`UrlBaseConnectionOptions`) but every method throws: `TestConnectionAsync` and `loadDataAsync` throw `Error("Method not implemented.")`, `loadPageAsync` throws `ClientException` `LoadPageAsync Method not Supported In REST API Provider.`. Declaring `connection.rest.*` does not fail at startup; using it fails at the first request.

## Writing a server for `dbsource`

1. Accept the request the provider makes: a form-encoded or query-string `command` and `dmnid` for `web`, a first JSON frame for `websocket`, a JSON body for `chunkbased` with a non-GET method. `command` is the resolved `<basis core="dbsource">` markup; parse the attributes you care about from it (the mock WebSocket server uses `/counter=["'](?<f>[^"']*)["']/i`).
2. Return one `sources` entry per `<member>`, in member order. The count must match exactly.
3. Give every entry `options.tableName` (any non-empty string; it is not used for naming but is read without a null check) and a numeric `options.mergeType`. Add `keyFieldName` and `statusFieldName` when you stream row-level changes.
4. For `websocket`, send one envelope per message. For `chunkbased`, write `[`, then `JSON.stringify(envelope) + ","` per update, and finish with `null]`. Set `Content-Type: application/json`.
5. Send `setting: { keepalive: false }` in the last envelope when the server wants the client to stop; the sources in that envelope are still applied.

Minimal WebSocket server (from `server/websocket.js`, started with `npm run ws`):

```javascript
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });
let timeCounter = 10;

setInterval(() => {
  const date = new Date();
  if (timeCounter > 0) timeCounter--;
  const data = {
    setting: { keepalive: timeCounter > 0 },
    sources: [{
      options: { tableName: "stream.time", mergeType: 0 },
      data: [{ hh: date.getHours(), mm: date.getMinutes(), ss: date.getSeconds(), remain: timeCounter }],
    }],
  };
  [...wss.clients].filter((ws) => ws.typeEx === "/time")
    .forEach((ws) => ws.send(JSON.stringify(data)));
}, 1000);

wss.on("connection", function connection(ws, req) {
  ws.typeEx = req.url;
  if (req.url == "/time") timeCounter = 10;
  ws.on("message", function incoming(message) {
    const data = JSON.parse(message);           // { command, dmnid }
    console.log("received: %s", data.command);
  });
});
```

## Examples

### `web`: static JSON file with two members

`data/book.json` is the envelope shown in the response section above.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>dbsource over web</title>
</head>
<body>
  <basis core="dbsource" source="bookapi" name="book" run="atclient">
    <member name="list" preview="true"></member>
    <member name="type" preview="true"></member>
  </basis>

  <basis core="callback" run="atclient" triggers="book.list book.type" method="onSource"></basis>

  <script>
    var host = {
      settings: {
        "connection.web.bookapi": "data/book.json",
        "default.dmnid": 2668,
        "default.source.verb": "GET"
      }
    };
    function onSource(args) {
      console.table(args.source.rows);
    }
  </script>
</body>
</html>
```

### `websocket`: live clock that stops after ten seconds

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>dbsource over websocket</title>
</head>
<body>
  <basis core="dbsource" source="simple" name="stream" run="atclient">
    <member name="time" />
  </basis>

  <div>
    Update time for 10 seconds only! (remain [##stream.time.remain##])
    <br />
    Time is : [##stream.time.hh|(00)##]:[##stream.time.mm|(00)##]:[##stream.time.ss|(00)##]
  </div>

  <script>
    var host = {
      settings: {
        "connection.websocket.simple": "ws://localhost:8080/time",
        "default.dmnid": 2668
      }
    };
  </script>
</body>
</html>
```

### `websocket`: append feed with client-side filtering

```html
<basis core="dbsource" source="simple" name="user" run="atclient">
  <member name="list" />
</basis>

<label>name: <input name="demo.filter-name" bc-triggers="keyup change" /></label>

<Basis core="print" datamembername="user.list" run="atclient"
       OnProcessing="manipulation" triggers="demo.filter-name">
  <layout>
    <script type="text/template">
      <table><tbody>@child</tbody></table>
    </script>
  </layout>
  <face>
    <script type="text/template">
      <tr><td>@id@</td><td>@name@</td><td>@age@</td></tr>
    </script>
  </face>
</Basis>

<script>
  var host = {
    dbLibPath: "/alasql.min.js",
    settings: {
      "connection.websocket.simple": "ws://localhost:8080/list",
      "default.dmnid": 2668
    }
  };
  async function manipulation(args) {
    const where = args.context.tryToGetSource("demo.filter-name");
    const nameValue = where?.rows[0].value;
    const sql = `select * from ? ${nameValue ? `where name like '%${nameValue}%'` : ""}`;
    args.source = await $bc.util.source.runSqlAsync(args.source, sql, args.context);
  }
</script>
```

The server sends `mergeType: 1` so each message adds one row to `user.list`; the `print` command re-renders on every update.

### `chunkbased`: POST with a body factory and a close callback

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>dbsource over chunked HTTP</title>
</head>
<body>
  <basis core="dbsource" source="simple" name="user" run="atclient">
    <member name="list" />
  </basis>

  <Basis core="print" datamembername="user.list" run="atclient">
    <layout>
      <script type="text/template"><table><tbody>@child</tbody></table></script>
    </layout>
    <face>
      <script type="text/template"><tr><td>@id@</td><td>@name@</td><td>@age@</td></tr></script>
    </face>
  </Basis>

  <script>
    function bodyMakerFunction(context, sourceId, params) {
      return Object.assign(params, { id: 12, data3: sourceId });
    }
    function onCloseConnection(param) {
      console.log("end with error:", param.withError);
    }
    var host = {
      settings: {
        "connection.chunkBased.simple": {
          Connection: "/chunk/chunk-stream-post",
          method: "POST",
          bodyFactory: "bodyMakerFunction",
          onClose: onCloseConnection
        },
        "default.dmnid": 2668
      }
    };
  </script>
</body>
</html>
```

### `local`: data from a JavaScript function

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>dbsource over local function</title>
</head>
<body>
  <basis core="dbsource" source="cache" name="people" run="atclient">
    <member name="list" sort="age desc" />
  </basis>

  <Basis core="print" datamembername="people.list" run="atclient">
    <face>
      <script type="text/template"><div>@rownumber@. @name@ (@age@)</div></script>
    </face>
  </Basis>

  <script>
    var host = {
      dbLibPath: "/alasql.min.js",
      settings: {
        "connection.local.cache": "/js/local-provider.js|getTables"
      }
    };
  </script>
</body>
</html>
```

`/js/local-provider.js` defines the `getTables` function shown in the `local` section.

### `call` through `callcommand` and through `url`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>call</title>
</head>
<body>
  <!-- GET call/called.html through the callcommand connection -->
  <basis core="call" file="called.html" run="atclient"></basis>

  <!-- POST to call/called.html; data-pp is sent as a form field named "data-pp" -->
  <basis core="call" file="called.html" method="post" data-pp="[##cms.cms.time##]" run="atclient"></basis>

  <!-- ad-hoc web connection; no callcommand setting needed -->
  <basis core="call" url="https://example.com/fragment.html" run="atclient"></basis>

  <script>
    const host = {
      settings: {
        "default.call.verb": "GET",
        "connection.web.callcommand": "call/"
      }
    };
  </script>
</body>
</html>
```

### `push`: two message types

```html
<basis core="dbsource" source="simple" name="stream" run="atclient">
  <member name="time" />
</basis>
<basis core="dbsource" source="simple1" name="stream1" run="atclient">
  <member name="time2" />
</basis>

<div>Time is : [##stream.time.hh|(00)##]:[##stream.time.mm|(00)##]:[##stream.time.ss|(00)##]</div>

<script>
  var host = {
    serviceWorker: true,
    push: {
      applicationServerKey: "<VAPID public key>",
      url: "http://localhost:8080/api/push/add-subscriber",
      params: { client: "qam-1" }
    },
    settings: {
      "connection.push.simple": "test",
      "connection.push.simple1": "test1",
      "default.dmnid": 2668
    }
  };
</script>
```

## Pitfalls

- `default.source.verb` must be `GET` in upper case. `fetchAjax` compares the verb with `=== "GET"`; `get` attaches a form body to a GET request and the browser rejects it.
- `dmnid` is sent as the string `null` by the `web` provider (and JSON `null` by the stream providers) when `default.dmnid` is not configured. Set it explicitly.
- A `call` with method GET sends no parameters at all, because `xmlAjax` never appends a query string. With POST the element's own attributes are sent as the body; `fileNames` and `siteSize` are sent only for PUT and PATCH. `pagesize` therefore never reaches the server: it is excluded from the POST attributes and dropped for GET.
- The number of `sources` must equal the number of `<member>` elements. With `web` the mismatch rejects the load; with `websocket` and `chunkbased` it is logged for every frame and the socket stays open.
- `mergeType` must be a number (`0` or `1`). A string value matches neither branch of the merge logic and the source silently disappears.
- `options.tableName` is read without a null check by `web`, `websocket` and `chunkbased`; an entry without `options` throws during mapping.
- A `chunkbased` connection in string form uses GET and sends neither `command` nor `dmnid`. Use the object form with `method: "POST"` when the server needs the parameters.
- Re-triggering a `dbsource` bound to a `chunkbased` connection while the stream is open fails: `StreamPromise.send` calls `send()` on the stream reader, which has no such method. Let the stream finish, or dispose the command before triggering again.
- `chunkbased` has no reconnect and does not check the HTTP status. A `fetch` or read error leaves the `StreamPromise` pending and never calls `onClose`.
- `websocket` reconnects only after `onerror`; a clean close (even an unexpected one) resolves the promise and nothing reconnects. Attempts are counted across the life of the `StreamPromise`, five in total.
- Two `dbsource` elements with the same `name` on a `websocket` connection share one `activeSockets` slot; opening the second closes the first with `Disconnect from <url> by client request`.
- `bodyFactory` and `onClose` strings are executed with `eval`. Never build them from untrusted input.
- `TestConnectionAsync` and the `heartbeat` settings are inert in this version; nothing calls them and `checkSourceHeartbeatAsync` throws `Method not implemented.`.
- `rest` connections construct fine and fail on first use with `Method not implemented.`.
- A misspelled provider segment (for example `connection.websockets.x`) breaks startup with a `TypeError` from `ConnectionOptionsManager`.
- The `fetch` used for data has `credentials: "omit"`; session cookies are not sent to the data endpoint even on the same origin.

## Related

- [host-configuration.md](host-configuration.md)
- [sources-and-reactivity.md](sources-and-reactivity.md)
- [commands/dbsource.md](commands/dbsource.md)
- [commands/call.md](commands/call.md)
- [service-worker-and-push.md](service-worker-and-push.md)
- [client-side-sql.md](client-side-sql.md)
- [binding-and-tokens.md](binding-and-tokens.md)
- [troubleshooting.md](troubleshooting.md)

## Source files

- `src/options/connection-options/ConnectionOptionsManager.ts`
- `src/options/connection-options/ConnectionOptions.ts`
- `src/options/connection-options/UrlBaseConnectionOptions.ts`
- `src/options/connection-options/WebConnectionOptions.ts`
- `src/options/connection-options/WebSocketConnectionOptions.ts`
- `src/options/connection-options/ChunkBasedConnectionOptions.ts`
- `src/options/connection-options/LocalStorageConnectionOptions.ts`
- `src/options/connection-options/PushConnectionOptions.ts`
- `src/options/connection-options/RESTConnectionOptions.ts`
- `src/options/connection-options/StreamPromise.ts`
- `src/type-alias.ts`
- `src/context/ISourceOptions.ts`
- `src/context/RootContext.ts`
- `src/context/Context.ts`
- `src/repository/Repository.ts`
- `src/data/Source.ts`
- `src/data/Data.ts`
- `src/component/source/MemberBaseSourceComponent.ts`
- `src/component/source/base/Member.ts`
- `src/component/collection/CallComponent.ts`
- `src/wrapper/UtilWrapper.ts`
- `src/options/HostOptions.ts`
