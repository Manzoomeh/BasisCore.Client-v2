# `select` (HTML element binding)

A `<select>` element with a `bc-triggers` attribute publishes the value of its selected option as a source whenever one of the listed DOM events fires. `select` is the registered name of `HTMLSelectComponent`, chosen automatically by the scanner for every `<select>` tag carrying `bc-triggers`; it is not written as `<basis core="select">`. Use it for sort keys, page sizes, merge-mode switches, filter categories and any other choice that other commands should react to. The shared mechanics are in [../html-element-binding.md](../html-element-binding.md).

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `bc-triggers` | string | required | Space separated DOM event names; `change` is the usual one. |
| `bc-name` | string | `name`, then `cms.unknown` | Source id (`scope.name`). |
| `bc-value` | string | - | **No effect on `<select>`** (see below). |
| `bc-off-value` | string | - | No effect (only checkboxes use it). |
| `bc-merge`, `bc-keyField`, `bc-statusField` | | | Merge options of the published source. |
| `if`, `OnProcessing`, `OnRendering`, `OnRendered`, `OnProcessed`, `triggers` | | | Lifecycle attributes shared by all HTML element bindings. |

## Value resolution

`HTMLSelectComponent.getSourceValueAsync` is:

```ts
return this.node.value ?? (await super.getSourceValueAsync(event));
```

`HTMLSelectElement.value` is the `value` of the first selected option, or `""` when no option is selected. It is never `null` or `undefined`, so the `??` fallback to the base rule is never taken. Therefore:

- `bc-value` is ignored on a `<select>`. To publish something other than the option value, change `args.value` in `OnProcessing`.
- An `<option>` without a `value` attribute publishes its text content (standard DOM behaviour).
- For `<select multiple>` only the first selected option's value is published. Collect all of them in `OnProcessing` with `node.selectedOptions`.

The source has one row `{ value: "<option value>" }`, read with `[##scope.name.value##]`.

Option values may contain tokens; they are resolved by the attribute binding before the user interacts with the control (the shipped example uses `<option value="[##cms.cms.time##]">`).

## Examples

### Basic dropdown

Adapted from `example/component/html-element/input`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Html Select Binding</title>
</head>
<body>
  <select bc-triggers="change" name="cms.cmb">
    <option value="default"></option>
    <option>1</option>
    <option>2</option>
    <option>3</option>
    <option value="[##cms.cms.time##]">now</option>
  </select>
  [##cms.cmb.value|(not set)##]

  <basis core="callback" run="atclient" triggers="cms.cmb"></basis>
</body>
</html>
```

### Choosing the merge mode of another publisher

Adapted from `example/component/renderable/print/add-edit-delete`. The form reads the select's source in its own `bc-merge` attribute.

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
```

Note that the inner `<select name="status">` has no `bc-triggers`: it is an ordinary form field whose value travels inside the form's object.

### Sort key for a `print` command

The `print` command re-renders whenever `demo.sort-by` is set; its `OnProcessing` hook reads the selected column and sorts the rows before rendering (the shipped `on-processing/sort-and-filter` example does the same with SQL).

```html
<label>Sort by
  <select name="demo.sort-by" bc-triggers="change">
    <option value="id">Id</option>
    <option value="name">Name</option>
    <option value="age">Age</option>
  </select>
</label>

<basis core="print" datamembername="demo.list" run="atclient" triggers="demo.sort-by" OnProcessing="sortRows">
  <face>
    <script type="text/template"><li>@id@ - @name@ (@age@)</li></script>
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

### Multiple selection

```html
<select multiple name="filter.tags" bc-triggers="change" OnProcessing="collectSelected">
  <option value="news">News</option>
  <option value="sport">Sport</option>
  <option value="tech">Tech</option>
</select>
<p>Tags: [##filter.tags.list|(none)##]</p>

<script>
  function collectSelected(args) {
    const values = Array.from(args.node.selectedOptions, (o) => o.value);
    args.value = { list: values.join(", "), values: values };
  }
</script>
```

## Pitfalls

- `bc-value` and `bc-off-value` are never read for a `<select>`; `node.value` always wins.
- `<select multiple>` publishes only the first selected value unless `OnProcessing` collects `selectedOptions`.
- Nothing is published at page load. A command that reads the select's source in one of its attributes (`filter="... [##demo.category.value##]"`) waits for the source when its scope is not `cms` and does not render until the first `change`; seed the source with `$bc.setSource` or read it with `tryToGetSource` in `OnProcessing` as above.
- A placeholder option written as `<option value=""></option>` publishes `""`; the token `[##scope.name.value|(default)##]` then shows the default because empty values do not satisfy a token.
- Changing the selection programmatically (`select.value = "x"`) does not fire `change`; dispatch the event yourself (`select.dispatchEvent(new Event("change"))`) if the source should update.

## Related

- [../html-element-binding.md](../html-element-binding.md)
- [input.md](input.md)
- [form.md](form.md)
- [unknown-html.md](unknown-html.md)
- [print.md](print.md)
- [../binding-and-tokens.md](../binding-and-tokens.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md)

## Source files

- `src/component/html-element/HTMLSelectComponent.ts`
- `src/component/html-element/HTMLComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/ComponentCollection.ts`
- `src/extension/ElementExtensions.ts`
- `src/tsyringe.config.ts`
