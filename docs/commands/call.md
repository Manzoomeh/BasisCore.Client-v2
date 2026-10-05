# call

`call` loads a markup fragment over HTTP, puts it where the command stands and then processes the
loaded markup as BasisCore content. Use it to assemble a page from server-side pieces (header,
menu, a widget rendered by the server) or to switch a region of the page to a different fragment
when a source changes. The loaded fragment may itself contain `[##…##]` tokens, `<basis>` commands
and further `call` commands.

## Attributes

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | `call` | required | Command name. |
| `run` | `atclient` | required | Only `run="atclient"` elements are processed by the browser. |
| `file` | string (token) | none | Page name appended to the connection URL. Resolved through the token system, so it may contain bindings such as `[##local.call.filename##]`. |
| `url` | string (token) | none | Base URL of an ad-hoc `web` connection. When present, the `callcommand` connection is not consulted. `file` is still appended to it. |
| `method` | `get` or `post` (token) | setting `default.call.verb` (`POST`) | HTTP verb. The value is upper-cased, so `method="post"` and `method="POST"` are the same. |
| `pagesize` | string (token) | `"0"` | Becomes the `siteSize` parameter of a non-POST request, which the `web` provider drops for GET (see below). Not used for POST. |
| `if`, `triggers`, `events`, `OnRendering`, `OnRendered`, `ignoreNullSource` | common | | See [Command attributes and lifecycle](../command-attributes-and-lifecycle.md). |
| any other attribute | string (token) | | For POST only: sent as a request parameter (see below). |

Attribute names are case-insensitive because the DOM lower-cases them; the reserved list the
command checks is `core`, `run`, `file`, `method`, `pagesize` (compared in lower case).

## How a request is built

### Choosing the connection

The command calls `context.loadPageAsync(file, parameters, method, url)`. The root context picks
the provider:

- if `url` is given, a new `WebConnectionOptions` is created on the spot with that URL;
- otherwise the connection named `callcommand` is taken from the host settings, for example
  `"connection.web.callcommand": "call/"`. If no such connection exists a
  `ConfigNotFoundException` for `host.settings` / `callcommand` is thrown.

The `web` provider builds the final address as `<connection url><file>` with no separator added,
so the connection URL normally ends with `/` (`"call/"` + `"called.html"` = `call/called.html`).
When `file` is absent only the connection URL is requested. See [Connections](../connections.md)
for the connection syntax.

### Verb and parameters

The verb is `method` if present, otherwise the `default.call.verb` setting (library default
`POST`). The parameters depend on the verb:

- **POST**: every attribute of the element except `core`, `run`, `file`, `method` and `pagesize`
  is added to the body under its lower-cased name, after token resolution. This includes
  attributes such as `triggers`, `if` or `data-*`. The body is sent as
  `application/x-www-form-urlencoded`.
- **GET**: the parameter object is `{ fileNames: <file>, siteSize: <pagesize or "0"> }`. The
  `web` provider does not append GET parameters to the URL (the code that would do so is
  disabled), so a GET request carries no parameters at all; only the URL identifies the fragment.

The request itself is an `XMLHttpRequest` with a 15 second timeout. Any status outside 200-299, a
network error or a timeout rejects the promise with an `Error` (`HTTP <status>: …`,
`Network error`, `Request timeout`), which surfaces as an unhandled rejection of the command run.

### Inserting and processing the result

The response text is converted with `$bc.util.toNode(result)`
(`document.createRange().createContextualFragment`), so `<script>` elements inside the fragment
execute when the fragment is inserted. The fragment replaces whatever the command rendered
before (`range.setContent`), then a new `ComponentCollection` is resolved from the command's own
container and `processNodesAsync` is run over the fragment's child nodes. The nested collection
uses the same context as the `call` command, so tokens inside the fragment see the same sources,
and nested commands run in their own high / normal / low waves.

### Priority

`call` is the only built-in command with `Priority.high`. Within one collection all `call`
commands run and finish before `normal` components (sources such as `dbsource`, `api`,
`inlinesource`) and `low` components (rendering commands) start. Commands inside the loaded
fragment belong to the nested collection and are not part of the outer waves.

### Re-running and disposal

`call` re-runs when one of its `triggers` sources is set or when an `events` entry fires. Each
run replaces the DOM content and assigns a new nested collection to the command, but the
previous collection is not disposed: its components keep their source handlers until the `call`
command itself is disposed, and `disposeAsync` only disposes the most recent collection.

`OnRendering` is invoked before the request (set `args.prevent = true` to skip it) and
`OnRendered` after the fragment has been processed; because `runAsync` returns `undefined`,
`OnRendered` receives `result: undefined`.

## Examples

### Load a fragment through the `callcommand` connection

`index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="/basiscore.js"></script>
  <title>Call Command - Simple</title>
</head>
<body>
  <basis core="call" file="called.html" pagesize="" run="atclient"></basis>
  <script>
    const host = {
      settings: {
        "default.call.verb": "get",
        "connection.web.callcommand": "call/",
      },
    };
  </script>
</body>
</html>
```

`call/called.html`:

```html
<h1>hi from called</h1>
<script>
  alert('hi from called');
</script>
```

### POST with extra attributes as parameters

```html
<basis core="call" file="called.html" run="atclient"
       method="post" data-pp="[##cms.cms.time##]"></basis>
<script>
  const host = {
    settings: { "connection.web.callcommand": "call/" },
  };
</script>
```

The body of the request is `data-pp=<current time>` (the token is resolved before sending).

### Nested calls

`index.html`:

```html
<basis core="call" file="call-level-1.html" pagesize="" run="atclient"></basis>
<script>
  $bc.setOptions({
    settings: {
      "default.call.verb": "get",
      "connection.web.callcommand": "call/",
    },
  }).run();
</script>
```

`call/call-level-1.html` (the loaded fragment loads the next level itself):

```html
<h1>hi from call-level-1</h1>
<basis core="call" file="call-level-2.html" pagesize="" run="atclient"></basis>
<script>
  console.log("hi from call-level-1");
</script>
```

### Switching the fragment from a source

```html
Load [##local.call.filename##]...
<basis core="call" file="[##local.call.filename##]" pagesize="" run="atclient"
       triggers="local.call"></basis>
<script>
  const host = {
    settings: {
      "default.call.verb": "get",
      "connection.web.callcommand": "call/",
    },
  };
  let i = 1;
  const h = setInterval(() => {
    $bc.setSource("local.call", { filename: `call-level-${i}.html` });
    i += 1;
    if (i == 4) clearInterval(h);
  }, 2000);
</script>
```

The command waits for `local.call` the first time (the token has no value yet), then re-runs on
every `setSource`.

### Ad-hoc URL

```html
<basis core="call" pagesize="" url="https://www.example.com/fragments/" file="menu.html"
       run="atclient"></basis>
<script>
  const host = { settings: { "default.call.verb": "get" } };
</script>
```

No `callcommand` connection is needed; the request goes to
`https://www.example.com/fragments/menu.html`.

### Rendering hooks

```html
<basis core="call" file="called.html" pagesize="" run="atclient"
       OnRendering="rendering" OnRendered="rendered"></basis>
<script>
  const host = {
    settings: {
      "default.call.verb": "get",
      "connection.web.callcommand": "call/",
    },
  };
  async function rendering(args) {
    console.log('rendering', args);
    args.prevent = await Promise.resolve(false); // set true to skip the request
  }
  function rendered(args) {
    console.log('rendered', args);
  }
</script>
```

## Pitfalls

- GET requests send no parameters: `fileNames` and `siteSize` are computed but the `web`
  provider never appends them to the URL. Put everything the server needs into `file` or `url`,
  or use POST.
- With POST, *every* non-reserved attribute is posted, including `triggers`, `if`,
  `OnRendering` and `data-*`. Servers that reject unknown fields will see them.
- The connection URL and `file` are concatenated as-is. `"connection.web.callcommand": "call"`
  with `file="x.html"` requests `callx.html`.
- Without `url` and without a `callcommand` connection the run throws
  `ConfigNotFoundException` (`host.settings` / `callcommand`).
- The default verb is `POST`. Most fragment servers (including the example dev server) expect
  GET, so set `"default.call.verb": "get"` or `method="get"`.
- Scripts inside the fragment run on insertion, every time the command re-runs.
- Re-running does not dispose the previous nested collection; components from earlier fragments
  keep their source handlers until the `call` command is disposed. A `call` that re-runs often
  on a trigger accumulates handlers.
- The command reads `OnProcessing` / `OnProcessed` like every command but never invokes them;
  only `OnRendering` and `OnRendered` fire.
- A fragment is parsed with `createContextualFragment`, not as a full document: `<html>`,
  `<head>` and `<body>` wrappers in the response are dropped.

## Related

- [Connections](../connections.md)
- [Host configuration](../host-configuration.md)
- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md)
- [Binding and tokens](../binding-and-tokens.md)
- [group](group.md), [repeater](repeater.md), [api](api.md)
- [Troubleshooting](../troubleshooting.md)

## Source files

- `src/component/collection/CallComponent.ts`
- `src/context/RootContext.ts` (`loadPageAsync`, connection selection)
- `src/context/LocalContext.ts` (`loadPageAsync` delegation to the owner context)
- `src/options/connection-options/WebConnectionOptions.ts` (`loadPageAsync`, `xmlAjax`)
- `src/options/connection-options/ConnectionOptionsManager.ts`
- `src/options/HostOptions.ts` (`default.call.verb`)
- `src/ComponentCollection.ts` (priority waves, nested processing)
- `src/wrapper/UtilWrapper.ts` (`toNode`)
- `src/component/ElementBaseComponent.ts` (`OnRendering`, `OnRendered`, `if`, `triggers`)
