# repeater

`repeater` renders its inner markup once per row of a source. Each row gets its own
`LocalContext` in which the row is published as the source `<name>.current`, so the repeated
markup can use ordinary tokens (`[##rep.current.id##]`) and nested commands that read
`<name>.current`. Use it when a `print` face is not enough: when every row needs nested
commands, HTML element bindings or a scope of its own.

## Attributes

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | `repeater` | required | Command name. |
| `run` | `atclient` | required | Only `run="atclient"` elements are processed. |
| `datamembername` | source id (token) | required | Source whose rows are iterated. Lower-cased and registered as a trigger, so the command re-runs whenever the source is set. |
| `name` | string (token) | none | Prefix of the per-row source. Row *n* is published as `<name>.current` in the row's local context. |
| `replace` | boolean (token) | `true` | `true`: remove the previous output and dispose the previous row contexts and collections before rendering. `false`: keep the previous output and append the new rows after it. |
| `if`, `triggers`, `events`, `OnProcessing`, `OnRendering`, `OnRendered`, `ignoreNullSource` | common | | See [Command attributes and lifecycle](../command-attributes-and-lifecycle.md). |

`repeater` extends `SourceBaseComponent` and has the default priority (`low`).

## How it works

### Source lookup

On each run the command takes the source that triggered it; if that is not the
`datamembername` source (first run, a `triggers` source, an `events` entry), it calls
`context.tryToGetSource(datamembername)`. When no source is available nothing is rendered and
`OnRendered` is not called. If `OnProcessing` is set it receives `{ context, node, source }` and
may replace `args.source` before rendering.

### Template

When the command is created, the `<basis core="repeater">` element is removed from the document
and kept in the command's `content` fragment. The template of a row is

```ts
const template = this.content.firstChild.cloneNode(true);
```

that is, a deep clone of the whole `<basis core="repeater">` element. The clone's child nodes
(everything that was written between the opening and the closing tag, text and elements alike)
are moved into a fragment and appended to the command's range with `setContent(fragment, true)`.
There is no restriction on the number or type of child nodes.

### Per-row scope

For every row of `dataSource.rows`:

1. A child container is created from the command's container with `parent.context`, `dc` and
   `parent.dc` registered.
2. `ILocalContext` is resolved, which yields a `LocalContext` whose owner is the repeater's
   context. `LocalContext.tryToGetSource` looks in its own repository first and then in the
   owner; it subscribes to the owner's `onDataSourceSet` so outer source updates are forwarded.
3. `localContext.setAsSource("<name>.current", row, dataSource.cloneOptions())` publishes the row
   object itself (not a copy) as a one-row source with the parent's `mergeType`, `keyFieldName`,
   `statusFieldName` and `extra`.
4. The local context is registered as `context`, a `ComponentCollection` is resolved from the
   child container and processes the row's nodes.

Both the local context and the collection are stored so they can be disposed later.

Row contexts are `LocalContext` instances, which receive their options from the `host_options`
token registered by the root runtime. A repeater inside a `group` with custom `options` still
uses the root settings for its rows (binding regex, command defaults), while sources of the
group remain visible through the owner chain.

### `replace`

With `replace="true"` (the default) each run first calls `range.deleteContents()` and disposes
every previous row context and collection, then renders the current rows of the source. With
`replace="false"` the previous output, contexts and collections are kept and the current rows of
the source are appended after them. Note that the *source* may itself be cumulative: a source
published with `mergeType: append` grows in the repository, and the repeater always iterates the
whole current row set, so `replace="false"` together with an `append` source renders the old
rows again on every run.

### Disposal

`disposeAsync` disposes all row contexts (unsubscribing them from the owner) and all row
collections (disposing every component inside them), then the command itself.

## Examples

### Basic list

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="/basiscore.js"></script>
  <title>Repeater Command - Simple</title>
</head>
<body>
  <input type="button" value="Set Source" onclick="set()" />
  <ul>
    <basis core="repeater" name="rep" datamembername="replace.data" run="atclient">
      <li>hi [##rep.current.id|(not found!)##] [##rep.current.name|('')##] </li>
    </basis>
  </ul>
  <script>
    let i = 0;
    function set() {
      $bc.setSource("replace.data", [{ id: i, name: `data ${i}` }]);
      i += 1;
    }
    set();
  </script>
</body>
</html>
```

Every click replaces the single `<li>` with the new row.

### `replace` versus source merge type

```html
<input type="button" value="Set Source" onclick="set()" />
<input type="button" value="trigger" name="event.render" bc-triggers="click" bc-value="0" />
<fieldset>
  <legend>Source.MergeType = replace, repeater.replace = true</legend>
  <ul>
    <basis core="repeater" name="rep" datamembername="replace.data" run="atclient" triggers="event.render">
      <li>hi [##rep.current.id|(not found!)##] [##rep.current.name|('')##] </li>
    </basis>
  </ul>
</fieldset>
<fieldset>
  <legend>Source.MergeType = append, repeater.replace = false</legend>
  <ul>
    <basis core="repeater" name="rep" datamembername="append.data" run="atclient" triggers="event.render" replace="false">
      <li>hi [##rep.current.id|(not found!)##] [##rep.current.name|('')##] </li>
    </basis>
  </ul>
</fieldset>
<script>
  let i = 0;
  function set() {
    $bc.setSource("replace.data",
      [{ id: i, name: `data ${i}` }, { id: i + 1, name: `data ${i + 1}` }],
      { mergeType: basiscore.MergeType.replace });
    $bc.setSource("append.data",
      [{ id: i, name: `data ${i}` }, { id: i + 1, name: `data ${i + 1}` }],
      { mergeType: basiscore.MergeType.append });
    i += 2;
  }
  set();
</script>
```

The first repeater always shows the two latest rows. The second one appends the complete,
growing `append.data` row set on every click of either button, so earlier rows appear several
times. Clicking "trigger" re-runs both repeaters without changing the sources.

### Nested commands reading the row

```html
<basis core="repeater" name="rep" datamembername="page.data" run="atclient">
  <basis core="group" run="atclient" options="[##rep.current.options##]">
    <fieldset>
      <legend>[##rep.current.title##]</legend>
      <basis core="print" datamembername="data.test" run="atclient">
        <layout><ul>@child</ul></layout>
        <face><script type="text/template"><li> @id - @name@</li></script></face>
      </basis>
    </fieldset>
  </basis>
</basis>
<script>
  $bc.setSource('page.data', [
    { title: "Group#1", options: { sources: { "data.test": [{ id: 1, name: "Data#1" }] } } },
    { title: "Group#2", options: { sources: { "data.test": [{ id: 3, name: "Data#3" }] } } },
  ]);
</script>
```

The nested `group` and `print` are cloned per row and run in the row's local context, where
`rep.current` is the current row object. A single-token attribute such as
`options="[##rep.current.options##]"` yields the row's `options` object itself.

### Row-scoped HTML bindings

```html
<basis core="repeater" name="item" datamembername="shop.items" run="atclient">
  <div>
    <span>[##item.current.title##]</span>
    <button name="shop.selected" bc-triggers="click" bc-value="[##item.current.id##]">Select</button>
  </div>
</basis>
<basis core="callback" run="atclient" triggers="shop.selected" method="onSelected"></basis>
<script>
  function onSelected(args) { console.log(args.source.rows[0].value); }
  $bc.setSource("shop.items", [{ id: 1, title: "A" }, { id: 2, title: "B" }]);
</script>
```

The `<button>` is processed inside the row's `LocalContext`, so clicking it publishes
`shop.selected` into that row context; the `callback` outside the repeater does not see it. To
publish to the page, handle the click in JavaScript and call `$bc.setSource` yourself, or place
the consumer inside the repeated markup.

## Pitfalls

- Without `name`, the per-row source id is `null.current` (the missing attribute reads as
  `null`); tokens such as `[##rep.current.x##]` never resolve: a text token stays empty and a
  command attribute waits forever. Always set `name`.
- Sources set from inside a row (HTML element bindings, `callback`, `api` inside the template)
  land in that row's `LocalContext` and are invisible outside the repeater.
- `replace="false"` never disposes anything until the command is disposed, and it re-renders the
  whole current row set on each run. Combined with an `append` source the output duplicates.
- The row object is published by reference. Mutating `rep.current` rows mutates the parent
  source's rows.
- The template is cloned per row, so `id` attributes inside it are duplicated and element
  references taken in `initializeAsync` of nested components point to the clone of one row only.
- The repeater is a `low` priority command; a `dbsource`/`api` that produces the iterated
  source in the same collection runs first, but a source set later by JavaScript simply
  re-triggers the repeater.
- Row contexts use the root host options (`host_options`), not the options of an enclosing
  `group`.

## Related

- [Sources and reactivity](../sources-and-reactivity.md) (merge types, `cloneOptions`)
- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md)
- [Binding and tokens](../binding-and-tokens.md)
- [HTML element binding](../html-element-binding.md)
- [group](group.md), [print](print.md), [callback](callback.md)

## Source files

- `src/component/collection/RepeaterComponent.ts`
- `src/component/SourceBaseComponent.ts`
- `src/component/CommandComponent.ts` (`content`, `setContent`)
- `src/RangeObject/RangeObject.ts`
- `src/context/LocalContext.ts`
- `src/data/Source.ts` (`cloneOptions`, row wrapping)
- `src/tsyringe.config.ts` (`ILocalContext` registration)
