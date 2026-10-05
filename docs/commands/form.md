# `form` (HTML element binding)

A `<form>` element with a `bc-triggers` attribute publishes all of its fields as **one object row** when one of the listed events fires, normally `submit`. `form` is the registered name of `HTMLFormComponent`, selected automatically for every `<form>` tag carrying `bc-triggers`; it is not written as `<basis core="form">`. Use it when several fields belong together: a filter panel sent to a `dbsource`, a record for `print`/`call`, or a nested payload (`_root.customer.name`, `_root.phones__0.number`) for an API. The native submission is always cancelled, so the page never navigates. The shared mechanics are in [../html-element-binding.md](../html-element-binding.md).

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `bc-triggers` | string | required | Space separated DOM event names; use `submit`. `change` or `input` also work and publish the whole form on every field edit. |
| `bc-name` | string | `name`, then `cms.unknown` | Source id (`scope.name`). |
| `bc-merge` | `replace` \| `append` | `replace` | How the submitted row is combined with the existing source. |
| `bc-keyField` | string | - | Field that identifies a row for `append` merges. |
| `bc-statusField` | string | - | Field holding `0` (add), `1` (edit) or `2` (delete) for `append` merges. |
| `bc-value`, `bc-off-value` | | | Not used: the form value is always built from `FormData`. |
| `if`, `OnProcessing`, `OnRendering`, `OnRendered`, `OnProcessed`, `triggers` | | | Lifecycle attributes shared by all HTML element bindings. |

The fields are addressed by their `name` attributes. Fields do not need `bc-triggers`.

## What is collected

`HTMLFormComponent.getSourceValueAsync` starts from `new FormData(this.node)`, so the browser decides which controls contribute:

- Only controls with a `name` and not `disabled` are included.
- Unchecked checkboxes and radios are absent. Checked ones contribute their `value` attribute (`"on"` when none is given).
- `<select multiple>` contributes one entry per selected option.
- `<input type="file">` contributes `File` objects (an empty `File` when nothing is selected).
- Buttons are not included (the constructor is called without a submitter).
- Every value is a string, including numbers, ranges and dates.

## Building the object

For each distinct key of the `FormData`:

1. If the key does **not** start with `_`, it becomes a property of the result object. With one entry the value is that string (or `File`); with several entries (repeated names) it is an array of them.
2. If the key starts with `_`, it is set aside and handed to `convertRootList`, which builds nested objects and arrays from the dotted path.

### Dotted paths: `_root.path.field`

The key is split on `.`. The first segment is the root property (`_root`, `_info`, any name beginning with `_`). Each following segment either descends into an object (creating `{}` when missing) or, for the last segment, stores the value (string, or array when the key had several entries).

### Arrays: `segment__index`

A segment of the form `name__index` (two underscores) means "element `index` of the array `name`". `name` is created as an array when missing, `array[index]` is created as `{}` when missing, and the next segments are applied to that object. The index must be a non-negative integer; the segments after an indexed segment are mandatory because the value is stored only by a final plain segment.

### Compaction: `removeArrayEmptySlots`

After all keys are processed, every root object is walked recursively and every array in it is replaced by `array.filter(String)`:

- holes left by non-contiguous indexes (`phones__1`, `phones__3`) are removed and the remaining elements are renumbered from `0`;
- elements whose string form is empty are removed, so an empty string coming from a repeated field disappears from arrays under a `_` root (objects are kept because `String({})` is `"[object Object]"`);
- properties set on the array with a non-numeric index are dropped by `filter`.

Top-level (non-underscore) arrays are not compacted.

### Worked example

Markup adapted from `example/component/html-element/form/multi-root` after the user pressed **Add Phone** twice (the template replaces `[x]` with `1`, then `2`):

```html
<form bc-triggers="submit" name="cms.form">
  <input name="id" value="7" />
  <input name="_info.fname" value="Ada" />
  <input name="_info.lname" value="Lovelace" />
  <input type="range" name="_root.range" value="40" />
  <input name="_root.phones__1.code" value="+44" />
  <input name="_root.phones__1.number" value="1234" />
  <input name="_root.phones__2.code" value="" />
  <input name="_root.phones__2.number" value="5678" />
  <input type="checkbox" name="tags" value="a" checked />
  <input type="checkbox" name="tags" value="b" checked />
  <input type="submit" />
</form>
```

Step 1, plain keys: `id` has one entry, `tags` has two.

```js
{ id: "7", tags: ["a", "b"] }
```

Step 2, `_` keys are grouped by root and expanded. `_info.fname` creates `_info = {}` and sets `fname`. `_root.phones__1.code` creates `_root = {}`, then `_root.phones = []`, then `_root.phones[1] = {}`, then sets `code`. `_root.phones__2.code` sets `_root.phones[2].code = ""`.

```js
_info: { fname: "Ada", lname: "Lovelace" }
_root: {
  range: "40",
  phones: [ <empty>, { code: "+44", number: "1234" }, { code: "", number: "5678" } ]
}
```

Step 3, compaction removes the hole at index 0 (and would remove any empty string sitting directly in an array). The object at index 2 keeps its empty `code` because only array elements are filtered.

```js
_root: {
  range: "40",
  phones: [ { code: "+44", number: "1234" }, { code: "", number: "5678" } ]
}
```

Published source `cms.form`, one row:

```js
{
  id: "7",
  tags: ["a", "b"],
  _info: { fname: "Ada", lname: "Lovelace" },
  _root: { range: "40", phones: [ { code: "+44", number: "1234" }, { code: "", number: "5678" } ] }
}
```

Read it with column tokens; the column part is evaluated as a JavaScript member expression on the row:

```html
[##cms.form.id##]
[##cms.form._info.fname##]
[##cms.form._root.range##]
[##cms.form._root.phones[0]?.code##]
[##cms.form._root.phones[1]?.number##]
```

Hyphenated field names (`min-id`) also work: when the member expression fails the token falls back to `row['min-id']`.

## Event handling

`event.preventDefault()` is called on every triggering event, so `submit` never leaves the page and no request is sent by the browser. Submission is started by a submit button or by pressing Enter in a text field; HTML5 validation (`required`, `min`, `pattern`) runs before the `submit` event, so an invalid form publishes nothing.

## Examples

### Simple form

Adapted from `example/component/html-element/form/simple`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Html Form Binding</title>
</head>
<body>
  <form bc-triggers="submit" name="cms.form">
    <label>fname : <input name="fname" /></label><br />
    <label>lname : <input name="lname" /></label><br />
    <label>range : <input type="range" name="range" /></label><br />
    <label>number : <input type="number" name="number" /></label>
    <input type="submit" />
  </form>

  <fieldset>
    <legend>Result</legend>
    fname: [##cms.form.fname##]<br />
    lname: [##cms.form.lname##]<br />
    range: [##cms.form.range##]<br />
    number: [##cms.form.number##]
  </fieldset>
</body>
</html>
```

### Nested object and dynamic array items

Adapted from `example/component/html-element/form/root`. New phone rows are stamped from a `<template>`; the `[x]` placeholder becomes a running index.

```html
<form bc-triggers="submit" name="cms.form">
  <label>id : <input name="id" /></label>
  <fieldset>
    <legend>cms.form._root</legend>
    <label>fname : <input name="_root.fname" /></label>
    <label>lname : <input name="_root.lname" /></label>
    <label>range : <input type="range" name="_root.range" /></label>
    <fieldset id="phone-holder"><legend>cms.form._root.phones</legend></fieldset>
    <template id="phone-template">
      <div>
        <label>Code : <input name="_root.phones__[x].code" /></label>
        <label>Phone : <input name="_root.phones__[x].number" /></label>
      </div>
    </template>
    <button type="button" onclick="addPhone()">Add Phone</button>
  </fieldset>
  <input type="submit" />
</form>

<fieldset>
  <legend>Result</legend>
  cms.form._root.fname: [##cms.form._root.fname##]<br />
  cms.form._root.phones[0]?.code: [##cms.form._root.phones[0]?.code##]<br />
  cms.form._root.phones[1]?.number: [##cms.form._root.phones[1]?.number##]<br />
  {{ return JSON.stringify((await $bc.waitToGetSourceAsync('cms.form')).rows[0]); }}
</fieldset>

<basis core="callback" run="atclient" triggers="cms.form"></basis>

<script>
  let id = 1;
  function addPhone() {
    const template = document.getElementById("phone-template");
    const copy = document.importNode(template.content, true);
    copy.querySelectorAll("[name]").forEach((element) => {
      element.attributes["name"].value = element.attributes["name"].value.replace("[x]", id.toString());
    });
    id++;
    document.getElementById("phone-holder").append(copy);
  }
</script>
```

### Server-side filter

Adapted from `example/component/html-element/serverside-live-filter`. The form publishes `data.filter`; the `dbsource` lists it in `triggers` and passes the fields as request parameters.

```html
<form name="data.filter" bc-triggers="submit">
  <label>name: <input type="text" name="name" /></label>
  <label>min id: <input type="number" name="min-id" min="1000" max="2000" /></label>
  <label>max id: <input type="number" name="max-id" min="1000" max="2000" /></label>
  <label>min age: <input type="range" name="age" min="10" max="90" /></label>
  <input type="submit" />
</form>

<basis core="dbsource" source="schoolapi" name="book" run="atclient"
       filter-name="[##data.filter.name##]" filter-min-id="[##data.filter.min-id##]"
       filter-max-id="[##data.filter.max-id##]" filter-age="[##data.filter.age##]"
       triggers="data.filter">
  <member name="list" type="list" request="print" preview="true"></member>
</basis>

<script>
  const host = {
    dbLibPath: "/alasql.min.js",
    settings: { "connection.web.schoolapi": "data/schoolapi", "default.dmnid": 2668 },
  };
  $bc.setSource("data.filter", { name: "", "min-id": 1000, "max-id": 1500, age: 10 });
</script>
```

### Appending, editing and deleting rows

Adapted from `example/component/renderable/print/add-edit-delete`. With `bc-merge="append"`, `bc-keyField="id"` and `bc-statusField="status"`, each submission adds (`0`), replaces (`1`) or removes (`2`) the row whose `id` matches.

```html
<form bc-triggers="submit" name="page.form" bc-keyField="id" bc-statusField="status" bc-merge="append">
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
```

### Sending the form object to the server with `call`

From `example/component/html-element/form/root`: the `call` command waits for `cms.form` and posts the row as JSON.

```html
<basis core="call" file="called.html" run="atclient" method="post" if="[##cms.form##]" triggers="cms.form"
       app-json="{{ return JSON.stringify((await $bc.waitToGetSourceAsync('cms.form')).rows[0]); }}">
</basis>
```

## Pitfalls

- A root key with no further segment (`name="_tags"`) creates the empty object `_tags: {}` and the value is lost. Always write at least `_root.field`.
- An indexed segment at the end of the path (`name="_root.phones__0"`) creates an empty object in the array and drops the value. Write `_root.phones__0.number`.
- Indexes are compacted: `phones__1` and `phones__3` end up at `phones[0]` and `phones[1]`. Non-numeric indexes (`phones__a`) are dropped.
- Inside `_` roots, empty strings that are direct array elements are removed by compaction; a repeated field with values `["", "x"]` becomes `["x"]`. Empty strings in object properties are kept.
- Repeated names produce an array only when two or more entries are present; one checked box of a group gives a string, two give an array. Check `Array.isArray` in consumers.
- Unchecked checkboxes and disabled fields are not part of the object at all; a token for them renders its default.
- Everything is a string (or a `File`). `"0"` and `"1"` from a status select work with `bc-statusField` because the comparison is loose.
- The form publishes nothing at page load. Page-text tokens show their default until the first submit; a command that reads the form's source in its attributes (the `dbsource` in the server-side filter example) waits for the source when its scope is not `cms`, which is why that example seeds `data.filter` with `$bc.setSource`.
- HTML5 validation blocks the `submit` event, so an invalid form publishes nothing and gives no BasisCore error.
- A field named `value` that also has its own `bc-triggers` publishes to a source called `value`, which cannot be read by tokens; this is harmless for the form itself.
- `<basis core="form" run="atclient">` is not supported: the component would receive the `<basis>` node and `new FormData()` throws on the first event.

## Related

- [../html-element-binding.md](../html-element-binding.md)
- [input.md](input.md)
- [select.md](select.md)
- [unknown-html.md](unknown-html.md)
- [callback.md](callback.md)
- [call.md](call.md)
- [dbsource.md](dbsource.md)
- [print.md](print.md)
- [../binding-and-tokens.md](../binding-and-tokens.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md)

## Source files

- `src/component/html-element/HTMLFormComponent.ts`
- `src/component/html-element/HTMLComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/ComponentCollection.ts`
- `src/extension/ElementExtensions.ts`
- `src/data/Source.ts`
- `src/repository/Repository.ts`
- `src/token/token-element/SourceTokenElement.ts`
- `src/tsyringe.config.ts`
