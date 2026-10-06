# schema command

`<basis core="schema" run="atclient">` renders a data-entry form from a question schema (a JSON document that describes properties, their parts, their control types and their validation rules) and, on demand, collects what the user entered as a structured change set. Use it when the shape of a form is owned by the server rather than written by hand in HTML: the same markup renders a blank form (`new`), an editable form pre-filled with an existing answer (`edit`) or a read-only rendering of that answer (`view`). The command never posts anything itself; it publishes the collected answer as a source so that a `callback`, `api` or `schemauploader` command can take over.

## Markup

```html
<button data-btn-add>Save</button>

<basis
  core="schema"
  run="atclient"
  schemaUrl="/schema/questions/1161"
  displayMode="new"
  button="[data-btn-add]"
  resultSourceId="demo.data"
  errorResultSourceId="demo.error">
</basis>

<basis core="callback" run="atclient" triggers="demo.data" method="onSaved"></basis>
```

The command is implemented by `SchemaComponent`, a `SourceBaseComponent`. In `edit` and `view` mode it therefore reads a data member (`datamembername`) like the other renderable commands; in `new` mode it renders immediately.

## Attributes

HTML attribute names are matched case-insensitively (the DOM lowercases them), so `schemaUrl` and `schemaurl` are the same attribute. Every attribute except `button` is read as a token, so it may contain `[##source.member.column##]` bindings; the value is re-read on every run.

| Name | Type | Default | Description |
|---|---|---|---|
| `schemaUrl` | string | none | Base URL of the question schema. The default loader requests `schemaUrl + paramUrl` with GET and expects the server envelope described below. Also forwarded to nested sub-schemas. |
| `paramUrl` | string | `answer.paramUrl` | Suffix appended to `schemaUrl`. When omitted in `edit`/`view` mode, the `paramUrl` of the loaded answer is used, so the answer decides which schema to fetch. |
| `displayMode` | `new` \| `edit` \| `view` | `new` | `new` renders a blank form without a data source. `edit` and `view` wait for the data member named by `datamembername` and read its first row as the answer. `view` uses read-only controls and never submits. |
| `datamembername` | string | none | Source id whose first row is the answer object (`IAnswerSchema`). Required for `edit` and `view`. Inherited from `SourceBaseComponent`. |
| `button` | CSS selector | none | Selector passed to `document.querySelectorAll` once, when the command initializes. Every matched element gets a click handler that collects the answers. Read as a plain value, not a token. |
| `resultSourceId` | string | none | Source id that receives the collected `IUserActionResult` when the button is clicked and validation passes. Submission is only wired when `button` and `resultSourceId` are both present and `displayMode` is not `view`. |
| `errorResultSourceId` | string | none | Source id that receives the value `true` when validation fails on a button click. Nothing is published when validation passes. |
| `callback` | JS expression | none | Evaluated with `eval` to a function `(params: IEditParams) => void`. Called by read-only controls when they render and by autocomplete/reference controls when a value is picked. It is not a submit hook. |
| `schemaCallback` | JS expression | none | Evaluated with `eval` to `async (context, paramUrl) => IQuestionSchema`. Replaces the default HTTP loader. |
| `cell` | integer | `1` | Number of columns in the `default` skin. Questions are distributed round-robin over `cell` column elements. Ignored by the `template2` skin. |
| `filesPath` | string | `""` | Prefix prepended to `value.url` of previously uploaded files rendered by `upload`/`blob` parts. |
| `direction` | `rtl` \| `ltr` | `rtl` | Fallback text direction. A `direction` field in the schema itself wins over this attribute. |
| `skin` | `default` \| `template2` | `default` | Selects the layout family (see Layout). |
| `options` | JS expression | none | Evaluated with `eval`; expected shape `{ validationErrors: { <errorType>: <sentenceId> }, messagesApi: "<url>" }`. Passed to the validation message handler, see [../schema/validation.md](../schema/validation.md). |
| `min_width`, `max_width`, `min_height`, `max_height` | number (px) | `450`, `450`, `300`, `300` | Bounds for the iframe opened by `html` parts. Not used by any other control and not applied to the form itself. |
| `qs_*` | string | none | Every attribute whose name starts with `qs_` becomes a query-string parameter named after the rest of the attribute name (lowercased by the DOM: `qs_rKey` becomes `rkey`). The values are available as `${name}` placeholders in part `link` URLs. |

The attributes `id`, `version`, `lid` and `viewMode` that appear in some older example pages are not read by the component in this version: `schemaId`, `schemaVersion` and `lid` always come from the loaded schema and answer.

## Display modes and the data source

`runAsync` branches on `displayMode`:

- `new`: `initUIAsync(null)` is called immediately. No data member is needed. All questions in the schema are rendered with editable controls and `getAnswersAsync` reports every non-empty value under `added`.
- `edit`: the normal `SourceBaseComponent` path runs. The command waits until the source named by `datamembername` exists (it registers that source id as a trigger), then calls `initUIAsync(source.rows[0])`. Only the first row is used. Controls are pre-filled; each answered property gets one row per entry in `answers`; properties without an answer get a single empty row. `getAnswersAsync` reports differences only.
- `view`: same loading path as `edit`, but `QuestionPartFactory` picks the read-only control classes and questions that have no matching answer property (`prpId`) are skipped entirely. The submit wiring is never installed.

Because `displayMode` is a token, it can be bound to a source and combined with `triggers` to switch the same element between `view` and `edit` (see Examples).

When the answer row is present, `paramUrl`, `schemaId`, `lid` and `schemaVersion` are taken from it and forwarded to the controls; the `paramUrl` attribute, when set, overrides the answer's `paramUrl` for the schema request.

## Loading the schema

### Default loader

Without `schemaCallback`, the command fetches the schema with `Util.getDataAsync` (a plain `fetch` with method GET, parsed as JSON):

```text
url = paramUrl ? schemaUrl + paramUrl : schemaUrl
schema = (await fetch(url)).json().sources[0].data[0]
```

The response must be a BasisCore server envelope: `{ "sources": [ { "options": { "tableName": ... }, "data": [ <schema> ] } ] }`. Only `sources[0].data[0]` is read. The files under `server/schemas/questions/*.json` are real examples of this envelope.

### schemaCallback

`schemaCallback="getSchemaAsync"` is evaluated with `eval`, so the value is any expression that yields a function. It is called as `schemaCallback(context, paramUrl)` where `paramUrl` is the resolved parameter URL (attribute or answer value) and must resolve to the unwrapped schema object, not the envelope:

```js
async function getSchemaAsync(context, paramUrl) {
  const r = await fetch(`/schema/questions${paramUrl ?? "/1161"}`);
  const json = await r.json();
  return json.sources[0].data[0];
}
```

The `schemaCallback` expression string is also forwarded to nested sub-schemas, so the same function serves every level.

If the resolved schema is missing or has no `questions`, the main container is created but stays empty and no submit handler is installed.

## Rendering and layout

`initUIAsync` replaces the element's content with:

```html
<div data-bc-schema-main-container data-bc-schema-direction="rtl|ltr" data-bc-schema-skin="default|template2">
  <!-- sections and column/grid containers -->
</div>
```

Questions are processed in schema order. For each question:

1. If `question.sectionId` is set and `schema.sections` contains that id, the question goes into that section. A section is a `<fieldset data-bc-section>` with a `<legend data-bc-section-title>` (`default`) or `<div data-bc-section-title>` (`template2`). The title is `section.title` when it is a string, or `section.title.value` when it is an object; a section without a title has the title element removed. `section.description` is not rendered.
2. Otherwise the question goes into the current unsectioned container. A new unsectioned container is started at the beginning and again after every newly created section, so unsectioned questions that follow a section do not join the earlier unsectioned block.

### default skin: cell columns

`QuestionCellManager` creates `cell` elements `<div data-bc-schema-column>` inside the section (or the main container) and appends questions to them round-robin: question 0 to column 0, question 1 to column 1, and so on. Every section gets its own set of `cell` columns.

### template2 skin: gridColumns and colSpan

`QuestionGridManager` creates a single `<div data-bc-schema-grid-container>` and sets an inline `width` on each question element from the section's `gridColumns` and the question's `colSpan` (default `1`):

```text
width = calc(((100% - (gridColumns - colSpan) * 10px) / gridColumns) * colSpan)
```

When the section has no `gridColumns`, or the question is outside any section, the width is `100%`. The `cell` attribute has no effect in this skin.

`template2` also changes the question-part layout (each part gets its own `[data-bc-caption-title]` element holding `part.caption`), the section layout and the radio control template. In the `default` skin captions of multi-part questions are rendered once as a header row (`[data-bc-answer-title]`) above the answer rows.

### Direction

The effective direction is resolved in this order: `schema.direction` from the loaded schema, then the `direction` attribute, then `rtl`. The result is written to `data-bc-schema-direction` and stored in the options passed to every control.

### Question and part DOM

Each question becomes a `[data-bc-question]` block with a `[data-bc-question-title]` (`question.title`), an optional help button (`[data-bc-help-btn]` with `data-bc-help-tooltip="question.help"`, removed when there is no help) and an `[data-bc-answer-container]` carrying `data-bc-schema-info-*` attributes (`multi`, `type`, `word`, `part` count and `part-<index>-type`). Each answer row is a `[data-bc-answer]`, each part a `[data-bc-part]` with a `<ul data-bc-validation-part>` for error messages. `question.cssClass` is added to the question block and `part.cssClass` to the part block. The complete list is in [../schema/dom-markers.md](../schema/dom-markers.md).

### Multi questions

When `question.multi` is `true` and the mode is not `view`, every answer row gets add/remove buttons (`[data-bc-btn="add"]`, `[data-bc-btn="remove"]`, and a paired `[data-bc-pair-btn-container]` on the last pre-filled row). Adding appends a new empty row; removing an existing row remembers its answer `id` so that it is reported under `deleted` on submit. Disabled questions (`question.disabled`) and questions whose first part is an `html` part get no add button.

## Submit button and what happens on click

At initialization the command runs `document.querySelectorAll(button)` and attaches a click listener to each match. Note that the selector is global to the document, not scoped to the command's element, and that it is evaluated once: buttons added to the page later are not wired.

The click handler calls `preventDefault()` and then, if the submit function exists (it is created in `initUIAsync` only when `button` and `resultSourceId` are set and `displayMode != "view"`):

1. `getAnswersAsync(false)` validates every question and computes the change set.
2. If validation failed and `errorResultSourceId` is set, `context.setAsSource(errorResultSourceId, true)` is called; because the value is a primitive, subscribers see one row `{ value: true }`.
3. If validation passed and at least one property changed, `context.setAsSource(resultSourceId, result)` is called; subscribers see the `IUserActionResult` as `rows[0]`.
4. If validation passed but nothing changed, the result is `null` and nothing is published.

Validation is described in [../schema/validation.md](../schema/validation.md); the output object in [../schema/answers-and-submission.md](../schema/answers-and-submission.md).

## Public methods

The component instance can be obtained from a component collection with `GetCommandListByCore("schema")` (the library does exactly this for nested sub-schemas; see [../javascript-api.md](../javascript-api.md)).

| Method | Description |
|---|---|
| `runAsync(source?: ISource): Promise<any>` | Entry point used by the lifecycle. In `new` mode renders immediately; otherwise defers to the source-based path and renders `source.rows[0]` as the answer. Passing a `Source` whose id equals `datamembername` renders that source directly. |
| `initUIAsync(answer?: IAnswerSchema): Promise<void>` | Rebuilds the whole form: resolves all attributes, loads the schema (default loader or `schemaCallback`), creates sections, questions and parts, and installs the submit function. `answer` may be `null` for a blank form. |
| `getAnswersAsync(throwError: boolean): Promise<IUserActionResult>` | Validates all questions and returns the change set, or `null` when there are no changes. With `throwError = true` a validation failure throws `Error("invalid")`; with `false` it publishes `true` to `errorResultSourceId` (if set) and returns `null`. |

## callback argument

`callback` receives one object of type `IEditParams`:

```ts
interface IEditParams {
  element: Element;   // the [data-bc-part] element of the control
  prpId: number;      // question.prpId
  typeId: number;     // question.typeId
  value: any;         // see below
}
```

Callers and the meaning of `value`:

- Read-only text, textarea, color, time and date controls (`view` mode) call it once when they render; `value` is the answer part value (`IPartValue`, e.g. `{ id, value }`) or `undefined` when there is none.
- The read-only select control calls it once with the `IFixValue` that matches the answer; read-only checklist and radio controls call it once per selected item with the matching `IFixValue`.
- Autocomplete, reference and their `simple*` variants call it whenever the selection changes (also while restoring an existing answer); `value` is the selected `IFixValue` (`{ id, value }`).

Text, select, checklist, radio, upload and `html` controls in editable mode do not call it.

## qs_* attributes and link placeholders

Controls that load data from the server (`select`, `checklist` and `radio` without inline `fixValues`, `autocomplete`, `reference`, `lookup`) build their URL from `part.link` with `Util.formatString`, which treats the link as a JavaScript template literal. The available placeholders are `${prpId}` and `${part}` of the current part, every `qs_*` attribute by its suffix name, and every `dependency[].name` declared on the part. A placeholder that is not supplied makes the template throw a `ReferenceError`, so every `${name}` in a link must have a matching `qs_name` attribute or dependency.

```html
<basis core="schema" run="atclient" schemaUrl="/schema/questions/1161" displayMode="new"
       qs_rkey="[##cms.cms.rkey##]" button="[data-btn-add]" resultSourceId="demo.data"></basis>
```

with a part `"link": "/schema/fix-data/${prpId}/${part}?rkey=${rkey}"` requests `/schema/fix-data/13057/1?rkey=...`.

## Examples

All examples assume the mock servers from the repository (`/schema/questions/:id`, `/schema/answers?id=`, `/validation`) and `<script src="/basiscore.js"></script>` in `<head>`.

### New form with validation messages from a server

```html
<body dir="rtl">
  <button data-btn-add>Add</button>
  <basis core="schema" run="atclient"
         schemaUrl="/schema/questions/1161"
         displayMode="new"
         button="[data-btn-add]"
         resultSourceId="demo.data"
         errorResultSourceId="demo.error"
         options="optionsConfig"
         qs_rKey="www"
         direction="rtl">
  </basis>
  <div id="errorResultSourceId"></div>
  <basis core="callback" run="atclient" triggers="demo.data"></basis>
  <basis core="callback" run="atclient" triggers="demo.error" method="onSource"></basis>

  <script>
    function onSource(args) {
      console.log("validation failed:", args.source.rows[0].value); // true
      const box = document.getElementById("errorResultSourceId");
      box.textContent = "error in validation";
      setTimeout(() => (box.textContent = ""), 3000);
    }
    var optionsConfig = {
      validationErrors: {
        required: 111, type: 222, regex: 333, length: 444,
        range: 555, size: 666, mime: 777, "mime-size": 888
      },
      messagesApi: "/validation"
    };
  </script>
</body>
```

The first `callback` command has no `method`, which makes it log the published `IUserActionResult` to the console.

### Edit form fed by an api command

```html
<body dir="rtl">
  <basis core="api" run="atclient" method="get"
         url="/schema/answers?id=[##inline.object.id##]"></basis>

  <button data-btn-edit>Edit</button>
  <basis core="schema" run="atclient"
         datamembername="answer.data"
         schemaUrl="/schema/questions"
         displayMode="edit"
         button="[data-btn-edit]"
         resultSourceId="demo.data"
         max_width="800" min_width="200" max_height="600" min_height="200"
         qs_rkey="123"
         filesPath="siteName/"
         direction="rtl">
  </basis>
  <basis core="callback" run="atclient" triggers="demo.data"></basis>

  <script>
    const host = {
      sources: { "inline.object": [{ id: 1423330 }] },
      repositories: { "bc.timepicker": "http://localhost:3002/basiscore.timepicker.js" }
    };
  </script>
</body>
```

The answer envelope returned by `/schema/answers` names its table `answer.data`, so the `api` command publishes it under that id and the schema command picks it up. No `paramUrl` is given: the answer's own `paramUrl` (`/1161`) is appended to `schemaUrl`.

### View mode with a per-field callback

```html
<body dir="rtl">
  <basis core="api" run="atclient" method="get"
         url="/schema/answers?id=[##inline.object.id##]"></basis>
  <basis core="schema" run="atclient"
         datamembername="answer.data"
         schemaUrl="/schema/questions"
         displayMode="view"
         callback="onCreateAnswerPart">
  </basis>
  <script>
    const host = { sources: { "inline.object": [{ id: 1423330 }] } };
    function onCreateAnswerPart(params) {
      // params.element, params.prpId, params.typeId, params.value
      if (params.typeId == 262) {
        const a = document.createElement("a");
        a.href = `#${params.prpId}`;
        params.element.appendChild(a);
        a.appendChild(params.element.querySelector("label"));
      }
    }
  </script>
</body>
```

### Two columns in the default skin

```html
<button data-btn-add>Add</button>
<basis core="schema" run="atclient"
       schemaUrl="/schema/questions/1161" displayMode="new"
       button="[data-btn-add]" cell="2" resultSourceId="demo.data"></basis>
<basis core="callback" run="atclient" triggers="demo.data"></basis>
```

### template2 skin with sections, gridColumns and colSpan

```html
<button data-btn-add>Add</button>
<basis core="schema" run="atclient"
       schemaUrl="/schema/questions/1167" displayMode="new"
       button="[data-btn-add]" resultSourceId="demo.data"
       skin="template2" direction="rtl"></basis>
<basis core="callback" run="atclient" triggers="demo.data"></basis>
```

Schema `1167` declares sections such as `{ "id": 1, "title": "...", "gridColumns": 3 }` and questions with `"sectionId": 1, "colSpan": 2`; a question with `colSpan: 2` in a 3-column section takes two thirds of the row.

### Switching between view and edit on the same element

```html
<fieldset dir="ltr">
  <label>
    <input type="checkbox" bc-triggers="change" name="cms.form"
           bc-value="view" bc-off-value="edit" checked />In View Mode
  </label>
</fieldset>

<basis core="api" run="atclient" method="get"
       url="/schema/answers?id=[##inline.object.id##]"></basis>
<basis core="schema" run="atclient"
       datamembername="answer.data"
       schemaUrl="/schema/questions"
       displayMode="[##cms.form.value|(view)##]"
       triggers="cms.form">
</basis>
<script>
  const host = { sources: { "inline.object": [{ id: 1423330 }] } };
</script>
```

The checkbox publishes `cms.form` (see [../html-element-binding.md](../html-element-binding.md)); each change re-runs the command, which rebuilds the form in the new mode.

### Loading the schema through schemaCallback

```html
<button data-btn-add>Add</button>
<basis core="schema" run="atclient"
       schemaCallback="getSchemaAsync"
       button="[data-btn-add]"
       resultSourceId="demo.data"></basis>
<basis core="callback" run="atclient" triggers="demo.data"></basis>

<script>
  async function getSchemaAsync(context, paramUrl) {
    const r = await fetch(`/schema/questions/1161`);
    const json = await r.json();
    return json.sources[0].data[0];
  }
</script>
```

### Sub-schema driven by a select value

```html
<button data-btn-add>Add</button>
<basis core="schema" run="atclient"
       schemaUrl="/schema/questions" paramUrl="/1163"
       displayMode="new" button="[data-btn-add]" resultSourceId="demo.data"></basis>
<basis core="callback" run="atclient" triggers="demo.data"></basis>
```

In schema `1163` the fix value `{ "id": 4, "value": "110", "schema": { "schemaId": 1164, "paramUrl": "/1164", ... } }` makes the control render a nested `schema` command (with `schemaUrl="/schema/questions"` and `paramUrl="/1164"`) below the option whenever it is selected. Its answers are reported under `value.answer` of that option, see [../schema/answers-and-submission.md](../schema/answers-and-submission.md).

## Pitfalls

- `button` is resolved with `document.querySelectorAll` once at initialization. A selector that matches nothing silently disables submission, a selector that matches several buttons wires all of them, and buttons rendered later are never wired.
- Submission requires both `button` and `resultSourceId`. With `button` alone the click does nothing; `getAnswersAsync` is still callable from script.
- `errorResultSourceId` only ever receives `true` (as `rows[0].value`). It is not reset on a later successful submit, so do not use it to track the current validity; use it as a notification.
- No result is published when nothing changed (`edit`) or nothing was entered (`new`): `getAnswersAsync` returns `null`.
- In `edit`/`view` mode the command renders nothing until the `datamembername` source exists, and it only looks at `rows[0]`. A source with several answers renders only the first one.
- `view` mode skips questions that have no entry in `answer.properties`; it is not a read-only mirror of the full schema.
- `schema.direction` overrides the `direction` attribute. If a form ignores your attribute, the server sent a direction.
- `cell` is ignored by `skin="template2"`; use `sections[].gridColumns` and `questions[].colSpan` instead. In `template2`, questions outside a section are always full width.
- `min_width`/`max_width`/`min_height`/`max_height` size only the iframe of `html` parts.
- `callback`, `schemaCallback` and `options` are passed to `eval`; their values must be expressions resolvable in the global scope at the time the form renders.
- A `${name}` placeholder in a part `link` that has no `qs_name` attribute (and no dependency with that name) throws a `ReferenceError` when the control loads its data.
- `schemaCallback` must return the schema object itself. Returning the full envelope yields a schema without `questions` and an empty form.
- Attribute names are lowercased by the DOM, so `qs_rKey` produces the placeholder `${rkey}`, not `${rKey}`.

## Related

- [../schema/displaying-answers.md](../schema/displaying-answers.md) - which commands show a saved answer, and when to use `view` mode
- [../schema/schema-json-contract.md](../schema/schema-json-contract.md)
- [../schema/field-types.md](../schema/field-types.md)
- [../schema/validation.md](../schema/validation.md)
- [../schema/answers-and-submission.md](../schema/answers-and-submission.md)
- [../schema/lookup-and-autocomplete.md](../schema/lookup-and-autocomplete.md)
- [../schema/file-upload.md](../schema/file-upload.md)
- [../schema/html-field-and-dialogs.md](../schema/html-field-and-dialogs.md)
- [../schema/dom-markers.md](../schema/dom-markers.md)
- [schemalist.md](schemalist.md)
- [schemauploader.md](schemauploader.md)
- [api.md](api.md)
- [callback.md](callback.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md)
- [../user-defined-components.md](../user-defined-components.md)

## Source files

- `src/component/renderable/schema/SchemaComponent.ts`
- `src/component/renderable/schema/IFormMakerOptions.ts`
- `src/component/renderable/schema/QuestionCellManager.ts`
- `src/component/renderable/schema/QuestionGridManager.ts`
- `src/component/renderable/schema/section/Section.ts`, `SectionDefault.ts`, `SectionTemplate2.ts`
- `src/component/renderable/schema/question-container/QuestionContainer.ts`
- `src/component/renderable/schema/question/Question.ts`
- `src/component/renderable/schema/question-part/QuestionPart.ts`
- `src/component/renderable/schema/part-control/QuestionPartFactory.ts`
- `src/component/renderable/schema/part-control/html/HTMLFieldType.ts` (use of `min_width`/`max_width`/`min_height`/`max_height`)
- `src/component/SourceBaseComponent.ts`
- `src/component/ValidationHandler.ts`
- `src/Util.ts` (`getDataAsync`, `formatString`)
- `src/tsyringe.config.ts` (registration of `schema`)
