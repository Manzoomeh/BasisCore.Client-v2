# Host configuration and connections

This page covers the `host` object that configures BasisCore.js, and the named **connections**
that commands such as `dbsource` use to fetch data: plain HTTP, WebSocket, chunked HTTP streams,
local JavaScript providers and web push.

How `dbsource` members turn into sources is described in [commands-data.md](commands-data.md);
merge options in [sources-and-triggers.md](sources-and-triggers.md).

---

## The `host` object

Configuration is a global object named `host`. Define it **before** the library's script tag:

```html
<script>
  var host = {
    settings: {
      "connection.web.api": "https://example.com/api/data",
      "default.dmnid": 1
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/basiscore@2.39.6/dist/basiscore.min.js"></script>
```

`host` is read once, the first time the library needs its defaults (at the latest when the page's
`load` event fires). Changing it afterwards has no effect.

### Configuring from script: `$bc.setOptions`

Instead of (or on top of) `host`, pass options to `$bc.setOptions` before the page is processed:

```html
<script>
  $bc.setOptions({
    settings: { "connection.web.api": "https://example.com/api/data" }
  }).run();
</script>
```

- Options given to `setOptions` are deep-merged over `host`, which is merged over the built-in
  defaults; per key, `setOptions` wins.
- Calling `setOptions` creates the default instance, so **automatic rendering on `load` no longer
  happens**. Call `.run()` yourself, from a script placed after the markup it should process.
- After the instance has run, `setOptions` throws.

### Keys

| Key | Default | Meaning |
|---|---|---|
| `autoRender` | `true` | Process the page on `window` `load`, unless an instance was already created |
| `settings` | see below | Connections and defaults |
| `sources` | — | Sources available from the start |
| `dbLibPath` | `/alasql.min.js` | Where AlaSQL is loaded from; see [client-side-sql.md](client-side-sql.md) |
| `repositories` | `{}` | Where user-defined components are loaded from; see [hooks-and-extensibility.md](hooks-and-extensibility.md) |
| `serviceWorker` | `false` | `true` registers `basiscore-serviceWorker.js`; a string registers that URL |
| `push` | — | Web push subscription options (see [Web push](#service-worker-and-web-push)) |
| `debug` | `false` | Accepted; has no effect in 2.39.6 |

`sources` maps a source id to either an array of rows or `{ data, options }`. Ids are lower-cased:

```js
var host = {
  sources: {
    "app.config": [{ theme: "light" }],
    "cart.items": { data: [], options: { keyFieldName: "sku", mergeType: 1 } }
  }
};
```

### `settings` keys

| Key | Default | Meaning |
|---|---|---|
| `connection.<provider>.<name>` | — | A named connection (next sections) |
| `default.dmnid` | `""` | Domain id sent with every data request |
| `default.source.verb` | `POST` | HTTP method for `dbsource` over a `web` connection |
| `default.call.verb` | `POST` | HTTP method for the `call` command |
| `default.source.heartbeatverb` | `GET` | Heartbeat method; heartbeats are not used by any command in 2.39.6 |
| `default.viewcommand.groupcolumn` | `prpid` | Grouping column of `view`; see [commands-rendering.md](commands-rendering.md) |
| `default.binding.regex` | `/\[##([^#]*)##\]/` | Token syntax; see [binding.md](binding.md) |
| `default.binding.face-regex` | built in | `@column@` syntax inside faces |
| `default.binding.codeblock-regex` | built in | `{{ … }}` code-block syntax |

Setting names are matched case-insensitively. A setting whose value is falsy (`0`, `""`, `false`)
counts as not set, and the default applies.

---

## Connections

A connection is a settings key of the form `connection.<provider>.<name>`:

```js
settings: {
  "connection.web.shop": "https://example.com/shop/data",
  "connection.websocket.live": "wss://example.com/live"
}
```

A command refers to it by `<name>`: `<basis core="dbsource" source="shop">`.

- `<provider>` is one of `web`, `rest`, `websocket`, `chunkbased`, `local`, `push`
  (case-insensitive). **Any other provider name stops the page from being processed at all.**
- `<name>` is case-sensitive and cannot contain a dot: in `connection.web.my.api` the name is
  `my`.
- A `source` that names no configured connection fails with
  `In 'host.settings' object, property '<name>' not configured!`.

### What every provider receives

For a `dbsource`, the request parameters are always the same two values:

| Parameter | Value |
|---|---|
| `command` | the `<basis>` element's HTML, with its tokens already resolved |
| `dmnid` | `default.dmnid` |

### The response envelope

Every provider except `local` expects JSON in this shape:

```json
{
  "setting": { "keepalive": true },
  "sources": [
    {
      "options": { "tableName": "shop.products", "keyFieldName": "id",
                   "statusFieldName": "status", "mergeType": 0 },
      "data": [ { "id": 1, "name": "Notebook", "status": 0 } ]
    }
  ]
}
```

- `sources` must hold **one entry per `<member>`, in the same order**. `dbsource` maps entries to
  members by position and publishes `<dbsource name>.<member name>`; `tableName` does not decide
  where the data goes. A different number of entries than members is an error.
- `options` must be present in every entry (it may be `{}`). Its merge fields are passed to the
  published source.
- `setting.keepalive` matters only for the streaming providers.

**Merge values are numbers.** `mergeType` is `0` (replace) or `1` (append); status values are `0`
(add), `1` (edit), `2` (delete). Names such as `"append"` or `"added"` are not recognised: a source
whose `mergeType` is `"append"` is silently not stored, and a row whose status is `"edited"` is
skipped. Keyed updates need `keyFieldName` on both the stored source and the incoming one.

---

## `web` — HTTP request and response

```js
"connection.web.api": "https://example.com/api/data"
```

or, as an object:

```js
"connection.web.api": { url: "https://example.com/api/data", verb: "GET" }
```

| Field | Meaning |
|---|---|
| `url` | endpoint |
| `verb` | `GET` or `POST`; falls back to `default.source.verb` |
| `heartbeat`, `heartbeatverb` | accepted; not used by any command in 2.39.6 |

**Request.** With `POST`, `command` and `dmnid` are sent as an
`application/x-www-form-urlencoded` body. With `GET`, they are appended to the URL as a query
string (after `?`, or `&` if the URL already has a query). Because `command` is the whole command
element, `GET` URLs get long; prefer `POST`.

The request is made with `credentials: "omit"`: **cookies are not sent**, even to the same origin.
Pass what the server needs through tokens in the command or through the URL.

**Response.** The envelope above. A non-2xx status is an error and nothing is published. The
`setting` object is ignored.

```html
<basis core="dbsource" run="atclient" name="shop" source="api">
  <member name="products"></member>
</basis>
<basis core="print" run="atclient" datamembername="shop.products">
  <face>@name@</face>
</basis>
```

### Known issues in 2.39.6

- **Write the verb in upper case.** The verb is not normalised: `"get"` makes the browser reject
  the request, because the parameters are then sent as a body, which a `GET` cannot have. This
  applies to both `verb` and `default.source.verb`.
- **Set `default.dmnid`.** When it is not set (or is `0`), the literal string `null` is sent as
  `dmnid`.

Fixes for both are proposed in pull request #93 of the BasisCore.Client-v2 repository and are
not part of a released version yet.

### The `call` command

`<basis core="call">` loads HTML from `connection.web.callcommand` (or from its own `url`
attribute), appending the `file` attribute to the URL. With `POST`, the command's other attributes
are sent form-urlencoded; with `GET`, no parameters are sent in 2.39.6. Requests time out after 15
seconds. See [commands-data.md](commands-data.md).

---

## `rest`

`connection.rest.<name>` is accepted in settings, but in 2.39.6 every operation on it throws
(`Method not implemented.`). Use a `web` connection instead.

---

## `websocket` — a live stream over one socket

```js
"connection.websocket.live": "wss://example.com/live"
```

or `{ Connection: "wss://example.com/live" }` — note the capital `C`. There are no other fields.

```html
<basis core="dbsource" run="atclient" name="ticker" source="live">
  <member name="prices"></member>
</basis>
```

**Handshake.** When the socket opens, the client sends one text message: the parameters as JSON,
`{"command":"<basis …>","dmnid":1}`. (An unset `dmnid` is sent as JSON `null`.)

**Messages from the server.** Each text message is one JSON envelope as described above, with one
`sources` entry per member. Every message is applied as it arrives, so a server usually sends a
full snapshot first (`mergeType: 0`) and then changes (`mergeType: 1` with key and status fields):

```json
{ "sources": [ { "options": { "tableName": "ticker.prices", "keyFieldName": "symbol",
  "statusFieldName": "op", "mergeType": 1 }, "data": [ { "symbol": "ABC", "price": 12.5, "op": 1 } ] } ] }
```

A message that is not valid JSON is logged and skipped.

**Closing.** A message with `"setting": { "keepalive": false }` makes the client close the socket
after applying that message's data. It also closes the socket when a message arrives after the
`dbsource` has been removed from the page.

**Re-running.** While the socket is open, re-running the `dbsource` (for example through
`triggers`) sends the new parameters over the same socket instead of opening another one.
Changing the `source` attribute while it is open is an error.

**Reconnecting.** The client reconnects only when the socket reported an error before closing; a
clean close by the server is final. There are at most five connection attempts in total for one
run of the `dbsource`; the counter is not reset after a successful reconnect. Each reconnect sends
the handshake again.

---

## `chunkbased` — a streamed HTTP response

A single `fetch` whose response body is read as it arrives. Each JSON envelope in the body is
applied as soon as it is complete.

```js
"connection.chunkbased.feed": {
  Connection: "https://example.com/feed",
  method: "POST"
}
```

| Field | Default | Meaning |
|---|---|---|
| `Connection` | — | URL (capital `C`) |
| `method` | `GET` | HTTP method, in upper case |
| `body` | — | object sent as the JSON body instead of the parameters |
| `bodyFactory` | — | `function (context, sourceId, parameters)` returning the body, or a string that evaluates to one |
| `onClose` | — | `function ({ withError, context })`, or a string that evaluates to one, called when the stream ends |

The string form `"connection.chunkbased.feed": "https://example.com/feed"` means `GET` with no
other fields.

**Request.** With `GET`, **nothing is sent**: neither `command` nor `dmnid`. With any other method
the body is JSON (`Content-Type: application/json`), chosen in this order: the result of
`bodyFactory`, else `body`, else the parameters `{ command, dmnid }`. A configured `body`
therefore **replaces** the parameters; include them yourself in `bodyFactory` if the server needs
them:

```js
bodyFactory: function (context, sourceId, parameters) {
  return Object.assign({ channel: "orders" }, parameters);
}
```

**Response body.** A JSON array of envelopes that ends with `null`, written out over time:

```text
[{"sources":[ … ]},
{"sources":[ … ]},
null]
```

Each envelope follows the same rules as a WebSocket message. An envelope with
`"setting": { "keepalive": false }` stops the reading. When the stream ends, anything left over
other than `,null]` is reported in the console and `onClose` receives `withError: true`.

**Limitations in 2.39.6.**

- There is no reconnect. When the stream ends or fails, the source stops updating until the
  `dbsource` runs again.
- The HTTP status is not checked, and a failed request is reported only in the console.
- Re-running the `dbsource` while its stream is still open throws an error. Let the server end the
  stream (or send `keepalive: false`) before triggering the command again.

---

## `local` — data from a JavaScript function

A `local` connection calls a global function, loaded from a script on first use, instead of making
a request.

```js
"connection.local.cache": "/js/cache-provider.js|loadCache"
```

or `{ Url: "/js/cache-provider.js", Function: "loadCache" }`. The string form must contain exactly
one `|`; anything else stops the page from being processed.

The script is added to the page once; if a global with that name already exists, the script is not
loaded. The function receives the parameters `{ command, dmnid }` and returns (or resolves to) an
object with one key per member, **in member order**. Each value is a table whose first row holds
the column names:

```js
function loadCache(parameters) {
  return {
    products: [
      ["id", "name"],
      [1, "Notebook"],
      [2, "Pen"]
    ]
  };
}
```

A key named `_` is treated as settings and ignored. `local` data carries no merge options.

---

## Service worker and web push

### Registering a service worker

Set `host.serviceWorker` to `true` (registers `basiscore-serviceWorker.js` relative to the page)
or to the worker's URL. Registration happens once per page, when the first instance runs. If the
browser has no service worker support or registration fails, the user sees an `alert`.

### Subscribing to push

When `host.push` is also set, the library asks for notification permission and subscribes:

```html
<div id="push-ask" style="display:none">
  Get notified about new orders? <button id="push-yes">Allow</button>
</div>
<script>
  var host = {
    serviceWorker: "/sw.js",
    push: {
      applicationServerKey: "<your-vapid-public-key>",
      url: "https://example.com/push/subscribe",
      params: { dmnid: "1" },
      permissionDlg: "#push-ask",
      permissionSubmit: "#push-yes"
    }
  };
</script>
```

| Key | Meaning |
|---|---|
| `applicationServerKey` | your VAPID public key, base64url-encoded |
| `url` | endpoint that receives the subscription |
| `params` | extra fields sent with the subscription |
| `permissionDlg` | selector of an element shown before the browser prompt, or `function (show)` |
| `permissionSubmit` | selector of the button inside it that triggers the browser prompt |

The flow:

1. **Permission already granted:** subscribe directly.
2. **Not decided yet:** show `permissionDlg` (sets `display: block`, or calls `permissionDlg(true)`),
   wait for a click on `permissionSubmit`, hide the dialog, then call
   `Notification.requestPermission()`. Both elements must exist, or the flow fails.
3. **Denied** (before or after asking): the user sees an `alert` saying notifications are blocked,
   and nothing is subscribed.

On success, an existing subscription is reused or a new one created, and a `POST` with
`multipart/form-data` is sent to `url` with the `params` fields plus `endpoint`, `p256dh` and
`auth` (keys base64-encoded). This happens on every page load. A non-2xx response or a network
failure is also reported with an `alert`.

### Receiving push data: `connection.push.<name>`

A `push` connection's value is a **message type**. Your service worker forwards push payloads to
open pages with `postMessage({ type, message })`, and every `dbsource` using a connection with that
type receives `message` as a response envelope:

```js
// sw.js
self.addEventListener("push", function (event) {
  const payload = event.data ? event.data.json() : null;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      list.forEach(function (client) { client.postMessage({ type: "orders", message: payload }); });
      return self.registration.showNotification("New orders");
    })
  );
});
```

```html
<script>
  // before the library script, together with serviceWorker and push
  var host = { settings: { "connection.push.orders": "orders" } };
</script>
<basis core="dbsource" run="atclient" name="live" source="orders">
  <member name="orders"></member>
</basis>
```

The push payload must be an envelope, `{ "sources": [ { "options": { "mergeType": 1 }, "data": [ … ] } ] }`,
with one entry per member as usual. The command sends nothing to a server; it only listens. Each run
of the `dbsource` adds another listener, so avoid re-running it with `triggers`. Load the library
with a normal script tag: the page starts listening for worker messages on `load`.

For errors that appear only in the browser console, see [troubleshooting.md](troubleshooting.md).
