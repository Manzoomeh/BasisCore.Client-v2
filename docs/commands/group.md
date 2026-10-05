# group

`group` wraps a block of markup in its own scope. The block gets a child dependency container and
a `LocalRootContext`: sources published inside the block stay local to it, sources of the
enclosing context are still visible, and the `options` attribute can replace host settings (for
example the binding regex, connections or inline `sources`) for that block only. Combined with
`if` it also works as a show/hide region whose content is removed from the DOM while hidden and
rebuilt when shown again.

## Attributes

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | `group` | required | Command name. |
| `run` | `atclient` | required | Only `run="atclient"` elements are processed. |
| `options` | JavaScript expression or token | none | Evaluated with `eval` and deep-merged over the options the enclosing runtime was created with. The result becomes the `IHostOptions` of the group's context. |
| `if` | boolean expression (token) | shown | When it evaluates to false the content is removed and the local context disposed; when it becomes true again the saved child nodes are re-inserted and processed. |
| `triggers`, `events`, `OnRendering`, `OnRendered`, `ignoreNullSource` | common | | See [Command attributes and lifecycle](../command-attributes-and-lifecycle.md). |

`group` has the default priority (`low`), so it runs after `call` and after the source commands of
the same collection.

## How it works

### Construction

When the command is created, the `<basis core="group">` element is taken out of the document and
replaced by two empty text nodes that mark the command's range. The constructor copies the
element's child nodes into an array (`childNodes`) and immediately moves them into the range, so
the block's markup is visible at its original place before the group has run.

### Each run

`runAsync` performs these steps:

1. If the group is currently hidden, the saved child nodes are placed back into the range.
2. The `LocalRootContext` of the previous run, if any, is disposed (it unsubscribes from the
   parent context).
3. A child container is created from the command's container and registers `parent.context`
   (the enclosing context), `dc` (itself) and `parent.dc`.
4. If `options` has a value, `eval(options)` is deep-merged with `defaultsDeep` over
   `context.options.originalOptions` and registered as `IHostOptions`. `originalOptions` is the
   options object the enclosing runtime was created with: the argument of `$bc.setOptions(...)`,
   an empty object for an auto-rendered page, or the merged object of an outer group. The library
   defaults, including the global `host` object, are merged in afterwards by `HostOptions`, so
   the precedence is group `options`, then the enclosing options, then `host`, then the built-in
   defaults.
5. A `LocalRootContext` is resolved from the child container and registered as `context`.
6. A new `ComponentCollection` is resolved from the child container and processes the saved child
   nodes. The collection is kept in an internal list.

Every run therefore creates a new context and a new collection. Previous collections are not
disposed on a re-run or on hide; they are disposed together when the group itself is disposed.

### What a `LocalRootContext` gives you

`LocalRootContext` extends `RootContext`, so a group owns:

- its own source repository. `setAsSource` calls made inside the block (by `callback`, an
  `<input bc-triggers>` or an `api` command) write to the local repository and are not seen by
  commands outside the group. `tryToGetSource` looks in the local repository first and falls back
  to the enclosing context, so outer sources remain readable.
- a subscription to the owner's `onDataSourceSet` event: when a source is set in the enclosing
  context, any local copy with the same id is deleted and the handlers inside the group are
  triggered, so inner commands see the new outer value.
- its own `ConnectionOptionsManager` built from the merged `settings`, so connections (including
  `callcommand`) can be redefined per group.
- the `sources` entry of the merged options, published into the local repository at creation.
- its own `settings`, read by the inner `ComponentCollection` and `TokenUtil` for
  `default.binding.regex` and `default.binding.codeblock-regex`, by `print`/`list`/`view`/`tree`
  for their defaults, and so on.

### `options` evaluation details

The attribute value is read as a string token and passed to `eval`. Two forms work:

- a global variable name or an inline object literal, for example `options="groupOptions"` or
  `options="({ debug: true })"`;
- a single binding token that resolves to an object, for example
  `options="[##rep.current.options##]"`. A single-token attribute returns the row value itself,
  not a string, and `eval` of a non-string value returns the value unchanged.

A string that is not valid JavaScript throws from `eval` and the run fails.

### Hiding

When `if` evaluates to false (or `OnRendering` sets `prevent`), `hideAsync` disposes the local
context and deletes the range content. The saved child nodes stay referenced by the command and
are re-inserted on the next run with a true `if`.

### `processNodesAsync(nodes)`

`GroupComponent` exposes `processNodesAsync(nodes: Node[]): Promise<IComponentCollection>`. It
resolves one more `ComponentCollection` from the group's current container (so the nodes are
processed in the group's context and with its options), runs it over `nodes`, keeps it for
disposal and returns it. Reach a group instance from JavaScript through the command list, for
example `$bc.global.GetCommandListByCore("group")[0]`.

### Disposal

`disposeAsync` disposes the local context, all collections created by this group (which disposes
every component inside them) and calls `clearInstances()` on the child container.

## Examples

### Plain scope

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="/basiscore.js"></script>
  <title>Group Command - Simple</title>
</head>
<body>
  <basis core="group" run="atclient" if="true">
    <h1>Group start</h1>
    <Basis core="print" datamembername="local.print" run="atclient">
      <face>
        <li><span>@id ( @name ) </span></li>
      </face>
    </Basis>
    <h1>Group end</h1>
  </basis>
  <script>
    $bc.setSource("local.print", [
      { id: 1, name: "btn-t=1" },
      { id: 2, name: "btn-t=2" },
      { id: 3, name: "btn-t=3" },
    ]);
  </script>
</body>
</html>
```

### Local sources do not leak upwards

```html
<basis core="group" run="atclient">
  <h1>Group 1 start</h1>
  <Basis core="print" datamembername="local.name" run="atclient">
    <face><li><span>@value </span></li></face>
  </Basis>

  <basis core="group" run="atclient">
    <h1>Group 2 start</h1>
    [##local.name.value|(not set)##]
    <form bc-triggers="submit" name="local.name">
      <label>Name: <input type="text" name="value" value="[##local.name.value##]" bc-triggers="change" /></label>
      <input type="submit" />
    </form>
    <basis core="group" run="atclient">
      <h1>Group 3 start</h1>
      [##local.name.value|(not set)##]
      <h1>Group 3 end</h1>
    </basis>
    <h1>Group 2 end</h1>
  </basis>

  <label>Name: <input type="text" name="local.name" bc-triggers="keyup" /></label>
  <h1>Group 1 end</h1>
</basis>
<script>
  $bc.setSource("local.name", "default");
</script>
```

Submitting the form inside group 2 publishes `local.name` into group 2's repository: group 2 and
group 3 update, the `print` in group 1 does not. Typing in the group 1 input publishes into group
1, which propagates down to groups 2 and 3 and removes their local copy.

### Show and hide with `if`

```html
current state is : [##local.group.value##]
<br />
<input type="button" value="show/hide group" onclick="fn()" />
<basis core="group" run="atclient" triggers="local.group" if="[##local.group.value##]">
  <h1>Group start</h1>
  <Basis core="print" datamembername="local.print" run="atclient">
    <face><li><span>@id ( @name ) </span></li></face>
  </Basis>
  <h1>Group end</h1>
</basis>
<script>
  var show = true;
  function fn() {
    show = !show;
    $bc.setSource("local.group", show);
  }
  $bc.setSource("local.print", [
    { id: 1, name: "btn-t=1" },
    { id: 2, name: "btn-t=2" },
  ]);
  $bc.setSource("local.group", show);
</script>
```

`$bc.setSource("local.group", false)` wraps the boolean as `{ value: false }`; the `if` token
resolves to `false`, the content is removed and the local context disposed. Setting it back to
`true` re-inserts the saved nodes and processes them again.

### Per-group binding syntax and sources

```html
use [## => [##cms.cms.time##]
<br />
user => [##app.user.name|(no user)##]
<basis core="group" run="atclient" options="groupOptions">
  <h1>Group#1 start</h1>
  use { => {cms.cms.time}
  <br />
  user => {app.user.name|(no user)}
  <basis core="group" run="atclient" options='groupOptions1'>
    <h1>Group#1.1 start</h1>
    use {# => {#cms.cms.time#}
    <br />
    user => {#app.user.name|(no user)#}
    <h1>Group#1.1 end</h1>
  </basis>
  <h1>Group#1 end</h1>
</basis>
<script>
  const groupOptions = {
    debug: true,
    settings: { "default.binding.regex": /\{([^\{\}]*)\}/ },
    sources: { "app.user": [{ id: 1, name: "user#1" }] },
  };
  const groupOptions1 = {
    settings: { "default.binding.regex": "\\{#([^\\{#\\}]*)#\\}" },
  };
</script>
```

Outside the groups only `[##…##]` is a token. Inside group 1 the regex is `{…}`; inside group
1.1 it is `{#…#}` while `app.user` is still inherited from group 1 through the parent fallback.
A regex may be given as a `RegExp` or as a string.

### Options coming from a repeater row

```html
<basis core="repeater" name="rep" datamembername="page.data" run="atclient" replace="false">
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
    { title: "Group#1", options: { sources: { "data.test": [{ id: 1, name: "Data#1" }, { id: 2, name: "Data#2" }] } } },
    { title: "Group#2", options: { sources: { "data.test": [{ id: 3, name: "Data#3" }, { id: 4, name: "Data#4" }] } } },
  ]);
</script>
```

Each row builds a group whose `sources` option publishes a different `data.test` into that
group's own repository.

## Pitfalls

- `options` is evaluated with `eval`. The value must be a JavaScript expression (a global name,
  an object literal in parentheses) or a single token resolving to an object. JSON text such as
  `options='{"debug":true}'` is a block statement to `eval` and throws.
- `originalOptions` is the raw options object the enclosing runtime was created with, not the
  effective settings. For an auto-rendered page it is `{}`; the global `host` object is merged in
  afterwards by `HostOptions`, so `host` values are still inherited.
- Old collections are not disposed on a re-run or when the group hides. Their components keep
  their source handlers until the group is disposed. Prefer `if` for show/hide and avoid
  `triggers` on a group unless the content really must be rebuilt.
- A `repeater` nested inside a group creates row contexts of type `LocalContext`, which take
  their options from the root runtime (`host_options`), not from the group. A binding regex
  overridden by the group does not apply to the repeater's rows.
- The source handlers of inner components are registered in the local repository. Sources set in
  the outer context reach them only through the owner subscription, which `hideAsync` removes:
  a hidden group does not react until it is shown again.
- Only the original top-level child nodes are saved for re-showing. A text node written directly
  under the group that contains a token is split into several nodes on the first run (the token
  gets its own range), and the extra nodes are deleted on hide and not re-inserted. Wrap such
  text in an element (`<span>[##x.y##]</span>`) when the group is shown and hidden with `if`.
- Even a wrapped token is only preserved, not revived: the first run replaced its text with a
  value node whose handler belongs to the local context that `hideAsync` disposed, so after the
  group is shown again the token keeps its last value and ignores later publications. Rebuild
  dynamic text with a `print` or `repeater` inside the group when it is toggled with `if`.
- Every show creates a new `LocalRootContext`, which republishes `host.sources` into the group's
  repository. An inner command re-created at that moment shows the `host` value until the page
  publishes the same source id again.
- A re-run through `triggers` while the group is visible processes the saved child nodes again
  without re-inserting them: the inner `<basis>` elements still live in the previous run's
  extracted fragment, so the new components render into that detached fragment and the visible
  output freezes (later publications update only the invisible copy). Use `if` for show and hide
  and avoid `triggers` on a group.

## Related

- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md)
- [Sources and reactivity](../sources-and-reactivity.md)
- [Host configuration](../host-configuration.md)
- [Binding and tokens](../binding-and-tokens.md)
- [repeater](repeater.md), [call](call.md), [callback](callback.md)
- [User-defined components](../user-defined-components.md) (container tokens)

## Source files

- `src/component/collection/GroupComponent.ts`
- `src/context/LocalRootContext.ts`
- `src/context/RootContext.ts`
- `src/context/Context.ts`
- `src/repository/Repository.ts` (`setSourceFromOwner`)
- `src/options/HostOptions.ts` (`originalOptions`, defaults merge)
- `src/ComponentCollection.ts`
- `src/component/ElementBaseComponent.ts` (`if`, `hideAsync`)
- `src/RangeObject/RangeObject.ts`
