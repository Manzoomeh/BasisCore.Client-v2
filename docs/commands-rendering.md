# Rendering commands

Rendering commands turn a source into markup: `print`, `list`, `view`, `tree`, `chart` and
`repeater`. Each one reads a source named by `dataMemberName`, renders it, and renders again
every time that source is published. How sources are produced and published is covered in
[sources-and-triggers.md](sources-and-triggers.md); the `@column@` and `[##...##]` syntaxes
are covered in [binding.md](binding.md).

Every command on this page is written as `<basis core="..." run="atclient">`. Without
`run="atclient"` the element is left for the server and the browser library ignores it.

The examples below publish their data from the host object so they can be pasted into a
page as they are:

```html
<script>
  var host = {
    sources: {
      "shop.products": [
        { "id": 1, "title": "Desk lamp", "price": 39 },
        { "id": 2, "title": "Notebook", "price": 6 },
        { "id": 3, "title": "Pen set", "price": 12 }
      ]
    }
  };
</script>
```

## Shared behaviour

### Attributes

These attributes are read by `print`, `list`, `view`, `tree`, `chart` and `repeater`.

| Attribute | Default | Meaning |
|---|---|---|
| `dataMemberName` | — | Source id to render, such as `shop.products`. Lower-cased before lookup. The command re-renders whenever this source is published. |
| `triggers` | — | Space-separated source ids that also cause a re-render. |
| `if` | — | JavaScript expression; when it is false the command does not render. |
| `ignoreNullSource` | `false` | When `true`, a run that has no source is skipped. |
| `OnProcessing` | — | Global function name. Receives `{ context, node, source }` before rendering and may replace `source`. |
| `OnRendering` | — | Global function name. Receives `{ context, node, source, prevent }`; set `prevent = true` to cancel. |
| `OnRendered` | — | Global function name. Receives `{ context, node, source, result }` after rendering. |
| `processRenderedContent` | `true` | `print`, `list`, `view`, `tree` only. When `true`, `<basis>` commands and `[##...##]` bindings inside the generated markup are processed. |

Callback signatures are described in [hooks-and-extensibility.md](hooks-and-extensibility.md).

### Faces and layouts

`print`, `list`, `view` and `tree` build their output from child templates:

| Child | Meaning |
|---|---|
| `<face>` | Template for one row. Several faces may be declared; the first one, in document order, that matches a row is used. |
| `<layout>` | Wrapper around all rendered rows. `@child` marks where the rows go. |
| `<else-layout>` | Markup shown when the source has no rows, or when no row produced output. |

A `<face>` accepts three attributes:

| Attribute | Meaning |
|---|---|
| `level` | Pipe-separated levels the face applies to, such as `1` or `2\|3`. Used by `view` and `tree`. |
| `rowtype` | `odd` or `even` (case-insensitive). Counting starts at zero, so the first rendered row is `even`. |
| `filter` | A SQL `WHERE` clause, such as `price > 10`. The face applies only to rows that satisfy it. Filters are run with the client-side SQL library; see [client-side-sql.md](client-side-sql.md). |

Inside a face, `@column@` is replaced with the row's value for that column. The short form
`@column` works only when a space or line end follows it; before `<`, `/` or any other
character, always close it with a second `@`. Every row also carries a `rownumber` column
when it comes from a `dbsource` or `inlinesource` member.

Face and layout content is parsed as XML. Close every element (`<br/>`, `<img ... />`) and
escape `&` as `&amp;`.

Table fragments such as `<tr>` are removed by the browser's HTML parser when they appear
outside a table. Wrap them in `<script type="text/template">` so they reach the command
intact:

```html
<face>
  <script type="text/template"><tr><td>@title@</td><td>@price@</td></tr></script>
</face>
```

## print

Renders every row of a source through a face.

| Attribute | Default | Meaning |
|---|---|---|
| Shared attributes | | See above. |

Children: `<face>`, `<layout>`, `<else-layout>`.

```html
<basis core="print" run="atclient" dataMemberName="shop.products">
  <layout>
    <script type="text/template"><table class="products"><tbody>@child</tbody></table></script>
  </layout>
  <face rowtype="even">
    <script type="text/template"><tr class="even"><td>@title@</td><td>@price@</td></tr></script>
  </face>
  <face rowtype="odd">
    <script type="text/template"><tr class="odd"><td>@title@</td><td>@price@</td></tr></script>
  </face>
  <else-layout><p>No products yet.</p></else-layout>
</basis>
```

Caveats:

- A row that matches no face is skipped. If no row matches, `<else-layout>` is shown. To
  catch every row, end the list with a face that has no `rowtype` or `filter`.
- `@child` in a layout is replaced once. If it is missing, a warning is logged and the rows
  are not shown.
- Faces are tried in document order. Put the narrowest `filter` first.

## list

Like `print`, with an optional separator after every N rows. Use it for grids and card rows.

| Attribute | Default | Meaning |
|---|---|---|
| Shared attributes | | See above. |

Children:

| Child | Meaning |
|---|---|
| `<face>`, `<layout>`, `<else-layout>` | As for `print`. |
| `<divider rowcount="N">` | Markup inserted after every N rows. `rowcount` is required for the divider to take effect. |
| `<incomplete>` | Markup used to pad the last group of rows up to N items. Without it nothing is added. |

```html
<basis core="list" run="atclient" dataMemberName="shop.products">
  <layout><div class="grid">@child</div></layout>
  <face><div class="card"><h4>@title@</h4><span>@price@</span></div></face>
  <divider rowcount="2"><hr/></divider>
  <incomplete><div class="card empty"></div></incomplete>
</basis>
```

With three products this renders two cards, a divider, the third card, and one
`<incomplete>` card to complete the second pair.

Caveats:

- The divider is also emitted after the last group when that group is full.
- When a `<divider>` is present, the layout and divider are assembled as HTML text. Write the
  layout directly, not inside `<script type="text/template">`, and use block markup such as
  `<div>` rather than table rows.
- `list` renders every row it receives. It has no paging of its own; page on the server or
  with a `postsql`/`sort` member (see [commands-data.md](commands-data.md)).

## view

Renders rows in two levels: one level-1 face per group, with the group's rows rendered
through level-2 faces inside it.

> **Known issue in 2.39.6:** `view` renders the level-1 face of each group, but the level-2
> rows do not appear in `@child`. A fix is proposed in pull request #97. Until it is released,
> render grouped data with `tree` (give each group a parent row) or with nested `print` commands.

| Attribute | Default | Meaning |
|---|---|---|
| Shared attributes | | See above. |
| `groupcol` | host setting `default.viewcommand.groupcolumn`, which is `prpid` | Column whose distinct values define the groups. |

Children: `<face level="1">` for the group header, `<face level="2">` for each row,
`<layout>`, `<else-layout>`. Place `@child` inside the level-1 face to mark where the
group's level-2 output goes.

```html
<script>
  var host = {
    sources: {
      "shop.specs": [
        { "prpid": 10, "groupname": "Size", "item": "Height", "value": "42 cm" },
        { "prpid": 10, "groupname": "Size", "item": "Weight", "value": "1.2 kg" },
        { "prpid": 20, "groupname": "Power", "item": "Bulb", "value": "LED 8 W" }
      ]
    }
  };
</script>

<basis core="view" run="atclient" dataMemberName="shop.specs">
  <face level="1">
    <section><h4>@groupname@</h4><dl>@child</dl></section>
  </face>
  <face level="2">
    <div><dt>@item@</dt><dd>@value@</dd></div>
  </face>
</basis>
```

Caveats:

- The level-1 face is rendered with the first row of each group, so only columns that are
  the same for the whole group belong in it.
- Groups appear in the order their first row appears in the source; rows are not sorted.
- Every row must match a level-2 face; otherwise rendering fails. A face without `level`
  matches both levels.
- If your data uses a different grouping column, set `groupcol` on the command, or change
  `default.viewcommand.groupcolumn` in the host settings for the whole page.

## tree

Renders a flat, self-referencing table as a nested tree.

| Attribute | Default | Meaning |
|---|---|---|
| Shared attributes | | See above. |
| `idcol` | `id` | Column holding each row's own key. |
| `parentidcol` | `parentid` | Column holding the parent's key. |
| `nullvalue` | `0` | Parent value that marks a root row. The string `null` (any case) matches a JavaScript `null`. |

Children: `<face>` with `level="1"`, `level="2"` and so on for each depth, and
`level="end"` for rows that have no children. Put `@child` inside a face where that row's
children go. `<layout>` and `<else-layout>` work as for `print`.

```html
<script>
  var host = {
    sources: {
      "site.menu": [
        { "id": 1, "parentid": 0, "title": "Products", "url": "/products" },
        { "id": 2, "parentid": 1, "title": "Lamps", "url": "/products/lamps" },
        { "id": 3, "parentid": 1, "title": "Stationery", "url": "/products/stationery" },
        { "id": 4, "parentid": 0, "title": "Contact", "url": "/contact" }
      ]
    }
  };
</script>

<basis core="tree" run="atclient" dataMemberName="site.menu">
  <layout><ul class="menu">@child</ul></layout>
  <face level="end"><li><a href="@url@">@title@</a></li></face>
  <face><li><a href="@url@">@title@</a><ul>@child</ul></li></face>
</basis>
```

Leaves match the first face; rows with children fall through to the second face, which has
no `level` and therefore matches every depth.

Caveats:

- If no row has the `nullvalue` in `parentidcol`, the command throws:
  `Tree command has no root record in data member '<source id>' with '<nullvalue>' value in '<parentidcol>' column that set in NullValue attribute.`
- Comparison is loose, so a numeric `0` in the data matches the default `nullvalue="0"`.
  When roots carry a real `null`, set `nullvalue="null"`.
- The data must be flat rows. Nested arrays of children are not read.
- A leaf receives both its depth and `end` as levels. Every row must match some face;
  otherwise rendering fails.

## chart

Draws an SVG chart from a source using D3.

| Attribute | Default | Meaning |
|---|---|---|
| `dataMemberName`, `triggers`, `if`, `ignoreNullSource`, `OnProcessing`, `OnRendering`, `OnRendered` | | As in the shared table. |
| `chartType` | — | One of `bar`, `stacked`, `line`, `funnel`, `donut`, `halfdonut`. Any other value throws `Chart type <value> is not supported`. |
| `group` | — | Category column. Bars, funnel stages, donut slices, stacked segments and line series are labelled by it. |
| `y` | — | Numeric value column. |
| `x` | — | `bar`: optional sub-category inside each group. `line`: the horizontal axis column. |
| `horizontal` | `false` | `bar` and `stacked`: draw horizontally. |
| `chartTitle` | — | Title text drawn above the chart. |
| `axisLabel` | `false` | Draw axes or labels. |
| `grid` | `false` | Draw grid lines (`bar`, `line`). |
| `legend` | `false` | Draw a legend; requires `group`. |
| `hover` | `false` | Show a tooltip and highlight on hover. |
| `isStringLineChart` | `false` | `line`: treat `x` as text categories instead of numbers. |
| `chartStyle` | — | JavaScript expression that returns a style object, merged over the defaults. |
| `chartContent` | — | JavaScript expression that returns HTML shown in the centre of a `donut` or `halfdonut`. |
| `onLabelClick` | — | JavaScript expression that returns a function. On a vertical `bar` chart with `axisLabel="true"`, it is called with the mouse event and the first row whose `group` matches the clicked label. |
| `style_<key>` | — | Sets one style key. See the caveats for which keys work. |

The boolean attributes are on only when their value is exactly `true`.

Chart types and the columns they use:

| `chartType` | Columns |
|---|---|
| `bar` | `group` and `y`: one bar per row. With `x` as well: bars grouped by `group`, one bar per `x` value inside each group. |
| `stacked` | `group` and `y`: one segment per row, showing its share of the total. |
| `line` | `x` and `y`; with `group`, one line per group value. |
| `funnel` | `group` and `y`; stages are sorted by `y`, largest first. |
| `donut`, `halfdonut` | `group` and `y`: one slice per row. |

Style keys and their defaults: `width` 800, `height` 400, `marginX` 40, `marginY` 40,
`backgroundColor` `#fff`, `textColor` `#000`, `opacity` 1, and `color`, an array of colours
used in turn (`["#004B85", "#FF7A00", "#00A693", "#B40020"]`). Chart types also read
`thickness` (`line`), `curveTension` (`line`), `innerPadding` (`funnel`), and
`innerRadiusDistance`, `outerRadiusDistance`, `cornerRadius` and `padAngel` (`donut`,
`halfdonut`).

```html
<script>
  var host = {
    sources: {
      "sales.byregion": [
        { "region": "North", "total": 120 },
        { "region": "South", "total": 95 },
        { "region": "West", "total": 60 }
      ]
    }
  };
  var salesChartStyle = { width: 600, height: 300, color: ["#004B85", "#00A693"] };
</script>

<basis core="chart" run="atclient" dataMemberName="sales.byregion"
       chartType="bar" group="region" y="total"
       axisLabel="true" legend="true" hover="true"
       chartTitle="Sales by region" chartStyle="salesChartStyle"></basis>
```

Caveats:

- HTML lower-cases attribute names, so `style_marginX` arrives as `marginx` and has no
  effect. `style_*` works only for the lower-case keys `width`, `height`, `opacity` and
  `thickness`. Set every other key, and `color` (which must be an array), through
  `chartStyle`.
- `chartStyle`, `chartContent` and `onLabelClick` are evaluated as JavaScript. Pass the name
  of a global variable or function, or a literal such as `{width: 600}`. Text for
  `chartContent` needs its own quotes: `chartContent="'<b>315</b>'"`.
- `y` values must be numbers. Values that arrive as strings are compared as text when the
  scale is computed.
- On `stacked` charts, setting `thickness` has no visible effect; the bar thickness is
  always derived from `height` or `width`.
- Each render replaces the SVG. With `hover="true"`, each render also adds a tooltip element
  to `document.body`.

## repeater

Repeats its inner markup once per row, exposing the row as a local source.

| Attribute | Default | Meaning |
|---|---|---|
| `dataMemberName`, `triggers`, `if`, `ignoreNullSource`, `OnProcessing`, `OnRendering`, `OnRendered` | | As in the shared table. |
| `name` | — | Prefix of the local source. Each copy sees its row as `<name>.current`. |
| `replace` | `true` | When `true`, earlier copies are removed before rendering again. When `false`, new copies are appended after the existing ones. |

Children: any markup, including `[##...##]` bindings and other `<basis>` commands. The whole
content is copied for every row. It does not use `<face>` or `<layout>`.

```html
<basis core="repeater" run="atclient" dataMemberName="shop.products" name="product">
  <article class="product">
    <h3>[##product.current.title##]</h3>
    <p>Price: [##product.current.price##]</p>
  </article>
</basis>
```

Caveats:

- `<name>.current` exists only inside each copy. Commands outside the repeater cannot read it.
- Each copy gets its own context. Nested commands inside a copy are disposed and recreated
  when the repeater renders again with `replace="true"`.
- Because the content is ordinary HTML, place a repeater where its markup is valid on its
  own; it cannot sit directly between table rows.
- For simple row markup without nested commands, `print` or `list` is lighter: they render
  the rows without creating a context per row.
