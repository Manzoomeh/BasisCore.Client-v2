# callback

`callback` runs a JavaScript function whenever one of the sources listed in `triggers` is
published or one of the `events` fires, and passes it the source together with the context. It is
the bridge from the declarative source graph to imperative code: logging, orchestration of several
sources, infinite scrolling, timers, or handing data to another library. Without a `method`
attribute it dumps the source to the console, which makes it the quickest way to see what a
`dbsource`, `api` or `inlinesource` actually published. It renders nothing and publishes nothing
by itself.

## How a callback runs

`CallbackComponent` has `Priority.none`. The initial processing of a page runs the `high`, `normal`
and `low` waves only, so a `callback` is **never run on load**: it runs exclusively when a source
in `triggers` is set or an `events` entry fires. A callback with neither attribute never does
anything.

Each run receives the source that caused it and calls the handler once:

1. If `method` is set, its resolved value is evaluated with `eval(methodName)`. The result must be
   a function. It is invoked with `Reflect.apply(method, null, [args])`, so `this` is `null`, and
   it is not awaited.
2. If `method` is not set, `context.logger.logSource(source)` is called, which does
   `console.log(source)`, `console.log(JSON.stringify(source.rows, null, " "))` and
   `console.table(source.rows)`.

Exceptions thrown synchronously by the handler are caught, logged with
`logger.logError("error in execute callback method '<name>'.", e)`, and the error object becomes
the run result (the `result` field of `OnRendered`). A rejected promise returned by an `async`
handler is not observed.

The command is created with `allowMultiProcess = true`, so rapid triggers (scroll, keyup,
streaming sources) all reach the handler instead of being dropped while a previous run is busy.

`runAsync` also contains a branch for runs without an incoming source that iterates over
`triggers` and calls the handler for every source that currently exists. It is only reached when
`processAsync()` or `renderAsync()` is called on the command object from JavaScript (for example
through `$bc.global.GetCommandListByCore("callback")`); the runtime itself never calls it for a
`Priority.none` component.

## Attributes

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | string | | Must be `callback`. |
| `run` | string | | Must be `atclient`. |
| `method` | string | | JavaScript expression evaluated with `eval` that must yield a function: a global function name (`onSource`), a path (`app.handlers.onSource`) or an inline function. Tokens allowed. Omitted: log the source. |
| `triggers` | string | | Space separated source ids. Each publication of one of them runs the handler once with that source. |
| `events` | string | | Space separated `document.<event>`, `window.<event>`, `timer.<ms>` or `<css selector>.<event>` entries. |
| `preventDefault` | boolean | `false` | Call `preventDefault()` on DOM events from `events` before running. |
| `stopPropagation` | boolean | `false` | Call `stopPropagation()` on DOM events from `events` before running. |
| `if` | string | | JavaScript expression evaluated before every run. |
| `ignoreNullSource` | boolean | `false` | Skip runs without a source. Every trigger and event run has a source, so it only affects manual `processAsync()` calls. |
| `OnRendering`, `OnRendered` | string | | Generic hooks around every run; `OnRendered` receives the handler's error object in `result` when it threw. |

`datamembername`, `OnProcessing` and `OnProcessed` are not read by `callback`.

## The handler argument

```ts
type SourceCallbackArgument = {
  context: IContext;   // the context the command belongs to
  node: Node;          // the <basis core="callback"> element
  source?: ISource;    // the source that caused the run
};
```

`args.source` is a regular source: `id` (lower case), `rows`, `mergeType`, `keyFieldName`,
`statusFieldName`, `versions`, `extra`. `args.context` is the full context API:
`tryToGetSource(id)`, `waitToGetSourceAsync(id)`, `setAsSource(id, data, options?, preview?)`,
`setSource(source, preview?)`, `addOnSourceSetHandler`, `removeOnSourceSetHandler`,
`loadDataAsync`, `loadPageAsync`, `getOrLoadDbLibAsync()`, `options`, `logger` (see
[JavaScript API](../javascript-api.md)).

### Sources produced by `events`

For each entry the base class creates a source whose id is the entry text, lower-cased by the
`Source` constructor, with a single row. The `Source` constructor stores an object as the row
itself and wraps a scalar in `{ value }`, so for DOM events the row **is** the `Event` object, and
for timers the row is `{ value: <interval id> }`:

| Entry | Listener | `args.source.id` | `args.source.rows[0]` |
| --- | --- | --- | --- |
| `document.click` | `document.addEventListener("click", …)` | `document.click` | the `Event` |
| `window.scroll` | `window.addEventListener("scroll", …)` | `window.scroll` | the `Event` |
| `timer.5000` | `setInterval(…, 5000)` | `timer.5000` | `{ value: <interval id> }` (pass `rows[0].value` to `clearInterval`) |
| `#data-area.scroll` | `document.querySelectorAll("#data-area")`, one listener per element | `#data-area.scroll` | the `Event` |
| `input[type='button'].click` | `querySelectorAll("input[type='button']")` | `input[type='button'].click` | the `Event` |

An entry is split at its **first** dot into selector and event name, so a selector that contains a
dot (a class selector such as `.item.click`) cannot be used. Elements are looked up once, when the
command is initialised; elements added to the DOM later get no listener.

## Examples

### React to a source

From `example/component/source/callback/simple/index.html`.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body>
  <basis core="callback" run="atclient" triggers="local.print" method="onSource"></basis>

  <script>
    var i = 0;
    setInterval(() => {
      $bc.setSource("local.print", [
        { id: i, name: `row-${i}` },
        { id: i + 1, name: `row-${i + 1}` }
      ]);
      i += 2;
    }, 2000);

    function onSource(args) {
      console.log("from callback", args.source.id, args.source.rows);
    }
  </script>
</body>
</html>
```

### Log a source without writing a function

```html
<basis core="dbsource" source="bookapi" name="book" run="atclient">
  <member name="list"></member>
  <member name="type"></member>
</basis>

<basis core="callback" run="atclient" triggers="book.list book.type"></basis>
```

Each publication prints the source object, its rows as JSON and a `console.table`.

### DOM events

From `example/component/source/callback/event/index.html`.

```html
<basis core="callback" run="atclient"
       events="document.click window.scroll input[type='button'].click input[type='text'].keyup"
       preventDefault="true" stopPropagation="true" method="onEvent"></basis>

<input type="button" value="Click me" />
<input type="text" value="Hi" />

<script>
  function onEvent(args) {
    const event = args.source.rows[0]; // the row is the Event itself
    console.log(args.source.id, event.type, event.target);
  }
</script>
```

### Timer

From `example/component/source/callback/timer/index.html`.

```html
<basis core="callback" run="atclient" events="timer.1000" method="timerCallback"></basis>

<script>
  let count = 5;
  function timerCallback(args) {
    const timerId = args.source.rows[0].value;
    console.log(`tick from ${args.source.id}, ${--count} left`);
    if (count <= 0) {
      clearInterval(timerId);
    }
  }
</script>
```

### Orchestrating several sources (incremental list)

Simplified from `example/component/source/callback/partial-load/index.html`: rows arrive in a
buffer source and are appended to the rendered source only when the list is scrolled or every five
seconds.

```html
<basis core="callback" run="atclient" triggers="user.buffer"
       events="#data-area.scroll timer.5000" method="onSource"></basis>

<div id="data-area" style="height: 300px; overflow: scroll;">
  <basis core="print" datamembername="user.list" run="atclient">
    <layout>@child</layout>
    <face><div>@id@ - @name@</div></face>
  </basis>
</div>

<script>
  let mustUpdate = true;
  let newDataCame = false;

  function onSource(args) {
    const div = document.getElementById("data-area");
    const hasScrollbar = div.scrollHeight > div.clientHeight;

    if (args.source.id === "#data-area.scroll" || args.source.id === "timer.5000") {
      mustUpdate = true;
    } else if (args.source.id === "user.buffer") {
      newDataCame = true;
    }

    if (mustUpdate && newDataCame) {
      mustUpdate = !hasScrollbar;
      newDataCame = false;
      const shown = args.context.tryToGetSource("user.list");
      const buffer = args.context.tryToGetSource("user.buffer");
      args.context.setAsSource(
        "user.list",
        buffer.rows.filter((x) => !shown?.rows.includes(x)),
        { keyFieldName: "id", mergeType: basiscore.MergeType.append }
      );
    }
  }

  let i = 0;
  setInterval(() => {
    $bc.setSource("user.buffer", [{ id: ++i, name: `user-${i}` }],
      { keyFieldName: "id", mergeType: basiscore.MergeType.append });
  }, 50);
</script>
```

### A handler that is not a global function name

```html
<basis core="callback" run="atclient" triggers="book.list"
       method="(a) => window.app.onBooks(a.source.rows)"></basis>
```

`method` is evaluated, so any expression that yields a function works.

## Pitfalls

- **Nothing happens without `triggers` or `events`.** The command is not part of any processing
  wave. The shipped `dbsource/web-socket/demo` page uses `datamembername` on a callback; that
  attribute is ignored and the handler never runs.
- **`triggers=""` is no trigger.** An empty attribute is skipped.
- **The handler must be reachable from `eval` in the page's global scope.** Functions declared
  inside modules or closures are not found; a `ReferenceError` from `eval` is not caught and
  surfaces as an unhandled rejection.
- **`async` handlers are fire-and-forget.** The result is not awaited and rejections are not
  logged by the command.
- **Event source ids are lower-cased.** `events="#dataArea.scroll"` produces the id
  `#dataarea.scroll`; compare against the lower-cased string.
- **DOM events are the row, timers are wrapped.** Read the event as `args.source.rows[0]`;
  `args.source.rows[0].value` is `undefined` for a DOM event and the interval id for a `timer.*`
  entry.
- **Selectors with a dot are not supported** in `events`; use an id or attribute selector.
- **Event listeners are attached once**, at initialisation, to the elements that exist at that
  moment.
- **One handler, every trigger.** With several ids in `triggers` the handler fires separately for
  each; branch on `args.source.id` first.
- **`callback` is not a lifecycle hook.** To change what another command renders use its
  `OnProcessing` or `OnRendering` attribute; `callback` only observes.

## Related

- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md) - `triggers`, `events`, priority waves
- [Sources and reactivity](../sources-and-reactivity.md) - what a source is, merge types
- [JavaScript API](../javascript-api.md) - the context API available through `args.context`
- [dbsource](dbsource.md), [api](api.md), [inlinesource](inlinesource.md) - commands whose output you typically inspect with `callback`
- [group](group.md) - the other command family that bridges to JavaScript
- [Troubleshooting](../troubleshooting.md)

## Source files

- `src/component/source/CallbackComponent.ts`
- `src/component/ElementBaseComponent.ts` (`triggers`, `events`, hooks)
- `src/component/Component.ts` (`allowMultiProcess`, `onTrigger`)
- `src/ComponentCollection.ts` (processing waves)
- `src/CallbackArgument.ts` (`SourceCallbackArgument`)
- `src/logger/ConsoleLogger.ts` (`logSource`)
- `src/data/Source.ts`
- `src/enum.ts` (`Priority`)
