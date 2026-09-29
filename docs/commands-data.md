# Data and composition commands

These commands load data, run code, or assemble parts of the page: `dbsource`,
`inlinesource`, `api`, `call`, `group`, `callback`, `cookie` and `component`. The rendering
commands that display their results are in [commands-rendering.md](commands-rendering.md).

Every command is written as `<basis core="..." run="atclient">`. Connections referred to by
name are configured in the host object; see [connections.md](connections.md).

## Shared attributes

All commands on this page read these attributes.

| Attribute | Default | Meaning |
|---|---|---|
| `if` | — | JavaScript expression; when it is false the command does not run. |
| `triggers` | — | Space-separated source ids. Publishing any of them runs the command again. |
| `events` | — | Space-separated event descriptors that run the command: `document.<event>`, `window.<event>`, `timer.<milliseconds>`, or `<selector>.<event>`. |
| `preventDefault`, `stopPropagation` | `false` | Applied to DOM events raised through `events`. |
| `ignoreNullSource` | `false` | When `true`, a run that has no source (such as the first run on page load) is skipped. |
| `OnRendering`, `OnRendered` | — | Global function names called before and after the command runs. |

`api` also reads `OnProcessing` and `OnProcessed`, described in its own section. Callback
arguments are described in [hooks-and-extensibility.md](hooks-and-extensibility.md), and
`triggers` in [sources-and-triggers.md](sources-and-triggers.md).

## dbsource

Sends the command to a named connection and publishes each returned table as a source.

| Attribute | Default | Meaning |
|---|---|---|
| `name` | — | Source prefix. Each member is published as `<name>.<member name>`. |
| `source` | — | Connection name, such as `catalog` for a host setting `connection.web.catalog`. |

Children: one `<member>` per expected result table.

| `<member>` attribute | Meaning |
|---|---|
| `name` | Member name; the result is published as `<command name>.<member name>`, lower-cased. |
| `sort` | `ORDER BY` expression applied in the browser, such as `price desc`. |
| `postsql` | SQL run in the browser over the result before it is published. See [client-side-sql.md](client-side-sql.md). |
| `preview` | When `true`, the published source is also written to the console. |

Other attributes on the command and its members, such as `request` below, and member
content are not interpreted in the browser; they travel to the server inside the command
text.

The request carries two form fields:

| Field | Value |
|---|---|
| `command` | The command's full markup (`outerHTML`) with `[##...##]` bindings already resolved. |
| `dmnid` | The host setting `default.dmnid`. |

```html
<script>
  var host = {
    settings: {
      "connection.web.catalog": "https://example.com/basis/catalog",
      "default.dmnid": 1
    }
  };
</script>

<basis core="dbsource" run="atclient" name="shop" source="catalog">
  <member name="products" request="productlist" sort="price desc"></member>
  <member name="categories" request="categorylist"></member>
</basis>

<basis core="print" run="atclient" dataMemberName="shop.products">
  <face><p>@title@ – @price@</p></face>
</basis>
```

A web connection expects a response of this shape, one entry per member, in member order:

```json
{
  "sources": [
    { "options": { "tableName": "products", "mergeType": 0 },
      "data": [ { "id": 1, "title": "Desk lamp", "price": 39 } ] },
    { "options": { "tableName": "categories", "mergeType": 0 },
      "data": [ { "id": 7, "title": "Lighting" } ] }
  ]
}
```

Caveats:

- Results are matched to `<member>` elements by position, not by name. `tableName` is not
  used to name the source; the first result becomes the first member.
- If the counts differ, the command throws:
  `Command '<name>' has <members> member(s) but <results> result(s) returned from source!`
- Each published row gains a `rownumber` column, starting at 1.
- `mergeType` and `keyFieldName` from each result's `options` are kept. `mergeType` is
  numeric: `0` replaces the source, `1` appends to it.
- A web connection sends the request without cookies. The default verb is `POST`, from the
  host setting `default.source.verb`.

## inlinesource

Builds sources in the browser from other sources, with SQL or a join. No request is made.

| Attribute | Default | Meaning |
|---|---|---|
| `name` | — | Source prefix, as for `dbsource`. |

Children: `<member>` elements with `format="sql"` or `format="join"`. `sort`, `postsql` and
`preview` work as for `dbsource`.

```html
<basis core="inlinesource" run="atclient" name="report">
  <member name="premium" format="sql">select title, price from [shop.products] where price &gt; 20</member>
</basis>
```

This publishes `report.premium` once `shop.products` exists.

Caveats:

- A member without `format="sql"` or `format="join"` is not supported.
- The SQL library is loaded on first use. The query syntax, the `datamembername` attribute
  for SQL members, and the join attributes are covered in
  [client-side-sql.md](client-side-sql.md).

## api

Calls an HTTP endpoint with `fetch` and publishes the JSON response.

| Attribute | Default | Meaning |
|---|---|---|
| `url` | — | Request URL. |
| `method` | `GET` | HTTP method; upper-cased before use. |
| `body` | — | Request body, sent exactly as written after bindings are resolved. |
| `Content-Type` | `application/json` | Value of the `Content-Type` request header. |
| `noCache` | `false` | When `true`, adds `pragma: no-cache` and `cache-control: no-cache`. |
| `name` | `cms.api` | Source id for a response that is not in the `sources` envelope. |
| `OnProcessing` | — | Global function name called before the request is sent. |
| `OnProcessed` | — | Global function name that turns the response into sources itself. |

How the response is published:

- If the JSON has a `sources` array, each entry is published under its own
  `options.tableName`, and `name` is ignored.
- Otherwise the whole JSON is published under `name`. An array becomes the rows, an object
  becomes a single row, and any other value becomes one row `{ "value": ... }`.

```html
<basis core="api" run="atclient" name="orders.open"
       url="https://example.com/api/orders?status=open" method="get"></basis>

<basis core="print" run="atclient" dataMemberName="orders.open">
  <face><p>Order @id@: @total@</p></face>
</basis>
```

The hooks receive `{ context, node, request }`, and `OnProcessed` also gets `response`:

| Hook | What you can do |
|---|---|
| `OnProcessing` | Read or adjust `request`. Set `response` to a `Response` or a promise of one to skip the network call. |
| `OnProcessed` | Read `response` and set `results` to an array of `Data` objects. Only those are published; the default publishing is skipped. |

```html
<script>
  function mapOrders(args) {
    return args.response.json().then(function (json) {
      args.results = [$bc.util.source.data("orders.open", json.items)];
    });
  }
</script>
<basis core="api" run="atclient" url="https://example.com/api/orders"
       OnProcessed="mapOrders"></basis>
```

Caveats:

- `body` is not serialised. Write the JSON text yourself, and bind values with `[##...##]`.
- A `GET` request with a `body` is rejected by the browser.
- The `Content-Type` header is always sent, which makes cross-origin requests use a CORS
  preflight.
- When `OnProcessed` is set and does not assign `results`, nothing is published.
- The response is read as JSON without checking the HTTP status.

## call

Loads an HTML fragment from the server, inserts it in place of the command, and runs the
commands inside it.

| Attribute | Default | Meaning |
|---|---|---|
| `file` | — | Fragment name, appended to the connection URL. |
| `url` | — | Base URL to use instead of the `callcommand` connection. |
| `method` | host setting `default.call.verb`, which is `POST` | HTTP method. |
| `pagesize` | `0` | Sent as `siteSize` on non-`POST` requests. |

Without `url`, the request goes to the connection named `callcommand`, for example the host
setting `connection.web.callcommand`. With `url`, the address is `url` followed directly by
`file`.

What is sent with a web connection:

| Method | Parameters |
|---|---|
| `POST` | Every attribute except `core`, `run`, `file`, `method` and `pagesize`, with lower-cased names and bindings resolved, as form fields. |
| `PUT`, `PATCH` | Only `fileNames` (the `file` value) and `siteSize`. |
| `GET` | No parameters; only the URL. |

```html
<script>
  var host = {
    settings: { "connection.web.callcommand": "https://example.com/fragments/" }
  };
</script>

<basis core="call" run="atclient" file="account-sidebar.html" section="orders"></basis>
```

This posts `section=orders` to `https://example.com/fragments/account-sidebar.html`.

Caveats:

- `url` is not in the excluded list, so on `POST` it is also sent as a form field.
- A missing `callcommand` connection raises a configuration error when the command runs.
- Requests time out after 15 seconds.
- The response is inserted as HTML and replaces the previous content on each run. Commands
  in the fragment run in the same context as the `call` command.

## group

Runs its children in their own local context, optionally with different host options.

| Attribute | Default | Meaning |
|---|---|---|
| `options` | — | JavaScript expression returning host options for the group, deep-merged over the page's original host options. |
| `if` | — | When false, the group's content is removed; when true again, it is restored and re-run. |

Children: any markup and `<basis>` commands.

The group's context reads sources from the page, and receives page sources as they are
published. Sources published inside the group stay inside it. With `options`, the group has
its own settings and connections.

```html
<script>
  var reportOptions = {
    settings: { "connection.web.reports": "https://reports.example.com/basis" }
  };
</script>

<basis core="group" run="atclient" options="reportOptions">
  <basis core="dbsource" run="atclient" name="report" source="reports">
    <member name="monthly" request="monthly"></member>
  </basis>
  <basis core="print" run="atclient" dataMemberName="report.monthly">
    <face><p>@month@: @total@</p></face>
  </basis>
</basis>
```

Caveats:

- `options` is evaluated with `eval`, not parsed as JSON. Use the name of a global object,
  or wrap a literal in parentheses: `options="({ settings: { ... } })"`. A bare `{ ... }` is
  read as a block, not an object.
- Commands outside the group cannot see sources published inside it.
- Each run creates a fresh local context and disposes the previous one.

## callback

Calls a global JavaScript function when a source is published or an event fires.

| Attribute | Default | Meaning |
|---|---|---|
| `method` | — | Name of a global function, resolved with `eval`. Without it, the source is written to the console. |
| `triggers` | — | Source ids whose publication calls the function. |
| `events` | — | Event descriptors that call the function, such as `timer.30000` or `window.resize`. |

Children: none.

The function receives one argument, `{ context, node, source }`. For a trigger, `source` is
the published source. For an event, `source` has the descriptor as its id, such as
`timer.30000`; a DOM event is its single row, and a timer produces one row `{ value: <timer id> }`.

```html
<script>
  function showOrderCount(args) {
    document.getElementById("order-count").textContent = args.source.rows.length;
  }
</script>

<span id="order-count"></span>
<basis core="callback" run="atclient" triggers="orders.open" method="showOrderCount"></basis>
```

On the first run, the function is called once for each `triggers` source that already exists.

Caveats:

- The function is not awaited. An `async` function runs on its own, and its errors are not
  caught by the command; errors thrown synchronously are logged.
- With `events` and no `triggers`, set `ignoreNullSource="true"`; otherwise the first run
  fails.
- In `<selector>.<event>`, everything after the first dot is the event name, so the
  selector cannot contain a dot. Use an id or tag selector, such as `#refresh.click`.
- Selector events are bound to the elements present when the command starts.

## cookie

Writes one cookie with `document.cookie`.

| Attribute | Default | Meaning |
|---|---|---|
| `name` | — | Cookie name. Required. |
| `value` | empty | Cookie value, written as is. |
| `max-age` | — | Lifetime in seconds. |
| `path` | — | Cookie path. |

Children: none.

```html
<basis core="cookie" run="atclient" name="lang" value="en" max-age="2592000" path="/"></basis>
```

Caveats:

- Only these four attributes are read. `expires`, `domain`, `secure` and `samesite` cannot be
  set through the command.
- The value is not encoded. Avoid `;`, `,` and spaces, or encode the value before binding it.
- To delete a cookie, write it again with `max-age="0"` and the same `path`.

## component

Hosts a JavaScript component class. The command resolves the class, creates it, and passes
each run to it.

| Attribute | Default | Meaning |
|---|---|---|
| `core` | — | `component.<key>`. The key selects the class; see below. |
| `triggers` | — | Source ids that run the component again. |

Any other attribute is available to the component; the command itself does not read it.

How `<key>` is resolved:

| Key | Class |
|---|---|
| `local.<Name>` | The global object `<Name>`. |
| `basiscore.<Name>` | The global object `basiscore.<Name>`. |
| anything else | Looked up in the host `repositories` map: the full key first, then shorter prefixes, dropping one dotted part at a time. The matched URL is loaded as a script, and the script must define the full key as a global object path. |

The class is constructed with one argument, the owner command. It may implement
`initializeAsync()`, `runAsync(source)` and `disposeAsync()`. Through the owner it can read
attributes (`getAttributeValueAsync`, `getAttributeBooleanValueAsync`), publish and read
sources (`setSource`, `tryToGetSource`, `waitToGetSourceAsync`), and replace its output
(`setContent`, `toNode`).

```html
<script>
  window.GreetingCard = class {
    constructor(owner) {
      this.owner = owner;
    }
    async runAsync(source) {
      const title = await this.owner.getAttributeValueAsync("title", "Hello");
      const node = this.owner.toNode("<h2 class='greeting'></h2>");
      node.firstChild.textContent = title;
      this.owner.setContent(node);
    }
  };
</script>

<basis core="component.local.GreetingCard" run="atclient" title="Welcome back"></basis>
```

A repository-hosted component:

```html
<script>
  var host = { repositories: { "acme": "https://example.com/js/acme-widgets.js" } };
</script>
<basis core="component.acme.rating" run="atclient" score="4"></basis>
```

Here `acme-widgets.js` must define `acme.rating`.

Caveats:

- An attribute such as `options="{ size: 3 }"` reaches the component as the literal string.
  Parse it in the component, for example with `JSON.parse` when the value is JSON.
- When no repository entry matches the key, the component fails to initialise with the
  error `'<key>' related repository setting not found`.
- The script is loaded only when the object is not already defined, and a script tag with
  the same `src` is reused.
