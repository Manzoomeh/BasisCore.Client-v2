# Hooks and extensibility

This page covers the JavaScript side of BasisCore.js 2.39.6: the global `$bc` object,
the four lifecycle hook attributes, the `events` attribute, user-defined components, and
the order in which commands start.

Command markup is in [commands-rendering.md](commands-rendering.md) and
[commands-data.md](commands-data.md); sources in [sources-and-triggers.md](sources-and-triggers.md).

## The `$bc` object

Loading the library defines two globals:

- `$bc` — the runtime API described below.
- `basiscore` — the library exports: component classes, `MergeType`, `HostOptions`,
  and the built-in `exposer` component.

`$bc` holds any number of *instances*. Each instance renders a set of DOM fragments with
its own options and its own sources. The methods called directly on `$bc` all act on one
default instance, `$bc.global`.

| Member | Returns | What it does |
|---|---|---|
| `$bc.setSource(id, data, options?)` | instance | Starts the default instance if it has not started, then stores `data` as source `id`. |
| `$bc.run()` | instance | Starts the default instance. Calling it again does nothing. |
| `$bc.addFragment(selectorOrElement)` | instance | Adds elements for the default instance to render. |
| `$bc.setOptions(options)` | instance | Sets host options for the default instance only. |
| `$bc.new()` | instance | Creates a new, empty instance and adds it to `$bc.all`. |
| `$bc.global` | instance | The default instance, created on first access. |
| `$bc.all` | array | Every instance created so far, including `$bc.global` once it exists. |
| `$bc.util` | object | Helper functions, listed below. |

### Instance methods

An instance (`$bc.global`, or the value returned by `$bc.new()`) has:

```text
addFragment(selector: string | Element)   -> instance
setOptions(options)                       -> instance
run()                                     -> instance
setSource(id, data, options?)             -> instance
GetCommandList()                          -> CommandComponent[]
GetCommandListByCore(core: string)        -> CommandComponent[]
GetComponentList()                        -> IComponent[]
```

`GetCommandList`, `GetCommandListByCore` and `GetComponentList` exist only on instances,
not on `$bc` itself, and only work after the instance has run, for example
`$bc.global.GetCommandListByCore("print")`. `GetCommandListByCore` compares the full `core` attribute exactly, so a user-defined
component must be looked up as `"component.local.Greeter"`, not `"component"`.

### Rules for starting an instance

- **`addFragment` and `setOptions` must come before `run`.** Afterwards they throw
  `Can't add fragment for already builded bc object.` and
  `Can't set option for already builded bc object.`
- `addFragment("selector")` that matches nothing logs
  `Selector '<selector>' don't refer to any element(s).` If every `addFragment` call
  matched nothing, `run()` throws `No element(s) selected for start rendering!`
- Without any `addFragment` call, an instance renders the whole document.
- `$bc.setSource` always starts the default instance first, then stores the data. On an
  instance from `$bc.new()`, `setSource` before `run()` only starts the instance; the data
  of that first call is not stored. Call `run()` first.

```js
const sidebar = $bc.new().addFragment("#sidebar");
sidebar.setOptions({ settings: { "default.dmnid": "1" } }).run();
sidebar.setSource("menu.items", [{ title: "Home" }]);
```

### Automatic rendering

On `window` `load`, the library calls `$bc.run()` only when **both** hold:

1. `$bc.all` is empty — no instance has been created, and
2. `host.autoRender` is not `false` (it defaults to `true`).

Any earlier call that creates the default instance — `$bc.setOptions`,
`$bc.addFragment`, `$bc.run`, `$bc.setSource`, reading `$bc.global` — or any
`$bc.new()` makes `$bc.all` non-empty. From then on you must call `run()` yourself.

### `$bc.util`

| Signature | Behaviour |
|---|---|
| `getLibAsync(objectName, url)` | If `objectName` already evaluates to something, resolves to it. Otherwise adds `<script src="url">` to `<head>` (once per URL), waits for `load`, logs `<objectName> loaded from <url>` and resolves to the object. Rejects on a script error. |
| `toNode(rawHtml)` | Parses HTML into a `DocumentFragment`. |
| `toHTMLElement(rawXml)` | Parses one well-formed XML element (with its children) into an `HTMLElement`. Invalid XML does not throw, so check the result. |
| `toElement(rawXml)` | Like `toHTMLElement`, but keeps `<svg>` and its children in the SVG namespace. |
| `getComponentAsync(context, key)` | Resolves a user-defined component class; see [Resolution](#how-the-class-is-found). |
| `storeAsGlobal(data, name?, prefix?, postfix?)` | Sets `window[name] = data` and returns `name`. Without `name`, generates one with `getRandomName(prefix, postfix)`. |
| `getRandomName(prefix?, postfix?)` | Returns `<prefix>_<timestamp>_<random>_<postfix>`; missing parts are empty. |
| `format(pattern, ...params)` | Replaces `{0}`, `{1}` … with the matching argument; unknown indexes stay as written. |
| `cloneDeep(obj)` | Deep copy. |
| `defaultsDeep(data, defaults)` | Deep copy of `data` with missing keys filled from `defaults`. |
| `addMessageHandler(type, handler)` | Calls `handler(message)` for service-worker messages whose `data.type` equals `type`. Returns `false` when the browser has no service worker support. |

`$bc.util.source` works on sources. The query helpers use the SQL library described in
[client-side-sql.md](client-side-sql.md) and need a context, which every hook argument
carries as `args.context`:

| Signature | Result |
|---|---|
| `source.new(id, data, options?)` | A new source object (not stored). |
| `source.data(id, data, options?)` | A data packet, the form `api` `OnProcessed` returns. |
| `source.filterAsync(source, where, context)` | Array of rows matching the `where` clause; all rows when `where` is empty. |
| `source.sortAsync(source, orderBy, context)` | New source with rows ordered by `orderBy`. |
| `source.runSqlAsync(source, sql, context)` | New source from `sql`; use `?` or `[<source id>]` as the table. |
| `source.isNullOrEmpty(value)` | `true` for `undefined`, `null` and `""`. |

`options` for any source is `{ mergeType, keyFieldName, statusFieldName, extra }`.
`mergeType` is a number: `0` (replace, the default) or `1` (append), also available as
`basiscore.MergeType.replace` and `basiscore.MergeType.append`. See
[sources-and-triggers.md](sources-and-triggers.md).

## Lifecycle hooks

Four attributes attach your own function to a command: `OnRendering`, `OnRendered`,
`OnProcessing` and `OnProcessed`. The attribute value is the name (or dotted path) of a global function. The library calls
it as `name(args)` and awaits it, so the function may be `async`. HTML attribute names
are not case-sensitive, so `onrendering` and `OnRendering` are the same attribute.

Every `args` object has `context` (the command's context: `tryToGetSource`,
`waitToGetSourceAsync`, `setAsSource`, `options`) and `node` (the command element). The
other fields depend on the hook and the command.

### `OnRendering` and `OnRendered` — every command

These two work on every `<basis>` command, and on HTML elements that use `bc-triggers`.

| Hook | Extra fields | What you can change |
|---|---|---|
| `OnRendering` | `prevent` (`false`), `source` | Set `args.prevent = true` to skip this run. |
| `OnRendered` | `result`, `source` | Nothing; notification only. |

`source` is the source that triggered the run; it is `undefined` on the first run. When
a run is prevented, a `group` also removes its content.

`OnRendered` is skipped when the run returns `null`. Source-backed renderers return `null`
when their source is not available yet. For `dbsource` and `api`, `OnRendered` means the
request has finished; to act on the data, subscribe to the resulting source instead (see
[sources-and-triggers.md](sources-and-triggers.md)).

### `OnProcessing` on source-backed renderers

Commands that render one source named by `dataMemberName` — `print`, `list`, `view`,
`tree`, `chart`, `repeater`, `schemalist`, `schemauploader`, and `schema` in a display
mode other than `new` — call `OnProcessing` just before rendering, with `args.source`.
Assigning a new source to `args.source` makes the command render that instead:

```html
<basis core="print" run="atclient" datamembername="demo.items"
       onprocessing="onlyActive">
  <face><div>@name@</div></face>
</basis>

<script>
  function onlyActive(args) {
    const rows = args.source.rows.filter((row) => row.active);
    args.source = $bc.util.source.new("demo.items", rows);
  }
  $bc.setSource("demo.items", [
    { name: "Alpha", active: true },
    { name: "Beta", active: false },
  ]);
</script>
```

The stored source is not changed; only this command sees the replacement. The hook is
not called while the source does not exist.

`schemauploader` calls the same `OnProcessing` function a second time just before
uploading, this time with `args.request` (a `Request`) instead of `args.source`. Setting
`args.response` to a `Response`, or a promise of one, skips the network call. Check
`args.request` to tell the two calls apart.

### `OnProcessing` and `OnProcessed` on `api`

| Hook | Extra fields | What you can change |
|---|---|---|
| `OnProcessing` | `request` | Set `args.response` (a `Response` or a promise of one) to skip `fetch`. |
| `OnProcessed` | `request`, `response` | Set `args.results` to an array of data packets to store. |

Without `OnProcessed`, the command parses the response as JSON itself. When you define
`OnProcessed`, nothing is parsed for you: only what you put in `args.results` is stored.

```html
<basis core="api" run="atclient" method="get"
       url="https://example.com/api/products" onprocessed="toProducts"></basis>

<script>
  async function toProducts(args) {
    const json = await args.response.json();
    args.results = [$bc.util.source.data("shop.products", json.items)];
  }
</script>
```

### Hooks on HTML elements

An HTML element with `bc-triggers` publishes a source when one of the listed DOM events
fires. It calls all four hooks in this order:

1. `OnProcessing` with `id` and `value`. Assigning `args.id` or `args.value` changes what
   is published.
2. `OnRendering` with `prevent` and the `source` about to be published.
3. The source is published, then `OnRendered` with `result: null` and that `source`.
4. `OnProcessed` with `id` and `value`. It runs even when step 2 prevented publishing.

```html
<input name="search.text" bc-triggers="keyup" onprocessing="trimValue" />
<script>
  function trimValue(args) { args.value = (args.value ?? "").trim(); }
</script>
```

### When hooks do not fire

`dbsource`, `inlinesource`, `cookie`, `call`, `group`, `callback` and user-defined
components do not call `OnProcessing` or `OnProcessed`. Only `OnRendering` and
`OnRendered` apply to them. In addition:

- A command whose `if` attribute evaluates to false runs no hooks at all.
- On an HTML element, `if` false skips publishing and `OnRendering`/`OnRendered`, but
  `OnProcessing` and `OnProcessed` still run.
- A command with `ignoreNullSource="true"` ignores runs without a triggering source,
  including its first run.

## The `events` attribute

`events` re-runs a command when a browser event happens. The value is a space-separated
list of items in the form `<target>.<event>`:

| Item | Listens on |
|---|---|
| `document.click` | `document` |
| `window.resize` | `window` |
| `timer.5000` | a timer that fires every 5000 ms |
| `#save.click` | every element matching `#save` |
| `input[type='text'].keyup` | every element matching `input[type='text']` |

Anything other than `document`, `window` or `timer` is treated as a CSS selector and
passed to `document.querySelectorAll`. The item is cut at dots: the text before the first
dot is the target, and the text between the first and second dot is the event name.
Therefore:

- a selector must not contain a dot. `.btn.click` has an empty target, which
  `querySelectorAll` rejects with a `SyntaxError`; that error stops start-up of every
  command in the instance. `button.primary.click` listens for an event named `primary`,
  which never fires. Use an id or an attribute selector instead;
- a selector must not contain a space, because spaces separate items;
- selectors are matched once, when the command starts. Elements added later are not bound.

Each event runs the command with a temporary source whose id is the item text in lower
case and whose single row is the `Event` object (for `timer`, a row `{ value: <interval
id> }`). The `if` attribute and `OnRendering` apply as usual. Timers keep running for
the life of the page.

Two companion attributes apply to every item of `events`:

- `preventDefault="true"` calls `event.preventDefault()` first.
- `stopPropagation="true"` calls `event.stopPropagation()` first.

```html
<basis core="callback" run="atclient" method="onSave"
       events="#save.click" preventDefault="true"></basis>
<button id="save">Save</button>

<script>
  function onSave(args) {
    const event = args.source.rows[0];
    console.log("clicked", event.target);
  }
</script>
```

## User-defined components

A user-defined component is a `<basis>` command whose behaviour is a JavaScript class you
provide. Write the core as `component.<key>`, for example `component.local.Greeter`.

### How the class is found

The part after `component.` is the key. It is resolved in this order:

| Key form | Resolved to |
|---|---|
| `local.<path>` | The global `<path>` on the page, for example the class `Greeter`. |
| `basiscore.<path>` | The library export `basiscore.<path>`, for example `basiscore.exposer`. |
| anything else | A script URL from `host.repositories`, then the global named by the full key. |

For repository keys, the lookup tries the full key first and then removes one dot-part at
a time from the right until a `repositories` entry matches:

```html
<script>
  var host = {
    repositories: { "acme.widgets": "https://example.com/acme-widgets.js" },
  };
</script>
<basis core="component.acme.widgets.Clock" run="atclient"></basis>
```

Here `acme.widgets.Clock` is tried first, then `acme.widgets`, which matches. The script is
loaded once, and it must define the global `acme.widgets.Clock` — the full key, not the
matched prefix. When nothing matches, the error is
`'acme.widgets.Clock' related repository setting not found`.

A `local.` class must exist when the command starts, so define it in a classic script
that runs before `load` (or before your own `run()` call).

### The class contract

The library calls `new YourClass(owner)` and then these methods if they exist:

```ts
constructor(owner)                        // owner: the command, see below
initializeAsync(): Promise<void>          // once, before the first run
runAsync(source?): Promise<any>           // each run; source = the triggering source
disposeAsync(): Promise<void>             // when the command is removed
```

`runAsync` is called with no source on the first run and with the triggering source on
later runs. Its return value is what `OnRendered` receives as `result`.

The `owner` passed to the constructor offers:

- `node`, `range`, `content` (the original children), `triggers`, `manager`, `disposed`;
- `getAttributeValueAsync(name, default?)`, `getAttributeBooleanValueAsync(name, default?)`,
  `getAttributeToken(name)` — attribute values with `[##…##]` bindings resolved;
- `setContent(node)` — replaces what the command shows;
- `setSource(id, data, options?, preview?)`, `tryToGetSource(id)`,
  `waitToGetSourceAsync(id)`, `addTrigger([ids])`;
- `processNodesAsync(nodes)` — turns `<basis>` markup you inserted into live commands;
- `toNode`, `toHTMLElement`, `toElement`, `storeAsGlobal`, `getRandomName`,
  `getLibAsync`, `getDefault(key, default?)`, `getSetting(key, default)`.

`owner.format` passes its arguments on as one array, so `owner.format("{0}-{1}", a, b)`
returns `a,b-{1}`. Use `$bc.util.format` instead.

```html
<basis core="component.local.Greeter" run="atclient" title="Hello"
       triggers="demo.user"></basis>

<script>
  class Greeter {
    constructor(owner) {
      this.owner = owner;
    }
    async initializeAsync() {
      this.title = await this.owner.getAttributeValueAsync("title", "Hi");
    }
    async runAsync() {
      const user = this.owner.tryToGetSource("demo.user");
      const name = user ? user.rows[0].name : "guest";
      this.owner.setContent(this.owner.toNode(`<p>${this.title}, ${name}</p>`));
    }
    async disposeAsync() {}
  }
</script>
```

Calling `$bc.setSource("demo.user", { name: "Sara" })` later re-runs the component
through its `triggers`.

### The built-in exposer

`component.basiscore.exposer` gives page scripts a handle on a command without writing a
class:

- `component="<name>"` stores the exposer object as `window.<name>` during start-up.
- `method="<function>"` calls `<function>(exposer, source)` on every run.

```html
<basis core="component.basiscore.exposer" run="atclient"
       component="profileBox" method="onProfile" triggers="demo.user"></basis>

<script>
  function onProfile(exposer, source) {
    console.log(exposer === window.profileBox, source?.rows);
  }
</script>
```

## Start-up order

When an instance runs, it collects every command first, then processes them in three
batches, each awaited before the next:

1. **high** — `call`, so inserted markup exists before anything else runs;
2. **normal** — source producers: `dbsource`, `inlinesource`, `api`;
3. **low** — everything else, including renderers, `group`, `cookie` and user-defined
   components.

Bindings in text and attributes, `callback`, and HTML elements with `bc-triggers` are
not in any batch; they react to sources and events. Priority is fixed per command
type and cannot be set from markup. Within a batch, commands run concurrently, so do not
rely on document order between two commands of the same batch; use `triggers` or
`waitToGetSourceAsync` instead.
