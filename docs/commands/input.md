# `input` (HTML element binding)

An `<input>` element with a `bc-triggers` attribute publishes its value as a source every time one of the listed DOM events fires. `input` is the registered name of `HTMLInputComponent`, which the scanner selects automatically for every `<input>` tag carrying `bc-triggers`; it is not written as `<basis core="input">`. Use it to feed text, numbers, dates, colors, checkbox states or file selections into tokens, `triggers` of other commands and callbacks. The general mechanics (discovery, source id, lifecycle hooks, merge options) are described in [../html-element-binding.md](../html-element-binding.md); this page covers what is specific to `<input>`.

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `bc-triggers` | string | required | Space separated DOM event names: `change`, `keyup`, `input`, `click`, ... |
| `bc-name` | string | `name`, then `cms.unknown` | Source id. Use a two-segment id (`scope.name`). |
| `bc-value` | string | - | Published instead of the element value when it is non-empty. |
| `bc-off-value` | string | `"off"` | Published by an unchecked checkbox. |
| `bc-merge`, `bc-keyField`, `bc-statusField` | | | Merge options of the published source, see [../html-element-binding.md](../html-element-binding.md). |
| `if`, `OnProcessing`, `OnRendering`, `OnRendered`, `OnProcessed`, `triggers` | | | Lifecycle attributes shared by all HTML element bindings. |

## Value resolution

`HTMLInputComponent.getSourceValueAsync` first applies the base rule, then a per-type fallback that is only reached when the base rule produced an empty value:

1. **Unchecked checkbox** (`type="checkbox"`, compared case-insensitively, and `checked` is false): `bc-off-value`, or the string `"off"` when the attribute is missing or empty.
2. Otherwise **`bc-value`**, when it resolves to a non-empty string.
3. Otherwise the element's **`value` property**, always a string.
4. If the result is still empty (`""`), the per-type fallback applies:
   - `checkbox`: the `checked` boolean. Because a checked checkbox without a `value` attribute already has `value === "on"`, this branch is reached only for a checked box written with `value=""`; it then publishes `true`.
   - `file`: `{ value: node.files }`, the `FileList`. Browsers return `C:\fakepath\<name>` from `value` as soon as a file is selected, so this branch is reached only when the selection is empty and the `FileList` has no entries. With a file selected the published value is the fakepath string. To publish the actual files, use `OnProcessing` and read `callbackArgument.node.files` (example below).
   - every other type: `node.value`, which is the same empty string.

The published source has one row, `{ value: <result> }`, read with `[##scope.name.value##]`.

### Per type

| `type` | Event to use | Published value |
|---|---|---|
| `text`, `search`, `email`, `password`, `url`, `tel`, `hidden` | `change`, `keyup` or `input` | the text, as typed |
| `number`, `range` | `change`, `input` | the string form of the number (`"42"`, never a number) |
| `date`, `time`, `datetime-local`, `month`, `week` | `change`, `input` | the normalized string (`"2024-03-05"`, `"14:30"`) or `""` when cleared |
| `color` | `change`, `input` | `"#rrggbb"` |
| `checkbox` | `change` | checked: `bc-value`, else `value` attribute, else `"on"`; unchecked: `bc-off-value`, else `"off"` |
| `radio` | `change` | `bc-value`, else the `value` attribute of the radio that changed (`change` fires only on the newly checked radio, so a group with a shared `name` publishes the selected value) |
| `file` | `change` | `bc-value`, else `C:\fakepath\<first file name>`, or `{ value: FileList }` when nothing is selected |
| `button`, `submit`, `reset` | `click` | `bc-value`, else the `value` attribute (the caption) |

Radio inputs are not treated as checkboxes: `bc-off-value` has no effect on them.

## Examples

### Text inputs with different events

Adapted from `example/component/html-element/input`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Html Text Binding</title>
</head>
<body>
  <input bc-triggers="change" name="cms.text" />
  [##cms.text.value|(not set)##]
  <br />
  <input bc-triggers="keyup" name="cms.text1" />
  [##cms.text1.value|(not set)##]
  <br />
  <input bc-triggers="change keyup" name="cms.text2" />
  [##cms.text2.value|(not set)##]

  <basis core="callback" run="atclient" triggers="cms.text cms.text1 cms.text2"></basis>
</body>
</html>
```

### Number, range, date, time and color

```html
<label>Number <input type="number" bc-triggers="change input" name="cms.number" /></label>
[##cms.number.value|(not set)##]
<br />
<label>Range <input type="range" bc-triggers="change input" name="cms.range" min="0" max="100" /></label>
[##cms.range.value|(not set)##]
<br />
<label>Date <input type="date" bc-triggers="change input" name="cms.date" /></label>
[##cms.date.value|(not set)##]
<br />
<label>Time <input type="time" bc-triggers="change input" name="cms.time" /></label>
[##cms.time.value|(not set)##]
<br />
<label>Color <input type="color" bc-triggers="change input" name="cms.color" /></label>
[##cms.color.value|(not set)##]
```

The number and range values are strings. To filter with them in a `face`, place the token directly in the SQL text (`id between [##cms.number.value|(0)##] and 100`); to use them as numbers in JavaScript convert in `OnProcessing`:

```html
<input type="range" name="ui.zoom" bc-triggers="input" min="50" max="200" OnProcessing="toNumber" />
<script>
  function toNumber(args) { args.value = Number(args.value); }
</script>
```

### Checkbox variants

Adapted from `example/component/html-element/chekbox-list`. All five boxes publish to `cms.cbox`; the last one toggled wins.

```html
<fieldset>
  <legend>Items</legend>
  <label><input type="checkbox" bc-triggers="change" name="cms.cbox" />on / off (defaults)</label><br />
  <label><input type="checkbox" bc-triggers="change" name="cms.cbox" value="val2" />val2 / off (value attribute)</label><br />
  <label><input type="checkbox" bc-triggers="change" name="cms.cbox" bc-value="val3" />val3 / off (bc-value)</label><br />
  <label><input type="checkbox" bc-triggers="change" name="cms.cbox" bc-off-value="val4" />on / val4 (bc-off-value)</label><br />
  <label><input type="checkbox" bc-triggers="change" name="cms.cbox" bc-value="val5" bc-off-value="val6" />val5 / val6</label><br />
  [##cms.cbox.value|(not set)##]
</fieldset>
```

A checkbox as a mode switch, adapted from `example/component/renderable/schema/switch-view-edit`:

```html
<label>
  <input type="checkbox" bc-triggers="change" name="cms.form" bc-value="view" bc-off-value="edit" checked />
  In View Mode
</label>
<p>Mode: [##cms.form.value|(view)##]</p>
```

### Radio group

```html
<input type="radio" bc-triggers="change" name="cms.g1" value="item-1" />
<input type="radio" bc-triggers="change" name="cms.g1" value="item-2" />
<input type="radio" bc-triggers="change" name="cms.g1" value="item-3" />
[##cms.g1.value|(not set)##]
```

### File input

With only the default rules the published value is the browser's fakepath string:

```html
<input type="file" bc-triggers="change" name="cms.file" />
[##cms.file.value|(not set)##]
```

To publish the selected files, replace the value in `OnProcessing`:

```html
<input type="file" multiple bc-triggers="change" name="upload.files" OnProcessing="collectFiles" />
<p>Selected: [##upload.files.names|(none)##]</p>

<script>
  function collectFiles(args) {
    const files = Array.from(args.node.files);
    args.value = {
      files: files,                                  // File objects for later upload code
      names: files.map((f) => f.name).join(", "),
      size: files.reduce((sum, f) => sum + f.size, 0),
    };
  }
</script>
```

### Button input that only triggers a command

Adapted from `example/component/collection/repeater/replace-append`.

```html
<input type="button" value="trigger" name="event.render" bc-triggers="click" bc-value="0" />

<basis core="repeater" name="rep" datamembername="replace.data" run="atclient" triggers="event.render">
  <li>@name@</li>
</basis>
```

## Pitfalls

- `bc-triggers="click"` on a checkbox or radio cancels the toggle, because the handler always calls `preventDefault()`. Use `change`.
- The value is published only on the listed events. Nothing is published at page load: page-text tokens show their `|(default)` (or nothing) until the first event, and a command that reads the input's source in one of its attributes (a `face` `filter`, a `dbsource` parameter) waits for the source when its scope is not `cms`. Seed with `$bc.setSource("scope.name", "")` in that case.
- `change input` on a range or `change keyup` on a text box publish twice for one interaction.
- A checked checkbox publishes a string (`"on"` by default), not a boolean. `true` is published only when the box is written with `value=""` and no `bc-value`.
- A file input publishes `C:\fakepath\<name>` once a file is selected; the `{ value: FileList }` branch is reached only when the selection is empty. Read `node.files` in `OnProcessing` instead.
- Numbers, dates and ranges are strings.
- Radio buttons do not use `bc-off-value`; unchecking a radio (by checking another one) does not publish anything for the unchecked element.
- `name` on an `<input>` inside a `<form bc-triggers="submit">` is both the form field key and, if the input also has `bc-triggers`, its own source id. A field named `value` would publish to a source called `value`, which no token can read.

## Related

- [../html-element-binding.md](../html-element-binding.md)
- [select.md](select.md)
- [form.md](form.md)
- [unknown-html.md](unknown-html.md)
- [callback.md](callback.md)
- [../binding-and-tokens.md](../binding-and-tokens.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md)

## Source files

- `src/component/html-element/HTMLInputComponent.ts`
- `src/component/html-element/HTMLComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/ComponentCollection.ts`
- `src/extension/ElementExtensions.ts`
- `src/data/Source.ts`
- `src/tsyringe.config.ts`
