# view

`view` renders a flat source as two levels. Rows are grouped by the value of one column (`groupcol`, default `prpid`); for every group a level 1 face is rendered once with the first row of the group as its data, and a level 2 face is rendered for every row of the group. The level 2 output is inserted at the `@child` placeholder of the level 1 output. `view` is not a single-record display: it renders every group and every row. Use it for property/value lists, question/answer blocks, "header plus items" sections, or any master/detail layout that comes from one denormalized result set.

## Defect in 2.39.6: level 2 faces are not rendered

In this version a `view` renders the level 1 face of every group with an empty `@child` slot; the level 2 rows never appear and no error is logged. The render cache stores the level 1 result under the group's first row, the level 2 pass over that same row takes the cached level 1 result as its own, and the children fragment ends up in a detached wrapper (details in [../troubleshooting.md](../troubleshooting.md)). The behaviour described on the rest of this page is what the command is designed to do and what its code attempts; until the defect is fixed, build grouped output with a `print` whose `OnProcessing` hook groups the rows, or with nested `print` commands inside a [repeater](repeater.md).

## Markup

```html
<basis core="view" datamembername="local.user" groupcol="prpid" run="atclient">
  <face level="1">
    <ul>
      <li>@question <ul>@child</ul></li>
    </ul>
  </face>
  <face level="2">
    <li>@answer@</li>
  </face>
</basis>
```

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `core` | string | - | `view`. |
| `run` | string | - | Must be `atclient`. |
| `datamembername` | source id | - | Source to render; lower-cased and registered as a trigger. |
| `groupcol` | column name | `host.settings["default.viewcommand.groupcolumn"]`, which is `prpid` | Column whose value defines the groups. When the attribute is absent the setting is read from the host options (setting names are case-insensitive). |
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

Attribute names are case-insensitive. The semantics of the shared attributes are described in [print.md](print.md#attributes).

## Child elements

| Element | Attributes | Description |
|---|---|---|
| `<face>` | `level`, `filter`, `rowtype` | Row template. `level` is a pipe-separated list of level names; `view` uses the levels `1` and `2`. A face without `level` matches both levels. |
| `<layout>` | - | Wrapper rendered once around all level 1 results; `@child` marks their position. |
| `<else-layout>` | - | Rendered when the source has no rows or no group produced a level 1 result. |

### `@child` inside a face

In `view` (and `tree`) the text `@child` inside a face is replaced, before the face is compiled, by a temporary `<basis-core-template-tag data-type="child">` element. After the level 1 face is rendered, the first such element in its output is located, removed, and the level 2 nodes of the group are inserted at that position. A level 1 face without `@child` renders without its children (no warning). `@child` inside a level 2 face is removed and renders nothing. Because the replacement is a case-insensitive regular expression on `@child`, a column reference such as `@children` or `@childcount` inside a face would be broken; rename such columns or read them through `{{ $data.children }}`.

## Rendering algorithm

1. If the source has zero rows the result is empty and `<else-layout>` is used.
2. The group column name is resolved from `groupcol` or the host setting.
3. The distinct values of that column are collected in first-appearance order (strict equality).
4. For each group value, the group's rows are selected with a loose comparison (`row[groupcol] == value`; the string `"null"` matches `null`).
5. Level 1: the faces are searched with the current level set to `["1"]` and the **first row of the group** as data. The first face whose filter result contains that row, whose `rowtype` matches (or is unset) and whose `level` contains `1` (or is unset) is rendered. If no face matches, the whole group is skipped, including its level 2 rows.
6. Level 2: with the level set to `["2"]`, every row of the group is rendered through the first matching face, in source order, and the results are concatenated in a fragment. Every row must match some level 2 face; a row that matches none makes the render fail with a `TypeError` (see Pitfalls).
7. The fragment is placed at the `@child` position of the level 1 result.
8. All level 1 results are placed into `<layout>` at `@child`, or appended one after another when there is no layout, and the output is inserted and re-scanned.

Row type counting (`rowtype="odd|even"`) runs per render parameter: one counter for all level 1 rows, and a fresh counter for the level 2 rows of each group. As in `print`, the first row processed by a counter is `even`.

Placeholders inside faces are the same as in `print`: `@column@`, `@expression`, and `{{ }}` blocks with `$data` bound to the row and `$bc` bound to the context object. Face templates are parsed as XML; wrap templates containing table rows or void elements in `<script type="text/template">` (see [print.md](print.md#templates-are-xml)).

## Incremental re-render

Level 1 results are cached under the key of the group's first row in a separate `root` group of the cache; level 2 results are cached under each row's key. A cached result is re-used when the row's version has not changed, so an `append` merge that edits one row (status `1`) re-renders only that row's level 2 node and, if the row is the first of its group, its level 1 node; all other DOM nodes are moved back into place with their state intact. A `replace` merge bumps every version and re-renders everything. The key is `row[keyFieldName]` when the source has a key field, otherwise the row object itself. See [print.md](print.md#incremental-re-render-by-key-and-version).

## Examples

### Questions with their answers

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>View Command - Simple</title>
</head>
<body>
  <basis core="callback" triggers="local.user" run="atclient"></basis>
  <basis core="view" datamembername="local.user" run="atclient">
    <face level="1">
      <ul>
        <li>@question <ul>@child</ul></li>
      </ul>
    </face>
    <face level="2">
      <li>
        @answer {{ return await fn($bc, $data); }}
      </li>
    </face>
  </basis>

  <script>
    $bc.setSource("local.user", [
      { id: 1, question: "FaName", answer: "ali",    prpid: "1", tags: ["A", "C", "D"] },
      { id: 2, question: "FaName", answer: "amir",   prpid: "1", tags: ["A", "B", "E"] },
      { id: 3, question: "FaName", answer: "hassan", prpid: "1", tags: ["E", "D"] },
      { id: 4, question: "EnName", answer: "Amir",   prpid: "2", tags: ["F", "A"] },
      { id: 5, question: "EnName", answer: "Ali",    prpid: "2", tags: ["D", "B", "A"] },
    ]);

    async function fn(_, $data) {
      const lis = $data.tags.sort().reduce((total, tag) => total += `<li>${tag}</li>`, "");
      return `${$data.prpid}<ul>${lis}</ul>`;
    }
  </script>
</body>
</html>
```

The default group column `prpid` produces two groups. The intended output is "FaName" once (from row 1) with three `<li>` children and "EnName" once with two; in 2.39.6 both headers render with an empty `<ul>` (see the defect note above). The `{{ }}` block returns markup that becomes part of the level 2 template text before XML parsing.

### Editing one row of a group

```html
<input type="button" value="Edit row 5" onclick="clickHandler()" />
<basis core="view" datamembername="local.user" groupcol="prpid" run="atclient">
  <face level="1">
    <script type="text/template">
      <ul data-l1="">
        <li>@question :
          <button onclick="this.style['color'] = `#${Math.floor(Math.random()*0xffffff).toString(16)}`">change color</button>
          <ul>@child</ul>
        </li>
      </ul>
    </script>
  </face>
  <face level="2">
    <li data-l2="">
      @answer
      <button onclick="this.style['color'] = `#${Math.floor(Math.random()*0xffffff).toString(16)}`">change color</button>
    </li>
  </face>
</basis>
<script>
  const host = {
    sources: {
      "local.user": {
        data: [
          { id: 1, question: "FaName", answer: "ali",  prpid: "1", status: 0 },
          { id: 2, question: "FaName", answer: "amir", prpid: "1", status: 0 },
          { id: 4, question: "EnName", answer: "Amir", prpid: "2", status: 0 },
          { id: 5, question: "EnName", answer: "Ali",  prpid: "2", status: 0 },
        ],
        options: {
          keyFieldName: "id",
          statusFieldName: "status",
          mergeType: basiscore.MergeType.append,
        },
      },
    },
  };
  function clickHandler() {
    $bc.setSource("local.user",
      { id: 5, question: "EnName", answer: "Ali-edited", prpid: "2", status: 1 },
      { keyFieldName: "id", statusFieldName: "status", mergeType: basiscore.MergeType.append });
  }
</script>
```

Click some "change color" buttons, then "Edit row 5": the intended result is that only the `<li>` of row 5 is rebuilt while every other node, including both level 1 headers, keeps its colour. In 2.39.6 the level 2 rows are not rendered at all (see the defect note above).

### A highlighted group and a fallback face

```html
<basis core="view" datamembername="product.info" groupcol="prpid" run="atclient">
  <face level="1" filter="prpid = '2'">
    <div class="highlight"><span>@question@:</span> @child</div>
  </face>
  <face level="1">
    <div><span>@question@:</span> @child</div>
  </face>
  <face level="2">
    <span>@answer@, </span>
  </face>
  <else-layout>
    <p>nothing to show</p>
  </else-layout>
</basis>
```

Faces are tried in document order, so the filtered level 1 face must come before the general one. The filter is SQL and needs the client-side SQL library (`host.dbLibPath`). The column is written `@question@` because the open form `@question` would run on to the next whitespace and take `:</span>` as part of the expression.

## Pitfalls

- In 2.39.6 the level 2 faces never appear in the output (see the defect note at the top of this page).
- `view` renders every group and every row; it is not a detail view of one record. To show one record, filter the source in `OnProcessing` or use a face `filter`.
- The level 1 face sees only the **first row** of each group. Columns that vary inside a group show the first row's value in the header.
- A row that matches no level 2 face (for example because of a `filter`) makes the render throw `TypeError: Cannot read properties of null (reading 'key')`; previously rendered output remains. Keep an unfiltered level 2 face as a fallback, or filter rows in `OnProcessing`.
- A group whose first row matches no level 1 face is silently skipped together with all its rows.
- A face without `level` matches both levels and, being tried in document order, can shadow the faces after it. Put specific faces first.
- `groupcol` defaults to `prpid`; with another column name and no `groupcol`, every row whose `prpid` is `undefined` falls into one single group (the distinct value `undefined`), and the level 1 face sees the first row of the source.
- The `@child` replacement is a plain regular expression; any `@child...` text inside a face is affected, not just the placeholder.
- `$bc` inside `{{ }}` is the context object, not the global wrapper; the example passes it to a function and ignores it.
- `OnProcessed`, `if` not clearing output, XML template parsing and the other shared pitfalls in [print.md](print.md#pitfalls) apply.

## Related

- [print.md](print.md) - shared attributes, face selection, placeholders, templates, caching
- [tree.md](tree.md) - recursive hierarchy from `id`/`parentid` columns
- [list.md](list.md)
- [callback.md](callback.md)
- [../host-configuration.md](../host-configuration.md) - `host.settings["default.viewcommand.groupcolumn"]`
- [../sources-and-reactivity.md](../sources-and-reactivity.md)
- [../binding-and-tokens.md](../binding-and-tokens.md)
- [../command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md)
- [../client-side-sql.md](../client-side-sql.md)

## Source files

- `src/component/renderable/ViewComponent.ts`
- `src/component/renderable/base/RenderableComponent.ts`
- `src/component/renderable/base/RenderParam.ts`
- `src/component/renderable/base/FaceCollection.ts`
- `src/component/renderable/base/RawFaceCollection.ts`
- `src/component/renderable/base/RawFace.ts`
- `src/component/renderable/base/TreeFaceRenderResult.ts`
- `src/component/renderable/base/FaceRenderResultRepository.ts`
- `src/data/DataUtil.ts`
- `src/token/TokenUtil.ts`
- `src/options/HostOptions.ts`
- `src/component/SourceBaseComponent.ts`
- `src/component/ElementBaseComponent.ts`
