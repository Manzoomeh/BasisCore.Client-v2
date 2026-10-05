# dbsource

`dbsource` loads one or more data sets from a named connection and publishes each of them as a
source. The command does not run SQL on the client and does not know anything about databases: it
serialises its own markup, hands it to the connection selected by the `source` attribute, and maps
the data sets that come back onto its `<member>` children, one source per member. Use it whenever a
server (or a `local` provider function) understands BasisCore command markup and answers with the
standard `sources` envelope, including streaming servers reached over `websocket` or `chunkbased`
connections. For plain REST endpoints that return arbitrary JSON, use [api](api.md) instead.

## How a dbsource runs

1. `initializeAsync` reads the `name` attribute. It becomes the first part of every published
   source id.
2. The command collects every `<member>` element inside it (`querySelectorAll("member")`).
   A `dbsource` without members does nothing.
3. `runAsync` reads the `source` attribute and resolves it to a connection with
   `context.connections.getConnection(name)`. An unknown name throws
   `ConfigNotFoundException` for `host.settings`.
4. The whole element (`outerHTML`) is converted to a string token and evaluated, so every
   `[##…##]` token in the command and in its members is replaced by its current value. The result
   is sent as `command`, together with `dmnid` taken from `default.dmnid`:

   ```js
   { command: "<basis core=\"dbsource\" …>…</basis>", dmnid: <default.dmnid> }
   ```

5. The connection answers with a list of data sets (see *Server response* below). The list is
   mapped onto the members **by position**: the first data set goes to the first member, the
   second to the second, and so on. The `tableName` inside the response is not used for the
   mapping. If the number of data sets differs from the number of members the command throws:

   ```text
   Command '<name>' has 2 member(s) but 1 result(s) returned from source!
   ```

6. For each member the rows go through `postsql` (if set), then `sort` (if set), then a
   `rownumber` column (1-based) is added to every row, and the result is published as the source
   `<name>.<member>` in lower case, carrying the `options` of the data set (`mergeType`,
   `keyFieldName`, `statusFieldName`, `extra`). With `preview="true"` the source is also dumped
   to the console.

`dbsource` has `Priority.normal`: it runs after `call` commands and before rendering commands in
the initial processing of the page. It is created with `allowMultiProcess = true`, so a trigger
that arrives while a previous load is still in flight starts a second load instead of being
dropped.

## Attributes of the command

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | string | | Must be `dbsource`. |
| `run` | string | | Must be `atclient` (case-insensitive); other values leave the element untouched. |
| `name` | string | | Prefix of the published source ids. Tokens allowed. |
| `source` | string | | Name of the connection: the third part of a `connection.<provider>.<name>` key in `host.settings`. Matched case-sensitively. Tokens allowed. |
| `triggers` | string | | Space separated source ids. When one of them is published the command runs again (and sends the `command` again). |
| `events` | string | | Space separated DOM, window, document or timer events that run the command again. See [Command attributes and lifecycle](../command-attributes-and-lifecycle.md). |
| `if` | string | | JavaScript expression evaluated before every run; `false` skips the run. |
| `ignoreNullSource` | boolean | `false` | When `true`, a run without an incoming source (the initial run) is skipped. |
| `OnRendering`, `OnRendered` | string | | Global function names called around every run. |

`OnProcessing` and `OnProcessed` are read from the element but the member-based loader never
calls them; they have no effect on `dbsource`.

Every other attribute you put on the element (for example `filter-name="[##data.filter.name##]"`
or `counter="…"`) is not interpreted by the client. It travels to the server inside `command`
with its tokens already resolved, which is how parameters are passed to the server-side command.

## Attributes of `<member>`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | string | | Second part of the published source id. |
| `preview` | boolean | `false` | When `true`, the published source is logged with `console.log` and `console.table`. |
| `sort` | string | | An `ORDER BY` clause executed on the client with AlaSQL: `SELECT * FROM ? order by <sort>`. |
| `postsql` | string | | A SQL statement executed on the client with AlaSQL over the received rows. `[<name>.<member>]` in the statement is replaced (case-insensitively) by the `?` parameter that carries the rows. |

`sort` and `postsql` need AlaSQL; see [Client-side SQL](../client-side-sql.md). Any other member
attribute (`type`, `request`, …) is only meaningful to the server that receives the command.

## What is sent, per connection provider

The parameters object `{ command, dmnid }` is handed to the provider's `loadDataAsync`. How it is
transported depends on the provider configured under `connection.<provider>.<name>`; the full
contract is in [Connections](../connections.md).

| Provider | Transport |
| --- | --- |
| `web` | `fetch` to the configured URL with the verb from the connection or `default.source.verb` (default `POST`). `POST` sends `command` and `dmnid` as `application/x-www-form-urlencoded` body; `GET` appends them as a query string. The answer is one JSON envelope. |
| `websocket` | Opens a `WebSocket` to the URL and sends `JSON.stringify({ command, dmnid })` once the socket is open. Every message received is one envelope. |
| `chunkbased` | `fetch` with the configured `method` (default `GET`). For non-`GET` methods the body is `JSON.stringify(body ?? parameters)` (or the result of `bodyFactory`). The response body is read as a stream of envelopes. |
| `local` | Calls the configured JavaScript function with the parameters and expects the column-array table format back. |
| `push` | Ignores the parameters and subscribes to push messages. |

`default.dmnid` defaults to `""`, which `getDefault` treats as "not set" and returns `null`. With
the `web` provider `URLSearchParams` turns that into the literal string `null`; the JSON based
providers send `null`. Set `'default.dmnid'` in `host.settings` when the server needs it.

## Server response

Every provider except `local` expects this envelope (`IServerResponse` in `src/type-alias.ts`):

```json
{
  "setting": { "keepalive": true },
  "sources": [
    {
      "options": {
        "tableName": "book.list",
        "mergeType": 0,
        "keyFieldName": null,
        "statusFieldName": null,
        "extra": null
      },
      "data": [
        { "id": 1, "BookName": "Web design", "Price": 14000, "Count": 1 }
      ]
    }
  ]
}
```

- `sources[i].data` becomes the rows of member `i`. An object instead of an array becomes one row.
- `sources[i].options` becomes the options of the published source: `mergeType` `0` replaces the
  existing rows, `1` appends them (with `keyFieldName`/`statusFieldName` driving insert, update and
  delete), `extra` is attached to the source. See
  [Sources and reactivity](../sources-and-reactivity.md).
- `options.tableName` is required by the providers (it is used as the intermediate `Data` id) but
  the published id is always `<name>.<member>`.
- `setting.keepalive` matters only for streaming providers: when a message carries
  `setting.keepalive === false` the `websocket` provider closes the socket and the `chunkbased`
  provider stops reading.

## Streaming connections

When the connection returns a `StreamPromise` (the `websocket` and `chunkbased` providers do), the
command keeps it in `this.connection` instead of awaiting it, so `runAsync` finishes immediately
and the initial processing of the page continues while data keeps arriving. Each envelope received
over the stream goes through the same positional mapping and is published with its own `options`,
which is how a server appends rows to a growing list or replaces a clock every second.

When the command is triggered again (through `triggers` or `events`) while the stream is still
open (`connection.isOpen`), it does not reconnect: it sends the freshly resolved `{ command,
dmnid }` over the open socket with `connection.send(params)`. The mock server in
`server/websocket.js` reads a `counter="…"` attribute out of that command to extend its countdown.
If the `source` attribute resolves to a different connection name while the stream is open the
command throws:

```text
Source attribute can't change when socket is open . Valid connection is 'simple'
```

For the `chunkbased` provider the object behind `connection.send` is the
`ReadableStreamDefaultReader` of the response, which has no `send` method: re-triggering a
chunk-based `dbsource` while the stream is open throws a `TypeError`. Re-triggering after the
stream ended works and starts a new request.

When a stream is closed (by the server, by `keepalive: false`, or because the command was disposed,
in which case the receiver callback returns `false` and the provider closes the connection), the
next trigger opens a new one. The `websocket` provider keys open sockets by the command `name`; a
second `dbsource` with the same `name` on the same connection closes the first socket.

## Examples

### One request, two published sources

Runs against the dev server (`npm run dev`), which serves the example folder. The response file
is `example/component/source/dbsource/simple/data/book.json`.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body>
  <basis core="dbsource" source="bookapi" name="book" run="atclient">
    <member name="list" preview="true"></member>
    <member name="type" preview="true"></member>
  </basis>

  <basis core="print" datamembername="book.list" run="atclient">
    <layout><ul>@child</ul></layout>
    <face><li>@BookName@ (@Price@)</li></face>
  </basis>

  <basis core="print" datamembername="book.type" run="atclient">
    <layout><ol>@child</ol></layout>
    <face><li>@Name@</li></face>
  </basis>

  <script>
    var host = {
      settings: {
        "connection.web.bookapi": "data/book.json",
        "default.dmnid": 2668,
        "default.source.verb": "GET"
      }
    };
  </script>
</body>
</html>
```

The file declares `tableName: "book.list"` and `tableName: "book.Type"`; the published ids are
`book.list` and `book.type` because the member names and the command name decide them.

### Parameters resolved from another source, re-sent on change

```html
<form name="data.filter" bc-triggers="submit">
  <input type="text" name="name" />
  <input type="submit" />
</form>

<basis core="dbsource" source="schoolapi" name="student" run="atclient"
       filter-name="[##data.filter.name|()##]" triggers="data.filter">
  <member name="list" sort="name asc"></member>
</basis>
```

Every submit publishes `data.filter`, which re-runs the command; the new `command` string carries
the resolved `filter-name="…"` attribute. `sort` is applied on the client to every answer and
needs `dbLibPath` to be configured.

### Live clock over a websocket

`npm run ws` starts `server/websocket.js`, which pushes one envelope per second for ten seconds and
then sends `keepalive: false`.

```html
<basis core="dbsource" source="simple" name="stream" run="atclient">
  <member name="time"></member>
</basis>

<div>
  Updates for 10 seconds (remaining [##stream.time.remain##])<br />
  Time: [##stream.time.hh|(00)##]:[##stream.time.mm|(00)##]:[##stream.time.ss|(00)##]
</div>

<script>
  var host = {
    settings: {
      "connection.websocket.simple": "ws://localhost:8080/time",
      "default.dmnid": 2668
    }
  };
</script>
```

### Sending new parameters over the open socket

```html
<form name="test.counter" bc-triggers="submit">
  <input type="number" name="value" min="5" max="30" value="10" />
  <input type="submit" />
</form>

<basis core="dbsource" source="simple" name="stream" run="atclient"
       counter="[##test.counter.value|(10)##]" triggers="test.counter">
  <member name="time"></member>
</basis>

<div>remaining [##stream.time.remain##]</div>

<script>
  var host = {
    settings: {
      "connection.websocket.simple": "ws://localhost:8080/time-remain",
      "default.dmnid": 2668
    }
  };
</script>
```

Each submit sends `{ command, dmnid }` again over the same socket; the server adds the `counter`
value to its countdown.

### Appending rows from a chunked HTTP stream

`/chunk/chunk-stream` is served by `server/chunk-server.js` through the dev server and writes one
envelope with `mergeType: 1` per second, so `user.list` grows.

```html
<basis core="dbsource" source="simple" name="user" run="atclient">
  <member name="list"></member>
</basis>

<basis core="print" datamembername="user.list" run="atclient">
  <layout><table><tbody>@child</tbody></table></layout>
  <face><tr><td>@id@</td><td>@name@</td><td>@age@</td></tr></face>
</basis>

<script>
  function onCloseConnection(param) {
    console.log("stream ended, withError =", param.withError);
  }
  var host = {
    settings: {
      "connection.chunkBased.simple": {
        Connection: "/chunk/chunk-stream",
        onClose: onCloseConnection
      },
      "default.dmnid": 2668
    }
  };
</script>
```

### Refining the received rows with `postsql`

```html
<basis core="dbsource" source="bookapi" name="book" run="atclient">
  <member name="expensive"
          postsql="SELECT [id], [BookName], [Price] FROM [book.expensive] WHERE [Price] > 10000"
          sort="[Price] desc"></member>
  <member name="type"></member>
</basis>

<script>
  var host = {
    dbLibPath: "/alasql.min.js",
    settings: {
      "connection.web.bookapi": "data/book.json",
      "default.source.verb": "GET"
    }
  };
</script>
```

`[book.expensive]` is the full lower-cased source id and is replaced by `?`; `postsql` runs
first, `sort` second, and `rownumber` is added last.

### Inspecting what came back

```html
<basis core="callback" run="atclient" triggers="book.list book.type" method="onSource"></basis>
<script>
  function onSource(args) {
    console.log(args.source.id);
    console.table(args.source.rows);
  }
</script>
```

## Pitfalls

- **Mapping is positional, not by `tableName`.** Two members need exactly two data sets, in the
  member order. A mismatch throws and nothing is published for that answer.
- **A failing `web` or `local` load blocks the rest of the page.** For non-streaming providers
  `runAsync` awaits the load. The runtime does not catch a rejected `runAsync` (unknown connection
  name, HTTP error, member count mismatch, invalid JSON): it becomes an unhandled promise rejection
  and the low-priority wave, which contains every rendering command, never starts for the initial
  page processing. Streaming providers do not have this problem because the promise is not
  awaited; their errors are logged by the provider.
- **`default.source.verb` must be upper case.** `WebConnectionOptions.fetchAjax` compares the verb
  with `"GET"` case-sensitively. With `'default.source.verb': 'get'` the parameters are put in the
  request body and `fetch` rejects with a `TypeError`, because a GET request cannot have a body.
  The shipped example `example/component/source/dbsource/simple/index.html` uses `'get'` and is
  affected.
- **Write explicit closing tags for members.** HTML does not self-close unknown elements, so
  `<member name="a" /><member name="b" />` parses as `b` nested inside `a`. `querySelectorAll`
  still finds both, but the nested markup is what the server receives.
- **Tokens without a fallback wait for their source.** `filter-name="[##data.filter.name##]"`
  suspends the run (and the initial normal wave) until `data.filter` is published; write
  `[##data.filter.name|()##]` to send an empty value instead. Tokens on `cms.*` sources do not
  wait.
- **The connection name is case-sensitive**, and the published ids are lower-cased:
  `name="Book"` with `<member name="List">` publishes `book.list`.
- **`dmnid` is sent as `"null"`** by the `web` provider unless `default.dmnid` is set.
- **Re-triggering an open chunk-based stream throws a `TypeError`** (`send` is called on a stream
  reader). Wait for the stream to end, or use a `websocket` connection when parameters must be
  re-sent.
- **`source` cannot change while a stream is open.** Resolve the connection name once or let the
  stream end before switching.
- **`sort` and `postsql` run on every received envelope**, including every push of a streaming
  connection, and they need AlaSQL (`dbLibPath`). `rownumber` is added after them, so it cannot be
  used inside `sort` or `postsql`.
- **`OnProcessing`/`OnProcessed` are ignored** by `dbsource`; use a [callback](callback.md) on the
  published source or `OnProcessing` on the rendering command instead.
- **Errors inside member post-processing are not awaited.** `processLoadedDataSet` calls
  `addDataSourceAsync` for each member without awaiting it, so a bad `postsql` statement surfaces
  as an unhandled rejection rather than failing the command.

## Related

- [Connections](../connections.md) - provider configuration and the `local` table format
- [Sources and reactivity](../sources-and-reactivity.md) - merge types, key and status fields
- [Client-side SQL](../client-side-sql.md) - `sort`, `postsql` and AlaSQL loading
- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md) - `triggers`, `events`, `if`
- [api](api.md) - fetch-based loading of arbitrary JSON
- [inlinesource](inlinesource.md) - deriving sources from sources on the client
- [callback](callback.md) - reacting to the published sources from JavaScript
- [Host configuration](../host-configuration.md) - `default.dmnid`, `default.source.verb`, `dbLibPath`

## Source files

- `src/component/source/DbSourceComponent.ts`
- `src/component/source/MemberBaseSourceComponent.ts`
- `src/component/source/SourceComponent.ts`
- `src/component/source/base/DbSourceMember.ts`
- `src/component/source/base/Member.ts`
- `src/context/RootContext.ts` (`loadDataAsync`)
- `src/options/connection-options/ConnectionOptionsManager.ts`
- `src/options/connection-options/WebConnectionOptions.ts`
- `src/options/connection-options/WebSocketConnectionOptions.ts`
- `src/options/connection-options/ChunkBasedConnectionOptions.ts`
- `src/options/connection-options/StreamPromise.ts`
- `src/data/DataUtil.ts` (`addRowNumber`)
- `src/type-alias.ts` (`IServerResponse`)
