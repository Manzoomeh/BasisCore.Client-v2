# Client binding, run mode and sources — v2.39.6

## Binding forms

| syntax | name | resolves to |
| --- | --- | --- |
| `[##source.member.column##]` | general source-binding token (context token) | scalar value when source.rows.length == 1; an array built from all rows when source.rows.length > 1 |
| `[##source.member##]` | source/member token without a column | not a normal field extractor; the runtime moves into source-presence / state-oriented behavior |
| `[##source.member.column | (default)##]` | fallback chain token | the first meaningful value found while walking the ' | '-separated parts left to right; a part wrapped in parent |
| `@expression@` | face-template (content template) syntax | the value of the expression, compiled with new Function(...) and evaluated against the current data row; every |
| `{{ javascript }}` | inline code block | the return value of an AsyncFunction("$bc", "$data", ...) executed by the client runtime; the wrapper catches |

## Structural markers

- `@child` — Structural layout placeholder meaning 'insert the rendered child content here'. It is not a row field named 'child' and must not be read as an ordinary face field.  
  valid in: layout
- `$bc` — The BasisCore context/runtime object injected as the first argument of the AsyncFunction that a {{...}} code block compiles into; used for calls such as $bc.tryToGetSourc  
  valid in: code block {{...}}
- `$data` — Current row data injected as the second argument of a {{...}} code block. It is reliable inside row-aware content templates such as <face>; in the generic string/attribut  
  valid in: code block {{...}} inside face templates, code block {{...}} in generic string bindings (may be undefined there)

## Run mode

### `atclient`

Explicit client-side mode. Element.prototype.isBasisCore() returns true only when the node is an element, its nodeName is BASIS and run equals 'atclient'; ComponentCollection.findRootLevelComponentNode only collects nodes for which isBasisCore() is true. This opts the command into the client pipeline: host.sources, $bc.setSource, triggers, client-side API calls, client-side database processing, client-side schema rendering and incremental rendering after load.

### `(run attribute omitted)`  (default)

The JavaScript client does not treat the <basis> node as a client command: no command component is built, no client initialization or source-triggered processing happens, and any <face> inside it is not interpreted by the client command pipeline. At document level the docs call this 'server-side rendering (default)', meaning the command is server-owned, pre-rendered or inactive from the browser's point of view - not that the browser bundle contains a second active execution engine.


## Built-in sources

| id | meaning |
| --- | --- |
| `cms.query` | URL query-string values. BasisCoreRootContext reads window.location.search, strips the leading '?', splits by '&', splits each pair by '=', decodes… |
| `cms.cookie` | Browser cookies built from document.cookie by splitting on ';' then on '=' and reducing into a single object. Published only when document.cookie is… |
| `cms.request` | Current browser location environment, always created in the client startup path, with the shape { requestId: -1, hostip: window.location.hostname… |
| `cms.cms` | Simple date/time strings generated from a JavaScript Date at startup: date (YYYY/MM/DD), time (HH:MM), date2 (YYYYMMDD), time2 (HHMMSS), date3… |

## Global attributes

| attribute | applies to | default | note |
| --- | --- | --- | --- |
| `run` | <basis> command elements |  | Only 'atclient' is recognized by the client runtime (isBasisCore checks… |
| `core` | <basis> command elements |  | Names the command family (print, list, view, tree, chart, schema, schemalist, schemauploader… |
| `name` | source-producing commands and plain HTML |  | On source-producing commands it is the published source id. On plain HTML elements it is the second |
| `datamembername` | source-backed renderable commands (print |  | A single source name. SourceBaseComponent subscribes implicitly via addTrigger([sourceName]), then… |
| `triggers` | <basis core="callback"> |  | Verified resolution: triggers.split(' ') then addTrigger(names). Each name is registered with… |
| `events` | any command |  | Registers DOM listeners on resolved targets and calls renderAsync(new SyntheticSource(...))… |
| `if` | commands |  | Boolean-style attribute resolved through ToBooleanToken. When it resolves to false, neither… |
| `preventDefault` | commands using events="..." |  | Read via getAttributeBooleanValueAsync('preventDefault', false); when true the events handler calls |
| `stopPropagation` | commands using events="..." |  | Read via getAttributeBooleanValueAsync('stopPropagation', false); when true the events handler… |
| `OnProcessing` | components (renderable, HTML control and |  | Lifecycle hook; its presence is verified, but whether every source-backed component interprets… |
| `OnProcessed` | components (renderable, HTML control and |  | Lifecycle hook; presence verified, consistency boundaries across components unverified. |
| `OnRendering` | components (renderable, HTML control and |  | Lifecycle hook; does not fire when an if attribute resolves to false. Consistency boundaries across |
| `OnRendered` | components (renderable, HTML control and |  | Lifecycle hook; presence verified, consistency boundaries across components unverified. |
| `bc-triggers` | any plain HTML element |  | The activation attribute: Element.prototype.isBasisTag() returns true when the element has… |
| `bc-name` | any plain HTML element with bc-triggers |  | Explicit source id; first step of the resolution order bc-name -> name -> 'cms.unknown'. It does… |
| `bc-value` | any plain HTML element with bc-triggers |  | Explicit published value; resolution order for non-checkbox flows is bc-value, then the element's… |
| `bc-off-value` | checkbox elements with bc-triggers | off | Value published when a checkbox is unchecked; if the attribute is missing the runtime falls back to |
| `bc-key` | HTML elements (listed in the reverse-eng |  | Listed in the reverse-engineered reference but NOT clearly consumed by the inspected HTML-element… |
| `bc-keyField` | any plain HTML element with bc-triggers |  | Sets the keyFieldName option on the published source, enabling key-based row identification for… |
| `bc-statusField` | any plain HTML element with bc-triggers |  | Sets the statusFieldName option on the published source, naming the field that expresses the… |
| `bc-merge` | any plain HTML element with bc-triggers | replace | The runtime reads the raw attribute, lowercases it and maps it into the merge enum, attaching it as |
| `bc-ignore` | any HTML element |  | isIgnoreTag() returns true when the element has bc-ignore; the component collector then skips that… |

## Merge strategies

- **replace** (default) — Verified repository merge strategy and the default: if no merge type is supplied the Source constructor falls back to MergeType.replace. If the source does not exist it is stored; if it exists…
- **append** — Verified repository merge strategy with two paths. Path A: if either side lacks a keyFieldName, the repository simply calls oldSource.addRows(newSource.rows) - plain concatenation with no duplicate…
- **push** — Listed in the reverse-engineered master reference's broader merge vocabulary but NOT verified as a repository MergeType value in the uploaded v2.39.6 TypeScript source (the verified enum is only {…
- **join** — Mentioned in the reverse-engineered master reference alongside merge values, but verified as an inline-source member format (member format="join" with lefttblcol, righttblcol, jointype such as…

## Documented gaps — verify before relying on these

- schemauploader end-to-end contract: the canonical request payload shape for all upload modes, the exact supported answer field patterns, whether multiple file rows are officially supported, whether all declared request headers…
- repeater public authoring surface: the full supported attribute list, whether repeater-only attributes exist, official authoring patterns distinct from print, and which behaviors are public semantics versus implementation…
- cookie command usage depth: the complete supported attribute set, the intended author-facing syntax, and expiry/path/domain/secure/same-site handling in practical examples are weaker than ideal.
- dbsource and the AlaSQL operating envelope: which SQL subset is officially safe, whether multi-database scenarios are first-class, query performance at scale, client-database lifetime across render cycles, and boundaries around…
- Connection protocol details beyond public host settings: exact chunk frame format for chunkbased, heartbeat timing and payload conventions, reconnect expectations for websocket and chunk streams, the full rest request/response…
- Push notifications and service worker deployment contract: exact backend subscription payload expectations, server-side message format conventions, production error/retry patterns, VAPID operational assumptions beyond the public…
- component.* repository loading conventions: the exact shape a custom repository should expose, the preferred packaging pattern for reusable third-party components, versioning expectations, and which loading conventions are…
- Lifecycle hook semantics across all components: whether all source-backed components interpret OnProcessing / OnProcessed / OnRendering / OnRendered identically, whether every hook is guaranteed in every render path, the exact…
- Internal DOM vocabulary is not the same as public authoring API: the data-bc-* markers clearly exist, but which are stable enough for debugging, useful for CSS targeting, or public enough for long-term automation is not formally…
- Bundle-to-source drift: it is unclear whether every inspected source file maps perfectly to the exact shipped build; where source and bundle differ, the release bundle should be treated as the practical source of truth.
