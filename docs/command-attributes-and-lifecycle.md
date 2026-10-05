# Command attributes and lifecycle

Every `<basis run="atclient" core="...">` element becomes a command component. All commands share one base class chain (`Component` -> `ElementBaseComponent` -> `CommandComponent`, with `SourceBaseComponent` added for commands that read a source), and that chain defines the attributes every command understands (`if`, `triggers`, `events`, `ignoreNullSource`, the `On*` hooks), the order in which a command is initialised, run and re-run, how concurrent updates are throttled, and how a command's output replaces the `<basis>` element in the page. This page documents those shared parts; the command pages document what each command adds on top.

## Which elements become commands

`ComponentCollection.findRootLevelComponentNode` walks the fragment given to the runtime and collects:

- every element named `basis` whose `run` attribute equals `atclient` (case-insensitive, `Element.isBasisCore()`); the walk does **not** descend into such an element, so a `<basis>` nested inside another `<basis>` is left to the outer command (for example `group`, `repeater` and `call` process their content with their own `ComponentCollection`);
- every other element that has a `bc-triggers` attribute, which becomes an HTML element component (see [HTML element binding](html-element-binding.md));
- nothing inside an element with `bc-ignore`.

The command class is chosen from the first segment of `core`, lower-cased: `core="Print"` resolves `print`, `core="component.basiscore.exposer"` resolves `component`. The registered names are print, tree, view, list, chart, schema, schemalist, schemauploader, cookie, call, group, repeater, callback, dbsource, inlinesource, api and component; the HTML element components are registered as input, select, form and unknown-html. An unknown core name fails at resolution time with an error from the dependency container.

## Attributes shared by all commands

HTML lower-cases attribute names and `getAttribute` is case-insensitive on HTML elements, so `OnRendering`, `onrendering` and `ONRENDERING` are the same attribute. Values are read through string tokens, so any of them may contain `[##...##]` or `{{ }}` bindings (see [Binding and tokens](binding-and-tokens.md)); a token that points at a source that has not been published yet makes the read wait for it.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | string | required | Command name, optionally followed by `.`-separated parts that the command interprets (`component.<repository>.<name>`). Stored as `CommandComponent.core` exactly as written. |
| `run` | string | required | Must equal `atclient` (case-insensitive) or the element is ignored by the browser runtime. |
| `name` | string | command-specific | Not a shared attribute, but used by several commands for the source id they publish: `api` (`cms.api` when absent), `dbsource` and `inlinesource` (the source part of `name.member`), `repeater` (`name.current`), `schemauploader` (`name.uploading`), `cookie` (cookie name). See the command pages. |
| `datamembername` | string | none | Source-reading commands only (print, list, view, tree, chart, schema, schemalist, schemauploader, repeater). The id of the source to render, lower-cased. The command subscribes to it and re-renders whenever it is set. |
| `triggers` | string | none | Space-separated source ids. The command re-renders whenever any of them is set. Works on every command, not only `callback`. |
| `if` | string | none | A JavaScript expression evaluated before every render; a falsy result skips the render. See [The `if` attribute](#the-if-attribute). |
| `ignoreNullSource` | boolean (`true`/`false`) | `false` | When `true`, a render that is not caused by a source (the initial pass of the priority waves) is skipped; the command renders only when a trigger, a `datamembername` source or an event fires. |
| `events` | string | none | Space-separated `target.event` entries that re-render the command when a DOM event or timer fires. See [The `events` attribute](#the-events-attribute). |
| `preventDefault` | boolean | `false` | Call `preventDefault()` on every DOM event received through `events`. |
| `stopPropagation` | boolean | `false` | Call `stopPropagation()` on every DOM event received through `events`. |
| `OnRendering` | function expression | none | Called before the command runs, after `if` passed; may cancel the run. |
| `OnRendered` | function expression | none | Called after the command ran. |
| `OnProcessing` | function expression | none | Called by source-reading commands with the source before rendering, by HTML elements with the id and value before publishing, by `api` and `schemauploader` with the `Request` before `fetch`. |
| `OnProcessed` | function expression | none | Called by HTML elements after publishing and by `api` after the response arrived. Not called by other commands. |
| `processRenderedContent` | boolean | `true` | Rendering commands (print, list, view, tree) only. When `true`, the generated markup is scanned for `<basis>` commands, `bc-triggers` elements and bindings and they are processed with a child `ComponentCollection`; the previous child collection is disposed first. |

Boolean attributes are parsed with `ToBooleanToken`: only the text `true` (any case) is `true`.

### The `if` attribute

`ElementBaseComponent.getIfValueAsync` runs on every render, before anything else except `ignoreNullSource`:

1. The `if` token is evaluated with `wait = true`, so `[##...##]` parts are replaced by their values (a token that names a source that never arrives blocks the render).
2. The resulting text is compiled as `new Function("try{return <text>;}catch{return false;}")` and called. A compile error (a syntax error in the expression) is logged as `Error in parse 'if' attribute expression in command: '...'` and rethrown; a runtime error inside the expression yields `false`.
3. Without an `if` attribute the result is `true`.

Because the text is JavaScript, write string comparisons with quotes: `if="'[##cms.query.mode##]'=='edit'"`. Numbers and booleans work bare: `if="[##cms.userA.id##]==15"`, `if="[##cms.if.trueVal##]"`. The existence form `if="[##cms.user##]"` yields `true`/`false` and never waits. A code block works too: `if="{{return await isAdmin($bc);}}"`.

When `if` is falsy (or `OnRendering` cancels the run) and the command is not already hidden, `hideAsync()` is called and `isHide` becomes `true`; the next successful render sets `isHide` back to `false`. The base `hideAsync` does nothing, so a rendering command whose `if` turns false **keeps its previous output** in the page. `group` overrides `hideAsync` to delete its content and dispose its local context, and restores the content when `if` becomes true again. Nothing is rendered on the first pass when `if` is false, so the common case (a command that must not appear) needs no extra work.

### The `triggers` attribute

`initializeAsync` splits the value on spaces and calls `addTrigger(ids)`, which registers the component's `onTrigger` handler for each id with `context.addOnSourceSetHandler`. Source ids are lower-cased by the repository, and the handler is a `Set` member, so registering the same id twice has no effect. When a source with one of these ids is set, `onTrigger(source)` runs the render pipeline with that source as argument. For source-reading commands the argument is only used as a signal: `SourceBaseComponent.runAsync` replaces it with `tryToGetSource(datamembername)` when its id differs. For `callback` it is the argument delivered to the method.

Commands that read `datamembername` add it as a trigger too, during `processAsync`, so the subscription exists before their first render.

### The `events` attribute

Each entry is split at its first dot into `type` and `event` (`item.split(".", 2)`), then:

| `type` | Listener |
| --- | --- |
| `document` | `document.addEventListener(event, callback)` |
| `window` | `window.addEventListener(event, callback)` |
| `timer` | `setInterval(..., parseInt(event))`; the entry `timer.1000` fires every second |
| anything else | `document.querySelectorAll(type).forEach(el => el.addEventListener(event, callback))`, evaluated once at initialisation against the current document |

The callback builds a `Source` whose id is the entry text, lower-cased, and whose single row is the `Event` object (`rows[0]` is the event; for a timer `rows[0].value` is the interval id returned by `setInterval`), applies `preventDefault` / `stopPropagation` when requested, and calls `renderAsync(source)` **directly**. This path skips `onTrigger`, so neither the busy guard nor the disposed check applies to event-driven renders. Listeners and timers are never removed when the component is disposed; a `callback` method can stop a timer itself with `clearInterval(arg.source.rows[0].value)`.

Because the entry is split at the first dot, a selector containing a dot cannot be used (`.toolbar.click` becomes type `""` and event `toolbar`, and `querySelectorAll("")` throws). Use tag, id or attribute selectors: `#refresh.click`, `input[type='text'].keyup`.

## Hooks

### How a hook attribute is resolved

Each `On*` attribute is read once, in `initializeAsync`, and wrapped as

```js
new Function("callbackArgument", `return ${attributeValue}(callbackArgument);`)
```

The value is therefore a JavaScript expression that evaluates to a function, looked up in the global scope at call time: a global function name (`OnRendering="rendering"`), a property path (`OnProcessed="app.hooks.parse"`), or a parenthesised arrow function. Functions declared inside modules or closures are not reachable unless assigned to `window`. An empty attribute (`OnProcessing=""`) installs no hook. Hooks are awaited, so an `async` hook delays the pipeline until it resolves; an exception thrown by a hook propagates and aborts that render.

### Callback argument shapes

Every argument carries `context` (the `IContext` of the command) and `node` (the `<basis>` element, which at this point lives in a `DocumentFragment` and no longer in the document; see [RangeObject](#rangeobject-how-output-is-placed)). The rest depends on the component family (`src/CallbackArgument.ts`):

| Family | `OnProcessing` | `OnRendering` | `OnRendered` | `OnProcessed` |
| --- | --- | --- | --- | --- |
| Source-reading commands (print, list, view, tree, chart, schema, schemalist, repeater) | `SourceCallbackArgument`: `{ source }`. Assign `args.source` to render a different source. | `RenderingCallbackArgument`: `{ prevent, source }`. Set `args.prevent = true` to cancel. `source` is the source that triggered the render, or `undefined` on the initial pass. | `RenderedCallbackArgument`: `{ result, source }`. For print, list, view and tree `result` is the array of generated `ChildNode`s. | not called |
| `schemauploader` | Called twice: first with `{ source }` (it is a source-reading command), then with `APIProcessingCallbackArgument` `{ request, response }` before the upload `fetch`. | as above | as above | not called |
| `api` | `APIProcessingCallbackArgument`: `{ request }`. Assign `args.response` (a `Response` or a promise of one) to skip `fetch`. | `{ prevent, source }` | `{ result: undefined, source }` | `APIProcessedCallbackArgument`: `{ request, response, results }`. The hook **must** assign `args.results` (an array of `Data`); when the hook is present the built-in JSON parsing is skipped and nothing is published otherwise. |
| HTML elements (input, select, form, unknown-html) | `HtmlCallbackArgument`: `{ id, value }`. Assign either to change what is published. | `{ prevent, source }` with the `Source` about to be published; `prevent = true` skips publishing. | `{ result: null, source }` | `{ id, value }`. Called even when publishing was prevented. |
| `callback` | not called | `{ prevent, source }` | `{ result, source }`; `result` is `true`, or the error thrown by the method | not called |
| `call`, `group`, `cookie`, `dbsource`, `inlinesource`, `component` | not called | `{ prevent, source }` | `{ result: undefined, source }` | not called |

`OnRendered` is skipped when `runAsync` returned exactly `null`. For source-reading commands that happens when the source is not available at render time (`SourceBaseComponent.runAsync` returns `null` without calling `OnProcessing`). A rendering command whose faces matched no rows still returns an (empty) array and still fires `OnRendered`.

### Order within one render

For a command (`ElementBaseComponent.renderAsync`):

```text
renderAsync(source)
  1. return if source is null and ignoreNullSource is true
  2. if                         -> false: hideAsync() unless already hidden; stop
  3. OnRendering(args)          -> args.prevent true: hideAsync() unless already hidden; stop
  4. runAsync(source)           (command-specific; source-reading commands: resolve source,
                                 OnProcessing(args), renderSourceAsync(args.source))
  5. isHide = false
  6. OnRendered(args)           unless runAsync returned null
```

For an HTML element component the DOM event handler (`HTMLComponent.onEventTriggerAsync`) runs: `preventDefault()` on the event, resolve id and value, `OnProcessing`, build the `Source`, `if`, `OnRendering`, `context.setSource`, `OnRendered`, `OnProcessed`. See [HTML element binding](html-element-binding.md).

## Lifecycle

### 1. Scanning and construction

`$bc.run()` (or the automatic run on page load) creates a `BasisCore` instance whose `ComponentCollection.processNodesAsync(rootNodes)` does the whole job. Scanning is synchronous: text and attribute bindings, `<basis>` commands and `bc-triggers` elements are discovered in one pass, and each command is constructed by resolving its class from a child dependency container that holds the `element`, the `context` and the container itself.

Constructing a `CommandComponent` has an immediate visible effect: its `RangeObject` removes the `<basis>` element from the document and leaves two empty text nodes in its place (details below). `group` moves its child nodes back into that slot in its constructor so that they stay visible.

### 2. `initializeAsync`

The `initializeAsync` of every component found in the pass is started right away and all of them are awaited together (`ComponentCollection.initializeTask`). For commands this reads `if` (as a token, not evaluated yet), `ignoreNullSource`, the four `On*` attributes, `triggers` (subscriptions are registered here) and `events` (listeners and timers are installed here). Subclasses add their own attribute tokens (`call` reads `url`, `file`, `method`, `pagesize`; `dbsource` and `inlinesource` read `name`; HTML elements read `bc-triggers`). Text and attribute bindings render their first value during this phase with `wait = false`.

Attribute values read in this phase are evaluated with `wait = true`. A `[##...##]` token in `triggers`, `events`, `ignoreNullSource` or an `On*` attribute that refers to a source which is never published keeps `initializeTask` pending; the priority waves never start, and `$bc.setSource(...)` calls from page scripts, which wait for `initializeTask`, are never applied.

### 3. Priority waves

After initialisation the collection runs `processAsync()` on its components in three waves, each wave awaiting all of its components with `Promise.all` before the next starts:

| `Priority` | Components | Why |
| --- | --- | --- |
| `high` | `call` | Loads remote markup that may contain the sources and commands the rest of the page needs |
| `normal` | `dbsource`, `inlinesource`, `api` (`SourceComponent` subclasses) | Publish sources |
| `low` | everything else that is run automatically: print, list, view, tree, chart, schema, schemalist, schemauploader, repeater, group, cookie, component (the default of `Component`) | Consume sources |
| `none` | text and attribute bindings, HTML element components, `callback` | Never run by the waves; they act only when a trigger, a DOM event or a timer fires |

A wave finishes when every `processAsync` in it resolves. A source-reading command in the `low` wave whose source has not been published yet is not blocked by this: `runAsync` returns `null` and the command waits for its `datamembername` trigger. Attributes whose tokens wait for a source do block, as described above.

### 4. `processAsync`, `onTrigger`, `renderAsync`, `runAsync`

`Component.processAsync()` is `onTrigger()` with no source. `SourceBaseComponent.processAsync` first reads `datamembername` and subscribes to it; `RenderableComponent.processAsync` first reads `processRenderedContent`.

`onTrigger(source)` is also the handler registered for every trigger. It is the single entry point for source-driven work:

```ts
if (!this._disposed && (!this._busy || this.allowMultiProcess)) {
  this._busy = true;
  try { await this.renderAsync(source); } finally { this._busy = false; }
}
```

`renderAsync` is the pipeline shown under [Order within one render](#order-within-one-render); `runAsync` is the command-specific part that every command implements.

### 5. Re-rendering

Setting a source (`$bc.setSource`, an HTML element publishing its value, `api`, `dbsource`, `inlinesource`, a user component) ends in `Repository.setSource`, which merges the rows and then calls `Trigger(source)` on the `EventManager` for that id. Every handler registered for the id runs, in registration order, with the merged source; a handler that throws synchronously is logged with `console.error` and does not stop the others. `onTrigger` is `async`, so an error thrown later in a render surfaces as an unhandled promise rejection instead. The same `setSource` also resolves pending `waitToGetSourceAsync` promises.

### 6. Busy guard and `allowMultiProcess`

While a component's `renderAsync` is in flight, further `onTrigger` calls for it are **dropped**, not queued. If a source is set three times while a `print` is still rendering, only the first render happens and the later two are lost; nothing is logged. The render does read the live source object from the repository, so the content reflects the merged rows at the time the render reads them, but no render is scheduled for changes that arrive afterwards.

`allowMultiProcess = true` disables the guard. It is set by `dbsource` and `inlinesource` (`MemberBaseSourceComponent`), which must be able to accept several parameter changes, and by `callback`, so a callback method is invoked for every trigger even while a previous invocation is still awaiting. No attribute controls it; a user-defined component sets the protected field in its constructor.

Renders started by the `events` attribute bypass `onTrigger` and are never dropped.

### 7. Disposal

`Component.disposeAsync` removes the component's handler from every source it subscribed to and marks it disposed, so later triggers are ignored. Commands that create child collections dispose them as well: `group` disposes its collections and local context, `call` and `repeater` dispose the collections of the content they inserted, and a rendering command with `processRenderedContent` disposes the collection of its previous output before scanning the new one. HTML element components remove their `bc-triggers` listeners and the `data-bc-init` marker. `ComponentCollection.disposeAsync` disposes every component it holds. Listeners and timers installed by `events` are not removed.

## RangeObject: how output is placed

`CommandComponent` creates a `Range` that selects the `<basis>` element and hands it to `RangeObject`:

1. `range.extractContents()` removes the whole `<basis>` element from the document and keeps it in `initialContent`, a `DocumentFragment`. `CommandComponent.content` is that fragment and `CommandComponent.node` is the detached `<basis>` element (this is why `node.querySelectorAll("face")` still works but `node.parentNode` is the fragment and `document.contains(node)` is `false`).
2. Two empty text nodes are inserted where the element was: `_startNode` and `_endNode`. They are the only trace of the command in the live DOM.
3. `setContent(content, append = false)` builds a `Range` from after the start marker to before the end marker, deletes what is between them unless `append` is `true`, and inserts `content`: a `Node` is inserted as is, an array is joined with `,` and parsed as HTML, anything else is `toString()`ed and parsed as HTML with `createContextualFragment`.
4. `deleteContents()` empties the slot (used by `group` when hidden and by `repeater` when `replace` is true).

Every re-render of a command therefore replaces exactly the nodes between its two markers, never its neighbours. Rendering commands pass a `DocumentFragment` to `setContent`; `call` passes the fragment of the loaded page; `repeater` appends one fragment per row. `TextComponent` uses the same class over a range inside a text node, which is why a binding in text is surrounded by two empty text nodes after the first render.

## Examples

### `if` with a token, an expression, a code block and an existence check

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>if</title>
</head>
<body>
  <basis core="print" datamembername="inlinesource.print" run="atclient" if="[##cms.if.trueVal##]">
    <face><script type="text/template"><div>@id (name is: @name@)</div></script></face>
  </basis>

  <basis core="print" datamembername="inlinesource.print" run="atclient" if="[##cms.userA.id##]==15">
    <face><script type="text/template"><div>@id (name is: @name@)</div></script></face>
  </basis>

  <basis core="print" datamembername="inlinesource.print" run="atclient"
         if="{{return await idGreaterThanTen($bc,'cms.userB')}}">
    <face><script type="text/template"><div>@id (name is: @name@)</div></script></face>
  </basis>

  <basis core="print" datamembername="inlinesource.print" run="atclient" if="[##app.user##]">
    <face><script type="text/template"><div>rendered only when app.user exists</div></script></face>
  </basis>

  <script>
    const host = {
      sources: {
        "cms.userA": [{ id: 15, name: "amir" }],
        "cms.userB": [{ id: 5, name: "amir" }],
        "cms.if": [{ trueVal: true, falseVal: false }],
        "inlinesource.print": [
          { id: 1, name: "qamsari" },
          { id: 2, name: "akaberi" },
          { id: 3, name: "amir" },
        ],
      },
    };
    async function idGreaterThanTen($bc, sourceId) {
      const data = await $bc.waitToGetSourceAsync(sourceId);
      return data.rows[0].id > 10;
    }
  </script>
</body>
</html>
```

The first two commands render, the third does not (`5 > 10` is false), and the fourth renders only when `app.user` exists at the time the command runs. The sources named in `if` are not triggers: publishing `app.user` later does not by itself re-run the fourth command; it is evaluated again when `inlinesource.print` is published again, or when a source listed in `triggers` is set.

### `events` and `triggers` on a callback

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>events</title>
</head>
<body style="height: 1000px;">
  <basis core="callback" run="atclient" triggers="local.print"
         events="document.click window.scroll input[type='button'].click input[type='text'].keyup"
         preventDefault="true" stopPropagation="true"></basis>

  <basis core="callback" run="atclient" events="timer.1000" method="timerCallback"></basis>

  <input type="button" value="Click Me!" />
  <input type="text" value="Hi" />

  <script>
    let count = 5;
    function timerCallback(arg) {
      const timerHandler = arg.source.rows[0].value;
      console.log(`timer ${arg.source.id}, ${--count} turns left`);
      if (count <= 0) {
        clearInterval(timerHandler);
      }
    }
  </script>
</body>
</html>
```

The first callback has no `method`, so it logs the received source to the console: an `Event` row for every click, scroll or key press, and the `local.print` source whenever it is set. The second stops its own timer after five ticks.

### `OnProcessing` on a rendering command

```html
<basis core="print" datamembername="inlinesource.print" run="atclient" OnProcessing="filter">
  <face><script type="text/template"><span>@id ( @name )</span><br /></script></face>
</basis>
<script>
  function filter(args) {
    const rows = args.source.rows.filter((x) => x.id > 3);
    args.source = $bc.util.source.new("inlinesource.print2", rows);
  }
</script>
```

The hook receives the published source and substitutes a filtered copy; the command renders `args.source`. Another command bound to the same `datamembername` without the hook still shows all rows. Combined with `triggers="demo.sort-by demo.filter-name"` the same hook re-runs when the filter inputs publish, and can read them with `args.context.tryToGetSource("demo.filter-name")`.

### `OnRendering` and `OnRendered` on `call`

```html
<basis core="call" file="called.html" pagesize="" run="atclient" OnRendering="rendering" OnRendered="rendered"></basis>
<script>
  const host = {
    settings: {
      "default.call.verb": "get",
      "connection.web.callcommand": "call/",
    },
  };
  async function rendering(args) {
    console.log("rendering", args);
    args.prevent = await Promise.resolve(false); // set true to skip the call
  }
  function rendered(args) {
    console.log("rendered", args); // args.result is undefined for call
  }
</script>
```

## Pitfalls

- `if` text is JavaScript. A token that expands to bare text (`if="[##cms.query.mode##]"` with `mode=edit`) becomes `return edit`, a `ReferenceError`, which evaluates to `false` silently. Quote strings.
- `if` is evaluated with `wait = true`. `if="[##app.flags.show##]"` with `app.flags` never published blocks that command's render forever (no error, no output). The existence form `[##app.flags##]` does not wait.
- A falsy `if` does not remove earlier output except for `group`. To hide a rendering command's content when a condition changes, wrap it in a `group` with the `if`, or render an empty source.
- Tokens in `triggers`, `events`, `ignoreNullSource` or `On*` attributes that wait for a missing source stall the whole collection: no wave runs and `$bc.setSource` from scripts is deferred indefinitely.
- Hook names are resolved in the global scope at call time. A function defined in an ES module or inside another function is `undefined` there, and the render fails with a `TypeError`.
- `OnProcessed` on `api` replaces the JSON parsing: if the hook does not set `args.results`, nothing is published.
- `OnProcessing` on `schemauploader` is called with two different argument shapes; check `args.request` before using it.
- Triggers that arrive while a command is rendering are dropped (except for `dbsource`, `inlinesource` and `callback`). Publish a source once with all changes rather than in a burst, or use a `callback` to re-publish after the render.
- `events` selectors cannot contain a dot, listeners are never removed, and event-driven renders bypass the busy and disposed checks. Each `events` entry also writes its target type to the console with `console.log` during initialisation.
- `args.node` in a hook is the detached `<basis>` element. To reach the rendered output, use `args.result` (`OnRendered` of print, list, view, tree) or query the document around the two empty text-node markers; do not use `args.node.parentElement`.
- `SourceBaseComponent.processAsync` lower-cases `datamembername`, so `datamembername="Demo.Data"` and `$bc.setSource("demo.data", ...)` match; the column path in tokens is not lower-cased.
- A source-reading command without `datamembername` registers a handler under the id `undefined` and never renders.

## Related

- [Binding and tokens](binding-and-tokens.md) - how attribute values are parsed and when they wait
- [Sources and reactivity](sources-and-reactivity.md) - source ids, merge types, row versions, contexts, source propagation into nested contexts
- [HTML element binding](html-element-binding.md) - `bc-triggers`, `bc-name`, `bc-value` and the hooks on input, select and form
- [callback](commands/callback.md), [group](commands/group.md), [call](commands/call.md), [api](commands/api.md), [print](commands/print.md)
- [User-defined components](user-defined-components.md) - writing a component class on top of this lifecycle
- [Internals](internals.md) - bootstrap, class hierarchy, IoC tokens
- [JavaScript API](javascript-api.md) - `GetCommandList` (on a wrapper such as `$bc.global`), `$bc.setSource`

## Source files

- `src/component/Component.ts`
- `src/component/ElementBaseComponent.ts`
- `src/component/CommandComponent.ts`
- `src/component/SourceBaseComponent.ts`
- `src/component/IComponent.ts`
- `src/component/renderable/base/RenderableComponent.ts`
- `src/component/source/SourceComponent.ts`, `src/component/source/MemberBaseSourceComponent.ts`, `src/component/source/APIComponent.ts`, `src/component/source/CallbackComponent.ts`
- `src/component/collection/CallComponent.ts`, `src/component/collection/GroupComponent.ts`, `src/component/collection/RepeaterComponent.ts`
- `src/component/html-element/HTMLComponent.ts`
- `src/component/renderable/SchemaUploader.ts`
- `src/component/text-base/TextComponent.ts`, `src/component/text-base/AttributeComponent.ts`
- `src/RangeObject/RangeObject.ts`
- `src/CallbackArgument.ts`
- `src/ComponentCollection.ts`
- `src/BasisCore.ts`
- `src/enum.ts` (`Priority`)
- `src/context/Context.ts`, `src/repository/Repository.ts`, `src/event/EventManager.ts`
- `src/extension/ElementExtensions.ts` (`isBasisCore`, `isBasisTag`, `isIgnoreTag`)
