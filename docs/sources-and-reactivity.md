# Sources and reactivity

A *source* is the unit of data in BasisCore Client: a named, lower-cased id (`inlinesource.users`, `cms.query`, `form.status`) that holds an array of rows plus a few merge options. Every piece of data a page works with, whether it came from a server call, an inline `<member>`, an HTML `<input>`, or a `$bc.setSource` call, ends up as a source inside a *repository* that belongs to a *context*. Commands and tokens subscribe to source ids; publishing a source with the same id again merges the new rows into the stored source according to its `mergeType` and then re-runs every subscriber. This page documents the data model (`Source`, `ISourceOptions`, `MergeType`, `DataStatus`), the exact merge algorithm, the three context classes and how sources flow from an owner context to its children, the sources the runtime creates for you (`cms.*` and `host.sources`), the JavaScript handler API, how renderers reuse already rendered rows, and the four ways a command gets re-run.

## The Source class

`src/data/Source.ts` implements `ISource`. A source is created with `new Source(id, data, options?)` (exposed to page code as `$bc.util.source.new(...)`) or indirectly by `context.setAsSource(id, data, options?, preview?)`.

| Member | Type | Description |
|---|---|---|
| `id` | `string` | The id passed to the constructor, converted with `toLowerCase()`. All repository lookups are also lower-cased, so ids are case-insensitive everywhere. |
| `rows` | `any[]` | The normalised row array (see below). |
| `versions` | `number[]` | One counter per row position, starting at `0`. Renderers use it to decide whether a row must be rendered again. |
| `mergeType` | `MergeType` | `options.mergeType ?? MergeType.replace`. |
| `keyFieldName` | `string` | `options.keyFieldName`; the row property that identifies a row. |
| `statusFieldName` | `string` | `options.statusFieldName`; the row property that holds a `DataStatus` value. |
| `extra` | `any` | `options.extra`; free metadata carried with the source (for example the `extra` block returned by a server response). |

### Row normalisation

The `data` argument is normalised the same way in `Source` and in `Data`:

| `data` | `rows` |
|---|---|
| an array | the array itself (same reference, not copied) |
| any other value where `typeof data === "object"` (including `null`) | `[data]` |
| a string, number, boolean, `undefined`, function | `[{ value: data }]` |

So `$bc.setSource("local.name", "default")` produces one row `{ value: "default" }`, which is why the scope example binds `[##local.name.value##]` and the face template uses `@value`. Note that `null` is an object for `typeof`, so `setAsSource("x", null)` stores a single `null` row, not an empty source.

### Methods

| Method | Effect |
|---|---|
| `cloneOptions()` | Returns `{ keyFieldName, mergeType, statusFieldName, extra }` so a derived source can be created with the same options (used by `repeater`, `$bc.util.source.sortAsync` and `runSqlAsync`). |
| `addRow(row)` | Pushes the row and a version `0`. |
| `addRows(rows)` | Appends all rows. The matching version entries are added after the rows have already been appended, so they land beyond the end of the `versions` array and are `undefined` rather than `0` (see Pitfalls). |
| `replaceRowFromIndex(index, newRow)` | Replaces the row at `index` and increments `versions[index]` by one. |
| `removeRowFormIndex(index)` | Removes the row and its version entry. |
| `getVersion(row)` | `versions[rows.indexOf(row)]`, or `0` when the row object is not in `rows`. |
| `replace(source)` | In-place replacement, see next section. |

### `replace()` and version bumping

`replace(newSource)` keeps the stored `Source` object (and therefore every reference a subscriber already holds) and swaps its content:

1. All current rows are spliced out and `newSource.rows` spliced in.
2. If the new row count is smaller, the surplus version entries are dropped. If it is larger, the extra positions are filled with `-1`.
3. Every version entry is incremented by one. Positions that existed before therefore go `0 -> 1 -> 2 ...`; newly added positions become `0`.
4. `mergeType` (`?? MergeType.replace`), `keyFieldName`, `statusFieldName` and `extra` are copied from the new source.

Versions are tracked per *position*, not per key. The renderer section below explains what that means.

### The Data class

`src/data/Data.ts` is the lightweight sibling used for data arriving from connections (`IServerResponseSource`, the `results` of `api`, the `onDataReceived` callback of `context.loadDataAsync`). It has `id`, `rows` (same normalisation) and `options?: ISourceOptions`, but no version tracking and no lower-casing. `$bc.util.source.data(id, data, options)` creates one.

## ISourceOptions, MergeType and DataStatus

```ts
interface ISourceOptions {
  mergeType?: MergeType;      // replace (default) | append
  keyFieldName?: string;      // row property used as the key
  statusFieldName?: string;   // row property holding a DataStatus
  extra?: any;
}

enum MergeType  { replace = 0, append = 1 }
enum DataStatus { added = 0, edited = 1, deleted = 2 }
```

`MergeType` is exported on the `basiscore` global (`basiscore.MergeType.append`). `DataStatus` is **not** exported; use the numeric values `0`, `1`, `2` in row data (comparison in the repository uses `==`, so the strings `"0"`, `"1"`, `"2"` coming from form fields work too).

Where the options come from:

| Producer | How options are given |
|---|---|
| `$bc.setSource(id, data, options)` / `context.setAsSource(id, data, options)` | third argument |
| `host.sources` | `{ options: {...}, data: [...] }` form of an entry |
| `<input>`, `<select>`, `<form>` and any element with `bc-triggers` | `bc-merge="append|replace"`, `bc-keyField`, `bc-statusField` attributes (the value of `bc-merge` is lower-cased and looked up in `MergeType`; an unknown value falls back to `replace`) |
| server responses (`dbsource`, `api`) | the `options` block of each returned source (`IServerResponseSourceOptions`) |

## The merge algorithm (Repository.setSourceEx)

`src/repository/Repository.ts` holds one `Map<SourceId, ISource>` per context. `setSource(newSource, preview?)` runs the following algorithm and returns the *result source*, which is the source object that stays in the repository:

```
old = repository.get(newSource.id)

if newSource.mergeType == replace:
    if old exists:  old.replace(newSource)            -> result = old
    else:           repository.set(id, newSource)     -> result = newSource

if newSource.mergeType == append:
    if old does not exist: repository.set(id, newSource) -> result = newSource
    else if newSource.keyFieldName AND old.keyFieldName are both set:
        for each row in newSource.rows:
            key    = row[newSource.keyFieldName]
            status = newSource.statusFieldName ? row[newSource.statusFieldName] : DataStatus.added
            if status == added:
                old.addRow(row)                           (no duplicate check)
            else:
                i = index of first old row where oldRow[old.keyFieldName] == key
                if i found and status == deleted: old.removeRowFormIndex(i)
                if i found and status == edited:  old.replaceRowFromIndex(i, row)
                (not found, or any other status value: row is ignored)
        -> result = old
    else:
        old.addRows(newSource.rows)                       -> result = old
```

Facts that follow from the code:

- **First publication**: whatever the merge type, the first source with a given id is stored as is. `mergeType: append` on a brand new id behaves like `replace`.
- **`replace` on an existing id** keeps the same `Source` object and bumps all versions; subscribers that cached the object see the new rows.
- **`append` without key fields on both sides** is a plain concatenation. The stored source keeps its own `keyFieldName`, `statusFieldName` and `mergeType`; the options of the incoming source are not copied in this branch.
- **`append` with key fields**: `keyFieldName` must be set both on the stored source (from its first publication) and on the incoming source; otherwise the concatenation branch is taken. The example `key-field` demonstrates the three variants (`withOutKey`, `withKey`, `withStatus`).
- **Status semantics**: without `statusFieldName` every incoming row is treated as `added` and pushed, even if a row with the same key already exists. With `statusFieldName`, `edited` and `deleted` rows are matched against the stored rows by key; an `edited` row replaces the matched row object (so a partial object replaces the full old row) and increments only that row's version; a `deleted` row removes it. A row whose key is not found is silently dropped. Only the first matching old row is affected.
- **Loose comparisons**: key matching and status comparison use `==`, so `id: 5` matches `id: "5"` and `status: "1"` is `edited`.

After the merge, `Repository.setSource`:

1. If `preview` is `true`, calls `logger.logSource(source)` with the *incoming* source: `console.log(source)`, `console.log(JSON.stringify(rows))`, `console.table(rows)`.
2. Triggers the handlers registered for the id (`EventManager.Trigger(resultSource)`), passing the result source, i.e. the merged stored source and not the incoming fragment.
3. Logs `"<id> Added... N Row(s)"` when the incoming source was stored as is, or `"<id> Updated... N Row(s)"` when it was merged into an existing one.

`Context.setSource` then calls its private `onDataSourceSetHandler(resultSource)`, which resolves pending `waitToGetSourceAsync` promises for that id and finally fires the context's `onDataSourceSet` event, which is what child contexts listen to.

## Contexts

Every component receives an `IContext`. There are three concrete classes in `src/context/`:

| Class | Created by | Repository | Lookup | Extra behaviour |
|---|---|---|---|---|
| `BasisCoreRootContext` (extends `RootContext`) | each `BCWrapper.run()` (one per `$bc` instance) | own | own only | owns the `ConnectionOptionsManager`, loads pages/data through connections, loads AlaSQL (`getOrLoadDbLibAsync`), publishes `host.sources`, `cms.query`, `cms.cookie`, `cms.request`, `cms.cms` |
| `LocalRootContext` (extends `RootContext`) | `<basis core="group">`, one per run of the group | own | own, then owner | has its own connection manager built from its options (the group's `options` attribute merged over the parent's original options, or the parent's options); publishes `host.sources` again into its own repository; subscribes to `owner.onDataSourceSet` |
| `LocalContext` (extends `Context`) | `<basis core="repeater">`, one per row; also the `ILocalContext` DI token | own | own, then owner | delegates `loadPageAsync`, `loadDataAsync`, `getOrLoadDbLibAsync` to the owner; subscribes to `owner.onDataSourceSet`; `repeater` publishes `<name>.current` into it with the row and the data source's cloned options |

### Lookup falls back to the owner

`LocalContext.tryToGetSource` and `LocalRootContext.tryToGetSource` are both `super.tryToGetSource(id) ?? this.owner.tryToGetSource(id)`. A source published inside a group or a repeater item is stored in that context's repository and is visible to that context and its descendants, but not to the owner or siblings. A source published in the owner is visible everywhere below it unless a descendant has published its own source with the same id.

`waitToGetSourceAsync(id)` first tries the lookup chain; if nothing is found it registers a one-shot resolver in the *current* context's repository (`resolves` map). The resolver fires when that id is next published in this context or arrives from the owner.

### Propagation from owner to child: setSourceFromOwner

Both child context classes register `this.setSourceFromOwner.bind(this)` on `owner.onDataSourceSet` in their constructor and remove it in `dispose()`. When the owner publishes any source:

1. `Repository.setSourceFromOwner(source)` in the child **deletes the child's own copy** of that id if it has one, so the lookup now falls through to the owner's (newer) source.
2. The child's handlers for that id are triggered with the owner's source object.
3. `"<id> Added from owner context..."` is logged.
4. `Context.onDataSourceSetHandler` resolves the child's pending waiters and fires the child's own `onDataSourceSet`, so the propagation continues to grandchildren.

Nothing flows upward: publishing in a child never reaches owner handlers. The `group/scope` example shows the consequences: the inner `<form name="local.name">` inside group 2 publishes into group 2's `LocalRootContext`, so only group 2 and group 3 re-render, while the outer `<input name="local.name" bc-triggers="keyup">` inside group 1 publishes into group 1's context, which deletes group 2's local copy and updates groups 1, 2 and 3.

### The preview flag

`setAsSource(id, data, options?, preview?)` and `setSource(source, preview?)` accept a trailing `preview` boolean. When `true`, the incoming source is dumped to the console (`console.log` of the object, `JSON.stringify` of the rows and `console.table`). `$bc.setSource` does not expose this flag; `args.context.setAsSource(...)` in callbacks and `component.setSource(...)` in user-defined components do.

## Built-in sources

`BasisCoreRootContext` publishes these when a root context is created (that is, when `run()` happens). They are plain sources with `mergeType: replace`, so you can overwrite them with `$bc.setSource`.

| Source | Created | Row shape |
|---|---|---|
| `cms.query` | only when `window.location.search` has content after the `?` | one row; each `name=value` pair becomes a property. The value is `decodeURIComponent`-ed; the name is not. A pair without `=` gets `""`. Later duplicates overwrite earlier ones. |
| `cms.cookie` | only when `document.cookie` is non-empty | one row built by splitting on `;` and then on `=`. Names are **not trimmed**, so with the usual `a=1; b=2` formatting the second property is `" b"`. Values are not decoded, and a value containing `=` is cut at the first `=`. |
| `cms.request` | always | `{ requestId: -1, hostip: window.location.hostname, hostport: window.location.port }`. `hostip` is the host *name*, not an IP address. |
| `cms.cms` | always | `{ date: "YYYY/MM/DD", time: "HH:MM", date2: "YYYYMMDD", time2: "HHMMSS", date3: "YYYY.MM.DD" }`, all parts zero-padded to two digits. |

`cms.cms` is a snapshot taken once at start-up; it does not tick. Its date fields are wrong: the month is produced with `Date.getMonth()` (0 based, so January is `00`) and the day with `Date.getDay()` (day of the week, `00` to `06`) instead of `getDate()`. Only `time` and `time2` are reliable. Produce your own date source if you need one.

Tokens treat the `cms` prefix specially: when a `[##cms.x.y##]` token is the last part of a binding expression and the source does not exist, the token resolves to `null` immediately instead of waiting for the source. Any other missing source in last position makes the token wait with `waitToGetSourceAsync`. See [binding-and-tokens](binding-and-tokens.md).

`host.sources` entries are published by `RootContext` before the `cms.*` sources, so they are available before any component is processed. Each key is lower-cased; an entry can be a plain row array or `{ options: ISourceOptions, data: any[] }`. Because `LocalRootContext` also extends `RootContext`, every `group` republishes the same `host.sources` entries into its own repository (they are removed again from the group's repository as soon as the owner publishes a source with the same id). See [host-configuration](host-configuration.md).

## Handler API

These methods are on every `IContext` (available as `args.context` in callbacks and `OnProcessing`/`OnRendered` hooks, as `this.context` in user-defined components, and as `$bc` inside `{{ ... }}` code blocks):

| Method | Behaviour |
|---|---|
| `tryToGetSource(id)` | Returns the stored `ISource` (lower-cased lookup, owner fallback in child contexts) or `undefined`. |
| `waitToGetSourceAsync(id)` | Resolves with the existing source, or with the result source of the next publication of that id in this context (or from the owner). One-shot: the pending resolver is removed once it fires. |
| `addOnSourceSetHandler(id, handler)` | Registers `handler(resultSource)` in this context's repository. The handler set is a `Set`, so the same function is added once; a second registration logs nothing. Handlers fire for publications in this context and for publications propagated from the owner. Logs `"handler Added for <id>..."`. |
| `removeOnSourceSetHandler(id, handler)` | Removes the handler. Nothing happens if it was not registered. |
| `setAsSource(id, data, options?, preview?)` | `setSource(new Source(id, data, options), preview)`. |
| `setSource(source, preview?)` | Runs the merge algorithm, triggers handlers, resolves waiters, propagates to children. |

Handlers receive the merged result source, run synchronously inside the publishing call, and are wrapped in `try/catch` by `EventManager.Trigger`: an exception in one handler is written with `console.error` and does not stop the others. Handlers run in registration order.

Components use the same API through `Component.addTrigger(ids)`, which registers one bound handler per id (deduplicated per component) and removes all of them in `disposeAsync()`. The handler calls `onTrigger(source)`, which skips the call if the component is disposed, or if it is still busy with a previous render and `allowMultiProcess` is false (true only for `callback`, `dbsource` and `inlinesource`). A dropped trigger is not logged.

## How renderers re-render incrementally

`print`, `list`, `view` and `tree` extend `RenderableComponent` (`src/component/renderable/base/`). Each component instance owns one `FaceRenderResultRepository`, a map from *row key* to `FaceRenderResult { key, version, nodes }` that lives as long as the component. Rendering a source goes through `RenderParam.getRenderedResultAsync(row)` for every row:

1. `key = source.keyFieldName ? row[source.keyFieldName] : row` (the row object itself when no key field is set).
2. `version = source.getVersion(row)`.
3. If the repository already has a result for `key` **and** its stored version equals `version`, that result is reused: its DOM nodes are moved into the newly built content without evaluating the template again. Otherwise the first matching `<face>` template is rendered, converted with `$bc.util.toElement`, and stored under `key` with the current version.

The component then rebuilds its whole output (optional `<layout>` with `@child`, or `<else-layout>` when there are no rows), replaces the previous content and, unless `processRenderedContent="false"`, processes the generated nodes as a new component collection (disposing the previous one).

What this means in practice (all of it can be observed with the `change color` buttons in the `print/key-field` and `tree/dynamic` examples, whose inline style survives only when the node is reused):

| Scenario | Result |
|---|---|
| Re-run without changing the source (for example `triggers="event.refresh"`) | same row objects, same versions: every row is reused, nothing is re-rendered. |
| `replace` publication, no `keyFieldName` | new row objects are new keys: everything is re-rendered. The old entries stay in the repository map until the component is disposed. |
| `replace` publication with `keyFieldName` | `replace()` increments the version of every existing *position*, so rows that stay at a position they already occupied are re-rendered; a key that moves to a position whose counter happens to equal the version stored for that key is reused with stale content (versions are positional). In the common case (same row count, same order) everything re-renders. |
| `append` with `keyFieldName`, no `statusFieldName` | every incoming row is pushed as `added`; a duplicate key gets version `0`, which equals the stored result, so the existing nodes are moved to the duplicate's position and the key appears once in the output although the source now holds two rows. |
| `append` with `keyFieldName` and `statusFieldName` | `edited` rows get a new version and are re-rendered; `deleted` rows disappear; untouched rows keep their version and are reused. This is the intended incremental path (`tree/dynamic`, `print/add-edit-delete`). |
| `append` without key fields | rows are concatenated; the new rows have `undefined` versions and render once, then are reused. |

`tree` applies the same mechanism per node (`TreeFaceRenderResult`) and re-attaches the child list under the `@child` placeholder of a reused parent. `view` groups results by `groupcol` value using the `groupName` argument of the repository.

## Processing order at start-up

`ComponentCollection.runAsync` processes components in three waves, awaiting all components of one wave before starting the next (`Priority` enum in `src/enum.ts`):

| Priority | Components |
|---|---|
| `high` | `call` |
| `normal` | `dbsource`, `inlinesource`, `api` (`SourceComponent` family) |
| `low` | the `Component` default: `print`, `list`, `view`, `tree`, `chart`, `schema`, `schemalist`, `schemauploader`, `group`, `repeater`, `cookie`, `component` |
| `none` | never processed in the start-up pass: `[##...##]` text/attribute tokens, `input`/`select`/`form`/`unknown-html` elements, `callback`. They do their work in `initializeAsync` or only when a trigger or event fires. |

Within a wave the components run concurrently; there is no ordering by document position. Source producers therefore finish before renderers start, but two renderers may run in any order.

## The four ways a command is re-run

Details of the attributes are in [command-attributes-and-lifecycle](command-attributes-and-lifecycle.md); this is the reactivity summary.

1. **Implicit `datamembername`**. Every `SourceBaseComponent` (`print`, `list`, `view`, `tree`, `chart`, `schema`, `schemalist`, `schemauploader`, `repeater`) lower-cases its `datamembername` and calls `addTrigger([id])`. When the handler fires with a different source id (because of `triggers`), the component re-reads its own source with `tryToGetSource`. If the source does not exist yet nothing is rendered and `OnRendered` is not called.
2. **`triggers="a.b c.d"`** (space separated, on any command). `ElementBaseComponent.initializeAsync` registers every listed id with `addTrigger`. The handler receives the published source. `callback` is the typical consumer: on a trigger it calls `method` with `{ context, node, source }`; without `method` it logs the source with `logSource`.
3. **`bc-triggers="change keyup"`** on an HTML element. These are DOM event names, not source ids. The element becomes a *publisher*: on each event it builds `new Source(bc-name ?? name ?? "cms.unknown", bc-value ?? element.value, { keyFieldName: bc-keyField, statusFieldName: bc-statusField, mergeType: bc-merge })` and calls `context.setSource`. `event.preventDefault()` is always called. The element is marked with `data-bc-init` so listeners are attached once. See [html-element-binding](html-element-binding.md).
4. **`events="document.click window.scroll #area.scroll timer.5000"`** on any command. Each item is `target.eventName`; `document` and `window` are the globals, `timer.N` starts a `setInterval(N)`, anything else is a CSS selector passed to `document.querySelectorAll`. The handler calls `renderAsync` directly (bypassing the repository and the busy guard) with a synthetic source whose id is the item text: for DOM events the single row is the `Event` object, for timers it is `{ value: timerId }` (the `callback/timer` example clears the interval with `arg.source.rows[0].value`). `preventDefault="true"` and `stopPropagation="true"` apply to the DOM events.

## Examples

### Replace versus append from JavaScript

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Replace and append</title>
</head>
<body>
  <button onclick="ReSetSource()">Set Source</button>

  <fieldset>
    <legend>Append</legend>
    <basis core="print" datamembername="inlineSource.append" run="atclient">
      <face>
        <script type="text/template">
          <br />
          <span>@id ( name is:@name@ ) </span>
        </script>
      </face>
    </basis>
  </fieldset>

  <fieldset>
    <legend>Replace</legend>
    <basis core="print" datamembername="inlineSource.replace" run="atclient">
      <face>
        <script type="text/template">
          <br />
          <span>@id ( name is:@name@ ) </span>
        </script>
      </face>
    </basis>
  </fieldset>

  <basis core="callback" run="atclient" triggers="inlineSource.replace inlineSource.append"></basis>

  <script>
    const host = {
      sources: {
        "inlineSource.append": [{ id: 1, name: "qamsari" }, { id: 2, name: "akaberi" }, { id: 3, name: "amir" }],
        "inlineSource.replace": [{ id: 1, name: "qamsari" }, { id: 2, name: "akaberi" }, { id: 3, name: "amir" }]
      }
    };

    let i = 4;
    function ReSetSource() {
      $bc.setSource("inlineSource.append", { id: i, name: `name-${i}` }, { mergeType: basiscore.MergeType.append });
      $bc.setSource("inlineSource.replace", { id: i, name: `name-${i}` }, { mergeType: basiscore.MergeType.replace });
      i += 1;
    }
  </script>
</body>
</html>
```

Each click adds one row to the first list and replaces the second list with a single row. The `callback` without `method` prints both merged sources to the console.

### Keyed add / edit / delete from a form

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Add, edit, delete</title>
</head>
<body>
  <form bc-triggers="submit" name="page.form" bc-keyField="id" bc-statusField="status" bc-merge="append">
    <label>Id <input name="id" /></label>
    <label>Name <input name="name" /></label>
    <label>Status
      <select name="status" required>
        <option value="0">Add</option>
        <option value="1">Edit</option>
        <option value="2">Delete</option>
      </select>
    </label>
    <input type="submit" />
  </form>

  <basis core="print" datamembername="page.form" run="atclient">
    <face>
      <script type="text/template">
        <br />
        <span>@id ( name is:@name@ ) </span>
        <button onclick="this.style['color'] = `#${Math.floor(Math.random()*0xffffff).toString(16)}`">change color</button>
      </script>
    </face>
  </basis>

  <basis core="callback" run="atclient" triggers="page.form"></basis>
</body>
</html>
```

The first submit stores the single-row source `page.form` with `keyFieldName: "id"` and `statusFieldName: "status"`. Later submits with status `0` append a row, status `1` replaces the row with the same `id` (only that row is re-rendered: change the colour of another row first to see it survive), status `2` removes it.

### Incremental tree updates

```html
<basis core="callback" triggers="local.tree" run="atclient"></basis>
<basis core="tree" datamembername="local.tree" idcol="id" parentidcol="pid" nullvalue="null" run="atclient">
  <layout><ul>@child</ul></layout>
  <face level="end"><li>@id@ - @name@</li></face>
  <face><li>@id@ - @name@<ul>@child</ul></li></face>
</basis>

<script>
  const host = {
    sources: {
      "local.tree": {
        data: [
          { id: 1, name: "ali", pid: null, status: 0 },
          { id: 2, name: "amir", pid: 1, status: 0 },
          { id: 4, name: "javad", pid: 2, status: 0 },
          { id: 5, name: "reza", pid: 4, status: 0 }
        ],
        options: { keyFieldName: "id", statusFieldName: "status", mergeType: basiscore.MergeType.append }
      }
    }
  };

  function rename() {
    $bc.setSource("local.tree", [{ id: 4, name: "javad-2", pid: 2, status: 1 }],
      { keyFieldName: "id", statusFieldName: "status", mergeType: basiscore.MergeType.append });
  }
  function remove() {
    $bc.setSource("local.tree", [{ id: 5, status: 2 }],
      { keyFieldName: "id", statusFieldName: "status", mergeType: basiscore.MergeType.append });
  }
</script>
```

### Scoped sources with group

```html
<basis core="group" run="atclient">
  <basis core="print" datamembername="local.name" run="atclient">
    <face><li><span>@value </span></li></face>
  </basis>

  <basis core="group" run="atclient">
    [##local.name.value|(not set)##]
    <form bc-triggers="submit" name="local.name">
      <label>Name: <input type="text" name="value" value="[##local.name.value##]" /></label>
      <input type="submit" />
    </form>
  </basis>

  <label>Name: <input type="text" name="local.name" bc-triggers="keyup" /></label>
</basis>

<script>
  $bc.setSource("local.name", "default");
</script>
```

The `$bc.setSource` call publishes into the root context; both groups see it through the owner fallback. Submitting the inner form stores `local.name` in the inner group's repository only, so the outer `print` keeps showing the previous value. Typing in the outer input publishes into the outer group, which deletes the inner group's copy and updates both.

### Subscribing from JavaScript

```html
<basis core="callback" run="atclient" triggers="orders.list" method="onOrders"></basis>
<script>
  async function onOrders(args) {
    // args.source is the merged stored source
    console.log(args.source.id, args.source.rows.length);

    // wait for another source published later
    const customers = await args.context.waitToGetSourceAsync("customers.list");

    // publish a derived source with the preview flag
    args.context.setAsSource("orders.summary", { count: args.source.rows.length }, undefined, true);
  }
</script>
```

## Pitfalls

- `append` only merges by key when **both** the stored source and the incoming source carry `keyFieldName`. If the first publication (for example a `host.sources` array without `options`) had no key, every later keyed `append` is a plain concatenation.
- Without `statusFieldName` every appended row is `added`, so re-sending an existing key duplicates the row in the source. The renderer hides the duplicate because it reuses the node for that key, which makes the growth easy to miss. Use `statusFieldName` with status `1` for updates.
- An `edited` or `deleted` row whose key is not found in the stored source is dropped silently; the log line still says `Updated`.
- Versions are positional. After a `replace` of a keyed source, a key that moved to a position whose counter equals its previously rendered version is reused without re-rendering. Keep row order stable when using `replace` on keyed sources, or use the `append` + status path for edits.
- `Source.addRows` (append without key fields) leaves `undefined` version entries, and a later `replace()` turns them into `NaN`. `NaN` never equals a stored version, so those rows re-render on every pass after that.
- `cms.cms.date`, `date2`, `date3` use the 0-based month and the weekday; only `time` and `time2` are correct.
- `cms.cookie` property names keep their leading space; `[##cms.cookie.theme##]` does not match `" theme"`. `cms.query` and `cms.cookie` do not exist at all when there is no query string or no cookie; bind them with a default: `[##cms.query.id|(0)##]`.
- Component triggers are dropped while the component is still rendering (`busy`), except for `callback`, `dbsource` and `inlinesource`. Rapid bursts of `setSource` can skip intermediate states; the final state is only guaranteed if the last publication arrives after the render finishes.
- `events` listeners and `timer.N` intervals are never removed when the component is disposed (for example when its `group` re-runs). The handler keeps calling `renderAsync` on the disposed component. Clear timers yourself in the callback (`clearInterval(arg.source.rows[0].value)`).
- Each item of an `events` attribute writes its target type to the console with `console.log` during initialisation.
- `checkSourceHeartbeatAsync` throws `Method not implemented.`; a token that refers to a source without a member (`[##cms##]`) therefore fails.
- `host.sources` are republished inside every `group`. Publishing a replacement from the root deletes the group copies, but a `group` that runs *after* the root publication starts with the original `host.sources` data again until the root publishes once more.

## Related

- [command-attributes-and-lifecycle](command-attributes-and-lifecycle.md) - `triggers`, `events`, `if`, `OnProcessing`/`OnRendering`/`OnRendered`/`OnProcessed`, busy guard
- [binding-and-tokens](binding-and-tokens.md) - `[##source.member.column|(default)##]` and `{{ }}` tokens, waiting rules
- [html-element-binding](html-element-binding.md) - `bc-triggers`, `bc-name`, `bc-value`, `bc-merge`, `bc-keyField`, `bc-statusField`
- [host-configuration](host-configuration.md) - `host.sources`, `dbLibPath`, `settings`
- [javascript-api](javascript-api.md) - `$bc.setSource`, `$bc.util.source`, `EventManager`
- [print](commands/print.md), [list](commands/list.md), [view](commands/view.md), [tree](commands/tree.md) - face rendering
- [group](commands/group.md), [repeater](commands/repeater.md) - the commands that create child contexts
- [callback](commands/callback.md) - reacting to sources from JavaScript
- [inlinesource](commands/inlinesource.md), [dbsource](commands/dbsource.md), [api](commands/api.md) - source producers
- [client-side-sql](client-side-sql.md) - AlaSQL based filtering and sorting of sources
- [troubleshooting](troubleshooting.md)

## Source files

- `src/data/Source.ts`, `src/data/ISource.ts`, `src/data/Data.ts`, `src/data/DataUtil.ts`
- `src/context/ISourceOptions.ts`, `src/enum.ts` (`MergeType`, `DataStatus`, `Priority`), `src/type-alias.ts` (`SourceId`, `SourceHandler`, `SourceData`)
- `src/repository/Repository.ts`, `src/repository/IRepository.ts`, `src/repository/IContextRepository.ts`
- `src/context/Context.ts`, `src/context/IContext.ts`, `src/context/RootContext.ts`, `src/context/BasisCoreRootContext.ts`, `src/context/LocalRootContext.ts`, `src/context/LocalContext.ts`, `src/context/ILocalContext.ts`
- `src/event/EventManager.ts`, `src/event/EventHandler.ts`
- `src/logger/ConsoleLogger.ts`, `src/logger/ILogger.ts`
- `src/component/Component.ts`, `src/component/ElementBaseComponent.ts`, `src/component/SourceBaseComponent.ts`, `src/component/html-element/HTMLComponent.ts`, `src/component/source/CallbackComponent.ts`
- `src/component/renderable/base/RenderableComponent.ts`, `src/component/renderable/base/RenderParam.ts`, `src/component/renderable/base/FaceCollection.ts`, `src/component/renderable/base/FaceRenderResult.ts`, `src/component/renderable/base/FaceRenderResultRepository.ts`, `src/component/renderable/TreeComponent.ts`
- `src/component/collection/GroupComponent.ts`, `src/component/collection/RepeaterComponent.ts`
- `src/ComponentCollection.ts`, `src/token/base/ObjectToken.ts`
