# list

`list` renders the rows of a source exactly like [`print`](print.md) and adds one feature: a `<divider>` template that is inserted after every `rowcount` rendered rows, together with an `<incomplete>` template that pads the last group so that every group has the same number of cells. It is not a paginated list and has no page size; it renders every row that matches a face. Use `list` for grids whose rows must be closed and reopened every N cells (card rows, galleries, thumbnail strips). Without a `<divider>`, `list` behaves identically to `print`.

## Markup

```html
<basis core="list" datamembername="local.data" run="atclient">
  <layout>
    <div>@child</div>
  </layout>
  <face>
    <span>@id@</span>
  </face>
  <divider rowcount="4">
    <script type="text/template"></div><div></script>
  </divider>
  <incomplete>
    <span>x</span>
  </incomplete>
  <else-layout>empty</else-layout>
</basis>
```

## Attributes

`list` has no attributes of its own. All attributes come from the shared base classes and behave as described in [print.md](print.md).

| Name | Type | Default | Description |
|---|---|---|---|
| `core` | string | - | `list`. |
| `run` | string | - | Must be `atclient`. |
| `datamembername` | source id | - | Source to render; lower-cased and registered as a trigger. |
| `triggers` | space-separated source ids | - | Additional sources that cause a re-render. |
| `if` | JavaScript expression | - | Skip rendering when false; earlier output is not removed. |
| `ignoreNullSource` | boolean | `false` | Skip the initial render that is not caused by a source. |
| `events` | `target.event` list | - | DOM events (`document.*`, `window.*`, `timer.<ms>`, `<selector>.<event>`) that cause a re-render. |
| `preventDefault`, `stopPropagation` | boolean | `false` | Applied to the events above. |
| `OnRendering` | function expression | - | `{ context, node, source, prevent }`; set `prevent = true` to skip. |
| `OnProcessing` | function expression | - | `{ context, node, source }`; replace `source` to render other rows. |
| `OnRendered` | function expression | - | `{ context, node, source, result }`; `result` is the array of generated nodes. |
| `OnProcessed` | function expression | - | Parsed but never invoked by this command. |
| `processRenderedContent` | boolean | `true` | Re-scan the output for nested commands, `bc-triggers` elements and tokens. |

Attribute names are case-insensitive. Any other attribute on the element (for example `idcol`, which appears in one of the shipped list examples) is ignored.

## Child elements

| Element | Attributes | Description |
|---|---|---|
| `<face>` | `filter`, `rowtype` | Row template; first matching face wins. Same placeholder syntax as `print` (`@col@`, `@expr`, `{{ }}`). Do not use `level` here. |
| `<layout>` | - | Wrapper rendered once; `@child` marks the row position. |
| `<else-layout>` | - | Rendered when no row was rendered. |
| `<divider>` | `rowcount` | Template inserted after every `rowcount` rendered rows. Taken as raw text: the script's text when wrapped in `<script type="text/template">`, otherwise the element's `innerHTML`. Tokens in it are resolved. |
| `<incomplete>` | - | Template for each padding cell of the last, incomplete group. Parsed like a face template (XML). |

Face selection (filter, odd/even row type), placeholders, the XML parsing of face templates, the `<script type="text/template">` rule, keyed caching of row results and the re-scan of the output are identical to `print`; see [print.md](print.md).

## Divider and incomplete algorithm

The divider path is taken only when a `<divider>` element exists and at least one row was rendered. Otherwise `list` falls through to the `print` logic (layout, or else-layout when nothing was rendered).

1. The divider template string and the integer `rowcount` are read. A counter `index` is set to `rowcount`.
2. For every rendered row, in order, a placeholder element is appended to a content string and `index` is decremented. When `index` reaches 0 the divider template is appended as raw text and `index` is reset to `rowcount`. A divider is therefore emitted after every complete group, including the last one when the row count is an exact multiple of `rowcount`.
3. After the loop, if `0 < index < rowcount` the last group is incomplete. For each missing cell a placeholder is appended and a clone of the `<incomplete>` template is pushed onto the list of render results, until the group is complete. No divider follows an incomplete group.
4. If a `<layout>` exists, `@child` in the layout is replaced by the whole content string (placeholders and dividers) and the result is parsed as HTML. Without a layout the content string itself is parsed as HTML.
5. Each placeholder is replaced, in order, by the nodes of the corresponding render result (rows first, then the padding cells).
6. The fragment is inserted and, with `processRenderedContent`, re-scanned.

Because dividers are concatenated as text before the HTML parse, a divider may be a fragment that closes and reopens a wrapper, such as `</div><div>`. With 9 rows and `rowcount="4"` the example above produces three `<div>` rows: 4 cells, 4 cells, then 1 real cell and 3 `x` cells. With 8 rows it produces two full rows followed by an empty third `<div>` (the trailing divider).

When `<incomplete>` is absent, nothing visible is inserted for the padding positions: an empty `<div>` is used internally as the template and only its child nodes, of which there are none, are copied. The padding results have no key and are never cached.

If `rowcount` is missing or not a number, no divider and no padding is ever emitted (the counter never reaches 0), but the HTML-parse path is still used for the layout.

## Examples

### Grid of four cells per row

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>List Command - Divider</title>
</head>
<body>
  <basis core="list" datamembername="local.data" run="atclient">
    <layout>
      <div class="row">@child</div>
    </layout>
    <face>
      <span class="cell">@id@</span>
    </face>
    <divider rowcount="4">
      <script type="text/template"></div><div class="row"></script>
    </divider>
    <incomplete>
      <span class="cell empty">x</span>
    </incomplete>
    <else-layout>empty</else-layout>
  </basis>

  <script>
    const host = { dbLibPath: "/alasql.min.js" };
    $bc.setSource("local.data", [
      { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
      { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 },
    ]);
  </script>
</body>
</html>
```

### Appending, editing and deleting rows

```html
<input type="button" value="Set Source" onclick="clickHandler()" />
<Basis core="list" datamembername="local.print" run="atclient">
  <layout>
    <div>@child</div>
  </layout>
  <face filter="id < 12">
    <span onclick="this.style['color'] = `#${Math.floor(Math.random()*0xffffff).toString(16)}`">@id ( @name ) </span>
  </face>
  <else-layout> empty </else-layout>
  <divider rowcount="4">
    <script type="text/template"></div><div></script>
  </divider>
  <incomplete>
    <script type="text/template">
      <img src="#" />
      x
    </script>
  </incomplete>
</Basis>
<basis core="callback" triggers="local.print" run="atclient"></basis>
<script>
  const host = { dbLibPath: "/alasql.min.js" };
  var i = 0;
  function clickHandler() {
    const rows = [];
    if (i >= 15) {
      rows.push({ id: i - 15, status: 2 });          // delete
    } else {
      rows.push({ id: i, name: `btn-t=${i}`, status: 0 }); // add
    }
    $bc.setSource("local.print", rows, {
      keyFieldName: "id",
      statusFieldName: "status",
      mergeType: basiscore.MergeType.append,
    });
    i += 1;
  }
  clickHandler();
</script>
```

Each click appends one keyed row; the rows already on screen are re-used from the cache, so a colour chosen with a click survives the next render. Rows with `id >= 12` are excluded by the face filter. From the 16th click on, rows are deleted (status `2`). The `callback` command logs the source on every change.

### A plain list without divider

```html
<Basis core="list" datamembername="local.print" run="atclient">
  <face filter="id < 12">
    <span>@id ( @name )</span>
  </face>
  <else-layout>
    <span>empty</span>
  </else-layout>
</Basis>
```

This is equivalent to the same markup with `core="print"`.

## Pitfalls

- `list` is not paginated. There is no `pagesize` attribute and no paging UI; rendering a page of a large source is done in `OnProcessing` (for example `select top 10 * from ?` with `$bc.util.source.runSqlAsync`), exactly as with `print`.
- When a `<divider>` is present, the `<layout>` must be plain markup. A layout wrapped in `<script type="text/template">` is parsed by the HTML parser in this path, which keeps the script's content as text; the placeholders are then not elements and the render throws `TypeError` on `selectNode`. In `print`, and in `list` without a divider, the script-wrapped layout works.
- Faces and `<incomplete>` are still parsed as XML; a `<br>` or `<img>` without `/>` in a plain face produces a parse error. Use `<script type="text/template">` for such templates.
- A trailing divider is emitted when the number of rendered rows is an exact multiple of `rowcount`; with the `</div><div>` idiom this leaves an empty wrapper at the end.
- `rowcount` is read with `parseInt`; a missing or non-numeric value silently disables dividing and padding.
- Padding cells are inserted only when a `<divider>` exists; `<incomplete>` alone has no effect.
- The rules for `if`, `OnProcessed`, `rowtype` counting, `level`, `@` expressions and the cache listed under [print.md](print.md#pitfalls) apply unchanged.

## Related

- [print.md](print.md) - the shared rendering model
- [view.md](view.md), [tree.md](tree.md) - the other renderable commands
- [callback.md](callback.md) - log a source on every change
- [../sources-and-reactivity.md](../sources-and-reactivity.md) - `append` merges with key and status fields
- [../client-side-sql.md](../client-side-sql.md) - face filters and paging in `OnProcessing`
- [../binding-and-tokens.md](../binding-and-tokens.md)
- [../command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md)

## Source files

- `src/component/renderable/ListComponent.ts`
- `src/component/renderable/base/RenderableComponent.ts`
- `src/component/renderable/base/RawFaceCollection.ts`
- `src/component/renderable/base/FaceCollection.ts`
- `src/component/renderable/base/RenderParam.ts`
- `src/component/renderable/base/FaceRenderResult.ts`
- `src/component/renderable/base/FaceRenderResultRepository.ts`
- `src/component/SourceBaseComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/extension/ElementExtensions.ts`
- `src/wrapper/UtilWrapper.ts`
- `src/Util.ts`
