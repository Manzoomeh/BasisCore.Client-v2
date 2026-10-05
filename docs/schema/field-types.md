# Schema field types (`viewType`)

Every question in a schema JSON document is made of one or more parts, and every part declares a `viewType`. When the `schema` command renders a question, `QuestionPartFactory` turns each part into a control: an editable control in `new` and `edit` display mode, and a read-only control in `view` mode. This page lists every `viewType` the factory recognises, the control class it maps to in each mode, the part fields each control reads, the shape of the values each control produces, and the fallbacks for unknown and component-backed parts.

## How a part becomes a control

`QuestionPartFactory.generate(question, part, owner, skin, answer)` lower-cases `part.viewType` and switches on it. The branch depends on `displayMode` of the `<basis core="schema">` element:

- `new` and `edit` (anything other than `view`) use the editable switch.
- `view` uses the read-only switch.

Two other inputs change the result:

- `question.multi` selects the multi-value variant of `autocomplete` and `reference`.
- `skin` (the `skin` attribute of the command, `default` or `template2`) selects `RadioListTypeTemplate2` for `radio` under `template2`.

Every control is wrapped in the part layout (`src/component/renderable/schema/question-part/assets/layout.html`):

```html
<div data-bc-part data-bc-part-related-cell>
  <!-- control layout replaces [data-bc-content] -->
  <ul data-bc-validation-part></ul>
</div>
```

Under `template2` the wrapper also carries `<div data-bc-caption-title><span></span></div>`, filled with `part.caption` when the question has more than one part. `part.cssClass` is added as a CSS class of the wrapper. Validation errors set `data-bc-invalid` on the wrapper and fill the `<ul>` (see [validation.md](validation.md)).

## Mapping table

| `viewType` | Editable class (`new`, `edit`) | Read-only class (`view`) |
|---|---|---|
| `text` | `TextType` (`<input type="text">`) | `ReadOnlyText` (`<label>`) |
| `textarea` | `TextAriaType` (`<textarea>`) | `ReadOnlyTextAriaType` (disabled `<textarea>`) |
| `password` | `PasswordType` (`<input type="password">` with eye toggle) | `PasswordType` (same editable control) |
| `time` | `TimeType` (`<input type="time">`) | `TimeType` (same editable control) |
| `color` | `ColorType` (`<input type="color">`) | `ReadonlyColorType` (disabled `<input type="color">`) |
| `select` | `SelectType` (`<select>`) | `ReadOnlySelectType` (`<label>` with the selected item text) |
| `checklist` | `CheckListType` (checkbox list) | `ReadonlyCheckListType` (checked, disabled checkboxes of the selected items only) |
| `radio` | `RadioListTypeDefault`, or `RadioListTypeTemplate2` when `skin="template2"` | `ReadonlyRadioType` (checked, disabled radio of the selected item) |
| `autocomplete` | `AutoCompleteSingleType`, or `AutoCompleteMultiType` when `question.multi` | same classes as editable mode |
| `simpleautocomplete` | `AutoCompleteSimpleType` | same class |
| `reference` | `ReferenceSingleType`, or `ReferenceMultiType` when `question.multi` | same classes |
| `simplereference` | `ReferenceSimpleType` | same class |
| `lookup` | `Lookup` | `Lookup` (same editable control) |
| `html` | `HTMLFieldType` (iframe modal) | `ReadOnlyText` |
| `upload` | `UploadType` (data URL files) | `ReadonlyUploadType` |
| `blob` | `BlobType` (`File` + `uploadToken`) | `ReadonlyUploadType` |
| `component.bc.timepicker` | `ComponentContainer` | `ReadOnlyTime` (`<label>` with `value.time`) |
| `component.calendar.datepicker` | `ComponentContainer` | `ReadOnlyDate` (`<label>` with `value.sstring`) |
| any other `component.*` | `ComponentContainer` | `ReadOnlyText` |
| anything else | `UnknownType` | `ReadOnlyText` |

Class files live under `src/component/renderable/schema/part-control/`. The `autocomplete`, `reference`, `simpleautocomplete`, `simplereference`, `lookup`, `time` and `password` controls have no dedicated read-only class; in `view` mode they render the editable control (the autocomplete and reference single-value controls remove their add button when `displayMode` is `view`, the others stay interactive). Nothing is submitted in `view` mode, so the interactive state is never read.

## Part fields and which controls read them

`IQuestionPart` (`src/component/renderable/schema/IQuestionSchema.ts`) declares these fields:

| Field | Type | Read by |
|---|---|---|
| `part` | number | all controls; identifies the part inside the question and in every produced value |
| `viewType` | string | `QuestionPartFactory` |
| `caption` | string | `QuestionContainer.manageCaptions` (column captions when a question has more than one part) and the `title` of validation errors |
| `cssClass` | string | `QuestionPart` (class on `[data-bc-part]`) |
| `validations` | object | all editable controls through `QuestionPart.ValidateValue`; `ComponentContainer` hands it to the component's `validateAsync` ([validation.md](validation.md)) |
| `placeHolder` | string | `TextBaseType`: `text`, `textarea`, `time`, `color`, `password` |
| `disabled` | boolean | all editable controls, through `isDisabled` (see below) |
| `readonly` | boolean | all editable controls, through `isReadonly` (see below) |
| `fixValues` | `IFixValue[]` | `select`, `checklist`, `radio` (list controls). When present the list is built from it and `link` is not requested |
| `link` | string | list controls without `fixValues`, `autocomplete`, `reference`, `simpleautocomplete`, `simplereference`, `lookup`, `html` |
| `dependency` | `IDependency[]` | list controls loading from `link`, `autocomplete`, `reference`, `simpleautocomplete`, `simplereference` ([lookup-and-autocomplete.md](lookup-and-autocomplete.md)) |
| `multiple` | boolean | `upload`, `blob` and their read-only control |
| `uploadToken` | string | `blob` only |
| `options` | any | `component.*` only (passed to the user-defined component) |
| `method` | `"POST"` or `"GET"` | not read by any control; every request is a GET |
| `formIdContent` | string | not read by any control |

`IFixValue` is `{ id: number, value: string, selected?: boolean, schema?: ISchema }`. `id` is the stored value and `value` is the displayed text. `selected` preselects the item when there is no saved answer. `schema` attaches a sub-schema to the item (see [lookup-and-autocomplete.md](lookup-and-autocomplete.md)).

### `disabled` and `readonly`

`QuestionPart` computes two flags:

- `isDisabled` is true when `question.disabled` is true, or when `part.disabled` is true **and the part has a saved answer**. A `part.disabled` flag therefore has no effect on a new, empty row; it protects existing values in `edit` mode.
- `isReadonly` is true when the question has more than one part and `part.readonly` is true. On a single-part question `readonly` is ignored.

Text-like controls, `select` and `lookup` set the `disabled` attribute when `isDisabled`, otherwise the `readonly` attribute when `isReadonly`. `checklist` and `radio` only honour `isDisabled`: their item template has a single `@disabled` placeholder which is consumed by the disabled check, so `readonly` never reaches the generated inputs. The bundled CSS styles `[readonly]` inputs and selects with `pointer-events: none` and reduced opacity.

## Controls in detail

### Text family: `text`, `textarea`, `time`, `color`, `password`

All extend `TextBaseType`. The control is the element marked `data-bc-text-input`. A saved answer is written as `answer.values[0].value.time ?? answer.values[0].value`, so both a plain string and an object with a `time` property are accepted as initial values. `placeHolder` becomes the `placeholder` attribute.

Produced values:

| Method | Condition | Value |
|---|---|---|
| `getAddedAsync` | no saved answer and input not empty | `{ part, values: [{ value: "<text>" }] }` |
| `getEditedAsync` | saved answer, text changed and not empty | `{ part, values: [{ id, value: "<text>" }] }` |
| `getDeletedAsync` | saved answer, text changed and now empty | `{ part, values: [{ id, value: "" }] }` |
| `getValuesAsync` | input not empty | `{ part, values: [{ value: "<text>" }] }` |

`password` adds the eye toggle described in [html-field-and-dialogs.md](html-field-and-dialogs.md). `color` uses `<input type="color">`, whose value is always a `#rrggbb` string. In `view` mode `text` and `textarea` render the saved string inside a `<label>` or a disabled `<textarea>` through `innerHTML`.

### `select`

`SelectType` builds `<option>` elements from `fixValues` or from the list returned by `link`. `option.value` is `item.id.toString()` and `option.text` is `item.value`. The option is selected when it matches the saved answer, otherwise when `item.selected` is true. The option value `"0"` means "nothing selected": validation treats it as empty, `getAddedAsync` ignores it and `getDeletedAsync` reports it when a saved value is changed to `"0"`. The reference data in `server/schemas/data.json` therefore starts every list with an item `{ "id": 0, "value": "please choose" }`.

Produced values (`value` is the option value string):

- added: `{ value: "5248" }`, plus `answer: <IUserActionResult>` when the item has a sub-schema;
- edited: `{ id, value: "5248", answer? }`; when only the sub-schema changed: `{ id, answer }`;
- deleted: `{ id, value: "0" }`.

The layout is `<select data-sys-select-option>` followed by `<div data-bc-sm-sub-schema-container>`, where a sub-schema is rendered. In `view` mode `ReadOnlySelectType` resolves the saved id against the same list (so `link` is still requested) and prints `item.value` in a `<label>`.

### `checklist` and `radio`

Both extend `SelectListType`. Each item is rendered from an item template into `[data-bc-items]`:

```html
<div data-sys-text="">
  <input type="checkbox" value="<id>" checked disabled />
  <title>
  <div data-bc-sm-sub-schema-container></div>   <!-- checklist only -->
</div>
```

Radio inputs share a generated `name` (`radio1`, `radio2`, ... per control instance). Selected ids are read with `parseInt(input.value)` and filtered with a truthiness test, so an item with `id: 0` can never be reported as selected.

Produced values (`value` is a number):

- added: every checked id that is not in the saved answer: `{ value: 5248, answer? }`;
- deleted: every saved id that is no longer checked: `{ id, value }`;
- edited: only items whose sub-schema produced a result: `{ value, answer }` (no `id`);
- `getValuesAsync`: all checked ids.

Validation receives the array of checked ids, so `required` fails on an empty selection and `minLength`/`maxLength` count items.

Sub-schema containers differ: `checklist` has one `[data-bc-sm-sub-schema-container]` inside every item; `radio` has a single container after `[data-bc-items]`.

#### `radio` under `skin="template2"`

`RadioListTypeTemplate2` renders the items as a segmented tab bar (`[data-bc-part-radio-tab-container]`, one `<label data-bc-part-radio-tab-button>` per item, a sliding `[data-bc-part-radio-tab-active]` marker moved with `translateX`). Items with `id <= 0` are dropped. A clear button `[data-bc-btn-cross]` unchecks the selection; it is removed when `validations.required` is true. The real radio inputs are hidden by CSS and the value model is the same as the default skin.

Read-only variants (`ReadonlyCheckListType`, `ReadonlyRadioType`) render only the items present in the saved answer, as checked and disabled inputs with the item text.

### `autocomplete`, `simpleautocomplete`, `reference`, `simplereference`, `lookup`

Server-searched controls. `autocomplete` and `reference` share one implementation, as do `simpleautocomplete` and `simplereference`. See [lookup-and-autocomplete.md](lookup-and-autocomplete.md) for the request contract. Value shapes:

- `autocomplete`, `reference` and the simple variants: `{ value: <id> }` (added), `{ id, value }` (edited); when a saved value is cleared, `getDeletedAsync` returns the saved `IPartCollection` unchanged;
- `lookup`: `{ value: <id>, title: "<text>" }` (added), `{ id, value, title }` (edited); deletion as above.

### `upload` and `blob`

File controls. `upload` produces `{ value: { content: "data:<mime>;base64,...", name, size, type } }` per new file; `blob` produces `{ value: { content: File, name, size, type, uploadToken } }`. Deleted files are reported as `{ id, value: { name, type } }`. See [file-upload.md](file-upload.md).

### `html`

`HTMLFieldType` opens `part.link` in an iframe modal and stores the object posted back by that page. It produces `{ value: <object> }` (added) and `{ id, value: <object> }` (edited). It performs no validation at all (`getValidationErrorsAsync` returns `null`, so `required` is ignored). See [html-field-and-dialogs.md](html-field-and-dialogs.md).

### `component.*`: user-defined components

A `viewType` starting with `component.` is rendered by `ComponentContainer`, which writes

```html
<basis run="atclient" core="<viewType>" options="<globalName>"></basis>
```

into the part and runs it through `$bc.new().addFragment(element).run()`. `part.options` is stored on `window` under a random name with `$bc.util.storeAsGlobal` and referenced by the `options` attribute. The component's manager must implement `ISchemaBaseComponent` (`src/component/user-define-component/ISchemaBaseComponent.ts`):

| Method | Called by |
|---|---|
| `setValues(values)` | after `onInitialized`, with `answer.values` when editing |
| `validateAsync(options)` or `getValuesForValidateAsync()` | `getValidationErrorsAsync` when `part.validations` exists; the first one found is used, otherwise a warning is logged |
| `getAddedValuesAsync()` | `getAddedAsync` when there is no saved answer |
| `getEditedValuesAsync(baseValues)` | `getEditedAsync` when there is a saved answer |
| `getDeletedValuesAsync(baseValues)` | `getDeletedAsync` when there is a saved answer |
| `getValuesAsync()` | `getValuesAsync` when there is no saved answer |

The arrays the component returns become `values` of the part unchanged, so a component defines its own value shape. In `view` mode no component is loaded: `component.bc.timepicker` is shown by `ReadOnlyTime` (`value.time`), `component.calendar.datepicker` by `ReadOnlyDate` (`value.sstring`), and every other `component.*` by `ReadOnlyText`, which prints the raw value. The repository of the component must be declared in the host configuration ([../user-defined-components.md](../user-defined-components.md)).

### Unknown `viewType`

Any other `viewType` renders `UnknownType`:

```html
<label data-bc-part-ctl data-bc-schema-unknown-control>Unknown-control - <viewType></label>
```

`UnknownType` extends `ReadonlyQuestionPart`, whose `getValidationErrorsAsync`, `getAddedAsync`, `getEditedAsync`, `getDeletedAsync` and `getValuesAsync` all throw `Method not supported.`. Because `SchemaComponent.getAnswersAsync` treats an exception from a question as a validation failure, a form that contains an unknown `viewType` can never be submitted: the button does nothing except publish `true` to `errorResultSourceId`.

## The `callback` option in `view` mode

When the `schema` command has a `callback` attribute, read-only controls call that function once per rendered value with `{ element, prpId, typeId, value }` (`IEditParams`). `element` is the `[data-bc-part]` wrapper. `value` is the saved `IPartValue` for `ReadOnlyText`, `ReadOnlyTextAriaType` and `ReadonlyColorType`, the matching `IFixValue` for `ReadOnlySelectType`, `ReadonlyCheckListType`, `ReadonlyRadioType` and the autocomplete family, the raw value object for `ReadOnlyTime`, and `value.sstring` for `ReadOnlyDate`. The example `example/component/renderable/schema/view-with-callback/index.html` wraps the label of a given `typeId` in a link.

## Examples

### A schema exercising the common view types

Served by the reference server as `/schema/questions/1161` (abridged):

```json
{
  "sources": [{ "data": [{
    "schemaId": 1161, "schemaVersion": "1.1", "lid": 1, "paramUrl": "/1161",
    "questions": [
      { "prpId": 13050, "title": "Generator name", "multi": true,
        "parts": [{ "part": 1, "viewType": "text", "placeHolder": "type a name",
                    "validations": { "required": true, "minLength": 3, "maxLength": 20 } }] },
      { "prpId": 13057, "title": "Emergency power", "multi": true,
        "parts": [
          { "part": 1, "viewType": "select", "caption": "Unit",
            "link": "/schema/fix-data/${prpId}/${part}?rkey=${rkey}", "validations": { "required": true } },
          { "part": 2, "viewType": "text", "caption": "Speed (rpm)",
            "validations": { "required": true, "min": 200, "max": 4000, "dataType": "int" } }
        ] },
      { "prpId": 130601, "title": "Voltage", "multi": true,
        "parts": [{ "part": 1, "viewType": "checklist",
                    "fixValues": [{ "id": 1, "value": "220" }, { "id": 2, "value": "380" }, { "id": 3, "value": "660" }] }] },
      { "prpId": 130603, "title": "Phase",
        "parts": [{ "part": 1, "viewType": "radio",
                    "fixValues": [{ "id": 1, "value": "single" }, { "id": 2, "value": "three", "selected": true }] }] },
      { "prpId": 550, "title": "Password", "parts": [{ "part": 1, "viewType": "password" }] },
      { "prpId": 1406031, "title": "Colour", "parts": [{ "part": 1, "viewType": "color" }] },
      { "prpId": 140603, "title": "Time",
        "parts": [{ "part": 1, "viewType": "component.bc.timepicker", "options": { "clockType": "24h" } }] }
    ]
  }] }]
}
```

### Rendering it in `new` mode

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body dir="rtl">
  <button data-btn-add>Save</button>
  <Basis core="schema" run="atclient"
         schemaUrl="/schema/questions/1161"
         displayMode="new"
         button="[data-btn-add]"
         resultSourceId="demo.data"
         errorResultSourceId="demo.error"
         qs_rkey="123"
         direction="rtl">
  </Basis>
  <basis core="callback" run="atclient" triggers="demo.data"></basis>
  <script>
    const host = {
      repositories: { "bc.timepicker": "http://localhost:3002/basiscore.timepicker.js" }
    };
  </script>
</body>
</html>
```

The `qs_rkey` attribute supplies the `${rkey}` placeholder of the `select` part's `link`.

### Rendering a saved answer in `view` mode

```html
<Basis core="api" url="/schema/answers?id=[##inline.object.id##]" method="get" run="atclient"></Basis>
<Basis core="schema" datamembername="answer.data" run="atclient"
       schemaUrl="/schema/questions" displayMode="view" qs_rkey="123">
</Basis>
<script>
  const host = { sources: { "inline.object": [{ id: 1423330 }] } };
</script>
```

In `view` mode only questions that have an answer are rendered, each with its read-only class from the table above.

## Pitfalls

- `viewType` matching is case-insensitive (`part.viewType.toLowerCase()`), but the value of a `component.*` type is passed verbatim as the `core` attribute, and the `view` mode special cases are matched after lower-casing (`component.bc.timepicker`, `component.calendar.datepicker`).
- An unknown `viewType` blocks submission of the whole form (see above). Check the browser for the red "Unknown-control" label.
- `part.disabled` only disables a part that has a saved value; `part.readonly` only works on multi-part questions, and never on `checklist`/`radio`.
- `select` lists must contain a "nothing selected" item with `id: 0`; otherwise the first item is always submitted. `checklist`/`radio` silently drop an item with `id: 0` from the selection.
- `checklist`/`radio` report sub-schema edits without the `id` of the saved value.
- In `view` mode an `html` part prints `[object Object]` because `ReadOnlyText` assigns the stored object to `innerHTML`.
- `ReadOnlyDate` dereferences `this.answer.values[0]` without a null check; a saved answer whose `component.calendar.datepicker` part has no value throws while rendering.
- `method` and `formIdContent` are declared in `IQuestionPart` but ignored; all lists and searches are fetched with GET.
- `ListBaseType.loadFromServerAsync` is started from the constructor and not awaited; a failing `link` leaves the list empty and logs an unhandled rejection.

## Related

- [schema-json-contract.md](schema-json-contract.md)
- [validation.md](validation.md)
- [lookup-and-autocomplete.md](lookup-and-autocomplete.md)
- [file-upload.md](file-upload.md)
- [html-field-and-dialogs.md](html-field-and-dialogs.md)
- [answers-and-submission.md](answers-and-submission.md)
- [dom-markers.md](dom-markers.md)
- [../commands/schema.md](../commands/schema.md)
- [../user-defined-components.md](../user-defined-components.md)

## Source files

- `src/component/renderable/schema/part-control/QuestionPartFactory.ts`
- `src/component/renderable/schema/question-part/QuestionPart.ts`, `EditableQuestionPart.ts`, `ReadonlyQuestionPart.ts`
- `src/component/renderable/schema/part-control/text-area/TextBaseType.ts`, `TextAriaType.ts`
- `src/component/renderable/schema/part-control/text/TextType.ts`, `TimeType.ts`, `ColorType.ts`, `PasswordType.ts`
- `src/component/renderable/schema/part-control/ListBaseType.ts`, `ReadOnlyListBaseType.ts`
- `src/component/renderable/schema/part-control/select/SelectType.ts`, `ReadOnlySelectType.ts`
- `src/component/renderable/schema/part-control/select-list/SelectListType.ts`, `ReadonlySelectListType.ts`, `check-list/*.ts`, `radio/*.ts`
- `src/component/renderable/schema/part-control/readonly-text/*.ts`, `readonly-text-area/ReadOnlyTextAriaType.ts`
- `src/component/renderable/schema/part-control/component-container/ComponentContainer.ts`
- `src/component/renderable/schema/part-control/unknown/UnknownType.ts`
- `src/component/renderable/schema/IQuestionSchema.ts`, `IAnswerSchema.ts`, `IUserActionResult.ts`, `IFormMakerOptions.ts`
- `src/component/user-define-component/ISchemaBaseComponent.ts`
