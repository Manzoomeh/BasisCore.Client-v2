# print

`print` is the general row renderer of BasisCore Client. It reads one source (a data member), picks a `<face>` template for every row, renders each row to DOM nodes, optionally wraps all of them in a `<layout>`, and falls back to `<else-layout>` when nothing was rendered. It re-renders whenever its source (or any source named in `triggers`) is set again, and it re-uses the DOM nodes of rows whose key and version have not changed. Use `print` for any flat repetition: table bodies, cards, option lists, menus, badges. `list`, `view` and `tree` are built on the same base class and share everything described here.

## Markup

```html
<basis core="print" datamembername="inlinesource.print" run="atclient">
  <layout>
    <ul>@child</ul>
  </layout>
  <face filter="id < 3" rowtype="odd">
    <li class="odd">@id - @name</li>
  </face>
  <face>
    <li>@id - @name</li>
  </face>
  <else-layout>
    <p>no rows</p>
  </else-layout>
</basis>
```

Only `<basis>` elements with `run="atclient"` (any letter case) are processed by the browser. The `core` value is case-insensitive and is resolved from its first dot-separated segment, so `core="print"` and `core="Print"` are the same command.

When the component is created the whole `<basis>` element is removed from the document and replaced by two empty text nodes that mark the output range. Every render replaces the content between those markers.

## Attributes

HTML attribute names are case-insensitive (the DOM lowercases them), so `OnProcessing`, `onprocessing` and `processrenderedcontent` all work. Every attribute value may contain `[##source.member.column##]` tokens and `{{ }}` code blocks; they are resolved before the value is used (see [../binding-and-tokens.md](../binding-and-tokens.md)).

| Name | Type | Default | Description |
|---|---|---|---|
| `core` | string | - | `print`. |
| `run` | string | - | Must be `atclient`, otherwise the element is ignored by the client. |
| `datamembername` | source id | - | Id of the source to render, for example `inlinesource.print`. The value is lower-cased and registered as a trigger, so the command renders again every time this source is set. |
| `triggers` | space-separated source ids | - | Additional sources that trigger a re-render. The data still comes from `datamembername`. Needed when a `<face filter>` or a template token depends on another source. |
| `if` | JavaScript expression | - | Evaluated before every render after token resolution. `false` skips rendering (see Pitfalls: previously rendered output is not removed). A throwing expression is treated as `false`. |
| `ignoreNullSource` | boolean | `false` | When `true`, a render that is not caused by a source (the initial pass after page load) is skipped entirely, including the `if` check. The command then renders only when a trigger fires. |
| `events` | space-separated `target.event` | - | DOM events that trigger a re-render: `document.click`, `window.resize`, `timer.1000` (milliseconds, `setInterval`), or `<css selector>.<event>` such as `#refresh.click`. Selector listeners are attached only to elements that exist when the component initializes. |
| `preventDefault` | boolean | `false` | With `events`: call `preventDefault()` on the event. |
| `stopPropagation` | boolean | `false` | With `events`: call `stopPropagation()` on the event. |
| `OnRendering` | function expression | - | Called before rendering with `{ context, node, source, prevent }`. Set `callbackArgument.prevent = true` to skip this render. |
| `OnProcessing` | function expression | - | Called after the source is resolved, before faces are evaluated, with `{ context, node, source }`. Assigning another source object to `callbackArgument.source` renders that source instead (sort, filter, page, or swap data). May be `async`. |
| `OnRendered` | function expression | - | Called after the output is in the DOM with `{ context, node, source, result }`. `result` is the array of generated top-level nodes. Not called when the source does not exist yet. |
| `OnProcessed` | function expression | - | Accepted and parsed, but never invoked by `print`, `list`, `view` or `tree` (only `api` and the HTML element components call it). |
| `processRenderedContent` | boolean | `true` | After every render the generated nodes are scanned for nested `<basis run="atclient">` commands, `bc-triggers` elements, `[##...##]` tokens and `{{ }}` blocks, which are processed as components. Set to `false` to insert the output as inert HTML. |

Boolean attributes are `true` only for the value `true` (case-insensitive); anything else is `false`.

A function attribute value is placed into `return <value>(callbackArgument);`, so it is normally the name of a global function (`OnProcessing="sortRows"`) but can be any expression that evaluates to a function (`OnRendered="app.afterRender"`). The `node` in every callback argument is the original `<basis>` element, which is no longer attached to the document.

### Render sequence

1. If the render was not caused by a source and `ignoreNullSource` is `true`: stop.
2. Evaluate `if`. If `false`: stop (nothing is removed).
3. Call `OnRendering`; stop if `prevent` was set.
4. Look up the source named by `datamembername`. If it does not exist yet: stop silently, output stays empty, `OnRendered` is not called. The component is already subscribed and will render when the source is set.
5. Call `OnProcessing`; take `callbackArgument.source` as the source to render.
6. Build the face list (filters are evaluated now), render every row, build layout or else-layout, replace the output.
7. If `processRenderedContent`: dispose the components created by the previous render and process the new nodes.
8. Call `OnRendered`.

Each component runs one render at a time; a trigger that arrives while a render is in progress is dropped.

## Child elements

| Element | Attributes | Description |
|---|---|---|
| `<face>` | `filter`, `rowtype`, `level` | Row template. Several faces may be given; the first face that matches a row is used (see Face selection). At least one face is required; with no `<face>` at all nothing is rendered and `<else-layout>` is used. |
| `<layout>` | - | Template rendered once around all row output. The text `@child` marks where the rows are inserted. Used only when at least one row was rendered. |
| `<else-layout>` | - | Template rendered when no row was rendered: the source has zero rows, or no row matched any face. |

The first `<layout>` and `<else-layout>` found by `querySelector` are used; faces are collected with `querySelectorAll("face")`, which also descends into nested markup.

### `@child` in the layout

`@child` is replaced (case-insensitively, as a regular expression) by a temporary `<basis-core-template-child-tag>` element; the rendered rows are then inserted at its position and the temporary element is removed. If the layout contains no `@child`, the rows are dropped and the warning `@child place holder not found in layout template` is logged. Because the replacement is a plain regular expression on `@child`, a column named `childname` written as `@childname` inside a layout would be damaged; this is only an issue in `view` and `tree` faces, where `@child` is also replaced inside faces.

## Face selection

Before each render every `<face>` is turned into a face descriptor:

- `filter`: an SQL `WHERE` expression run against the source with the client-side SQL engine (`SELECT * FROM ? where <filter>`), so it needs `host.dbLibPath` to be loadable (see [../client-side-sql.md](../client-side-sql.md)). Tokens inside the filter are resolved first, which is how `filter="name like '%[##filter.name.value##]%'"` implements a live filter. The result is the set of rows related to this face; without `filter` all rows are related. A row is related when a row with the same property values is in the filter result.
- `rowtype`: `odd` or `even` (case-insensitive); any other value, or no attribute, means "not set".
- `level`: pipe-separated level names, used by `view` and `tree` only. Do not use it on `print` or `list` faces (see Pitfalls).

For every row, in source order, the faces are searched in document order and the first face is taken for which all of these hold:

1. the row is in the face's related rows,
2. `rowtype` is not set, or equals the current row type,
3. `level` is not set, or one of its values is one of the current levels.

The row type comes from a counter that starts at 0: when the counter is even the row type is `even`, otherwise `odd`. The counter is incremented after a row is rendered and decremented when a row matched no face. Both change the parity, so the row type simply alternates for every row processed, and the first row processed is `even`, the second `odd`, the third `even`, and so on. A face with `rowtype="even"` therefore matches the 1st, 3rd, 5th rows.

A row that matches no face is skipped. When no row matches, the `<else-layout>` is rendered.

## Placeholders inside a face

A face template is text, and two kinds of placeholders are substituted per row.

### `@` expressions

The pattern is `@expression@` or `@expression` (terminated by whitespace or another `@`), and the `@` must not be preceded by another `@`. The expression is JavaScript, compiled once per face into a function whose local constants are the row's own properties. Everything a row has is a variable:

```html
<div style="background-color: @color@;">
  id = @id
  @color.toUpperCase()
  @color[1]
  @color.length
  @fn(color,'t')      <!-- fn is a global function -->
</div>
```

A `ReferenceError` (unknown column or unknown identifier) renders as an empty string. Any other exception (for example calling a method on `null`) is thrown and the render fails. Use the closed form `@name@` whenever the placeholder is followed by text without whitespace (`@id@px`), and in attribute values.

Because the pattern is applied to the whole template, an e-mail address like `info@example.com` is read as the expression `example.com` and renders as `info` (the `ReferenceError` becomes empty). Write such text through a `{{ }}` block or outside the face.

### `{{ }}` code blocks

A block `{{ ... }}` is the body of an `async` function with two parameters: `$bc`, which is bound to the command's context object (`tryToGetSource`, `waitToGetSourceAsync`, `setAsSource`, `options`, `logger`), not the global `$bc` wrapper, and `$data`, the current row. The block must `return` a string; `null`/`undefined` renders as an empty string. Exceptions are caught, logged with `console.error`, and the error object itself is returned and rendered as text. `&quot;` in the block is replaced by `"` before compilation.

```html
<face>
  <li>
    @answer
    {{ return await buildTags($data); }}
  </li>
</face>
```

### `[##...##]` tokens inside faces

Tokens are not substituted while the face is rendered. They stay in the output and are turned into live text or attribute components by the re-scan step (`processRenderedContent`), so they still work, but they do not see the row data; they bind to sources exactly like tokens outside the command.

### A scalar source

`$bc.setSource("db.name", "qadireh")` creates one row `{ value: "qadireh" }`, so a face can print it with `@value@`.

## Templates are XML

The text of a `<face>`, `<layout>` or `<else-layout>` is parsed with an XML parser (`application/xml`) after substitution, and the resulting elements are rebuilt as HTML (or SVG, inside an `<svg>`) elements. Consequences:

- Markup must be well formed: `<br/>`, `<img ... />`, quoted attribute values, `&amp;` for a literal ampersand, no `&nbsp;`.
- Text nodes are trimmed and whitespace-only text nodes are dropped, so `<b>@a</b> <b>@b</b>` renders without the space between the two elements.
- A parse error renders the browser's `parsererror` element with the error message instead of the row.
- SVG markup inside a face is created in the SVG namespace and displays correctly.

### When `<script type="text/template">` is required

Without a script wrapper the template is taken from the element's `innerHTML`, which is the browser's re-serialization of markup it has already parsed as HTML. That has two effects:

1. The HTML parser restructures or drops elements that are not valid at that position. `<tr>`, `<td>`, `<th>`, `<thead>`, `<tbody>` inside a `<face>` lose their tags and only their text survives, so a table body cannot be built from a plain face. The same happens to any partial fragment such as `</div><div>`.
2. Void elements are serialized without a closing slash (`<br>`, `<img src="#">`), which is not well-formed XML and produces a parse error.

If a `<face>`, `<layout>`, `<else-layout>` (or `<divider>`/`<incomplete>` in `list`) contains exactly one child element and that element is `<script type="text/template">`, the raw text of the script is used instead. The browser never parses the inside of a script, so table rows, void elements and fragments survive untouched:

```html
<layout>
  <script type="text/template">
    <table>
      <thead><tr><th>Id</th><th>Name</th></tr></thead>
      <tbody>@child</tbody>
    </table>
  </script>
</layout>
<face>
  <script type="text/template">
    <tr><td>@id@</td><td>@name@</td></tr>
    <br />
  </script>
</face>
```

Use the script form whenever a template contains table markup, void elements, `<select>`/`<option>` structures you want to keep verbatim, or nested `<basis>` commands with their own `<face>` elements (otherwise the outer command collects the inner faces too).

## Incremental re-render by key and version

Every rendered row is stored in a per-component cache under a key:

- if the source has a `keyFieldName`, the key is `row[keyFieldName]`;
- otherwise (or when that column is `undefined`) the row object itself is the key.

Together with the key, the row's version from the source is stored. On the next render a row whose key is in the cache with the same version is not rendered again; its existing DOM nodes are moved into the new output. Unchanged rows therefore keep their DOM state (inline styles, input values, listeners attached by scripts). Versions change as follows:

- `replace` merge: every row's version is incremented, so a replace always re-renders every row (new row objects also miss the cache when there is no key field).
- `append` merge with `keyFieldName` and `statusFieldName`: an edited row (status `1`) gets a new version and is re-rendered; added rows (status `0`) are new; deleted rows (status `2`) disappear. Untouched rows are re-used.
- A render caused by `triggers`, `events` or a re-set of the same row objects re-uses everything whose version did not change.

The cache is never emptied, so results of rows that were deleted stay referenced for the life of the component. See [../sources-and-reactivity.md](../sources-and-reactivity.md) for merge semantics.

## Re-scanning the rendered output

With `processRenderedContent="true"` (the default) the generated nodes are processed as a new component collection after every render: nested `<basis run="atclient">` commands run, `<input name="x" bc-triggers="change">` style elements become sources, and `[##...##]` / `{{ }}` tokens become live. The collection created by the previous render is disposed first. This is how the sort buttons in the table example below (`<td name="demo.sort-by" bc-triggers="click" bc-value="id">`) become clickable sources.

Because a nested `<basis>` inside a face is only processed by this step, nested commands must be inside a `<script type="text/template">` face (or hidden from the outer `querySelectorAll("face")`) and must have their own `run="atclient"`.

## Examples

### Faces, layout and else-layout

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Print Command - Simple</title>
</head>
<body>
  <Basis core="print" datamembername="inlineSource.print" run="atclient">
    <layout>
      <span data-u="">@child</span>
      <span>w</span>
    </layout>
    <face>
      <script type="text/Template">
        <img src="#" />
        <span>@id ( name is:@name@ ) </span>
        <br/>
      </script>
    </face>
    <else-layout>
      <script type="text/template">
        <span>no user found!</span>
      </script>
    </else-layout>
  </Basis>

  <script>
    const host = {
      sources: {
        "inlineSource.print": [
          { id: 1, name: "qamsari" },
          { id: 2, name: "akbari" },
          { id: 3, name: "amir" },
          { id: 4, name: "ali" },
        ],
      },
    };
  </script>
</body>
</html>
```

Replace the face with `<face filter="1!=1">` and the `<else-layout>` is rendered instead, because no row matches any face.

### Live updates with `$bc.setSource`

```html
<input type="button" value="Set Source" onclick="clickHandler()" />
<Basis core="print" datamembername="local.print" run="atclient">
  <layout>
    <script type="text/template">
      <ul>@child</ul>
    </script>
  </layout>
  <face>
    <li><span>@id ( @name ) </span></li>
  </face>
</Basis>
<script>
  var i = 0;
  function clickHandler() {
    $bc.setSource("local.print", { id: i, name: `btn-t=${i}` });
    i += 1;
  }
  clickHandler();
</script>
```

Each call replaces the source (`replace` is the default merge type), so the list always shows one row. Pass `{ mergeType: basiscore.MergeType.append }` as the third argument to accumulate rows.

### Keyed rows keep their DOM state

```html
<button bc-value=" " name="event.refresh" bc-triggers="click">Refresh Component</button>
<Basis core="print" datamembername="inlineSource.withKey" run="atclient" triggers="event.refresh">
  <face>
    <script type="text/template">
      <br />
      <span>@id ( name is:@name@ )
        <button onclick="this.style['color'] = `#${Math.floor(Math.random()*0xffffff).toString(16)}`">change color</button>
      </span>
    </script>
  </face>
</Basis>
<script>
  const host = {
    sources: {
      "inlineSource.withKey": {
        options: { keyFieldName: "id" },
        data: [
          { id: 1, name: "qamsari" },
          { id: 2, name: "akaberi" },
          { id: 3, name: "amir" },
        ],
      },
    },
  };
</script>
```

Click "change color" on a row, then "Refresh Component": the command renders again because `event.refresh` is a trigger, but the rows are served from the cache and the colour survives. Editing one row through `$bc.setSource("inlineSource.withKey", [{ id: 2, name: "x", status: 1 }], { keyFieldName: "id", statusFieldName: "status", mergeType: basiscore.MergeType.append })` re-renders only that row.

### Sorting and filtering in `OnProcessing`

```html
<label>name: <input name="demo.filter-name" bc-triggers="keyup change" /></label>
<Basis core="print" datamembername="demo.data" run="atclient"
       OnProcessing="manipulation" triggers="demo.sort-by demo.filter-name">
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
</Basis>
<script>
  const host = {
    dbLibPath: "/alasql.min.js",
    sources: {
      "demo.data": {
        data: [
          { id: 1000, name: "amir", age: 31 },
          { id: 1001, name: "ali", age: 45 },
          { id: 1002, name: "reza", age: 22 },
        ],
        options: { keyFieldName: "id" },
      },
    },
  };
  let orderPart = "";
  async function manipulation(args) {
    const where = args.context.tryToGetSource("demo.filter-name");
    const wherePart = where?.rows[0].value ? `where name like '%${where.rows[0].value}%'` : "";
    const sort = args.context.tryToGetSource("demo.sort-by");
    if (sort) {
      orderPart = `order by ${sort.rows[0].value}`;
    }
    const sql = `select top 10 * from ? ${wherePart} ${orderPart}`;
    args.source = await $bc.util.source.runSqlAsync(args.source, sql, args.context);
  }
</script>
```

The header cells live inside the layout; they become sources because the rendered output is re-scanned. Clicking one sets `demo.sort-by`, which is a trigger, so the command renders again and `manipulation` reads the new value.

### Live filter in a face `filter`

```html
<label>name: <input type="text" name="filter.name" bc-triggers="keyup change" /></label>
<label>min age: <input type="range" bc-triggers="change input" name="filter.age" min="10" max="90" /></label>
<Basis core="print" datamembername="local.print" run="atclient" triggers="filter.age filter.name">
  <layout>
    <script type="text/template">
      <table><tbody>@child</tbody></table>
    </script>
  </layout>
  <face filter="name like '%[##filter.name.value##]%' and age >= [##filter.age.value|(10)##]">
    <script type="text/template">
      <tr><td>@id@</td><td>@age@</td><td>@name@</td></tr>
    </script>
  </face>
</Basis>
<script>
  const host = { dbLibPath: "/alasql.min.js" };
  $bc.setSource("filter.name", "");
  $bc.setSource("filter.age", 10);
  $bc.setSource("local.print", [
    { id: 1000, age: 31, name: "amir" },
    { id: 1001, age: 45, name: "ali" },
  ]);
</script>
```

The face filter is re-evaluated on every render, but the sources it references are not registered as triggers automatically; `triggers="filter.age filter.name"` is required.

## Pitfalls

- A face with no matching row for any row, or a source with zero rows, renders `<else-layout>`; a source that does not exist yet renders nothing at all and waits.
- `if="false"` (or an `if` that becomes false later) does not clear output that was rendered earlier; `print` has no hide step, so the old rows stay visible until a render with a true condition replaces them.
- `OnProcessed` is never called for `print`, `list`, `view` and `tree`.
- `level` on a `print` or `list` face throws `TypeError: Cannot read properties of undefined (reading 'some')` during rendering, because these commands never set the current levels.
- If every face has `rowtype="odd"` (and none is `even` or unset), rows are rendered in parallel and the first row, which is `even` and matches nothing, becomes a `null` result; the layout step then throws. Always keep a face without `rowtype`.
- The first processed row is `even`, not `odd`; the counter is zero-based.
- Plain (non-script) templates are re-serialized HTML parsed as XML: `<br>` and `<img>` without `/>` produce a `parsererror` node, and `<tr>`/`<td>` are stripped before BasisCore sees them. Wrap such templates in `<script type="text/template">`.
- Text in templates is trimmed; whitespace between inline elements is lost.
- `@` followed by a non-space character is always an expression. `user@example.com` renders as `user`. `@@` is not an expression.
- `$bc` inside a `{{ }}` block is the context object, not the global `$bc`. Use `$bc.tryToGetSource("x")` there, or call a global function and pass `$data`.
- `filter` requires the SQL library (`host.dbLibPath`, default `/alasql.min.js`); without it the first filtered render fails while loading the library.
- Faces are found with `querySelectorAll("face")`, so faces of a nested command inside a plain face are collected by the outer command. Put nested commands in a `<script type="text/template">` face.
- Keyed caching only helps for `append` merges and for renders triggered without data changes; `replace` increments every version and re-renders everything.
- A cached row is re-used whenever its version is unchanged, even if a different face would now match it (a `filter` token changed, or the odd/even parity shifted because a row was deleted). Face selection decides only whether a row is rendered at all; it does not invalidate the cache.
- The row cache grows for the life of the component; rows removed from the source stay cached.

## Related

- [list.md](list.md) - `print` plus `<divider>` and `<incomplete>`
- [view.md](view.md) - two-level grouped rendering
- [tree.md](tree.md) - recursive parent/child rendering
- [inlinesource.md](inlinesource.md), [dbsource.md](dbsource.md), [api.md](api.md) - commands that produce sources
- [callback.md](callback.md) - log sources while debugging triggers
- [../binding-and-tokens.md](../binding-and-tokens.md) - `[##...##]` tokens and `{{ }}` blocks
- [../command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md) - `if`, `triggers`, `events`, callbacks
- [../sources-and-reactivity.md](../sources-and-reactivity.md) - `$bc.setSource`, merge types, key and status fields
- [../client-side-sql.md](../client-side-sql.md) - the SQL dialect used by `filter`
- [../html-element-binding.md](../html-element-binding.md) - `bc-triggers` elements inside rendered output
- [../troubleshooting.md](../troubleshooting.md)

## Source files

- `src/component/renderable/PrintComponent.ts`
- `src/component/renderable/base/RenderableComponent.ts`
- `src/component/renderable/base/RawFaceCollection.ts`
- `src/component/renderable/base/RawFace.ts`
- `src/component/renderable/base/FaceCollection.ts`
- `src/component/renderable/base/RenderParam.ts`
- `src/component/renderable/base/FaceRenderResult.ts`
- `src/component/renderable/base/FaceRenderResultRepository.ts`
- `src/component/renderable/base/template/ContentTemplate.ts`
- `src/component/renderable/base/template/ExpressionTemplate.ts`
- `src/component/renderable/base/template/CodeBlockTemplate.ts`
- `src/component/SourceBaseComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/component/CommandComponent.ts`
- `src/component/Component.ts`
- `src/extension/ElementExtensions.ts`
- `src/wrapper/UtilWrapper.ts`
- `src/wrapper/SourceWrapper.ts`
- `src/token/CodeBlockToken.ts`
- `src/options/HostOptions.ts`
- `src/RangeObject/RangeObject.ts`
