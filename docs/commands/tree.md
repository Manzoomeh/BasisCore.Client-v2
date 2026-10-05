# tree

`tree` renders a flat source as a nested hierarchy. Every row carries its own id (`idcol`, default `id`) and the id of its parent (`parentidcol`, default `parentid`); rows whose parent id equals `nullvalue` (default `"0"`) are roots. Each root is rendered with a face, its children are rendered recursively and inserted at the face's `@child` placeholder, and so on until a row has no children. Faces can target a depth with `level="1"`, `level="2"` and leaf rows with `level="end"`. Use `tree` for menus, category trees, organisation charts and threaded comments delivered as a flat `id`/`parentid` table. `tree` does not read nested `children` arrays.

## Markup

```html
<basis core="tree" datamembername="local.tree" idcol="id" parentidcol="pid" nullvalue="null" run="atclient">
  <layout>
    <ul>@child</ul>
  </layout>
  <face level="end">
    <li><a href="/@name@">@id@ - @name@</a></li>
  </face>
  <face level="2">
    <li><a href="/@name@">@id - @name Level2</a><ul>@child</ul></li>
  </face>
  <face>
    <li>@id@ - @name@<ul>@child</ul></li>
  </face>
</basis>
```

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `core` | string | - | `tree` (case-insensitive, `tRee` works). |
| `run` | string | - | Must be `atclient`. |
| `datamembername` | source id | - | Source to render; lower-cased and registered as a trigger. |
| `idcol` | column name | `id` | Column holding a row's own id. |
| `parentidcol` | column name | `parentid` | Column holding the id of the row's parent. |
| `nullvalue` | string | `"0"` | Value in `parentidcol` that marks a root row. Compared loosely (`==`), so the default matches the number `0` and the string `"0"`. The special value `null` (case-insensitive) matches rows whose parent id is JavaScript `null` (strict `=== null`; `undefined` does not match). |
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

Attribute names are case-insensitive; `idcol`, `parentidcol` and `nullvalue` accept `[##...##]` tokens. The shared attributes are described in detail in [print.md](print.md#attributes).

## Child elements

| Element | Attributes | Description |
|---|---|---|
| `<face>` | `level`, `filter`, `rowtype` | Node template. `level` is a pipe-separated list of level names (`1`, `2`, `3`, ..., `end`). A face without `level` matches every node. Any other attribute on a face (for example `replace`) is ignored. |
| `<layout>` | - | Wrapper rendered once around all root nodes; `@child` marks their position. |
| `<else-layout>` | - | Rendered when the source has zero rows. |

### Levels

While a node is rendered the current level set is:

- `["<depth>"]` when the row has children (`1` for roots, `2` for their children, and so on),
- `["<depth>", "end"]` when the row has no children.

A face matches a node when its `level` is absent, or one of its values is in the current level set. `level="end"` therefore matches leaves at any depth, `level="2"` matches depth 2 nodes with or without children, and `level="1|2|end"` matches roots, depth 2 nodes and all leaves. Faces are tried in document order and the first match wins, so in the markup above a leaf at depth 2 uses the `end` face because it comes first; move the `level="2"` face above it to give depth 2 leaves the depth 2 template.

### `@child` inside a face

`@child` inside a face is replaced, before compilation, by a temporary `<basis-core-template-tag data-type="child">` element. After the face is rendered the first such element is removed and the rendered children are inserted at its position. A face without `@child` renders its node without descendants (no warning), which is the normal choice for `level="end"` faces. `@child` is matched as a case-insensitive regular expression, so a column reference beginning with `@child` (such as `@childcount`) is damaged.

## Rendering algorithm

1. If the source has zero rows, nothing is rendered and `<else-layout>` is used.
2. `parentidcol`, `idcol` and `nullvalue` are resolved.
3. Root rows are all rows whose `parentidcol` equals `nullvalue` (loose equality; the string `null` selects `=== null`).
4. If there is no root row the render throws `Error: Tree command has no root record in data member '<source id>' with '<nullvalue>' value in '<parentidcol>' column that set in NullValue attribute.` Nothing is rendered and the previous output stays.
5. For each root row, in source order, a node is rendered at depth 1: the children are selected as all rows whose `parentidcol == row[idcol]`, the level set is computed, the first matching face is rendered with the row as data, then each child is rendered the same way at depth + 1 and appended into the node's `@child` position.
6. If a row matches no face, `null` is returned for it. For a root this leaves a `null` in the results; for a child the parent's code calls `AppendTo` on `null` and the render throws. Always provide a face without `level` as a fallback.
7. All root results are placed into `<layout>` at `@child`, or appended one after another when there is no layout, and the output is inserted and re-scanned.

Children are matched with a loose comparison, so an `id` of `1` (number) links to a `pid` of `"1"` (string). Rows that are not reachable from a root (orphans, or cycles not connected to a root) are silently not rendered. A row whose own id equals `nullvalue` (for example `id: 0` with the default `nullvalue`) is its own child and recurses until the stack overflows.

Row type counting (`rowtype`) uses one counter for all roots and a fresh counter for the children of each parent; the first row processed by a counter is `even`. Placeholders (`@col@`, `@expr`, `{{ }}`) and the XML parsing of templates are as in [print.md](print.md#placeholders-inside-a-face).

## Incremental re-render

Each node's result is cached under the row's key (`row[keyFieldName]`, or the row object when the source has no key field) with the row's version. On the next render a node whose version is unchanged is re-used: its DOM nodes are moved back and its `@child` range is emptied and refilled with the (possibly re-used) children. An `append` merge that edits one row (status `1`) therefore rebuilds only that node; deleting a row (status `2`) removes it and its subtree; a `replace` merge re-renders every node whose version changed, which is every position that already existed. A position added by the replace starts at version `0`, so a key that was deleted earlier and comes back at such a position re-uses its stale cached node (versions are positional, see [../sources-and-reactivity.md](../sources-and-reactivity.md#replace-and-version-bumping)). Details in [print.md](print.md#incremental-re-render-by-key-and-version).

## Examples

### Static tree with leaf, depth 2 and fallback faces

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Tree Command - Simple</title>
</head>
<body>
  <basis core="tree" datamembername="local.tree" idcol="id" parentidcol="pid" nullvalue="null" run="atclient">
    <layout>
      <script type="text/template">
        <ul data-hi="">
          @child
        </ul>
      </script>
    </layout>
    <face level="end">
      <li data-end-like><a href="/@name@">@id@ - @name@</a></li>
    </face>
    <face level="2">
      <li>
        <a href="/@name@">@id - @name Level2</a>
        <ul>@child</ul>
      </li>
    </face>
    <face>
      <li data-else>
        @id@ - @name@
        <ul>@child</ul>
      </li>
    </face>
  </basis>

  <script>
    const host = {
      sources: {
        "local.tree": [
          { id: 1, name: "ali1",   pid: null },
          { id: 2, name: "amir",   pid: 1 },
          { id: 3, name: "hassan", pid: 1 },
          { id: 4, name: "javad",  pid: 2 },
          { id: 5, name: "reza",   pid: 4 },
        ],
      },
    };
  </script>
</body>
</html>
```

Row 1 is the only root (`pid: null`, `nullvalue="null"`). It is rendered with the fallback face; row 2 (depth 2, has children) with the `level="2"` face; row 3 (depth 2, leaf) with the `end` face because it comes first; row 4 (depth 3) with the fallback face; row 5 with the `end` face.

### Roots marked with `0`

```html
<basis core="tree" datamembername="menu.items" run="atclient">
  <layout><ul class="menu">@child</ul></layout>
  <face level="end"><li><a href="@url@">@title@</a></li></face>
  <face><li>@title@<ul>@child</ul></li></face>
</basis>
<script>
  $bc.setSource("menu.items", [
    { id: 1, parentid: 0, title: "Products", url: "/products" },
    { id: 2, parentid: 1, title: "Software", url: "/products/software" },
    { id: 3, parentid: 1, title: "Hardware", url: "/products/hardware" },
    { id: 4, parentid: 0, title: "About", url: "/about" },
  ]);
</script>
```

All defaults apply: `idcol="id"`, `parentidcol="parentid"`, `nullvalue="0"`. Two roots are rendered (a forest is allowed).

### Replace, edit and delete with live updates

```html
<input type="button" value="Set Source" onclick="setSourceHandler()" />
<input type="button" value="Edit node 4" onclick="editSourceHandler()" />
<input type="button" value="Remove node 5" onclick="removeSourceHandler()" />
<basis core="callback" triggers="local.tree" run="atclient"></basis>
<basis core="tree" datamembername="local.tree" idcol="id" parentidcol="pid" nullvalue="null" run="atclient">
  <layout>
    <ul data-hi>@child</ul>
  </layout>
  <face level="end">
    <li id="@id@">@id@ - @name@
      <button onclick="this.style['color'] = `#${Math.floor(Math.random()*0xffffff).toString(16)}`">change color</button>
    </li>
  </face>
  <face>
    <li id="@id@">@id@ - @name@
      <button onclick="this.style['color'] = `#${Math.floor(Math.random()*0xffffff).toString(16)}`">change color</button>
      <ul>@child</ul>
    </li>
  </face>
</basis>
<script>
  const host = {
    sources: {
      "local.tree": {
        data: [
          { id: 1, name: "ali-0",    pid: null, status: 0 },
          { id: 2, name: "amir-0",   pid: 1,    status: 0 },
          { id: 3, name: "hassan-0", pid: 1,    status: 0 },
          { id: 4, name: "javad-0",  pid: 2,    status: 0 },
          { id: 5, name: "reza-0",   pid: 4,    status: 0 },
        ],
        options: { keyFieldName: "id", statusFieldName: "status", mergeType: basiscore.MergeType.append },
      },
    },
  };
  var i = 1;
  const options = { keyFieldName: "id", statusFieldName: "status" };
  function setSourceHandler() {
    $bc.setSource("local.tree", [
      { id: 1, name: `ali-${i}`,    pid: null, status: 0 },
      { id: 2, name: `amir-${i}`,   pid: 1,    status: 0 },
      { id: 3, name: `hassan-${i}`, pid: 1,    status: 0 },
      { id: 4, name: `javad-${i}`,  pid: 2,    status: 0 },
      { id: 5, name: `reza-${i}`,   pid: 4,    status: 0 },
    ], { ...options, mergeType: basiscore.MergeType.replace });
    i += 1;
  }
  function editSourceHandler() {
    $bc.setSource("local.tree", [{ id: 4, name: `javad-${i}`, pid: 2, status: 1 }],
      { ...options, mergeType: basiscore.MergeType.append });
    i += 1;
  }
  function removeSourceHandler() {
    $bc.setSource("local.tree", [{ id: 5, status: 2 }],
      { ...options, mergeType: basiscore.MergeType.append });
  }
</script>
```

"Edit node 4" rebuilds only node 4 (its children are re-used), "Remove node 5" drops the leaf, and "Set Source" (a `replace`) re-renders every node whose position already existed (press it before removing node 5 to see every node rebuilt; pressed right after the removal, the re-added node 5 gets version `0` again and keeps its cached markup). After node 5 is removed, node 4 is a leaf, but its cached node (rendered with the fallback face, with an empty `<ul>`) is re-used because its own version did not change; it switches to the `end` face only after it is edited or the source is replaced.

## Pitfalls

- The default `nullvalue` is the string `"0"`. Sources whose roots have `parentid: null` render nothing and throw the "no root record" error unless `nullvalue="null"` is set. Rows whose parent column is missing (`undefined`) match neither `"0"` nor `null`.
- The "no root record" error is thrown from the render; the previous output stays and the error surfaces as an unhandled promise rejection in the console.
- A node that matches no face breaks the render (a `TypeError` while appending `null`). Keep a face without `level` as the last face.
- Face order matters: because `level="end"` is usually listed first, depth-specific faces never see leaves. Reorder the faces if leaves of a given depth need the depth template.
- `replace="true"` on a `<face>` has no effect; only `level`, `filter` and `rowtype` are read.
- Loose comparison links `1` and `"1"`, but `null`, `undefined` and `""` are different root markers; normalise the data or set `nullvalue` accordingly.
- A row whose `idcol` value equals `nullvalue` is its own child and causes infinite recursion.
- Rows not reachable from a root are dropped silently; nothing reports orphans.
- The cache is checked after a face has matched but the cached nodes are returned regardless of which face matched. A node whose version is unchanged keeps its old markup even when it became a leaf (or gained children) and a different `level` face would now apply.
- `else-layout` is used only for an empty source. A non-empty source without roots is an error, not an else case.
- `@child` is a regular-expression replacement; avoid column names starting with `child` inside faces.
- Templates are XML: `<br>`/`<img>` without `/>` and raw table rows need a `<script type="text/template">` wrapper (see [print.md](print.md#templates-are-xml)).
- `OnProcessed` is never called; `if` becoming false does not clear earlier output; `$bc` inside `{{ }}` is the context object. See [print.md](print.md#pitfalls).

## Related

- [print.md](print.md) - shared attributes, face selection, placeholders, templates, caching
- [view.md](view.md) - two-level grouping by one column
- [list.md](list.md)
- [callback.md](callback.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md) - `replace`/`append`, key and status fields
- [../binding-and-tokens.md](../binding-and-tokens.md)
- [../command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md)
- [../troubleshooting.md](../troubleshooting.md)

## Source files

- `src/component/renderable/TreeComponent.ts`
- `src/component/renderable/base/RenderableComponent.ts`
- `src/component/renderable/base/RenderParam.ts`
- `src/component/renderable/base/FaceCollection.ts`
- `src/component/renderable/base/RawFaceCollection.ts`
- `src/component/renderable/base/RawFace.ts`
- `src/component/renderable/base/TreeFaceRenderResult.ts`
- `src/component/renderable/base/FaceRenderResultRepository.ts`
- `src/data/DataUtil.ts`
- `src/component/SourceBaseComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/extension/StringExtensions.ts`
