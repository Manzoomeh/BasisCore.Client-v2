# HTML element binding (`bc-*` attributes)

Any ordinary HTML element that carries a `bc-triggers` attribute becomes a *source publisher*: when one of the listed DOM events fires on it, BasisCore Client reads a value from the element and stores it in the context as a source, exactly as `$bc.setSource()` would. Everything that listens to that source (`[##...##]` tokens, commands with `triggers`, callbacks) reacts. Use this when a plain control (text box, checkbox, select, form, button, table header, span) should drive filters, sorting, API calls or user-defined components without writing any JavaScript.

## How elements are discovered

While scanning the document, `ComponentCollection.findRootLevelComponentNode` walks every node and sorts elements into two lists:

- An element with `bc-ignore` is skipped together with its whole subtree. No tokens, commands or `bc-triggers` elements inside it are processed.
- A `<basis run="atclient">` element becomes a command. Its children are not walked by this pass; the command itself decides what to do with its content.
- Any other element whose `hasAttribute("bc-triggers")` is true (`Element.isBasisTag()`) is collected as an HTML element component. Its children are still walked, so a `<form bc-triggers="submit">` may contain `<input bc-triggers="change">` elements and both are bound.

The presence of the attribute is what matters: `bc-triggers=""` still makes the element a component (it just never attaches a listener).

### Tag to component mapping

The lowercased tag name selects the implementation. `ComponentCollection.knowHtmlElement` is `["form", "input", "select"]`; everything else resolves to `unknown-html`.

| Tag | Registered core | Class | Page |
|---|---|---|---|
| `input` | `input` | `HTMLInputComponent` | [commands/input.md](commands/input.md) |
| `select` | `select` | `HTMLSelectComponent` | [commands/select.md](commands/select.md) |
| `form` | `form` | `HTMLFormComponent` | [commands/form.md](commands/form.md) |
| any other tag (`button`, `div`, `span`, `td`, `textarea`, `a`, ...) | `unknown-html` | `HTMLIUnknownComponent` | [commands/unknown-html.md](commands/unknown-html.md) |

The four names are registered in `src/tsyringe.config.ts` next to the real commands, but they are reached only through this mapping. They are not meant to be written as `<basis core="form">`: such an element would be constructed with the `<basis>` node, and for `form` the first event throws because `new FormData()` requires an `HTMLFormElement`.

Markup produced by rendering commands (`print`, `list`, `view`, ...) and by `group`, `repeater`, `call` and user-defined components is scanned with the same rules, so a `<td bc-triggers="click">` inside a `layout` template is bound after the command renders.

## Nothing is published at page load

`HTMLComponent.priority` is `Priority.none`. `ComponentCollection.runAsync` runs components in three waves, `Priority.high`, then `normal`, then `low`, and never touches `none`. Consequently an HTML element publishes nothing when the page is processed. Its source exists only after the first listed event fires (or after one of its `triggers` sources is set, see below). A token such as `[##filter.name.value|(all)##]` placed in page text or in an ordinary element attribute renders its default (or nothing) right away and updates when the source is first published. A token inside a command attribute that is read when the command runs (a `face` `filter`, a `dbsource` parameter, an `if`) behaves differently: if the source does not exist yet and its scope is not `cms`, the read **waits** until the source is published, so the command does not render until the user acts. Seed such sources with `$bc.setSource(...)` before the first render, as the live-filter example does.

## Attribute reference

All attributes below are read with the token-aware attribute reader, so their values may contain `[##source.member.column##]` tokens and `{{ }}` code blocks (see [binding-and-tokens.md](binding-and-tokens.md)). `bc-triggers` is evaluated once, when the element is initialized. All the others are evaluated again on every event, so a `bc-value="[##cms.cms.date##]"` publishes the current date each time.

HTML attribute names are case-insensitive, so `bc-keyField` and `bc-keyfield` are the same attribute.

| Name | Type | Default | Description |
|---|---|---|---|
| `bc-triggers` | string | required | DOM event names separated by single spaces, exactly as passed to `addEventListener` (`click`, `change`, `keyup`, `input`, `submit`, ...). One listener is attached per name. |
| `bc-name` | string | `name` attribute, then `cms.unknown` | Id of the published source. Lowercased when the `Source` is created. See *Source id* below. |
| `name` | string | - | Fallback source id when `bc-name` is absent. On `<form>` children it is also the `FormData` key. |
| `bc-value` | string | - | Value to publish instead of the element's own value. An empty result falls through to the element value. Ignored by `<select>` (see [commands/select.md](commands/select.md)). |
| `bc-off-value` | string | `"off"` | Published by an `<input type="checkbox">` that is **unchecked** when the event fires. Other elements ignore it. |
| `bc-merge` | `replace` \| `append` | `replace` | How the new rows are combined with an existing source of the same id. Compared after lowercasing; any other word means `replace`. |
| `bc-keyField` | string | - | `keyFieldName` option of the published source; enables per-row update/insert/delete with `bc-merge="append"`. |
| `bc-statusField` | string | - | `statusFieldName` option; the row field holding `0` (added), `1` (edited) or `2` (deleted). |
| `bc-ignore` | flag | - | Excludes this element and its subtree from scanning entirely. The value is irrelevant. |
| `if` | expression | `true` | JavaScript expression evaluated before publishing. When falsy the source is not set (the lifecycle hooks `OnProcessing` and `OnProcessed` still run). |
| `OnProcessing` | function name | - | Called with `{ context, node, id, value }` before the source is built. Changes to `id` and `value` are used. |
| `OnRendering` | function name | - | Called with `{ context, node, prevent, source }` after the source is built. Setting `prevent = true` cancels publishing. |
| `OnRendered` | function name | - | Called with `{ context, node, result: null, source }` after the source has been set. |
| `OnProcessed` | function name | - | Called with `{ context, node, id, value }` at the very end, whether or not the source was published. |
| `triggers` | source ids | - | Inherited from the command base: when any of these sources is set, the element publishes its current value again without a DOM event. |

### Source id

`getSourceIdAsync` reads `bc-name`; if that is empty it reads `name`; if that is empty too the `Source` is created with the id `cms.unknown`. `Source` lowercases the id, so `name="Filter.Name"` is stored as `filter.name` and read with `[##filter.name.value##]`.

Give every source a two-segment id of the form `scope.name`. The token syntax `[##a.b.c##]` is parsed as source `a.b` and column `c`; a one-segment id such as `name="query"` cannot be addressed by a value token (`[##query.value##]` would look for a source called `query.value` and return only `"true"`/`"false"` for its existence).

Elements that share a source id (a radio group, several checkboxes, several buttons) publish to the same source; with the default `replace` merge the last event wins.

### `data-bc-init` guard

`initializeAsync` only attaches listeners when the element does **not** already have a `data-bc-init` attribute, then sets `data-bc-init=""` on it. `disposeAsync` removes the listeners and the attribute. This prevents a node from being wired twice when the same DOM subtree is processed by two collections that are both alive (for example the owner page and a `group`). Two consequences:

- Do not copy rendered markup with its `data-bc-init` attribute (for instance by cloning `outerHTML`): the copy will never get listeners.
- Do not add `data-bc-init` by hand.

## What happens when an event fires

`HTMLComponent.onEventTriggerAsync` runs the following steps for every event:

1. `event.preventDefault()` is always called. A `submit` never navigates, a click on `<a href>` never follows the link, a `click` on a checkbox or radio reverts the toggle (use `change` for those).
2. The source id is resolved (`bc-name`, then `name`).
3. The value is resolved by the element-specific `getSourceValueAsync` (see *Value resolution* below).
4. If `OnProcessing` is set, it receives `{ id, value, context, node }` (`HtmlCallbackArgument`) and may replace `id` and `value`. If it sets `id` to `null`, the source id becomes `cms.unknown`.
5. `bc-merge`, `bc-keyField` and `bc-statusField` are read.
6. `new Source(id ?? "cms.unknown", value, { keyFieldName, statusFieldName, mergeType })` is created. The row shape follows the `Source` rules below.
7. `if` is evaluated. When it is truthy and `OnRendering` is set, the hook runs with `{ prevent: false, source }`; `prevent = true` cancels.
8. If still allowed, `context.setSource(source)` stores or merges the source and notifies every handler bound to that id. Then `OnRendered` runs with `{ result: null, source }`.
9. `OnProcessed` runs with `{ id, value }` (the values after `OnProcessing`), regardless of whether the source was published.

The hooks are attribute strings that name a function in page scope; they are invoked as `functionName(callbackArgument)` and may be `async`.

## The published source shape

`Source` turns the resolved value into rows:

| Resolved value | `source.rows` | Read with |
|---|---|---|
| string, number, boolean, `undefined` (scalars) | `[{ value: <value> }]` | `[##scope.name.value##]` |
| a plain object (the result of a `<form>`) | `[<object>]` | `[##scope.name.field##]`, `[##scope.name._root.list[0]?.field##]` |
| an array (only reachable through `OnProcessing`) | the array itself | `[##scope.name.field##]` returns an array of the field over all rows |

`[##scope.name.value|(not set)##]` in page text renders `not set` while the source does not exist and is replaced as soon as the element publishes. Text and attribute tokens never block. Tokens read by a running command (for example the `filter` of a `print` face) do block when the source is missing and the scope is not `cms`; the live-filter example therefore seeds its sources with `$bc.setSource("filter.name", '')` before the user types anything.

## Value resolution

The base rule in `HTMLComponent.getSourceValueAsync`:

1. If the element is an `<input type="checkbox">` and it is not checked: `bc-off-value`, or `"off"` when that attribute is absent or empty.
2. Otherwise `bc-value`, when it resolves to a non-empty string.
3. Otherwise the element's `value` property (`undefined` for elements that have none, such as `div`, `span`, `td`).

Each element type refines this:

| Element | Refinement | Details |
|---|---|---|
| `<input>` | if the result is still empty: checkbox gives its `checked` boolean, file gives `{ value: FileList }`, every other type gives `.value` | [commands/input.md](commands/input.md) |
| `<select>` | `.value` is used first; `bc-value` and `bc-off-value` are never consulted | [commands/select.md](commands/select.md) |
| `<form>` | `FormData` converted to an object; `_root.path.field` and `__index` build nested objects and arrays | [commands/form.md](commands/form.md) |
| anything else | the base rule unchanged | [commands/unknown-html.md](commands/unknown-html.md) |

Values coming from the DOM are strings. `<input type="number">` publishes `"42"`, not `42`; convert in `OnProcessing` or in the consumer.

## Merging with `bc-merge`

`Repository.setSourceEx` applies the merge type carried by the new source:

- `replace` (default): if a source with the same id exists, its rows are replaced in place (its row versions are incremented); otherwise the new source is stored.
- `append`: if no source exists yet, the new one is stored. Otherwise, when **both** the existing and the new source have a `keyFieldName`, each new row is processed by status: status `0`/missing adds the row, status `1` replaces the row with the same key, status `2` removes it. The status is read from the row field named by `bc-statusField` and compared loosely, so the string `"1"` from a form field works. Without key fields on both sides the new rows are simply appended.

Because the first publication creates the source, put `bc-keyField` on the element from the start so the stored source has a key field to match against.

## Re-publishing through `triggers`

Since `HTMLComponent` extends the command base, an element may also carry `triggers="other.source"`. When that source is set, the element re-runs `onEventTriggerAsync` without an event and publishes its current value. Note that in this path the generic render pipeline evaluates `if` and `OnRendering` once before calling the element routine, which evaluates them again; `OnRendered` is likewise called twice (once with `result: null`, once with `result: undefined`). Write these hooks so that running them twice is harmless.

## Examples

### Buttons, a div and a span publishing to one source

Adapted from `example/component/html-element/simple`. The two `<input type="button">` elements have no name and publish to `cms.unknown`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Html Button Binding</title>
</head>
<body>
  <input type="button" bc-triggers="click" value="with value attribute" />
  <input type="button" bc-triggers="click" value="with bc-value attribute" bc-value="[##cms.cms.time2##]" />

  <button name="cms.test" bc-triggers="click" value="button.value">with button tag</button>
  <button name="cms.test" bc-triggers="click" bc-value="button.bc-value = [##cms.cms.date##]">with button tag</button>
  <div name="cms.test" bc-triggers="click" bc-value="div.bc-value = [##cms.cms.date##]">div</div>
  <span name="cms.test" bc-triggers="click" bc-value="span.bc-value = [##cms.cms.date##]">span</span>
  <br />
  Without Name : [##cms.unknown.value|(not set)##]
  <br />
  With Name : [##cms.test.value|(not set)##]
</body>
</html>
```

### Client-side live filter

Adapted from `example/component/html-element/clientside-live-filter`. Four inputs publish four sources; the `print` command lists them in `triggers` and re-renders with a `filter` that uses their values. The sources are seeded so the tokens have values before the first keystroke.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>ClientSide Live Filter</title>
</head>
<body>
  <fieldset>
    <legend>Filter</legend>
    <label>name: <input type="text" name="filter.name" bc-triggers="keyup change" /></label><br />
    <label>min id: <input type="number" name="filter.min-id" bc-triggers="keyup change" min="1000" max="2000" /></label><br />
    <label>max id: <input type="number" name="filter.max-id" bc-triggers="keyup change" min="1000" max="2000" /></label><br />
    <label>min age: <input type="range" bc-triggers="change input" name="filter.age" min="10" max="90" /></label>
  </fieldset>

  <p>Name contains: [##filter.name.value|( )##], id between [##filter.min-id.value|(1000)##] and [##filter.max-id.value|(1500)##], age >= [##filter.age.value|(10)##]</p>

  <basis core="print" datamembername="local.print" run="atclient"
         triggers="filter.max-id filter.min-id filter.age filter.name">
    <layout>
      <script type="text/template">
        <table>
          <thead><tr><th>Id</th><th>Age</th><th>Name</th></tr></thead>
          <tbody>@child</tbody>
        </table>
      </script>
    </layout>
    <face filter="name like '%[##filter.name.value##]%' and (id between [##filter.min-id.value|(1000)##] and [##filter.max-id.value|(1100)##]) and age >= [##filter.age.value##]">
      <script type="text/template">
        <tr><td>@id@</td><td>@age@</td><td>@name@</td></tr>
      </script>
    </face>
  </basis>

  <script>
    const host = { dbLibPath: "/alasql.min.js" };
    const dataList = [];
    for (let id = 1000; id < 1500; id++) {
      dataList.push({ id, age: Math.floor(Math.random() * 80) + 10, name: Math.random().toString(36).substring(7) });
    }
    $bc.setSource("filter.name", "");
    $bc.setSource("filter.min-id", 1000);
    $bc.setSource("filter.max-id", 1500);
    $bc.setSource("filter.age", 10);
    $bc.setSource("local.print", dataList);
  </script>
</body>
</html>
```

### A button that only signals

Adapted from `example/component/renderable/print/key-field`. The value is irrelevant; the `print` command re-renders because it lists `event.refresh` in `triggers`.

```html
<button bc-value=" " name="event.refresh" bc-triggers="click">Refresh Component</button>

<basis core="print" datamembername="inlineSource.withOutKey" run="atclient" triggers="event.refresh">
  <face>
    <script type="text/template"><li>@name@</li></script>
  </face>
</basis>
```

### Reshaping the value with `OnProcessing`

```html
<input type="text" name="search.query" bc-triggers="keyup change" OnProcessing="normalizeQuery" />
<p>Query: [##search.query.value|(empty)##] ([##search.query.length|(0)##] characters)</p>

<script>
  function normalizeQuery(args) {
    // args: { context, node, id, value }
    const text = String(args.value ?? "").trim().toLowerCase();
    args.value = { value: text, length: text.length }; // an object becomes the single row
  }
</script>
```

### Appending, editing and deleting rows from a form

Adapted from `example/component/renderable/print/add-edit-delete`. The merge type itself comes from another published source.

```html
<label>Merge Type
  <select name="form.status" bc-triggers="change">
    <option value="append">Append</option>
    <option value="replace">Replace</option>
  </select>
</label>

<form bc-triggers="submit" name="page.form" bc-keyField="id" bc-statusField="status"
      bc-merge="[##form.status.value|(append)##]">
  <label>Id : <input name="id" /></label>
  <label>Name : <input name="name" /></label>
  <label>Status
    <select name="status" required>
      <option value="0">Add</option>
      <option value="1">Edit</option>
      <option value="2">Delete</option>
    </select>
  </label>
  <input type="submit" />
</form>

<basis core="print" datamembername="page.form" run="atclient">
  <face>
    <script type="text/template"><li>@id@ (@name@)</li></script>
  </face>
</basis>
<basis core="callback" run="atclient" triggers="page.form"></basis>
```

## Pitfalls

- `preventDefault()` is unconditional. `bc-triggers="click"` on a checkbox or radio cancels the toggle; use `change`. On `<a href>` the link is not followed; on `<form>` the browser never submits.
- Nothing is published until an event fires (priority `none`). Page-text tokens simply show their default until then, but a command whose attributes read the element's source (a `print` `filter`, a `dbsource` parameter) waits for that source when its scope is not `cms` and does not render. Seed the source with `$bc.setSource` or make the command independent of it.
- `bc-triggers` names are literal DOM event names, case-sensitive, separated by single spaces. `onclick`, `Click` or a comma-separated list attach listeners for events that never fire.
- Listing two events that fire for the same interaction (`change input` on a range, `keyup change` on a text box) publishes twice; downstream commands render twice.
- A one-segment source id (`name="query"`) cannot be read with `[##query.value##]`. Always use `scope.name`.
- Every element without `bc-name`/`name` writes to the shared `cms.unknown` source.
- An empty `bc-value=""` is treated as absent; the element's own `value` is published instead.
- `bc-merge` accepts only `replace` and `append`. Any other word (or a token that resolves to nothing) silently means `replace`.
- `bc-merge="append"` with `bc-keyField` only matches rows when the stored source also has a key field; if the first publication was made without `bc-keyField`, later publications are appended blindly.
- Elements inside a `bc-ignore` subtree are never bound, and neither are tokens inside it.
- Cloned markup that already carries `data-bc-init` is never wired.
- With `triggers`, the `if`, `OnRendering` and `OnRendered` hooks run twice per re-run.

## Related

- [commands/input.md](commands/input.md)
- [commands/select.md](commands/select.md)
- [commands/form.md](commands/form.md)
- [commands/unknown-html.md](commands/unknown-html.md)
- [commands/callback.md](commands/callback.md)
- [binding-and-tokens.md](binding-and-tokens.md)
- [sources-and-reactivity.md](sources-and-reactivity.md)
- [command-attributes-and-lifecycle.md](command-attributes-and-lifecycle.md)
- [javascript-api.md](javascript-api.md)

## Source files

- `src/component/html-element/HTMLComponent.ts`
- `src/component/html-element/HTMLInputComponent.ts`
- `src/component/html-element/HTMLSelectComponent.ts`
- `src/component/html-element/HTMLFormComponent.ts`
- `src/component/html-element/HTMLIUnknownComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/component/Component.ts`
- `src/ComponentCollection.ts`
- `src/extension/ElementExtensions.ts`
- `src/data/Source.ts`
- `src/repository/Repository.ts`
- `src/CallbackArgument.ts`
- `src/enum.ts`
- `src/tsyringe.config.ts`
