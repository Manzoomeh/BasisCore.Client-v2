# `unknown-html` (HTML element binding)

`unknown-html` is the component used for every element that carries `bc-triggers` and is not an `<input>`, `<select>` or `<form>`: buttons, table cells, `div`/`span`, links, `textarea` and so on. It is the registered name of `HTMLIUnknownComponent`, a class that adds nothing to the shared `HTMLComponent` behaviour, so the element publishes `bc-value` or its own `value` property on each listed event. Use it for action buttons, clickable sort headers, mode switches and any "signal" that should re-run commands through `triggers`. The shared mechanics are in [../html-element-binding.md](../html-element-binding.md).

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `bc-triggers` | string | required | Space separated DOM event names, typically `click`; `keyup`/`input` for `textarea`. |
| `bc-name` | string | `name`, then `cms.unknown` | Source id (`scope.name`). `name` is a valid attribute on `button`, but on `div`, `span`, `td` it is a custom attribute; both are read the same way. |
| `bc-value` | string | - | Value to publish; may contain tokens that are resolved on every event. |
| `bc-off-value` | string | - | No effect (only `<input type="checkbox">` uses it). |
| `bc-merge`, `bc-keyField`, `bc-statusField` | | | Merge options of the published source. |
| `if`, `OnProcessing`, `OnRendering`, `OnRendered`, `OnProcessed`, `triggers` | | | Lifecycle attributes shared by all HTML element bindings. |

## Value resolution

The base rule of `HTMLComponent.getSourceValueAsync` applies without changes:

1. `bc-value`, when it resolves to a non-empty string.
2. Otherwise the element's `value` property, if the element has one: `button` (its `value` attribute, not its caption), `textarea` (the text), `output`, `option`, `data`.
3. Elements without a `value` property (`div`, `span`, `td`, `a`, `svg`, ...) yield `undefined`.

The source has one row `{ value: <result> }`. When the result is `undefined` the row is `{ value: undefined }`: the source exists and fires every handler bound to it, but `[##scope.name.value##]` has nothing to show and renders its default. Such an element is still useful as a pure trigger.

`event.preventDefault()` is called on every event, so a `<a href>` with `bc-triggers="click"` does not navigate, and a `<button>` inside a form with `bc-triggers="click"` does not submit the form.

## Examples

### Action buttons and other tags

Adapted from `example/component/html-element/simple`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Html Button Binding</title>
</head>
<body>
  <button name="cms.test" bc-triggers="click" value="button.value">with button tag</button>
  <button name="cms.test" bc-triggers="click" bc-value="button.bc-value = [##cms.cms.date##]">with token</button>
  <div name="cms.test" bc-triggers="click" bc-value="div.bc-value = [##cms.cms.date##]" style="border: 1px solid black; display: inline; padding: 3px;">div</div>
  <span name="cms.test" bc-triggers="click" bc-value="span.bc-value = [##cms.cms.date##]" style="border: 1px solid black; display: inline; padding: 3px;">span</span>
  <br />
  With Name : [##cms.test.value|(not set)##]
</body>
</html>
```

### Sortable table headers inside a `print` layout

Adapted from `example/component/renderable/on-processing/sort-and-filter`. The header cells are part of the rendered layout and are bound again after every render; each click publishes the column name to `demo.sort-by`, which re-runs the `print` command. Its `OnProcessing` hook sorts the rows before rendering.

```html
<basis core="print" datamembername="demo.list" run="atclient" triggers="demo.sort-by" OnProcessing="sortRows">
  <layout>
    <script type="text/template">
      <table>
        <thead>
          <tr>
            <td name="demo.sort-by" bc-triggers="click" bc-value="id">Id</td>
            <td name="demo.sort-by" bc-triggers="click" bc-value="name">Name</td>
            <td name="demo.sort-by" bc-triggers="click" bc-value="age">Age</td>
          </tr>
        </thead>
        <tbody>@child</tbody>
      </table>
    </script>
  </layout>
  <face>
    <script type="text/template">
      <tr><td>@id@</td><td>@name@</td><td>@age@</td></tr>
    </script>
  </face>
</basis>

<script>
  function sortRows(args) {
    const col = args.context.tryToGetSource("demo.sort-by")?.rows[0].value ?? "id";
    args.source.rows.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0));
  }
  $bc.setSource("demo.list", [
    { id: 2, name: "b", age: 31 },
    { id: 1, name: "a", age: 45 },
    { id: 3, name: "c", age: 27 },
  ]);
</script>
```

### A button that re-runs an `api` command

From `example/component/source/api/restful/triggers`. The value `"null"` is a string and is irrelevant; the `api` command re-fetches because `events.fetch` is in its `triggers`.

```html
<button name="events.fetch" bc-triggers="click" bc-value="null">Fetch API</button>

<basis core="api" url="data/book.json" method="get" run="atclient" triggers="events.fetch"></basis>
```

### Refreshing a user-defined component

From `example/component/user-component/simple`.

```html
<button bc-value="0" bc-triggers="click" name="event.click">Click to refresh</button>

<basis core="component.local.DemoComponent" run="atclient" triggers="event.click"></basis>
```

### `textarea`

```html
<textarea name="note.text" bc-triggers="keyup change" rows="4"></textarea>
<p>[##note.text.value|(empty)##]</p>
```

### Publishing structured data from a clickable row

```html
<ul>
  <li name="ui.selected" bc-triggers="click" bc-value="1" OnProcessing="selectItem">First</li>
  <li name="ui.selected" bc-triggers="click" bc-value="2" OnProcessing="selectItem">Second</li>
</ul>
<p>Selected id [##ui.selected.id|(none)##], label [##ui.selected.label|(none)##]</p>

<script>
  function selectItem(args) {
    args.value = { id: Number(args.value), label: args.node.textContent };
  }
</script>
```

## Pitfalls

- A `div`, `span`, `td` or `a` without `bc-value` publishes `{ value: undefined }`; handlers fire but no token can display anything. Give it a `bc-value`.
- `<button>` publishes its `value` attribute, not its visible caption. Without `value` or `bc-value` it publishes `""`.
- Every element without `bc-name`/`name` publishes to the shared `cms.unknown` source.
- `preventDefault()` is always called: links do not navigate and buttons inside a form do not submit it when they carry `bc-triggers="click"`.
- Elements rendered by a command (`print`, `repeater`, ...) are re-created on every render, and new listeners are attached each time. Hooks referenced from `OnProcessing` must therefore be idempotent, and state should live in sources, not on the elements.
- `click` fires `mousedown`/`mouseup` first; listing `click mouseup` publishes twice.
- The registered name `unknown-html` is chosen by the scanner from the tag; `<basis core="unknown-html" run="atclient">` would receive the `<basis>` element itself and publish `undefined`.

## Related

- [../html-element-binding.md](../html-element-binding.md)
- [input.md](input.md)
- [select.md](select.md)
- [form.md](form.md)
- [print.md](print.md)
- [api.md](api.md)
- [component.md](component.md)
- [../binding-and-tokens.md](../binding-and-tokens.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md)

## Source files

- `src/component/html-element/HTMLIUnknownComponent.ts`
- `src/component/html-element/HTMLComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/ComponentCollection.ts`
- `src/extension/ElementExtensions.ts`
- `src/data/Source.ts`
- `src/tsyringe.config.ts`
