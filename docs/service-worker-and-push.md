# Service Worker and Web Push

BasisCore Client can register a service worker for the page, subscribe the browser to Web Push with a VAPID application server key, post the resulting subscription to your server, and route messages that the service worker forwards into the page to named handlers. On top of that routing, the `push` connection provider lets a `dbsource` command receive its members from push messages instead of from an HTTP request. Use this subsystem when the server needs to reach the browser while the tab is in the background or closed; for live data while the tab is open, the `websocket` and `chunkbased` connection providers are simpler (see [connections.md](connections.md)).

The library covers four things: registration (`host.serviceWorker`), the permission and subscription handshake (`host.push`), message dispatch (`$bc.util.addMessageHandler`) and the `push` connection provider. The service worker file itself is your code; the repository ships one reference implementation in TypeScript (`src/ServiceWorker/ServiceWorker.ts`, not part of the bundle) and one working example (`example/component/source/dbsource/push/simple/basiscore-serviceWorker.js`).

## Registration: `host.serviceWorker`

| Name | Type | Default | Description |
|---|---|---|---|
| `serviceWorker` | `boolean \| string` | `false` | `false`: nothing is registered. `true`: registers `basiscore-serviceWorker.js`, resolved by the browser relative to the page URL. A string: registered as given (for example `"/sw.js"`). |

Registration happens inside `BCWrapper.run()`, right after the `BasisCore` instance has been created and before the wrapper's `manager` event fires. The sequence is:

1. `run()` reads `context.options.serviceWorker`. A falsy value ends the flow.
2. A static flag `BCWrapper._serviceWorkerAdded` is checked. The flag is shared by every wrapper on the page (`$bc.run()`, `$bc.new().run()`, fragments). If it is already set, the library writes `console.warn("Try add service worker more than one.", options)` and does nothing else. Only the first wrapper that runs with `serviceWorker` enabled registers a worker.
3. If `"serviceWorker" in navigator` is false, the library logs and `alert()`s `Service worker not support in browser!` and stops.
4. Otherwise `navigator.serviceWorker.register(filePath)` is called. On success it logs `Service worker from '<filePath>' register successfully!` and continues with the push flow. On rejection it logs and `alert()`s `Error in register service worker.(<reason>)`.

The registered file must be served from the same origin as the page and, for the default name, from the same directory as the page (or a parent directory on the same path), because `basiscore-serviceWorker.js` is a relative URL. A service worker's scope is its own directory, so a worker served from `/app/sw.js` controls pages under `/app/` only.

## Subscription: `host.push`

`host.push` is read only after a successful registration. If `host.serviceWorker` is off, `host.push` is never used. If `host.push` is absent, the flow ends after registration and the page has a service worker but no push subscription.

| Name | Type | Default | Description |
|---|---|---|---|
| `applicationServerKey` | `string` | none | VAPID public key in base64url form (the usual `B...` string of 87 characters). It is padded to a multiple of 4, `-` and `_` are replaced by `+` and `/`, decoded with `atob` and converted character by character into a `Uint8Array`. |
| `url` | `string` | none | Endpoint that receives the subscription as a `POST`. |
| `params` | `object` | none | Extra fields appended to the posted form data. Each own property name becomes a field, each value is passed to `FormData.append` as is. |
| `permissionDlg` | `string \| (show: boolean) => void` | none | Either a CSS selector of an element whose `style.display` is set to `"block"` to show and `"none"` to hide, or a function that receives `true` to show and `false` to hide. |
| `permissionSubmit` | `string` | none | CSS selector of the element whose `click` event asks the browser for notification permission. |

### Notification permission flow

`tryActiveNotification` runs before anything touches the push manager:

1. If `"Notification" in window` is false, the library logs and `alert()`s `Your browser does not support Push Notifications!` and stops.
2. If `Notification.permission === "granted"`, the subscription step runs immediately. No dialog is shown.
3. If `Notification.permission === "denied"`, the library logs and `alert()`s `You have blocked notifications.(current permission is denied` and stops. Nothing in the library can revert a denied permission; the user must change it in the browser's site settings.
4. Otherwise (permission is `"default"`) the dialog is shown: `document.querySelector(permissionDlg).style.display = "block"` when `permissionDlg` is a string, or `permissionDlg(true)` when it is a function. Then a `click` listener is added to `document.querySelector(permissionSubmit)`. When the user clicks:
   - `event.preventDefault()` is called,
   - the dialog is hidden (`display = "none"` or `permissionDlg(false)`),
   - `await Notification.requestPermission()` runs,
   - if the result is `"granted"` the subscription step runs, otherwise the "You have blocked notifications" message is logged and alerted.

The dialog exists because browsers require a user gesture before `Notification.requestPermission()` is allowed to show the native prompt. The library does not render a dialog of its own; both `permissionDlg` and `permissionSubmit` must point to markup you put on the page. When permission is still `"default"` and `permissionDlg` is missing, the code path `dlg(true)` throws `TypeError` (not a function) and the flow dies silently as an unhandled promise rejection; when the selector matches nothing, `null.style` throws in the same way.

### Subscription and the POST to `url`

`tryRegisterSubscriptionAsync` runs once permission is granted:

1. `registration.pushManager.getSubscription()` is awaited. If it rejects: `Error in get Subscription for push api (<reason>). Unable to activate Push Notification!` is logged and alerted.
2. If there is no subscription yet, `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <Uint8Array> })` is called. If it rejects: `Unable to subscribe push api. Unable to activate Push Notification!(<reason>)` is logged and alerted.
3. The subscription (existing or new) is sent to the server. A `FormData` is built in this order: every key of `params`, then `endpoint` (`subscription.endpoint`), `p256dh` and `auth` (the two `subscription.getKey()` buffers, each converted to a binary string and encoded with `btoa`, that is standard base64, not base64url). If building the form data throws, the message `"Error in generate client push data for send to server. <reason>"` (the quotes are part of the message) is logged and alerted and the error is rethrown.
4. `fetch(url, { method: "POST", mode: "cors", cache: "no-cache", body: formData })`. No `Content-Type` header is set, so the browser sends `multipart/form-data` with a boundary. Credentials are the `fetch` default (`same-origin`).
   - `response.ok`: `Push api is activated. Subscription data send for server successfully!` is logged together with the response text.
   - A non-2xx response: `Error in send Push api subscription data for server [<status> (<statusText>)]. Unable to activate Push Notification!` is logged and alerted.
   - A network failure: `Error in send Push api subscription data send for server (<reason>). Unable to activate Push Notification!` is logged and alerted.

The POST is sent on every page load where the flow reaches step 3, including when `getSubscription()` returned an existing subscription. There is no retry and no local cache of "already sent". Your endpoint must therefore be idempotent on `endpoint`.

What the server receives, as form fields:

| Field | Value |
|---|---|
| each key of `host.push.params` | the value you configured |
| `endpoint` | the push service URL for this browser |
| `p256dh` | base64 of the client public key |
| `auth` | base64 of the auth secret |

## The service worker file

The library never inspects the worker's code; the worker only has to do two things for the rest of the subsystem to work: handle `push` events, and forward a payload shaped `{ type, message }` to the open pages with `client.postMessage(...)`.

The example worker at `example/component/source/dbsource/push/simple/basiscore-serviceWorker.js` does this:

```js
self.addEventListener("push", function (e) {
  const message = e.data ? e.data.json() : { message: "Standard Message" };
  clients.matchAll({ includeUncontrolled: true }).then(function (allClients) {
    if (allClients.length > 0) {
      for (const client of allClients) {
        client.postMessage(message);
      }
    } else {
      const options = {
        body: message.offlineMessage ?? e.data.text(),
        vibrate: [100, 50, 100],
        data: message,
        actions: [{ action: "close", title: "Ignore" }],
      };
      if (message.url) {
        options.actions.push({ action: "explore", title: "Visit" });
      }
      e.waitUntil(
        self.registration.showNotification("Push Notification", options)
      );
    }
  });
});
self.addEventListener("notificationclick", function (e) {
  const notification = e.notification;
  const action = e.action;
  if (action === "explore") {
    clients.openWindow(e.data.url).then((x) => notification.close());
  } else {
    notification.close();
  }
});
```

Behaviour of this worker:

- The push payload is parsed as JSON and forwarded unchanged to every window client (`includeUncontrolled: true`, so pages that loaded before the worker took control are included). The payload itself is therefore the `{ type, message }` object that the page expects (see the next section).
- When no page is open, a notification titled `Push Notification` is shown instead. Its body is `message.offlineMessage` when present, otherwise the raw payload text. The whole payload is attached as `data`. An extra `Visit` action is added when `message.url` exists.
- On click, `explore` opens `e.data.url` in a new window; any other action closes the notification. Note that `notificationclick` events carry the payload as `e.notification.data`, not `e.data`; `e.data` is `undefined` in a `NotificationEvent`, so the `Visit` action in this example throws before opening a window.

The TypeScript reference worker `src/ServiceWorker/ServiceWorker.ts` follows the same pattern with a fixed `body + " test1..."` message, an `images/icon-512x512.png` icon, and, when no client is open, shows the notification and then calls `clients.openWindow("/")` and posts the payload to the new client. It is a template to copy and compile yourself; it is not imported by `src/index.ts` and is not part of `basiscore.js`.

## Receiving messages in the page: `$bc.util.addMessageHandler`

```ts
$bc.util.addMessageHandler(messageType: string, handler: (message: any) => void): boolean
```

The `UtilWrapper` constructor (run once when the library loads) checks `"serviceWorker" in navigator`. When supported, it creates a handler map and, on the window `load` event, attaches one `message` listener to `navigator.serviceWorker`. Every message is dispatched as:

```js
const type = event.data.type;
const message = event.data.message;
if (type && handlers.has(type)) handlers.get(type).Trigger(message);
```

So the service worker must post objects of the form `{ "type": "<name>", "message": <anything> }`. Only `event.data.message` reaches the handler; `type` and any other property are dropped. Messages whose `type` has no handler are ignored.

`addMessageHandler` returns `true` when the browser supports service workers (the handler was stored) and `false` otherwise (nothing was stored). Handlers for one type are kept in an `EventManager`, which is a `Set`: adding the same function twice has no effect, and an exception thrown by one handler is written with `console.error` and does not stop the others.

```js
$bc.util.addMessageHandler("news", (message) => {
  $bc.setSource("news.list", message.rows);
});
```

## The `push` connection provider

A `connection.push.<name>` entry in `host.settings` creates a `PushConnectionOptions`. Its setting value is the message type it listens to:

```js
var host = {
  serviceWorker: true,
  push: { /* see above */ },
  settings: {
    "connection.push.simple": "test",
    "connection.push.simple1": "test1",
  },
};
```

When the connection is constructed (that is, when the root context is created, before any command runs) it calls `$bc.util.addMessageHandler("test", processMessage)`. From then on:

- `loadDataAsync(context, sourceId, parameters, onDataReceived)` does not perform any request. It stores `onDataReceived` in the connection's own `EventManager` and resolves immediately. The `parameters` (`command`, `dmnid`) are ignored.
- Every message with `type === "test"` is logged as `push message receive` and, if `message.sources` exists, converted exactly like a `websocket` or `chunkbased` payload: each entry becomes `new Data(options.tableName ?? "cms.no-name", data, options)`, and the list is delivered to every stored `onDataReceived` callback. Messages without `sources` are ignored.
- `TestConnectionAsync` throws `TestConnection not support in PushConnectionOptions.` and `loadPageAsync` throws `loadPage not support in PushConnectionOptions.`, so a `push` connection cannot be used by `call`.

The push payload the server sends must therefore be:

```json
{
  "type": "test",
  "message": {
    "sources": [
      {
        "options": { "tableName": "stream.time", "mergeType": 0 },
        "data": [{ "hh": 10, "mm": 5, "ss": 42, "remain": 9 }]
      }
    ]
  }
}
```

### How `dbsource` consumes it

```html
<basis core="dbsource" source="simple" name="stream" run="atclient">
  <member name="time" />
</basis>
```

`dbsource` runs in the normal priority wave, resolves the connection named by `source`, and calls `loadDataAsync` with its `processLoadedDataSet` callback. For a `push` connection this returns at once with no data; the command stays registered. Each time a matching message arrives, `processLoadedDataSet` receives the `Data` list and:

1. checks `dataList.length` against the number of `<member>` elements and throws `Command 'stream' has 1 member(s) but N result(s) returned from source!` when they differ, so one push message must carry exactly one `sources` entry per member, in member order;
2. publishes each entry as `<name>.<member>` (here `stream.time`) with the entry's `options` (`mergeType`, `keyFieldName`, `statusFieldName`), so tokens and commands bound to `stream.time` re-render;
3. returns `true` while the command is not disposed. The `push` provider does not read this return value, so a disposed `dbsource` keeps its callback in the connection until the page is unloaded (it ignores the data because `disposed` is checked first).

The `tableName` in the payload is not used as the source id by `dbsource`; the member position is. `tableName` matters for `api` and for the `onDataReceived` consumers that use `Data.id`.

## Examples

### Full page: registration, subscription, two push-driven sources

Adapted from `example/component/source/dbsource/push/simple/index.html`, with the permission dialog that the flow needs when permission has not been granted yet.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Push based source</title>
</head>
<body>
  <div id="push-dlg" style="display:none">
    <p>Receive live updates on this device?</p>
    <button id="push-ok">Yes</button>
  </div>

  <basis core="dbsource" source="simple" name="stream" run="atclient">
    <member name="time" />
  </basis>
  <basis core="dbsource" source="simple1" name="stream1" run="atclient">
    <member name="time2" />
  </basis>

  <basis core="callback" run="atclient" triggers="stream.time stream1.time2"></basis>
  <div>
    Update time for 10 seconds only! (remain [##stream.time.remain##])
    <br />
    Time is : [##stream.time.hh|(00)##]:[##stream.time.mm|(00)##]:[##stream.time.ss|(00)##]
  </div>

  <script>
    var host = {
      serviceWorker: true,
      push: {
        applicationServerKey: "BDeRNwAPgVtNfsvZrRrAkm-O4-P36gSDLxDx25gQ-hoXjpdg3MQ8E3_kzZQSEH58ugL5F5Pi-3nKFvtys8R4eys",
        url: "http://localhost:8080/api/push/add-subscriber",
        params: { client: "qam-1" },
        permissionDlg: "#push-dlg",
        permissionSubmit: "#push-ok",
      },
      settings: {
        "connection.push.simple": "test",
        "connection.push.simple1": "test1",
        "default.dmnid": 2668,
      },
    };
  </script>
</body>
</html>
```

Place the worker shown earlier next to this page as `basiscore-serviceWorker.js`. A push message with `type: "test"` and one `sources` entry updates `stream.time`; a message with `type: "test1"` updates `stream1.time2`. The `callback` command without a `method` dumps each received source to the console as a table.

### Explicit worker path and a function dialog

```html
<script>
  var host = {
    serviceWorker: "/sw.js",
    push: {
      applicationServerKey: "<VAPID public key>",
      url: "/api/push/subscribe",
      params: { userId: 42 },
      permissionDlg: function (show) {
        document.getElementById("push-dlg").hidden = !show;
      },
      permissionSubmit: "#push-ok",
    },
  };
</script>
```

### Handling a custom message type in JavaScript

```html
<script src="/basiscore.js"></script>
<script>
  var host = { serviceWorker: "/sw.js" };
  const supported = $bc.util.addMessageHandler("news", function (message) {
    $bc.setSource("news.items", message.rows);
  });
  if (!supported) {
    console.warn("service workers are not available here");
  }
</script>
<ul>
  <basis core="print" datamembername="news.items" run="atclient">
    <face><li>@title@</li></face>
  </basis>
</ul>
```

The worker posts `{ type: "news", message: { rows: [...] } }`.

## Pitfalls

- `host.push` without `permissionDlg`/`permissionSubmit` only works while `Notification.permission` is already `"granted"`. On a fresh profile the flow throws `TypeError` inside an async function and nothing is logged by the library. The shipped example page omits both selectors for this reason; add them for real use.
- The dialog `click` listener is registered on the element found at run time and is never removed. If the user clicks and denies, clicking again runs `Notification.requestPermission()` again; browsers may then refuse silently.
- Keys are posted as standard base64 (`btoa`), not base64url. Decode accordingly on the server before handing them to a Web Push library that expects base64url.
- The POST uses `mode: "cors"` and the default `credentials` policy; cookies are not sent to a cross-origin `url`. Put identity into `params` instead.
- `_serviceWorkerAdded` is static. A second `$bc.new().setOptions({ serviceWorker: ... }).run()` on the same page only warns; it does not register a different worker, and its `host.push` is never processed.
- `$bc.util.addMessageHandler` attaches the real `message` listener on the window `load` event. If `basiscore.js` is injected after `load` has fired, the listener is never attached: `addMessageHandler` still returns `true` but no message is delivered. Load the library with a normal `<script>` tag.
- Message routing happens only through `navigator.serviceWorker`'s `message` event, so a worker must use `client.postMessage(...)`. Messages posted from other windows or iframes are not seen by this mechanism (see [javascript-api.md](javascript-api.md) for the general API).
- A `push` connection's `loadDataAsync` ignores `parameters`; the `command` text and `dmnid` that `dbsource` prepares are never sent anywhere. Filtering what each client receives is the server's job when it sends the push.
- `dbsource` over `push` enforces one `sources` entry per `<member>`; a message with a different count throws inside the message handler, is caught by `EventManager.Trigger` and written with `console.error`, and the sources are not updated.
- The example worker's `Visit` action reads `e.data.url` in `notificationclick`, where `e.data` is `undefined`; use `e.notification.data.url` in your own worker.
- Every page load that passes the permission check re-posts the subscription to `url`. Make the endpoint idempotent.

## Related

- [host-configuration.md](host-configuration.md)
- [connections.md](connections.md)
- [commands/dbsource.md](commands/dbsource.md)
- [commands/callback.md](commands/callback.md)
- [javascript-api.md](javascript-api.md)
- [sources-and-reactivity.md](sources-and-reactivity.md)
- [troubleshooting.md](troubleshooting.md)

## Source files

- `src/wrapper/BCWrapper.ts` (registration, `tryAddServiceWorkerAsync`, `tryActiveNotification`, `tryActivePushAPI`)
- `src/wrapper/UtilWrapper.ts` (`addMessageHandler`, message dispatch)
- `src/options/IHostOptions.ts`, `src/options/IPushOptions.ts`
- `src/options/connection-options/PushConnectionOptions.ts`
- `src/options/connection-options/ConnectionOptionsManager.ts` (`connection.push.<name>` parsing)
- `src/component/source/MemberBaseSourceComponent.ts` (`dbsource` member count check and publishing)
- `src/ServiceWorker/ServiceWorker.ts` (reference worker, not bundled)
- `example/component/source/dbsource/push/simple/index.html`
- `example/component/source/dbsource/push/simple/basiscore-serviceWorker.js`
