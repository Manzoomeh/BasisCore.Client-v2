# BasisCore client commands — v2.39.6

Generated from the shipped documentation. Attributes marked required are
those the docs state as mandatory or whose absence throws.


## `call` — collection

High-priority fragment loader that fetches external markup, replaces the command range with it and then processes the returned nodes as live BasisCore content.

> فرمان call یک قطعه نشانه‌گذاری بیرونی را بارگذاری می‌کند، آن را در صفحه درج می‌کند و سپس محتوای بازگشتی را دوباره توسط بیسیس‌کور پردازش می‌کند.


**Optional** (7)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `file` | filename |  | Fragment file or page name; appended to the configured callcommand connection base when… |
| `url` | url |  | Explicit URL that bypasses the callcommand connection by creating a temporary… |
| `method` | enum |  | HTTP method; falls back to the configured default call verb (host setting… |
| `pagesize` | integer | 0 | Forwarded as siteSize in non-POST mode; it is a request parameter, not a client-side… |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `triggers` | source_ref |  | Source ids that cause the fragment to be reloaded, typically together with a bound file… |
| `*` | free_text |  | In POST mode every attribute except the reserved core, run, file, method and pagesize is… |

**Caveats**
- warning: In the inspected client, WebConnectionOptions.xmlAjax() does not append GET parameters (the code is commented out with a TODO), so GET flows that depend on fileNames/dmnid/siteSize/command…
- warning: `connection` is NOT a validated call attribute; routing is decided only by `url` or the configured callcommand connection. In POST mode it would simply be forwarded as an ordinary parameter.

```html
<basis core="call"
       run="atclient"
       file="header.html">
</basis>
```

## `group` — collection

Scope boundary that creates a child DI container and a new local root context, optionally deep-merging custom host options, and processes its child nodes inside that local context.

> فرمان group یک دامنه اجرایی محلی می‌سازد تا فرزندانش با تنظیمات و منابع اختصاصی خودشان پردازش شوند.


**Optional** (4)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `options` | expression |  | JavaScript expression (evaluated with eval) returning a host-options object; deep-merged… |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `if` | expression |  | Conditionally shows the subtree; hiding disposes the local context and removes the… |
| `triggers` | source_ref |  | Source ids that cause the group to be re-evaluated. |

**Caveats**
- warning: `options` is eval'd, not JSON-parsed: syntax errors break evaluation silently and untrusted expressions are dangerous; prefer referencing a named global object.

```html
<basis core="group" run="atclient" options="groupOptions">
  <basis core="print" datamembername="data.test" run="atclient">
    <face>
      <div>@id@ — @name@</div>
    </face>
  </basis>
</basis>
```

## `repeater` — collection

Row-by-row scope generator that iterates the current source rows, creates a child container and local context per row, publishes each row as name.current and processes the inner markup once per row.

> فرمان repeater به ازای هر سطر منبع یک زمینه محلی می‌سازد، آن سطر را با نام name.current منتشر می‌کند و محتوای داخلی را یک بار برای هر سطر پردازش می‌کند.


**Optional** (11)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `name` | identifier |  | Local prefix that exposes each row as <name>.current inside the repeated subtree; not… |
| `datamembername` | source_ref |  | Source whose rows are iterated; it is also registered as a trigger. |
| `replace` | boolean | true | When true the previously rendered DOM is deleted and old row contexts disposed before… |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `triggers` | source_ref |  | Additional source triggers besides datamembername. |
| `if` | expression |  | Conditionally render or hide. |
| `ignoreNullSource` | boolean |  | Skip rendering when no source is supplied. |
| `OnProcessing` | identifier |  | Callback before source rendering. |
| `OnProcessed` | identifier |  | Callback after processing. |
| `OnRendering` | identifier |  | Callback before render. |
| `OnRendered` | identifier |  | Callback after render. |

**Caveats**
- warning: Omitting `name` is the most common authoring mistake; without it the repeated children lose the clean row-scoped source.
- warning: replace="false" appends instead of refreshing; combined with an append-merge source or extra triggers it duplicates DOM quickly.

```html
<basis core="repeater"
         run="atclient"
         name="rep"
         datamembername="app.users">
    <li>
      User: [##rep.current.id##] — [##rep.current.name##]
    </li>
  </basis>
```

## `component` — component

Dynamic component loader and execution bridge: everything after component. in the core value is resolved from a global symbol, a built-in basiscore path or host.repositories, instantiated with a BasisCore-aware owner and run through initializeAsync/runAsync/disposeAsync.

> فرمان component یک کلاس جاوااسکریپت سفارشی را به صورت پویا بارگذاری و نمونه‌سازی می‌کند تا داخل چرخه حیات بیسیس‌کور اجرا شود.


**Required**

| attribute | kind | note |
| --- | --- | --- |
| `core` | identifier | The component key is embedded in the core value itself: core="component.<key>"; the runtime splits on the firs |

**Optional** (7)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `triggers` | source_ref |  | Source ids that cause the component to be processed again; the triggering source is… |
| `if` | expression |  | Standard conditional execution guard from the command base. |
| `options` | expression |  | Structured configuration read inside the manager with… |
| `component` | identifier |  | Read by the built-in component.basiscore.exposer to store the instance globally under… |
| `method` | identifier |  | Read by the built-in component.basiscore.exposer; the named global function is evaluated… |
| `*` | free_text |  | Any other attribute can be read by the manager through owner.getAttributeValueAsync /… |

**Caveats**
- error: core="component" without a suffix does not identify a manager class; always use core="component.<key>".
- warning: component.local.* is resolved with eval, so the global constructor (e.g. DemoComponent) must exist when the component initializes.
- warning: Repository lookup trims the key from the right (bc.watermark.editor -> bc.watermark -> bc), but the loaded script must still expose the FULL requested object path.

```html
<basis core="component.local.DemoComponent" run="atclient"></basis>
```

## `form` — input

Runtime behavior attached to a plain HTML <form> carrying bc-triggers: it serializes the form through the browser FormData API into one structured object and publishes it as a single source.

> رفتار form کل وضعیت یک فرم HTML را به یک شیء ساختاریافته تبدیل و آن را به عنوان یک منبع منتشر می‌کند.


**Required**

| attribute | kind | note |
| --- | --- | --- |
| `bc-triggers` | free_text | DOM events that publish the whole form; submit is the normal choice and the default browser submit is prevente |

**Optional** (9)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `bc-name` | source_ref |  | Explicit source id; wins over name. |
| `name` | source_ref |  | Fallback source id used when bc-name is absent. |
| `bc-merge` | enum |  | Merge behavior when the source is updated; replace is usually clearest because a form… |
| `bc-keyField` | column_ref |  | Inherited publishing option; matters more in repeated row-based scenarios. |
| `bc-statusField` | column_ref |  | Inherited publishing option; matters more in repeated row-based scenarios. |
| `OnProcessing` | identifier |  | Hook before publication; useful for payload reshaping or validation. |
| `OnProcessed` | identifier |  | Hook after processing. |
| `OnRendering` | identifier |  | Hook before the source is committed to context. |
| `OnRendered` | identifier |  | Hook after the source is committed to context. |

**Children**: `<input>` · `<select>`

**Caveats**
- warning: Sparse arrays are compacted with val.filter(String), so missing intermediate indices do not survive; treat indices as authoring hints.

```html
<form bc-triggers="submit" name="cms.form">
  <input name="fname" />
  <input name="lname" />
  <input type="submit" />
</form>
```

## `input` — input

Runtime behavior attached to a plain HTML <input> carrying bc-triggers: on each listed DOM event it resolves a source id and value and publishes them as a BasisCore source.

> رفتار input مقدار یک عنصر ورودی HTML را هنگام رخدادهای تعیین‌شده به صورت یک منبع بیسیس‌کور منتشر می‌کند.


**Required**

| attribute | kind | note |
| --- | --- | --- |
| `bc-triggers` | free_text | Space-separated DOM events on the element itself (keyup, change, click, ...); without it the runtime does not |

**Optional** (15)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `bc-name` | source_ref |  | Explicit source id; wins over name when both are present. |
| `name` | source_ref |  | Fallback source id used when bc-name is absent. |
| `bc-value` | free_text |  | Overrides the value that will be published instead of the element's current .value. |
| `bc-off-value` | free_text | off | Value published by an unchecked checkbox; the literal string "off" is used when it is… |
| `bc-keyField` | column_ref |  | Sets the keyFieldName source option when publishing. |
| `bc-statusField` | column_ref |  | Sets the statusFieldName source option when publishing. |
| `bc-merge` | enum |  | Merge behavior of the published source; the MergeType enum in the inspected source… |
| `if` | expression |  | Skips publication when the expression evaluates to false. |
| `ignoreNullSource` | boolean |  | Matters mainly when the component is triggered by BasisCore sources rather than direct… |
| `triggers` | source_ref |  | BasisCore source ids that make the input re-publish its current value; different from… |
| `events` | free_text |  | Inherited event-based triggering; less common for input components. |
| `OnProcessing` | identifier |  | Runs before publication and can mutate the outgoing id and value (best place to normalize |
| `OnProcessed` | identifier |  | Runs after processing. |
| `OnRendering` | identifier |  | Runs before the source is committed and can prevent publication. |
| `OnRendered` | identifier |  | Runs after the source is committed. |

**Caveats**
- warning: Authored as a plain HTML <input> with bc-triggers, not as <basis core="input">; no shipped example uses the basis-tag form.
- warning: Checkboxes normally publish value strings, not booleans: checked publishes bc-value or .value, unchecked publishes bc-off-value or "off".

```html
<input bc-triggers="keyup" name="app.query" />
```

## `schema` — input

Metadata-driven form engine that loads a question schema, builds sections and controls per part viewType, validates values and publishes a schema-aware change payload to a result source.

> فرمان schema از روی فراداده پرسش‌ها یک فرم پویا می‌سازد، مقادیر را اعتبارسنجی می‌کند و پاسخ نهایی را در یک منبع منتشر می‌کند.


**Optional** (20)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `schemaUrl` | url |  | Base URL used to fetch the question schema; combined with paramUrl when present. |
| `paramUrl` | free_text |  | Optional path suffix appended to schemaUrl; in edit/view mode it falls back to… |
| `displayMode` | enum |  | Selects the rendering mode. |
| `datamembername` | source_ref |  | Answer source to populate the form from. |
| `button` | css_selector |  | CSS selector passed to document.querySelectorAll to bind click handlers that collect the… |
| `resultSourceId` | source_ref |  | Source that receives the collected answer payload when validation succeeds; this is the… |
| `errorResultSourceId` | source_ref |  | Source that receives a validation-failed signal (a boolean flag, not a structured error… |
| `callback` | identifier |  | Field-level interaction hook passed into question parts; NOT the submit callback. |
| `schemaCallback` | identifier |  | Global async function (context, schemaUrl) that overrides schema loading and must return… |
| `cell` | integer |  | Column count used by the default skin layout manager (QuestionCellManager). |
| `filesPath` | free_text |  | Prefix prepended to file.url when rendering previously uploaded files in upload/blob… |
| `direction` | enum | rtl | Fallback text direction when the schema data does not supply its own; schema.direction… |
| `skin` | enum | default | Layout skin; template2 switches from QuestionCellManager to QuestionGridManager. |
| `min_width` | integer |  | Minimum width used by the html part control when sizing its iframe popup. |
| `max_width` | integer |  | Maximum width used by the html part control when sizing its iframe popup. |
| `min_height` | integer |  | Minimum height used by the html part control when sizing its iframe popup. |
| `max_height` | integer |  | Maximum height used by the html part control when sizing its iframe popup. |
| `options` | identifier |  | Name of a global variable evaluated at runtime and passed into validation configuration… |
| `qs_*` | free_text |  | Any attribute starting with qs_ becomes a query-string value (qs_rKey="www" -> rKey=www)… |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |

**Caveats**
- warning: `callback` is a field-level interaction hook, not the submit mechanism; submission is handed off through resultSourceId, and schemaCallback only overrides schema loading.
- warning: The shipped TypeScript source uses skin values `default` and `template2`; the older `template1` label from the short reference does not match the code.
- warning: `button` uses document.querySelectorAll globally, so a broad selector will bind every matching button on the page to this form.
- warning: callback, schemaCallback and options are resolved with eval, so the referenced names must be global and explicit.

```html
<basis core="schema"
       run="atclient"
       schemaUrl="/schema/questions/1161"
       displayMode="new"
       button="[data-btn-add]"
       resultSourceId="demo.data"
       errorResultSourceId="demo.error"
       qs_rKey="www"
       qs_name="haha"
       direction="rtl">
</basis>
```

## `select` — input

Runtime behavior attached to a plain HTML <select> carrying bc-triggers: it publishes the dropdown's current node.value into the context as a BasisCore source.

> رفتار select گزینه انتخاب‌شده در یک فهرست کشویی HTML را به صورت یک منبع بیسیس‌کور منتشر می‌کند.


**Required**

| attribute | kind | note |
| --- | --- | --- |
| `bc-triggers` | free_text | DOM events that publish the selection; change is the normal choice. |

**Optional** (11)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `bc-name` | source_ref |  | Explicit source id. |
| `name` | source_ref |  | Fallback source id used when bc-name is absent. |
| `bc-value` | free_text |  | Inherited override; rarely needed because HTMLSelectComponent returns this.node.value… |
| `bc-keyField` | column_ref |  | Publishes the keyFieldName source option. |
| `bc-statusField` | column_ref |  | Publishes the statusFieldName source option. |
| `bc-merge` | enum |  | Merge behavior when the source is stored; replace is almost always the right model for a… |
| `if` | expression |  | Skips publication when the expression resolves to false. |
| `OnProcessing` | identifier |  | Runs before the final source is constructed; use it to transform the outgoing id/value… |
| `OnProcessed` | identifier |  | Runs after processing completes. |
| `OnRendering` | identifier |  | Final pre-publication interception point; can prevent publication. |
| `OnRendered` | identifier |  | Runs after the source has been placed into context. |

**Children**: `<option>`

**Caveats**
- warning: Authored as a plain HTML <select> with bc-triggers, not as <basis core="select">.
- warning: <select multiple> is not handled: the component reads node.value, so assume scalar publication and validate any multi-select need in your own project.

```html
<select bc-triggers="change" name="app.status">
  <option value="draft">Draft</option>
  <option value="published">Published</option>
</select>
```

## `unknown-html` — input

Generic HTML-element source publisher used as the runtime fallback for any element carrying bc-triggers whose tag is not form, input or select (button, div, span, td, custom elements).

> unknown-html مؤلفه پیش‌فرض برای هر عنصر HTML دارای bc-triggers است که form، input یا select نباشد و مقدار آن عنصر را به صورت منبع منتشر می‌کند.


**Required**

| attribute | kind | note |
| --- | --- | --- |
| `bc-triggers` | free_text | DOM events to listen to; required for the element to be treated as a BasisTag at all. |

**Optional** (12)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `bc-name` | source_ref |  | Explicit source id. |
| `name` | source_ref | cms.unknown | Fallback source id; when both bc-name and name are missing the runtime publishes to… |
| `bc-value` | free_text |  | Value to publish; usually essential on generic tags because they have no meaningful… |
| `bc-keyField` | column_ref |  | Sets the key field used for source merges. |
| `bc-statusField` | column_ref |  | Sets the status field name for the published source. |
| `bc-merge` | enum |  | Controls merge behavior of the published source. |
| `bc-ignore` | boolean |  | Prevents the element from being treated as a BasisCore runtime element at all. |
| `if` | expression |  | Skips publication when the expression resolves to false. |
| `OnProcessing` | identifier |  | Lifecycle hook around the publish workflow. |
| `OnProcessed` | identifier |  | Lifecycle hook around the publish workflow. |
| `OnRendering` | identifier |  | Lifecycle hook around the publish workflow. |
| `OnRendered` | identifier |  | Lifecycle hook around the publish workflow. |

**Caveats**
- warning: Despite the name it is not only for invalid markup: buttons, divs, spans and table cells all route here because the specialized list is only [form, input, select].
- warning: Without bc-name and name the source silently lands in cms.unknown, which is too ambiguous for production code.
- warning: On generic tags without bc-value the runtime falls back to node.value and usually ends up publishing null.

```html
<button name="app.action" bc-triggers="click" bc-value="reload">
  Reload
</button>
```

## `chart` — renderable

Source-backed SVG generator that maps rows into a D3 rendering pipeline, building a chart-type-specific manager, applying merged style layers and shared features such as title, legend, hover and labels.

> فرمان chart داده‌های یک منبع را با کمک کتابخانه D3 به نمودار SVG تبدیل می‌کند.


**Required**

| attribute | kind | note |
| --- | --- | --- |
| `chartType` | enum | Selects the renderer; an unsupported value throws. |

**Optional** (16)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `datamembername` | source_ref |  | Selects the source member to visualize. |
| `x` | column_ref |  | X-axis / X-field, used mainly by bar and line charts. |
| `y` | column_ref |  | Numeric value field; the most important field across almost all chart types. |
| `group` | column_ref |  | Grouping/category series field; meaning shifts per chart type (bar clusters, line series, |
| `chartTitle` | free_text |  | Chart title text. |
| `axisLabel` | boolean |  | Turns on the chart's built-in textual annotation mode; exact meaning depends on the chart |
| `grid` | boolean |  | Enables grid lines for cartesian charts such as bar and line. |
| `legend` | boolean |  | Enables legend output rendered as foreignObject blocks with colored rectangles; it… |
| `horizontal` | boolean |  | Changes orientation for bar and stacked charts. |
| `hover` | boolean |  | Enables a lightweight tooltip div appended to the page body. |
| `chartContent` | expression |  | JavaScript expression evaluated and injected into a foreignObject in the donut/halfdonut… |
| `chartStyle` | expression |  | JavaScript expression returning a style object; merged over the built-in defaults. |
| `onLabelClick` | identifier |  | Callback used by the line chart axis label interaction; receives the event args and the… |
| `isStringLineChart` | boolean |  | Makes the line chart X scale use scalePoint over discrete string values instead of a… |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `style_*` | free_text |  | Any attribute whose name starts with style_ overrides one individual style key… |

**Caveats**
- error: Only six chart types exist in v2.39.6; guessed values such as pie or area do not work.
- warning: chartStyle and chartContent are evaluated as JavaScript expressions, not parsed as strict JSON, so syntax errors fail immediately; keep them simple object literals.
- warning: Line charts with non-numeric X values need isStringLineChart="true" or the numeric extent path misinterprets the data.

```html
<basis core="chart"
       run="atclient"
       datamembername="dashboard.sales"
       chartType="bar"
       x="month"
       y="amount"
       chartTitle="Monthly Sales"
       grid="true"
       legend="false">
</basis>
```

## `list` — renderable

Structured repeated renderer for list/grid output that shares the print render pipeline and adds grouping through <divider rowcount> plus last-row padding through <incomplete>.

> فرمان list سطرهای یک منبع را به صورت فهرست یا شبکه رندر می‌کند و امکان گروه‌بندی هر N آیتم با divider و تکمیل سطر ناقص با incomplete را دارد.


**Optional** (4)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `datamembername` | source_ref |  | Selects the source member to render. |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `pagesize` | integer |  | Mentioned in the short reference label, but no client-side pagination logic is… |
| `processRenderedContent` | boolean | true | Controls whether rendered child nodes are processed again by BasisCore; enabled by… |

**Children**: `<face>` · `<layout>` · `<else-layout>` · `<divider>` · `<incomplete>`

**Caveats**
- warning: Do not treat list as a self-contained pager: v2.39.6 client does not render paging controls or page state; treat pagination as a server-side or application-level concern.
- warning: If divider rowcount is missing or invalid the intended grouping structure fails.

```html
<basis core="list" datamembername="local.products" run="atclient">
  <face>
    <div>@name@</div>
  </face>
</basis>
```

## `print` — renderable

General-purpose row renderer that iterates a source member and renders one <face> template per row, optionally wrapped in <layout> or replaced by <else-layout>.

> فرمان print رکوردهای یک منبع داده را سطر به سطر و با استفاده از قالب‌های face به HTML تبدیل می‌کند.


**Optional** (9)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `datamembername` | source_ref |  | Selects the source member to render; a wrong value is the most common reason nothing… |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `if` | expression |  | Conditionally enables the whole command; different from face-level filter which only… |
| `ignoreNullSource` | boolean |  | Controls behavior when the bound source is missing or null so a missing source is not a… |
| `triggers` | source_ref |  | Space-separated source ids; the command re-runs when any of them is published. |
| `OnProcessing` | identifier |  | Global function name; intercepts and can transform the source before rendering. |
| `OnProcessed` | identifier |  | Global function name; observes the processed result. |
| `OnRendering` | identifier |  | Global function name; hook before DOM output is written. |
| `OnRendered` | identifier |  | Global function name; hook after DOM rendering completes. |

**Children**: `<face>` · `<layout>` · `<else-layout>`

**Caveats**
- warning: When print renders nothing, verify datamembername first; it is the most frequent error.

```html
<basis core="print" datamembername="inlineSource.products" run="atclient">
  <face>
    <div>@name@ — @price@</div>
  </face>
</basis>
```

## `schemalist` — renderable

Schema-aware list renderer that takes rows of saved answer objects, loads the matching question schema for each row and produces readable summary output per answer record.

> فرمان schemalist مجموعه‌ای از پاسخ‌های ذخیره‌شده اسکیما را می‌گیرد، تعریف پرسش متناظر هر پاسخ را بارگذاری می‌کند و خروجی فهرست‌وار تولید می‌کند.


**Optional** (4)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `datamembername` | source_ref |  | Source whose rows are IAnswerSchema-style saved answer objects (schemaId, schemaVersion… |
| `schemaUrl` | url |  | Base endpoint for loading the question schema per answer row; the runtime appends… |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `viewMode` | free_text |  | Appears in the public example but is not visibly consumed by the inspected… |

**Children**: `<face>`

**Caveats**
- warning: The inspected component body is thinner than the public examples; the verified contract is datamembername + schemaUrl, and advanced face helper expressions such as @prp[12].value() should…

```html
<basis core="schemalist"
       datamembername="answer.data"
       run="atclient"
       schemaUrl="/schema/questions">
</basis>
```

## `tree` — renderable

Recursive hierarchical renderer that rebuilds a hierarchy from a flat table of rows carrying parent references and renders it level by level, inserting descendants at @child.

> فرمان tree از یک جدول تخت که هر سطر آن به والد خود ارجاع می‌دهد ساختار سلسله‌مراتبی می‌سازد و آن را به صورت بازگشتی رندر می‌کند.


**Optional** (11)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `datamembername` | source_ref |  | Selects the source member to render. |
| `idcol` | column_ref | id | Column holding the node's own primary key. |
| `parentidcol` | column_ref | parentid | Column pointing to the parent row; essential for building the hierarchy. |
| `nullvalue` | free_text | 0 | Value that marks a root row; the literal string "null" matches JavaScript null, any other |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `processRenderedContent` | boolean | true | Controls whether generated DOM is processed again for nested BasisCore content. |
| `triggers` | source_ref |  | Space-separated source ids; the command re-runs when any of them is published. |
| `OnProcessing` | identifier |  | Global function name; intercepts and can transform the source before rendering. |
| `OnProcessed` | identifier |  | Global function name; observes the processed result. |
| `OnRendering` | identifier |  | Global function name; hook before DOM output is written. |
| `OnRendered` | identifier |  | Global function name; hook after DOM rendering completes. |

**Children**: `<face>` · `<layout>` · `<else-layout>`

**Caveats**
- error: The command throws when no row matches the configured root condition (parentidcol equal to nullvalue).
- warning: tree expects a FLAT relational source; it does not walk nested children arrays in JSON.

```html
<basis core="tree"
       datamembername="local.tree"
       idcol="id"
       parentidcol="pid"
       nullvalue="null"
       run="atclient">
  <face>
    <li>
      @name@
      <ul>@child</ul>
    </li>
  </face>
</basis>
```

## `view` — renderable

Grouped master/detail renderer that groups flat rows by a column, renders one level-1 face per group using the group's first row and injects the level-2 child output through @child.

> فرمان view سطرهای تخت یک منبع را بر اساس یک ستون گروه‌بندی می‌کند و آن‌ها را به صورت بخش‌های والد و فرزند نمایش می‌دهد.


**Optional** (9)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `datamembername` | source_ref |  | Selects the source member to render. |
| `groupcol` | column_ref | prpid (from setting default.viewcommand.groupcolumn) | Column used to group rows; falls back to the system default when omitted. |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `processRenderedContent` | boolean | true | Controls whether generated DOM is processed again for nested BasisCore content. |
| `triggers` | source_ref |  | Space-separated source ids; the command re-runs when any of them is published. |
| `OnProcessing` | identifier |  | Global function name; intercepts and can transform the source before rendering. |
| `OnProcessed` | identifier |  | Global function name; observes the processed result. |
| `OnRendering` | identifier |  | Global function name; hook before DOM output is written. |
| `OnRendered` | identifier |  | Global function name; hook after DOM rendering completes. |

**Children**: `<face>` · `<else-layout>`

**Caveats**
- warning: The short label "single-record display" is incomplete: view is really a grouped renderer over multiple rows.
- error: A level-1 face without @child renders parent markup but the child rows have nowhere to go.

```html
<basis core="view" datamembername="inlineSource.faq" groupcol="questionId" run="atclient">
  <face level="1">
    <article class="faq-block">
      <h2>@question@</h2>
      <div class="faq-body">@child</div>
    </article>
  </face>

  <face level="2">
    <p>@answer@</p>
  </face>
</basis>
```

## `callback` — side-effect

JavaScript bridge command that runs a named global function when a watched source is published or a configured DOM/timer event fires, passing {context, node, source} to the handler.

> فرمان callback هنگام تغییر منبع یا وقوع رویداد و تایمر، یک تابع جاوااسکریپت سراسری را فراخوانی می‌کند.


**Optional** (12)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `method` | identifier |  | Global JavaScript function name resolved with eval and invoked via Reflect.apply; when… |
| `triggers` | source_ref |  | Source ids to watch; when the command runs without an incoming source it scans these and… |
| `events` | free_text |  | Event descriptors handled by the inherited base logic: document.click, window.scroll… |
| `preventDefault` | boolean |  | Applies preventDefault() to matching DOM events before the handler runs. |
| `stopPropagation` | boolean |  | Applies stopPropagation() to matching DOM events before the handler runs. |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `if` | expression |  | Conditional execution guard. |
| `ignoreNullSource` | boolean |  | Skip execution when no source is supplied. |
| `OnProcessing` | identifier |  | Pre-processing hook. |
| `OnProcessed` | identifier |  | Post-processing hook. |
| `OnRendering` | identifier |  | Hook before the command run. |
| `OnRendered` | identifier |  | Hook after the command run. |

**Caveats**
- warning: `method` is resolved with eval, so the handler must be reachable in global scope.
- warning: The handler is NOT awaited; async work and async failures are entirely your responsibility, and only synchronous throws are caught.

```html
<basis core="callback"
       run="atclient"
       triggers="local.print"
       method="onSource">
</basis>
```

## `cookie` — side-effect

Declarative wrapper around document.cookie that builds a name=value string with optional max-age and path and writes it to the browser.

> فرمان cookie به صورت اعلانی یک کوکی مرورگر را می‌نویسد.


**Optional** (6)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `name` | free_text |  | Cookie key; effectively required since the implementation calls name.trim() without… |
| `value` | free_text |  | Cookie value; falls back to an empty string when the evaluated value is missing. Usually… |
| `max-age` | integer |  | Optional cookie max-age in seconds appended as ;max-age=<value>. |
| `path` | free_text |  | Optional cookie path appended as ;path=<value> when non-empty. |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `triggers` | source_ref |  | Source ids that cause the cookie to be rewritten with re-resolved bindings. |

**Caveats**
- warning: The command does NOT republish cms.cookie; that built-in source is a startup snapshot of document.cookie, so keep reactive state in a normal source and treat the cookie as persistence only.
- warning: domain, expires, secure, SameSite, HttpOnly, priority and partitioned are not read by CookieComponent in this version; do not use it for secure session cookies.

```html
<basis core="cookie"
       run="atclient"
       name="last_time"
       value="[##cms.cms.time2##]"
       max-age="55"
       path="/">
</basis>
```

## `schemauploader` — side-effect

Two-phase persistence helper for schema answers containing files: it swaps embedded File objects for generated blob ids, posts the answer JSON, then uploads each binary once the server returns usedforid.

> فرمان schemauploader پاسخ یک فرم اسکیما را ابتدا به صورت JSON ارسال می‌کند و سپس فایل‌های همراه آن را در مرحله دوم آپلود می‌کند.


**Optional** (9)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `datamembername` | source_ref |  | Source to watch; only the first row is processed and it may be the answer itself or a… |
| `name` | identifier |  | Base name for the published status sources <name>.uploading and <name>.uploaded. |
| `url` | url |  | Endpoint that receives the JSON answer POST; the response must contain usedforid. |
| `blob` | url |  | File-upload endpoint receiving multipart/form-data; falls back to url when omitted. May… |
| `noCache` | boolean |  | When true adds pragma: no-cache and cache-control: no-cache to the JSON request. |
| `OnProcessing` | identifier |  | The one clearly wired hook; receives the outgoing Request and may supply a custom… |
| `OnProcessed` | identifier |  | Present in the base class model but not visibly invoked by the inspected… |
| `Content-Type` | free_text |  | Token is read in the constructor but the inspected implementation still hardcodes… |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |

**Caveats**
- warning: Only rows[0] is processed, so bind it to a source representing ONE answer payload, never a list of records.
- error: If the JSON endpoint does not return usedforid the file-upload phase cannot complete.
- warning: Content-Type is not functionally effective for the JSON request in this build, and OnProcessed is not clearly invoked; prefer observing the status sources.

```html
<basis core="schemauploader"
       run="atclient"
       datamembername="demo.data"
       name="uploader"
       url="/blob/answer-json"
       blob="/blob/answer-blob">
</basis>
```

## `api` — source

Fetch-driven source command that builds a browser Request, executes it, parses the JSON response and publishes either the envelope-defined sources or one fallback source.

> فرمان api یک درخواست HTTP مستقیم از مرورگر ارسال می‌کند و پاسخ JSON را به یک یا چند منبع بیسیس‌کور تبدیل می‌کند.


**Optional** (15)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `url` | url |  | Request URL; may contain token bindings that are resolved before the fetch. |
| `method` | enum |  | HTTP method, uppercased before the Request is created. |
| `body` | free_text |  | Passed directly into RequestInit.body; objects are NOT serialized for you, so supply a… |
| `name` | source_ref | cms.api | Fallback source id used only when the JSON response has no `sources` envelope. |
| `Content-Type` | free_text |  | Added as a request header when present and non-empty. |
| `noCache` | boolean |  | When true adds pragma: no-cache and cache-control: no-cache request headers. |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `triggers` | source_ref |  | Re-runs the command when the listed sources are published. |
| `events` | free_text |  | Re-runs the command on DOM, document, window or timer events (e.g. timer.30000). |
| `if` | expression |  | Guards execution. |
| `ignoreNullSource` | boolean |  | Suppresses execution on a null trigger, useful so the command only runs after a… |
| `OnProcessing` | identifier |  | Receives {context, node, request, response}; assigning args.response replaces the default |
| `OnProcessed` | identifier |  | Receives {context, node, request, response, results}; assigning args.results (Data[])… |
| `OnRendering` | identifier |  | Execution guard hook before the command runs. |
| `OnRendered` | identifier |  | Hook after the command completes. |

**Caveats**
- warning: `name` only controls the output in the plain-JSON fallback path; when the response contains a `sources` array the ids come from sources[*].options.tableName.
- warning: Child <member> elements are NOT inspected by APIComponent; treat them as legacy decoration.
- warning: The default parser calls response.json(); non-JSON endpoints require OnProcessed to do their own parsing.
- warning: When OnProcessed exists the default JSON mapping is skipped entirely and you own parsing, Data creation and source ids.

```html
<basis core="api"
       run="atclient"
       url="/api/products"
       method="get"
       name="products">
</basis>
```

## `dbsource` — source

Thin member-based source loader that serializes its own markup, sends it plus dmnid to a named connection, maps returned datasets to <member> elements by position and publishes each as commandName.memberName.

> فرمان dbsource نشانه‌گذاری خود را به یک اتصال پیکربندی‌شده می‌فرستد و هر مجموعه‌داده بازگشتی را به عنوان یک منبع مستقل منتشر می‌کند.


**Optional** (5)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `source` | identifier |  | Name of the configured connection (connection.web.*, connection.websocket.*… |
| `name` | identifier |  | Prefix of every published source id; the final id is <name>.<member name>, lowercased. |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |
| `triggers` | source_ref |  | Source ids that cause the command to re-run and re-resolve its tokenized attributes. |
| `*` | free_text |  | Any additional custom attribute (e.g. filter-name="[##data.filter.name##]") is… |

**Children**: `<member>`

**Caveats**
- error: If the number of returned datasets differs from the number of <member> nodes the client throws "Command '<name>' has X member(s) but Y result(s) returned from source!".
- error: Once a streaming connection is open the `source` attribute cannot change; changing it throws "Source attribute can't change when socket is open".
- warning: The request payload is the serialized outerHTML of the command (token-expanded) plus dmnid, so the backend contract depends on your markup attributes.
- warning: Using member sort or postsql requires AlaSQL; configure host.dbLibPath or loading fails with "Error in load 'alasql'. 'DbLibPath' not configure properly in host object.".

```html
<basis core="dbsource" source="bookapi" name="book" run="atclient">
  <member name="list"></member>
</basis>
```

## `inlinesource` — source

Client-side derived-source factory that executes each child <member> in memory and publishes one source per member named commandName.memberName in lowercase.

> فرمان inlinesource با استفاده از عضوهای join و sql، منبع‌های جدیدی را از منابع موجود در سمت کلاینت می‌سازد.


**Optional** (2)

| attribute | kind | default | note |
| --- | --- | --- | --- |
| `name` | identifier |  | Prefix of every published source id; the final id is <name>.<member name>, lowercased. |
| `run` | enum |  | Client/server execution mode; every client-side example in the docs uses atclient. |

**Children**: `<member>`

**Caveats**
- warning: The published id is <name>.<member>, never the command name alone, and it is lowercased regardless of how it was authored.
- warning: Only format="join" and format="sql" are validated in the inspected client bundle; raw <row>-style member markup is not validated client behavior.
- error: join lefttblcol/righttblcol must have exactly three parts (source.member.column); anything else throws.
- warning: join output columns are aliased as <source>_<member>_<field> (e.g. db_data1_name), so templates and follow-up SQL must use the aliased names.

```html
<basis core="inlinesource" name="list" run="atclient">
  <member name="star" format="join"
          lefttblcol="db.data1.id"
          righttblcol="db.data2.studentid"
          jointype="leftjoin" />
</basis>
```
