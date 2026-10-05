# chart

`<basis core="chart">` renders the rows of a source member as an SVG chart drawn with D3. Six chart types are available (`bar`, `stacked`, `line`, `funnel`, `donut`, `halfdonut`), each with its own expectations about which row fields are read through the `x`, `y` and `group` attributes. Styling comes from a built-in style object that can be overridden with a JavaScript object (`chartStyle`) or single `style_*` attributes, and optional features (title, legend, tooltip, labels, grid) are switched on with boolean attributes. Use it when the data already lives in a BasisCore source and a declarative chart in markup is enough; for anything beyond the six built-in renderers, draw the SVG yourself.

## How it works

`ChartComponent` extends `SourceBaseComponent`, so it behaves like the other source-driven display commands:

1. `processAsync` reads `dataMemberName`, lowercases it and registers it as the component's trigger.
2. Whenever that source is set (or when a `triggers` attribute fires), `runAsync` resolves the source, calls the optional `OnProcessing` callback and then `renderSourceAsync(source)`.
3. `renderSourceAsync` calls `initUIAsync(source.rows)`, which re-reads every attribute (`getArgs`) and calls `createChart(rows)`.
4. `createChart` builds a new `<svg>` element, appends it to `document.body`, instantiates the renderer class for `chartType` (`BarChart`, `StackedChart`, `LineChart`, `FunnelChart`, `DonutChart`, `HalfDonutChart`), calls `renderChart()` then `applyFeatures()`, and finally moves the `<svg>` into the command's range with `setContent(svg, false)`.

An unknown `chartType` throws `Error("Chart type <value> is not supported")`.

Every render replaces the previous content of the command's range with the new `<svg>` (`setContent` with `append = false`), so updating the source redraws the chart. The attributes are re-read on each render, so attribute values that contain binding tokens are re-evaluated too. The component has the default `Priority.low`.

### SVG sizing

The outer `<svg>` gets:

- `width = Number(style.width) + 2 * Number(style.marginX)`
- `height = Number(style.height) + 2 * Number(style.marginY)`, plus `20` when `legend="true"`
- `style="background-color: <style.backgroundColor>"`
- an `xmlns:xhtml` attribute, needed by the `foreignObject` legends and donut content

All drawing happens inside a `<g transform="translate(marginX, marginY)">`, so `style.width` and `style.height` are the size of the plotting area, not of the whole image.

### Side effect of the temporary body insertion

The `<svg>` is appended to `document.body` before the renderer runs and only moved into the command's position afterwards. During `applyFeatures` the renderers select hover targets document-wide (`d3.selectAll(".bar")`, `d3.selectAll("rect")`, `d3.selectAll(".line")`, `d3.selectAll("polygon")`, `d3.selectAll(".arc")`). As a result, a chart with `hover="true"` (re)binds its tooltip handlers to every matching element already on the page, including the shapes of other charts and, for `stacked`, every `<rect>` in the document.

## Attributes

All attribute names are matched case-insensitively (`getAttribute`). Values are tokenized, so `[##...##]` bindings work in them. An attribute with an empty value is treated as absent.

| Name | Type | Default | Description |
|---|---|---|---|
| `core` | string | - | Must be `chart`. |
| `run` | string | - | Must be `atclient` for the browser to process the element. |
| `dataMemberName` | string | - | Source member whose rows are charted, e.g. `chart.data`. Lowercased; also registered as the trigger that redraws the chart. |
| `chartType` | string | - | One of `bar`, `stacked`, `line`, `funnel`, `donut`, `halfdonut`. Anything else throws. |
| `y` | string | - | Field name holding the numeric value. Used by every chart type. |
| `group` | string | - | Field name holding the category label (`bar`, `stacked`, `funnel`, `donut`, `halfdonut`) or the series name (`line`, grouped `bar`). |
| `x` | string | - | Field name for the x position (`line`) or the inner category of a grouped `bar`. Ignored by the other types. |
| `chartTitle` | string | - | Title text drawn centered above the plotting area, 16px, at `y = -marginY / 2`. |
| `legend` | string | - | `"true"` adds a legend row below the plot and makes the SVG 20px taller. Every other value is `false`. |
| `hover` | string | - | `"true"` adds a tooltip that follows the mouse over the shapes. |
| `axisLabel` | string | - | `"true"` adds axes (`bar`, `line`) or in-shape labels (`stacked`, `funnel`, `donut`, `halfdonut`). |
| `grid` | string | - | `"true"` adds dashed grid lines (`bar`, `line` only). |
| `horizontal` | string | `"false"` | `"true"` draws `bar` and `stacked` charts horizontally. Ignored by the other types. |
| `isStringLineChart` | string | - | `"true"` makes the `line` x axis a point scale over the distinct `x` strings instead of a linear scale over their numeric extent. |
| `chartStyle` | JS expression | - | Evaluated with `new Function`; the result object is merged over the default style. Usually the name of a global variable. |
| `chartContent` | JS expression | - | Evaluated with `new Function`; the resulting HTML string is placed in the hole of a `donut` / `halfdonut`. |
| `onLabelClick` | JS expression | - | Passed to `eval`; must yield a function. Called on `mousedown` on an x-axis tick of `bar` and `line` charts (see below). |
| `style_<key>` | string | - | Overrides a single style key after `chartStyle` has been merged. The value stays a string. |

Boolean attributes are compared with the string `"true"` (`legend == "true"`, `hover == "true"`, `grid == "true"`, `axisLabel == "true"`, `horizontal == "true"`, `isStringLineChart == "true"`). `"True"`, `"1"` or a bare attribute are `false`.

The general command attributes (`OnProcessing`, `OnRendering`, `OnRendered`, `OnProcessed`, `triggers`, `if`, `ignoreNullSource`, `events`) are documented in [command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md).

### How `chartStyle`, `chartContent` and `onLabelClick` are evaluated

```js
// chartStyle
new Function(`if(${chartStyle}) return ${chartStyle};`)()
// chartContent
new Function(`if(${chartContent}) return ${chartContent};`)()
// onLabelClick
eval(onLabelClick)
```

The attribute text is pasted into JavaScript source, so it must be a valid expression: the name of a global variable (`chartStyle="myStyle"`), an object literal (`chartStyle="{opacity: 0.5}"`) or a function expression. A name that is not defined throws a `ReferenceError` and the chart is not rendered. The style result is shallow-merged: `this.style = { ...this.style, ...styleVar }`.

### `style_*` overrides

After the `chartStyle` merge, every attribute of the element whose name starts with `style_` is split on `_` and the second part becomes the style key: `style_opacity="0.2"` sets `style.opacity = "0.2"`. Two consequences follow from the DOM:

- HTML attribute names are lowercased by the parser, so `style_marginX` sets the key `marginx`, which no renderer reads. Only keys that are already lowercase (`width`, `height`, `opacity`, `color`, `thickness`) can be set this way; camel-cased keys (`marginX`, `marginY`, `backgroundColor`, `textColor`, `curveTension`, `innerRadiusDistance`, `outerRadiusDistance`, `cornerRadius`, `padAngel`, `innerPadding`) must go through `chartStyle`.
- The value is always a string. `width`, `height`, `marginX` and `marginY` are coerced with `Number()` for the SVG size, `opacity` is only concatenated into an `rgba()` string and `thickness` into `"<n>px"`, so those work. `style_color` would set `color` to a string, and `color[i % color.length]` then yields single characters instead of colors; set the palette through `chartStyle`.

The merged style object is kept on the component instance, so overrides persist across re-renders of the same element.

## Default style

```js
{
  width: 800,
  height: 400,
  marginX: 40,
  marginY: 40,
  backgroundColor: "#fff",
  textColor: "#000",
  opacity: 1,
  color: ["#004B85", "#FF7A00", "#00A693", "#B40020"],
}
```

Shapes are filled with `rgba(r, g, b, opacity)` of `color[i % color.length]` and stroked with the same color at full opacity. The palette wraps around for more than four series everywhere except the donut strokes (see Pitfalls).

## Style keys

Common keys (`IChartStyle`):

| Name | Type | Default | Description |
|---|---|---|---|
| `width` | number | 800 | Width of the plotting area. |
| `height` | number | 400 | Height of the plotting area. |
| `marginX` | number | 40 | Horizontal margin on each side. |
| `marginY` | number | 40 | Vertical margin on each side; the title sits at `-marginY / 2`. |
| `backgroundColor` | string | `#fff` | Background of the whole SVG. |
| `textColor` | string | `#000` | Applied in `applyFeatures` (see Features). |
| `opacity` | number | 1 | Alpha of the fills. |
| `color` | string[] | 4 colors | Series palette. |

Per chart type:

| Chart | Key | Type | Default | Description |
|---|---|---|---|---|
| `donut`, `halfdonut` | `innerRadiusDistance` | number | 70 | Inner radius is `radius - innerRadiusDistance`. A value equal to the radius (for example `400`) turns the donut into a pie. |
| `donut`, `halfdonut` | `outerRadiusDistance` | number | 10 | Outer radius is `radius - outerRadiusDistance`. |
| `donut`, `halfdonut` | `cornerRadius` | number | 0 | Rounded corners of each arc. |
| `donut`, `halfdonut` | `padAngel` | number | 0 | Gap angle between arcs, in radians. The key is spelled `padAngel`, not `padAngle`. |
| `funnel` | `innerPadding` | number | 0 | `paddingInner` of the vertical band scale, i.e. the gap between stages as a fraction of a band. |
| `stacked` | `thickness` | number | see below | Intended thickness of the bar. |
| `line` | `thickness` | number | 2 | Stroke width in px. |
| `line` | `curveTension` | number | 1 | Tension of `d3.curveCardinal`; `1` draws straight segments, lower values smooth the line. |

`radius` for `donut` is `min(width, height) / 2`; for `halfdonut` it is `height` when `height > width`, otherwise `width / 2`.

## Chart types

### bar

Uses `group`, `y` and optionally `x`.

- Without `x` (simple bars): one bar per row, `group` is the category on the band axis, `y` the value on the linear axis (`[0, max]`, or `[0, 1]` when the maximum is `0`). Bars are colored by row index. The tooltip shows the `group` value.
- With `x`, `y` and `group` (grouped bars): rows are grouped with `d3.group(rows, d => d[group])`; each group gets a band on the outer axis and the distinct `x` values get inner bands. The value axis is `[0, max].nice()`. Bars are colored by their index inside the group, so each `x` category has a consistent color across groups. The tooltip shows the `x` value.
- `horizontal="true"` swaps the axes: categories run down the y axis and values along the x axis.

Bars are `<path class="bar">` elements with rounded tops and a `title` attribute used by the tooltip.

### stacked

Uses `group` (segment label) and `y` (segment value); `x` is ignored. The rows are transformed into segments `{ value, cumulative, label, percent }` where `cumulative` is the running total before the segment and `percent` is `value / total * 100`; segments with `value <= 0` are dropped. A single bar of length `total` is drawn along the center of the plotting area, segmented in row order:

- `horizontal="true"`: one `<rect>` per segment, `x = scale(cumulative)`, `width = scale(value)`, centered vertically.
- otherwise: `y = scale(cumulative)`, `height = scale(value)`, centered horizontally.

The bar thickness is computed as `settingThickness || horizontal ? height / 2 : width / 2`, which JavaScript parses as `(settingThickness || horizontal) ? height / 2 : width / 2`. The `thickness` style key therefore does not set the thickness: when it is present the bar is always `height / 2` thick, and when it is absent the bar is `height / 2` for horizontal charts and `width / 2` for vertical ones.

The vertical variant computes `yScale(d.label)` for the `title` attribute; a linear scale returns `undefined` for a string label, so no `title` attribute is written and, with `hover="true"`, moving the mouse over a segment throws `TypeError: Cannot read properties of undefined (reading 'value')` in the tooltip handler. The horizontal variant stores the label.

### line

Uses `x`, `y` and optionally `group`.

- x scale: `d3.scaleLinear()` over `d3.extent(rows, d => d[x])` by default; with `isStringLineChart="true"` a `d3.scalePoint()` over `rows.map(d => d[x])` with `padding(0.5)`, keeping the row order.
- y scale: `d3.scaleLinear()` over `d3.extent(rows, d => d[y])`. The axis starts at the minimum value, not at zero.
- Without `group`: one `<path class="line">` through all rows, drawn in `color[0]`. The path gets no `title` attribute (the datum is the whole array), so the tooltip shows `undefined`.
- With `group`: rows are grouped by `group` and one path is drawn per series, colored by series index; the `title` attribute (tooltip text) is the series name.

Stroke width is `style.thickness || 2` px; the curve is `d3.curveCardinal.tension(style.curveTension || 1)`.

### funnel

Uses `group` (stage label) and `y` (stage value). The rows are sorted by `y` descending before anything else, so the widest stage is always on top regardless of row order. Each stage is a `<polygon class="polygon">` trapezoid whose top width is the stage value on a `[0, width]` linear scale and whose bottom width is the next stage's value; stages are laid out on a vertical band scale with `paddingInner(style.innerPadding || 0)`. All x coordinates are additionally shifted by `marginX`, so the funnel is drawn `marginX` pixels to the right of where the other chart types start.

`axisLabel="true"` writes two centered text lines per stage inside the trapezoid (label above, value below) with a font size of `min(16, height / (rows * 4))`.

### donut

Uses `group` (label) and `y` (value). A `d3.pie()` layout with `sort(null)` keeps row order; arcs are `<path class="arc">` built with `d3.arc()` using `innerRadius = radius - (innerRadiusDistance || 70)`, `outerRadius = radius - (outerRadiusDistance || 10)`, `cornerRadius` and `padAngel`. The ring is centered at `(width / 2, height / 2)`.

`chartContent` (an HTML string) is placed in a `<foreignObject>` sized `(radius - innerRadiusDistance) * sqrt(2) - 10` square in the hole. The position of that box is computed with the expression `(this.radius - innerRadiusDistance || 70)`, which falls back to `70` when `innerRadiusDistance` is not set, so set `innerRadiusDistance` explicitly in `chartStyle` whenever you use `chartContent`.

### halfdonut

Same inputs and style keys as `donut`, but the pie runs from `-PI/2` to `+PI/2` and is centered at `(width / 2, height)`, so it sits on the bottom edge of the plotting area. `radius` is `height` when `height > width`, otherwise `width / 2`. The `chartContent` box is placed above the bottom edge and is half as tall as in `donut`.

## Features applied in `applyFeatures`

| Feature | bar | stacked | line | funnel | donut | halfdonut |
|---|---|---|---|---|---|---|
| `chartTitle` | yes | yes | yes | yes | yes | yes |
| `legend` | yes (needs `group`) | yes (needs `group`) | yes (needs `group`) | yes (needs `group`) | yes (needs `group`) | yes (needs `group`) |
| `hover` | `.bar` | all `rect` | `.line` | `polygon` | `.arc` | `.arc` |
| `axisLabel` | x and y axes | percent / value texts | x and y axes | label and value per stage | text inside arcs (not rendered) | text inside arcs (not rendered) |
| `grid` | yes | no | yes | no | no | no |
| `onLabelClick` | with `axisLabel` | no | with `axisLabel` | no | no | no |
| `textColor` | `style("color")` | `style("color")` | `style("color")` | `attr("fill")` | `style("color")` | `style("color")` |

### chartTitle

A `<text>` at `(width / 2, -marginY / 2)`, `text-anchor="middle"`, `font-size: 16px`. The funnel adds `marginX` to the x coordinate like its shapes.

### legend

Rendered only when `legend="true"` and `group` is set. Each entry is a `<foreignObject width="100" height="100">` at `x = (width / entries + 1) * i`, `y = height + 20` (`y = height` for `donut`), containing an `<xhtml:div class="legend">` (flex column, centered, `gap: 10px` from `assets/style.css`) with a 24x12 color swatch and the label. Entries are:

- `bar` without `x`, `funnel`, `donut`, `halfdonut`: one per row, labelled with `row[group]`;
- `bar` with `x`: one per distinct `x` value;
- `stacked`: one per segment, labelled with `segment.label`;
- `line`: one per series.

Because the entries are 100px wide and spaced `width / entries + 1` apart, they overlap when there are more than about `width / 100` entries. The swatch is a nested 24x12 `<svg>` with a rounded `<rect>` filled with the series color; D3 resolves the bare name `svg` to the SVG namespace, so the swatch renders correctly inside the XHTML `div`.

### hover tooltip

When `hover="true"`, `applyFeatures` creates `<div id="tooltip" class="tooltip">` and appends it to `document.body`. The CSS for `.tooltip` (absolute position, 11px white text on `rgba(0,0,0,0.9)`, `opacity: 0`) and `.colorbox` comes from `src/component/chart/assets/style.css`, which is bundled with the library. On `mousemove` over a shape the tooltip's innerHTML is set to a color box filled with the shape's `stroke` plus the shape's `title` attribute, and it is positioned at `top: pageY - 10px; left: pageX + 80px; opacity: 0.8`. `mouseover` dims the shape to opacity 0.7, `mouseleave` hides the tooltip and restores the shape.

A new tooltip `div` is appended on every render; old ones are never removed, so charts whose source updates (and pages with several hover-enabled charts) accumulate `#tooltip` elements in `body`. Only the most recently bound handlers are active on a shape, and each handler writes to its own `div`.

### axisLabel

- `bar`: bottom axis (`d3.axisBottom`) and left axis (`d3.axisLeft`) chosen according to `x` and `horizontal`.
- `line`: bottom axis over the x scale, left axis over the y scale.
- `stacked`: horizontal charts get a bold `<percent> %` text and a `<total>/<value> مورد` text (the word is hard-coded Persian for "items") above each segment; vertical charts get the percent text centered in each segment.
- `funnel`: label and value text inside each trapezoid.
- `donut`, `halfdonut`: a `<text>` with the `group` value is appended as a child of each `<path class="arc">`. SVG does not render text inside a `path`, so these labels are not visible.

### grid

`bar` and `line` only: dashed (`3, 3`) lines at `opacity 0.5` drawn with `axisBottom(...).tickSize(-height)` and `axisLeft(...).tickSize(-width)`; the tick texts of the grid axes are removed. For grouped bars the vertical lines follow the group bands (the value scale when horizontal), and the horizontal lines of a horizontal grouped chart follow an evenly spaced band scale with one band per bar.

### onLabelClick

The value is `eval`'d into a function `(event, row)`:

- `bar`: when `axisLabel="true"` and `onLabelClick` is set, every `.tick` of the bottom axis gets a `mousedown` handler that calls `onLabelClick(event, rows.find(r => r[group] == tickValue))`. For vertical charts the bottom axis carries the `group` labels, so the first row with that label is passed (the only row for simple bars). For horizontal charts the bottom axis is the value scale, so the second argument is `undefined`.
- `line`: when `axisLabel="true"` the handler is bound unconditionally. The tick values are `x` values but the lookup compares `r[group] == tickValue`, so the second argument is usually `undefined`; and if `onLabelClick` is not set, pressing a tick throws `TypeError: onLabelClick is not a function`.
- Other types ignore it.

### textColor

`bar`, `stacked`, `line`, `donut` and `halfdonut` run `selectAll("text").style("color", textColor)`. CSS `color` only affects SVG text whose fill is `currentColor`, which is what D3 axes emit for tick labels, and the HTML legend labels; the chart title and other `<text>` with no `fill` keep the browser default (black). `funnel` uses `attr("fill", textColor)` and recolors every text, including the title. The default `#000` is always applied because the check is `if (textColor)`.

## Examples

Every example loads the library and declares the source in `host.sources`; see [host-configuration.md](../host-configuration.md). Any other source (for example [inlinesource](inlinesource.md), [dbsource](dbsource.md) or [api](api.md)) works the same way as long as `dataMemberName` names it.

### Grouped bar chart

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Bar Chart</title>
</head>
<body>
  <basis core="chart" datamembername="chart.data" run="atclient"
    chartType="bar" group="group" x="x" y="y"
    grid="true" hover="true" legend="true" axisLabel="true"
    chartTitle="Visits per browser" onLabelClick="labelClicked"
    style_opacity="0.2">
  </basis>

  <script>
    const labelClicked = (event, row) => {
      console.log(event, row);
    };
    const host = {
      sources: {
        "chart.data": [
          { x: "Chrome",  y: 250, group: "2024-07-06" },
          { x: "Firefox", y: 195, group: "2024-07-06" },
          { x: "Android", y: 647, group: "2024-07-06" },
          { x: "Chrome",  y: 377, group: "2024-07-07" },
          { x: "Firefox", y: 352, group: "2024-07-07" },
          { x: "Android", y: 647, group: "2024-07-07" },
        ],
      },
    };
  </script>
</body>
</html>
```

For simple bars drop `x` and let `group` carry the category, as in `example/component/chart/barChartDefaultStyle.html`. Add `horizontal="true"` for a horizontal bar chart.

### Stacked chart

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Stacked Chart</title>
</head>
<body>
  <basis core="chart" datamembername="chart.data" run="atclient"
    chartType="stacked" group="column" y="y" horizontal="true"
    hover="true" axisLabel="true" legend="true"
    chartTitle="Share per month" style_opacity="0.2">
  </basis>

  <script>
    const host = {
      sources: {
        "chart.data": [
          { column: "january",  y: "8" },
          { column: "february", y: "8" },
          { column: "march",    y: "8" },
          { column: "april",    y: "8" },
        ],
      },
    };
  </script>
</body>
</html>
```

### Multi-line chart

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Multi Line Chart</title>
</head>
<body>
  <basis core="chart" datamembername="chart.data" run="atclient"
    chartType="line" group="column" x="x" y="y"
    grid="true" hover="true" axisLabel="true" legend="true"
    chartTitle="chart title" chartStyle="chartStyle">
  </basis>

  <script>
    const chartStyle = {
      height: 400,
      width: 800,
      marginX: 40,
      marginY: 40,
      color: ["#004B85", "#FF7A00", "#00A693", "#B40020"],
      thickness: 4,
      curveTension: 0.6,
    };
    const host = {
      sources: {
        "chart.data": [
          { column: "male",   x: "0", y: "3" },
          { column: "male",   x: "1", y: "1" },
          { column: "male",   x: "2", y: "8" },
          { column: "male",   x: "3", y: "6" },
          { column: "male",   x: "4", y: "7" },
          { column: "male",   x: "5", y: "4" },
          { column: "female", x: "0", y: "5" },
          { column: "female", x: "1", y: "2" },
          { column: "female", x: "2", y: "2" },
          { column: "female", x: "3", y: "1" },
          { column: "female", x: "4", y: "4" },
          { column: "female", x: "5", y: "6" },
        ],
      },
    };
  </script>
</body>
</html>
```

When the `x` values are labels rather than numbers, add `isStringLineChart="true"` (see `example/component/chart/singleLineStringChart.html`):

```html
<basis core="chart" datamembername="chart.data" run="atclient"
  chartType="line" x="day" y="value" isStringLineChart="true"
  grid="true" axisLabel="true" chartTitle="Visits per day">
</basis>
```

### Funnel chart

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Funnel Chart</title>
</head>
<body>
  <basis core="chart" datamembername="chart.data" run="atclient"
    chartType="funnel" group="column" y="y"
    hover="true" legend="true" axisLabel="true"
    chartTitle="chart title" chartStyle="chartStyle">
  </basis>

  <script>
    const chartStyle = {
      height: 400,
      width: 800,
      marginX: 40,
      marginY: 40,
      opacity: 0.2,
      innerPadding: 0.1,
    };
    const host = {
      sources: {
        "chart.data": [
          { column: "january",  y: "7" },
          { column: "february", y: "5" },
          { column: "march",    y: "3" },
          { column: "april",    y: "1" },
        ],
      },
    };
  </script>
</body>
</html>
```

### Donut chart with center content

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Donut Chart</title>
</head>
<body>
  <basis core="chart" datamembername="chart.data" run="atclient"
    chartType="donut" group="column" y="y"
    hover="true" legend="true"
    chartTitle="chart title" chartStyle="chartStyle" chartContent="chartContent">
  </basis>

  <script>
    const chartContent = `
      <div style="display:flex;justify-content:center;align-items:center;flex-direction:column;width:100%;height:100%">
        <div style="font-size:12px">Remaining days</div>
        <div style="font-size:30px">172</div>
      </div>`;
    const chartStyle = {
      height: 400,
      width: 700,
      marginX: 40,
      marginY: 40,
      cornerRadius: 8,
      innerRadiusDistance: 70,
      color: ["#01D6BD", "#E5F6F4"],
    };
    const host = {
      sources: {
        "chart.data": [
          { column: "used",      y: "8" },
          { column: "remaining", y: "6" },
        ],
      },
    };
  </script>
</body>
</html>
```

A pie chart is a donut whose `innerRadiusDistance` is at least the radius (`chartStyle="{ innerRadiusDistance: 200 }"` for the default 800x400 plotting area); `padAngel` separates the slices, as in `example/component/chart/pieChartOpacity.html`.

### Half donut chart

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Half Donut Chart</title>
</head>
<body>
  <basis core="chart" datamembername="chart.data" run="atclient"
    chartType="halfdonut" group="column" y="y"
    hover="true" legend="true"
    chartTitle="chart title" chartStyle="chartStyle">
  </basis>

  <script>
    const chartStyle = {
      height: 400,
      width: 800,
      marginX: 40,
      marginY: 40,
      opacity: 0.2,
      padAngel: 0.04,
      innerRadiusDistance: 70,
    };
    const host = {
      sources: {
        "chart.data": [
          { column: "march", y: "8" },
          { column: "april", y: "6" },
          { column: "may",   y: "7" },
          { column: "june",  y: "4" },
        ],
      },
    };
  </script>
</body>
</html>
```

## Pitfalls

- Plain `width`, `height`, `marginX` and `marginY` attributes on the element (as found in some example pages) are not read. Sizes come only from the default style, `chartStyle` and `style_*`.
- `style_*` keys are lowercased by the HTML parser; `style_marginX`, `style_backgroundColor`, `style_textColor` and other camel-cased keys silently set unused keys. Use `chartStyle` for them.
- The palette key is `color`, not `colors`. Several example pages pass `colors: [...]` inside `chartStyle`, which is ignored and the default palette is used.
- `chartStyle`, `chartContent` and `onLabelClick` are JavaScript, evaluated in global scope every time the chart renders. A misspelled variable name throws and leaves the chart empty. The variables must exist before the first render.
- Booleans must be the exact string `"true"`; `horizontal="True"` or `legend` without a value are `false`.
- The donut and half donut `stroke` is `color[d.index]` without `% color.length`, so the fifth and later slices have no `stroke` attribute (an `undefined` value removes the attribute), and with `hover="true"` moving the mouse over them throws a `TypeError` in the tooltip handler. Fills do wrap around the palette.
- `funnel` sorts rows by `y` descending; the stage order in the source is not preserved.
- `stacked`: the `thickness` style key is ineffective (operator precedence), the vertical variant's segments have no `title` attribute so hovering them throws a `TypeError`, `grid` and `onLabelClick` are not implemented, and the horizontal `axisLabel` text contains a hard-coded Persian word.
- `donut` / `halfdonut`: `axisLabel="true"` appends text inside `<path>` elements, so no labels appear; use `legend` or `chartContent` instead. Set `innerRadiusDistance` explicitly when using `chartContent`, otherwise the content box is mispositioned.
- Legend entries are 100px wide, so they overlap when there are more than roughly `width / 100` of them.
- The `line` y axis starts at the minimum value of `y`, not at zero. Without `isStringLineChart="true"`, string `x` values are passed to a linear scale.
- `line` with `axisLabel="true"` and no `onLabelClick`: pressing the mouse on an x tick throws `TypeError` in the console.
- Each render with `hover="true"` appends another `div#tooltip` to `document.body` and rebinds the handlers of all matching shapes on the page (`stacked` binds every `<rect>` in the document). The tooltip divs accumulate on source updates and are never removed.
- A single `line` (no `group`) has no `title` attribute, so its tooltip text reads `undefined`.
- `textColor` set through `style("color")` does not recolor the chart title in `bar`, `stacked`, `line`, `donut` and `halfdonut`; only axis ticks and legend labels change.

## Related

- [sources-and-reactivity.md](../sources-and-reactivity.md)
- [host-configuration.md](../host-configuration.md)
- [command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md)
- [binding-and-tokens.md](../binding-and-tokens.md)
- [inlinesource.md](inlinesource.md), [dbsource.md](dbsource.md), [api.md](api.md)
- [print.md](print.md), [list.md](list.md), [view.md](view.md), [tree.md](tree.md)

## Source files

- `src/component/chart/ChartComponent.ts`
- `src/component/chart/BarChart.ts`
- `src/component/chart/StackedChart.ts`
- `src/component/chart/LineChart.ts`
- `src/component/chart/FunnelChart.ts`
- `src/component/chart/DonutChart.ts`
- `src/component/chart/HalfDonutChart.ts`
- `src/component/chart/assets/style.css`
- `src/component/SourceBaseComponent.ts`
- `src/component/CommandComponent.ts`
- `src/RangeObject/RangeObject.ts`
- `src/type-alias.ts` (`IChartSetting`, `IBarChartSetting`, `IStackedChartSetting`, `IFunnelChartSetting`, `IDonutChartSetting`, `ILineChartSetting`, `IChartStyle`, `IDonutChartStyle`, `IFunnelChartStyle`, `IStackedChartStyle`, `ILineChartStyle`)
- `src/tsyringe.config.ts` (registration of `chart`)
