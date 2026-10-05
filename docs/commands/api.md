# api

`api` performs one HTTP request with the browser `fetch` API and publishes the JSON it receives as
one or more sources. Unlike [dbsource](dbsource.md) it needs no connection in `host.settings`, has
no `<member>` children and sends no BasisCore command markup: the URL, method, body and headers
come straight from its attributes. Use it for REST endpoints and static JSON files. When the
response is the standard `sources` envelope every entry becomes a source; any other JSON is
published under the `name` attribute. Two hooks, `OnProcessing` and `OnProcessed`, let JavaScript
replace the request or convert the response.

## How an api command runs

1. The attribute tokens `url`, `method`, `body`, `name`, `Content-Type` and `noCache` are
   resolved. `method` is upper-cased.
2. A `RequestInit` is built: `{ method, body }`. If the resolved `Content-Type` (default
   `application/json` when the attribute is absent or empty) is a non-empty string, a
   `Content-Type` header is added. If `noCache` is
   `"true"` (case-insensitive) the headers `pragma: no-cache` and `cache-control: no-cache` are
   added. Then `request = new Request(url, init)`.
3. If `OnProcessing` is set it is called with `{ context, node, request }`. When the hook assigns
   `args.response` (a `Response` or a `Promise<Response>`), that value is awaited and used.
4. Otherwise `response = await fetch(request)`.
5. If `OnProcessed` is set it is called with `{ context, node, request, response }` and must
   assign `args.results`, an array of `Data` objects. Nothing else is parsed.
6. Otherwise `json = await response.json()`:
   - if `json.sources` exists, each entry becomes
     `new Data(entry.options.tableName, entry.data, entry.options)`;
   - otherwise the whole JSON becomes `new Data(name ?? "cms.api", json)`.
7. Every `Data` is turned into a `Source` and published with `context.setSource`, which applies
   the merge type of the options (replace by default).

`api` has `Priority.normal`: it runs after `call` and before rendering commands in the initial
processing, then again for every `triggers` source or `events` occurrence. It does not set
`allowMultiProcess`, so a trigger that arrives while a request is still pending is ignored.

## Attributes

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | string | | Must be `api`. |
| `run` | string | | Must be `atclient`. |
| `url` | string | | Request URL, relative or absolute. Tokens allowed. |
| `method` | string | | HTTP method; upper-cased before use (`get` and `GET` are the same). Tokens allowed. |
| `body` | string | | Request body passed to `fetch` as-is. Not JSON-encoded for you. Tokens allowed. |
| `name` | string | `cms.api` | Source id used when the response is not a `sources` envelope. |
| `Content-Type` | string | `application/json` | Value of the `Content-Type` request header. When the resolved value is an empty string no header is sent; this needs a token that resolves to `""` (for example `Content-Type="[##cfg.api.contenttype|()##]"`), because a literal `Content-Type=""` is treated as an absent attribute and the default applies. |
| `noCache` | boolean | `false` | `true` adds `pragma: no-cache` and `cache-control: no-cache` request headers. |
| `triggers` | string | | Space separated source ids that run the request again. |
| `events` | string | | DOM, window, document or `timer.<ms>` events that run the request again. |
| `if` | string | | JavaScript expression evaluated before every run. |
| `ignoreNullSource` | boolean | `false` | `true` skips runs without an incoming source, which includes the initial run: the request is then only made when a trigger fires. |
| `OnProcessing` | string | | Global function name; may replace the response. |
| `OnProcessed` | string | | Global function name; must produce `results`. |
| `OnRendering`, `OnRendered` | string | | Generic hooks around every run. |

Attribute names are matched case-insensitively (the DOM lower-cases them), so `content-type` and
`nocache` work as well. `max-age` is not an attribute of this command.

## Response handling

### The `sources` envelope

```json
{
  "setting": { "keepalive": true },
  "sources": [
    { "options": { "tableName": "book.list", "mergeType": 0 }, "data": [ { "id": 1, "BookName": "…" } ] },
    { "options": { "tableName": "book.type", "mergeType": 1 }, "data": [ { "id": 1, "Name": "…" } ] }
  ]
}
```

Each entry is published under `options.tableName` (lower-cased by the `Source` constructor) with
the entry's `options` as source options: `mergeType` `0` replaces, `1` appends, `keyFieldName`
and `statusFieldName` drive append-mode updates, `extra` is attached to the source. The `name`
attribute is ignored. `setting` is ignored by `api`. An entry without `options.tableName` throws
when the `Source` is created (`id.toLowerCase()` on `undefined`).

### Any other JSON

The whole value is published under `name` (default `cms.api`) with default options:

| Response value | Rows |
| --- | --- |
| Array | the array items |
| Object | one row, the object itself |
| String, number, boolean | one row `{ value: <scalar> }` |

Nothing is checked before parsing: a non-2xx status with a JSON body is published like any other
answer, and a body that is not JSON makes `response.json()` reject with a `SyntaxError`.

## The hooks

### `OnProcessing`

```ts
type APIProcessingCallbackArgument = {
  context: IContext;
  node: Node;          // the <basis core="api"> element
  request: Request;    // the request the command built
  response: Promise<Response> | Response; // assign to replace fetch(request)
};
```

Use it to add headers, credentials, an `AbortController`, a cache-busting query string, or to
answer from a local cache. The hook is awaited. If `args.response` stays unset the command calls
`fetch(request)` itself.

### `OnProcessed`

```ts
type APIProcessedCallbackArgument = {
  context: IContext;
  node: Node;
  request: Request;
  response: Response;  // read it with response.json(), response.text(), …
  results: Data[];     // assign the sources to publish
};
```

The hook is awaited and completely replaces the default parsing. Build the `Data` objects with
`$bc.util.source.data(id, rows, options)`. If `args.results` is left unset nothing is published and
no error is raised. This is the place to check `response.ok`, to read text or binary bodies, and
to project third-party JSON into stable source ids.

## Relationship to `fetch` and to `dbsource`

`api` is a thin wrapper around one `fetch(new Request(url, { method, body, headers }))` call with
the browser defaults for everything else (`credentials: "same-origin"`, `mode: "cors"`, no timeout,
no retry). What it adds is the conversion of the answer to sources and the integration with
`triggers`, `events` and `if`. `dbsource` instead goes through a named connection, sends its own
markup plus `dmnid`, maps answers onto `<member>` elements by position and supports streaming
providers; its published ids come from the member names, while `api` takes them from the envelope
or from `name`.

## Examples

All examples run against the dev server (`npm run dev`); the JSON file is
`example/component/source/api/restful/simple/data/book.json`.

### Envelope response, two sources

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body>
  <basis core="api" url="data/book.json" method="get" run="atclient"></basis>

  <basis core="print" datamembername="book.list" run="atclient">
    <layout><ul>@child</ul></layout>
    <face><li>@BookName@: @Price@</li></face>
  </basis>

  <basis core="callback" run="atclient" triggers="book.list book.type" method="onSource"></basis>
  <script>
    function onSource(args) {
      console.table(args.source.rows);
    }
  </script>
</body>
</html>
```

### Plain JSON under an explicit name

```html
<basis core="api" name="api.users" url="https://reqres.in/api/users" method="get" run="atclient"></basis>

<basis core="callback" run="atclient" triggers="api.users" method="onSource"></basis>
```

The endpoint answers with an object (`{ page, data: [...] }`), so `api.users` has one row whose
`data` property holds the array. Use `OnProcessed` to publish the array itself (next example).

### Projecting a third-party response with `OnProcessed`

```html
<basis core="api" url="https://reqres.in/api/users" method="get" run="atclient" OnProcessed="projectUsers"></basis>

<basis core="print" datamembername="api.users" run="atclient">
  <face><div>@first_name@ @last_name@</div></face>
</basis>

<script>
  async function projectUsers(args) {
    if (!args.response.ok) {
      args.results = [$bc.util.source.data("api.error", [{ status: args.response.status }])];
      return;
    }
    const json = await args.response.json();
    args.results = [$bc.util.source.data("api.users", json.data)];
  }
</script>
```

### Renaming envelope sources in `OnProcessed`

```html
<basis core="api" url="data/book.json" method="get" run="atclient" OnProcessed="renameSources"></basis>
<basis core="callback" run="atclient" triggers="my-book.type"></basis>

<script>
  async function renameSources(args) {
    const json = await args.response.json();
    args.results = json.sources.map((x) =>
      $bc.util.source.data(`my-${x.options.tableName}`, x.data, x.options)
    );
  }
</script>
```

### Replacing the request with `OnProcessing`

```html
<basis core="api" url="data/book.json" method="get" run="atclient" OnProcessing="customFetch"></basis>

<script>
  function customFetch(args) {
    const request = args.request;
    const fresh = new Request(`${request.url}?q=${Date.now()}`, {
      method: request.method,
      headers: request.headers,
      credentials: "include"
    });
    args.response = fetch(fresh);
  }
</script>
```

### Re-running on a button click

```html
<button name="events.fetch" bc-triggers="click" bc-value="null">Fetch</button>

<basis core="api" url="data/book.json" method="get" run="atclient" triggers="events.fetch"></basis>
```

The request is made once on load and again on every click (the button publishes `events.fetch`).
Add `ignoreNullSource="true"` to skip the initial request.

### Polling with a timer

```html
<basis core="api" url="/api/token-result" method="post" run="atclient"
       body='{"check":"[##cms.cms.time2##]"}' name="poll.result" events="timer.30000"></basis>
```

`/api/token-result` (`server/api-server.js`) echoes the JSON body. The request repeats every 30
seconds and `poll.result` is replaced each time.

### POST with a body and a different content type

```html
<basis core="api" url="/api/token-result" method="post" run="atclient"
       Content-Type="text/plain" body="hello" name="echo"></basis>
```

### Bypassing browser caching headers

```html
<basis core="api" url="data/book.json" method="get" run="atclient" noCache="true"></basis>
```

## Pitfalls

- **`name` only applies to non-envelope responses.** If the JSON has a `sources` array the ids
  come from `options.tableName` and `name` is ignored.
- **`OnProcessed` must assign `args.results`**, otherwise nothing is published and no error is
  logged. The default JSON parsing is not run as a fallback.
- **A body on `GET` or `HEAD` makes `fetch` reject with a `TypeError`.** The command passes `body`
  through unchanged; use `POST`/`PUT`/`PATCH` with a body, or put the data in the URL.
- **`body` is not JSON-encoded.** `body="{myid=44}"` (as in the shipped `body` example) is sent
  verbatim and is not valid JSON; write `body='{"myid":44}'`.
- **Rejections abort the initial rendering wave.** A network error, a GET with a body or a
  non-JSON response rejects `runAsync`; the runtime does not catch it, the console shows an
  unhandled rejection, and the low-priority wave (rendering commands) of the initial page
  processing never starts. Guard risky endpoints with `OnProcessed`, which can inspect
  `response.ok` and still publish something.
- **No `response.ok` check by default.** A 404 or 500 with a JSON body is published as data.
- **The response body can be read once.** Reading it in `OnProcessed` is fine (the default parser
  is skipped); do not read it in `OnProcessing` and then let the command parse it again.
- **A missing `options.tableName` in an envelope entry throws** when the `Source` is created.
- **`Content-Type` is sent even without a body** because the default is `application/json`. A
  literal `Content-Type=""` does not remove it (empty attributes are read as absent); make the
  attribute resolve to an empty string through a token with an empty fallback, or replace the
  request in `OnProcessing`.
- **Tokens without a fallback wait.** `url="/api/search?q=[##filters.search.q##]"` does not run
  until `filters.search` is published; while it waits, the initial normal wave (and with it the
  rendering wave) is held up. Give the token a fallback (`[##filters.search.q|()##]`) or use
  `ignoreNullSource="true"` with `triggers`. Tokens on the built-in `cms.*` sources do not wait.
- **Concurrent triggers are dropped**: while one request is pending the command is busy and a
  second trigger is ignored (`allowMultiProcess` is `false`).
- **Cross-origin requests follow the browser's CORS rules**; `credentials` and `mode` cannot be set
  from attributes, only from a replaced request in `OnProcessing`.
- `<member>` elements inside `api` are ignored.

## Related

- [dbsource](dbsource.md) - connection-based loading with the same envelope
- [callback](callback.md) - inspecting the published sources
- [Sources and reactivity](../sources-and-reactivity.md) - merge types and source options
- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md) - `triggers`, `events`, `if`, `ignoreNullSource`, `On*` hooks
- [JavaScript API](../javascript-api.md) - `$bc.util.source.data`
- [Binding and tokens](../binding-and-tokens.md) - tokens in `url` and `body`
- [Connections](../connections.md) - the envelope as produced by connection providers

## Source files

- `src/component/source/APIComponent.ts`
- `src/component/source/SourceComponent.ts`
- `src/component/ElementBaseComponent.ts` (hooks, `triggers`, `events`, `if`)
- `src/CallbackArgument.ts` (`APIProcessingCallbackArgument`, `APIProcessedCallbackArgument`)
- `src/data/Data.ts`
- `src/data/Source.ts`
- `src/wrapper/SourceWrapper.ts` (`data`)
- `src/type-alias.ts` (`IServerResponse`, `HttpMethod`)
