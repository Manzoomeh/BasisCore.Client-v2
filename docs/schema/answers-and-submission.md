# Answers and submission

A `schema` form is a change tracker as much as a renderer. In `edit` and `view` mode it loads a saved answer (`IAnswerSchema`) and maps each saved row and value onto a control; on submit it compares the current state of every control against that answer and emits only what was added, edited or deleted, as an `IUserActionResult`. This page explains how the answer is loaded, how the three change lists are computed at the question, row and part level, the exact output shape, how multi questions and nested sub-schemas appear in it, and how the result reaches the server through `resultSourceId` and the `schemauploader` command.

## Loading answers (edit and view)

1. The command waits for the source named by `datamembername` and takes `rows[0]` as the answer. The usual producer is an `api` command whose response envelope names the table (`"tableName": "answer.data"`), see [schema-json-contract.md](schema-json-contract.md).
2. The schema is fetched from `schemaUrl + (paramUrl attribute ?? answer.paramUrl)`.
3. For every question in schema order, the answer property with the same `prpId` is looked up (`==` comparison).
   - `edit`: with a property, one answer row (`Question`) is created per entry of `property.answers`, each pre-filled; without a property, a single empty row is created.
   - `view`: questions without a property are skipped.
4. Inside a row, each part receives the `IPartCollection` whose `part` equals its own `part` number (`===` comparison), or `undefined`.

How a part shows its value:

| Control | Pre-fill |
|---|---|
| `text`, `textarea`, `password`, `color`, `time` | `values[0].value` (or `values[0].value.time` when the value is a `{ time, timeid }` object) |
| `select` | option whose id `==` `values[0].value`; its `answer` loads the sub-schema when the option has a `schema` |
| `checklist`, `radio` | every item whose id `==` one of `values[].value`; each selected item's `answer` loads its sub-schema |
| `autocomplete`, `reference` (and `simple*`) | `GET link?fixid=<values[0].value>` to fetch the label, then the item is shown as selected |
| `upload`, `blob` | one file entry per value: `{ name, type, size?, url?, image? }`; `filesPath + url` is the download link |
| `html` | `values[0].value` object, shown as JSON in the input and sent to the iframe as `{ ...value, mode: "edit" }` |
| `component.*` | `manager.setValues(values)` once the user-defined component is initialized |

Rows of a multi question get buttons: the last row shows an add button when it is a new (empty) row or when its parts are disabled, otherwise a remove/add pair; earlier rows show a remove button. Removing a row that came from the answer records `answer.id` in the container's removed list.

## Computing the change set

`SchemaComponent.getAnswersAsync` iterates the question containers; each one validates its rows (see [validation.md](validation.md)) and then runs `getChangeValuesAsync`:

```text
added   = rows.map(row => row.getAddedPartsAsync())   filtered non-null
edited  = rows.map(row => row.getEditedPartsAsync())  filtered non-null
deleted = rows.map(row => row.getDeletedPartsAsync()) filtered non-null, then collapsed
          + { id } for every removed row that had an answer id
```

### Row level (Question)

| Method | Result |
|---|---|
| `getAddedPartsAsync` | `{ id?: answer.id, parts: [...] }` built from each part's `getAddedAsync`; `id` is included only when the row came from the answer (a new value in an existing row, for example a part that had no saved value). |
| `getEditedPartsAsync` | `{ id: answer.id, parts: [...] }` from each part's `getEditedAsync`. |
| `getDeletedPartsAsync` | `{ id: answer.id, parts: [...] }` from each part's `getDeletedAsync`. |

A method returns `null` when none of the row's parts contributed.

### Collapsing a fully cleared row

After collecting, each `deleted` entry is replaced by `{ id }` (no `parts`) when all of these hold:

- the entry lists as many parts as the question has parts,
- the number of deleted values equals the number of values the row had in the answer,
- the question has no `edited` and no `added` entries at all (across all its rows).

Otherwise the full `{ id, parts }` entry is kept. Rows removed with the remove button are always reported as `{ id }`.

### Part level

Each control implements `getAddedAsync`, `getEditedAsync`, `getDeletedAsync` (and `getValuesAsync`, which returns the current value regardless of the answer and is used for dependency resolution). The table lists what they return; `answer` is the part's saved `IPartCollection`, `v0` is `answer.values[0]`.

| Control | added (no answer) | edited (answer) | deleted (answer) |
|---|---|---|---|
| `text`, `textarea`, `password`, `color`, `time` | `{ value }` when the input is non-empty | `{ id: v0.id, value }` when the value differs from `v0.value` and is non-empty | `{ id: v0.id, value: "" }` when the value differs and is empty |
| `select` | `{ value: optionValue, answer? }` when the option is not `"0"` | `{ id: v0.id, value, answer? }` when changed to a non-`"0"` option; or `{ id: v0.id, answer }` when unchanged but the sub-schema has changes | `{ id: v0.id, value: "0" }` when changed to `"0"` |
| `checklist`, `radio` | without answer: one `{ value: id, answer? }` per checked item; with answer: one `{ value: id, answer? }` per item that is checked now but was not saved | only for parts with sub-schema options: `{ value: id, answer }` for items that were and still are checked and whose nested form has changes | `{ id, value }` for saved items that are no longer checked |
| `autocomplete`, `reference`, `simple*` | `{ value: selectedId }` when an id is selected | `{ id: v0.id, value: selectedId }` when the selection differs | the saved `IPartCollection` itself (`{ part, values: [{ id, value }] }`) when the selection was cleared |
| `upload` | one `{ value: { content, name, size, type } }` per newly chosen file; `content` is a data URL produced by `FileReader.readAsDataURL` | same as added (new files on an existing row, no `id`) | `{ id, value: { name, type } }` per existing file whose delete button was clicked |
| `blob` | as `upload`, but `content` is the `File` object and `uploadToken` (from `part.uploadToken`) is added | as added | as `upload` |
| `html` | `{ value }` when the iframe submitted an object | `{ id: v0.id, value }` when the object differs from `v0.value` | `{ id: v0.id, value }` when the current value is an empty object |
| `component.*` | `manager.getAddedValuesAsync()` | `manager.getEditedValuesAsync(answer.values)` | `manager.getDeletedValuesAsync(answer.values)` |

The `added`/`edited`/`deleted` table rows are wrapped as `{ part, values: [...] }` by the part. Note that `edited` for checklist/radio is produced only when the part has sub-schema options; a changed selection is always expressed as `added` plus `deleted` values.

### Property and result level

A property is emitted only when at least one list is non-empty:

```ts
{ propId: question.prpId, multi: question.multi, added?, edited?, deleted? }
```

The result is emitted only when at least one property changed and no validation error occurred:

```ts
{
  lid: schema.lid,
  paramUrl: schema.paramUrl,
  schemaId: schema.schemaId,
  schemaVersion: schema.schemaVersion,
  usedForId: answer?.usedForId,
  ownerid: answer?.ownerid,
  properties: [ ... ]
}
```

Otherwise `getAnswersAsync` returns `null` and nothing is published.

## Output examples

### new mode

Schema `1161`, the user fills the two-part question `13057` once and checks two boxes of `130601`:

```json
{
  "lid": 1,
  "paramUrl": "/1161",
  "schemaId": 1161,
  "schemaVersion": 1.1,
  "properties": [
    {
      "propId": 13057,
      "multi": true,
      "added": [
        {
          "parts": [
            { "part": 1, "values": [ { "value": "5248" } ] },
            { "part": 2, "values": [ { "value": "1500" } ] }
          ]
        }
      ]
    },
    {
      "propId": 130601,
      "multi": true,
      "added": [
        { "parts": [ { "part": 1, "values": [ { "value": 4 }, { "value": 6 } ] } ] }
      ]
    }
  ]
}
```

`usedForId` and `ownerid` are present as `undefined` and disappear when the object is serialized with `JSON.stringify`. Select values are strings (option values); checklist values are numbers (parsed ids).

### edit mode

Answer `1423330`: property `13057` has two rows (`45615` and `156852`). The user changes part 2 of the first row from `"1000"` to `"1200"`, removes the second row with the remove button, adds a third row, unchecks value `6` of `130601` and checks `4`:

```json
{
  "lid": 1,
  "paramUrl": "/1161",
  "schemaId": 1161,
  "schemaVersion": 1.1,
  "usedForId": 1423330,
  "properties": [
    {
      "propId": 13057,
      "multi": true,
      "added": [
        {
          "parts": [
            { "part": 1, "values": [ { "value": "3" } ] },
            { "part": 2, "values": [ { "value": "900" } ] }
          ]
        }
      ],
      "edited": [
        { "id": 45615, "parts": [ { "part": 2, "values": [ { "id": 85257, "value": "1200" } ] } ] }
      ],
      "deleted": [
        { "id": 156852 }
      ]
    },
    {
      "propId": 130601,
      "multi": true,
      "added": [
        { "id": 8456215, "parts": [ { "part": 1, "values": [ { "value": 4 } ] } ] }
      ],
      "deleted": [
        { "id": 8456215, "parts": [ { "part": 1, "values": [ { "id": 78855, "value": 6 } ] } ] }
      ]
    }
  ]
}
```

If instead the user had cleared both text parts of row `156852` in place (without removing the row), the entry would still collapse to `{ "id": 156852 }` only if the question had no other `added` or `edited` entries; with the edit on row `45615` present, it stays `{ "id": 156852, "parts": [ ... ] }` with `value: ""` entries.

## Multi questions: adding and removing rows

- The add button (`[data-bc-btn="add"]`) calls `QuestionContainer.addQuestion(null)`: a new empty row whose values appear under `added` without an `id`.
- The single remove button (`[data-bc-btn="remove"]`, shown on rows that are not last) removes the row. If the row had `answer.id`, that id is appended to `deleted` as `{ id }`.
- The paired remove button (`[data-bc-btn-remove]`, shown on the last pre-filled row) removes the row the same way and immediately appends a fresh empty row.
- Removing a row that was added in the current session reports nothing.
- `question.disabled` or a disabled part on the last row suppresses the remove/add pair in favour of a plain add button, and `view` mode shows no buttons.

## Sub-schema answers

When a `select`, `checklist` or `radio` option carries a `schema`, selecting it renders a nested `schema` command (`schemaUrl` and `schemaCallback` of the parent, the option's `paramUrl`, `displayMode` `new` for an option without a saved answer and the parent's mode otherwise). On submit the parent part calls `getAnswersAsync(false)` on the nested command and, when it returns a result, attaches it as `answer` on the option's value:

```json
{
  "propId": 2,
  "multi": true,
  "edited": [
    {
      "id": 8456251,
      "parts": [
        {
          "part": 1,
          "values": [
            {
              "id": 78854,
              "answer": {
                "lid": 1,
                "paramUrl": "/1164",
                "schemaId": 1164,
                "schemaVersion": 1.1,
                "usedForId": 1423332,
                "properties": [
                  {
                    "propId": 55,
                    "multi": true,
                    "edited": [
                      { "id": 123152, "parts": [ { "part": 1, "values": [ { "id": 56987, "value": "new text" } ] } ] }
                    ]
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

The nested object is a complete `IUserActionResult` with its own header, so the structure recurses. A nested form with no changes contributes no `answer` key; a nested form with validation errors makes the parent part fail validation (see [validation.md](validation.md)). Deselecting an option removes its nested form from the page (a `select` also disposes the nested component collection; `checklist` and `radio` only clear the container); only the parent value's own deletion is reported.

## Publishing: resultSourceId

The click handler installed for `button` runs `getAnswersAsync(false)` and, when the result is not `null`, calls `context.setAsSource(resultSourceId, result)`. The result is an object, so the source has exactly one row and `args.source.rows[0]` in a `callback` command is the `IUserActionResult`:

```html
<basis core="callback" run="atclient" triggers="demo.data" method="onSubmit"></basis>
<script>
  async function onSubmit(args) {
    const result = args.source.rows[0];
    await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    });
  }
</script>
```

`JSON.stringify` of an `upload` result embeds the files as data URLs. A `blob` result contains `File` objects, which `JSON.stringify` turns into `{}`; that format is meant for the `schemauploader` command.

## Hand-off to schemauploader

```html
<button data-btn-add>Save</button>
<basis core="schema" run="atclient"
       schemaUrl="/schema/questions/1166" displayMode="new"
       button="[data-btn-add]" resultSourceId="demo.data"></basis>

<basis core="schemauploader" run="atclient"
       datamembername="demo.data"
       url="/api/answers"
       blob="/api/blob"
       name="upload"></basis>
```

`schemauploader` is a source-based command that triggers on `datamembername`. It takes `rows[0]` (or `rows[0].data` when the row wraps the result), walks `properties[].added` and `properties[].edited`, and for every value whose `value.content` is a `File` (produced by `blob` parts) replaces the content with a generated `blobid` and remembers the file together with `uploadToken`, `prpid` and `part`. It then POSTs the JSON result to `url`, reads `{ usedforid }` from the response, and uploads each remembered file as `multipart/form-data` to `blob` (or `url`) with `uploadtoken`, `blobid`, `prpid`, `part`, `usedforid` and `lid`. When `name` is set, `${name}.uploading` is published with `{ answer, postAnswerResult, fileList }`. Attributes and callbacks are documented in [../commands/schemauploader.md](../commands/schemauploader.md).

## Examples

### Edit page that posts the change set

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body dir="rtl">
  <basis core="api" run="atclient" method="get"
         url="/schema/answers?id=[##inline.object.id##]"></basis>

  <button data-btn-edit>Save changes</button>
  <basis core="schema" run="atclient"
         datamembername="answer.data"
         schemaUrl="/schema/questions"
         displayMode="edit"
         button="[data-btn-edit]"
         resultSourceId="demo.data"
         errorResultSourceId="demo.error"
         qs_rkey="123"
         filesPath="siteName/">
  </basis>

  <basis core="callback" run="atclient" triggers="demo.data" method="onChanges"></basis>
  <basis core="callback" run="atclient" triggers="demo.error" method="onInvalid"></basis>

  <script>
    const host = { sources: { "inline.object": [{ id: 1423330 }] } };

    function onChanges(args) {
      const result = args.source.rows[0];
      for (const p of result.properties) {
        console.log(p.propId, "added", p.added?.length ?? 0,
                              "edited", p.edited?.length ?? 0,
                              "deleted", p.deleted?.length ?? 0);
      }
    }
    function onInvalid() { alert("Please fix the highlighted fields."); }
  </script>
</body>
</html>
```

### Reading the result without a button

```js
// $bc wrapper created for a fragment that contains the schema command
const schema = wrapper.GetCommandListByCore("schema")[0];
try {
  const result = await schema.getAnswersAsync(true); // throws Error("invalid") on validation errors
  if (result) sendToServer(result);
} catch (e) {
  // errors are already rendered under the parts
}
```

## Pitfalls

- No changes means no publish: in `edit` mode an untouched form, and in `new` mode an empty form, produce `null` and the `resultSourceId` subscriber is never called.
- Text values compare with `!=` against `v0.value`: a saved number `33` and the input string `"33"` are equal, so unchanged numeric fields are not reported as edited.
- Text parts report deletion with `value: ""`; select parts with `value: "0"`. Both carry the saved `id`.
- `select` values are strings, `checklist`/`radio`/autocomplete values are numbers. Normalize on the server.
- `upload` parts put the whole file into the result as a data URL; large files make the result large. `blob` parts keep `File` objects and require `schemauploader` (plain `JSON.stringify` drops them).
- A row removed with the remove button is reported as `{ id }` even if the user had edited it first; the edits are discarded.
- A fully cleared row collapses to `{ id }` only when the whole question has no other `added`/`edited` entries; otherwise expect per-value deletions.
- `checklist`/`radio` never report `edited` for selection changes; look at `added` and `deleted`.
- `usedForId` and `ownerid` are `undefined` in `new` mode; the server must assign them.
- `getAnswersAsync` is wired to `button` only when `resultSourceId` is set and `displayMode` is not `view`.
- The result header comes from the loaded schema, not from the answer: if the schema served for `paramUrl` has a different `schemaVersion` than the saved answer, the result reports the schema's version.

## Related

- [displaying-answers.md](displaying-answers.md) - showing a saved answer read-only or as a list
- [../commands/schema.md](../commands/schema.md)
- [schema-json-contract.md](schema-json-contract.md)
- [validation.md](validation.md)
- [field-types.md](field-types.md)
- [file-upload.md](file-upload.md)
- [lookup-and-autocomplete.md](lookup-and-autocomplete.md)
- [html-field-and-dialogs.md](html-field-and-dialogs.md)
- [dom-markers.md](dom-markers.md)
- [../commands/schemauploader.md](../commands/schemauploader.md)
- [../commands/api.md](../commands/api.md)
- [../commands/callback.md](../commands/callback.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md)
- [../user-defined-components.md](../user-defined-components.md)

## Source files

- `src/component/renderable/schema/SchemaComponent.ts` (`runAsync`, `renderSourceAsync`, `initUIAsync`, `getAnswersAsync`)
- `src/component/renderable/schema/question-container/QuestionContainer.ts` (`addQuestion`, `onQuestionRemove`, `getChangeValuesAsync`, `getUserActionAsync`, `getAllValuesAsync`)
- `src/component/renderable/schema/question/Question.ts` (row buttons, `getAddedPartsAsync`, `getEditedPartsAsync`, `getDeletedPartsAsync`)
- `src/component/renderable/schema/question-part/QuestionPart.ts`
- `src/component/renderable/schema/part-control/text-area/TextBaseType.ts`
- `src/component/renderable/schema/part-control/select/SelectType.ts`
- `src/component/renderable/schema/part-control/select-list/SelectListType.ts`, `check-list/CheckListType.ts`
- `src/component/renderable/schema/part-control/auto-fill/AutoFillType.ts`
- `src/component/renderable/schema/part-control/upload/UploadType.ts`, `BlobType.ts`, `IFileValue.ts`, `IBlobValue.ts`, `IFileInfo.ts`
- `src/component/renderable/schema/part-control/html/HTMLFieldType.ts`
- `src/component/renderable/schema/part-control/component-container/ComponentContainer.ts`
- `src/component/renderable/schema/part-control/ListBaseType.ts` (`loadSubSchemaAsync`, `getSubSchemaValueAsync`)
- `src/component/user-define-component/ISchemaBaseComponent.ts`
- `src/component/renderable/schema/IAnswerSchema.ts`, `IUserActionResult.ts`
- `src/component/renderable/SchemaUploader.ts`
- `src/component/SourceBaseComponent.ts`
- `src/data/Source.ts` (object results become a single row)
- `src/context/Context.ts` (`setAsSource`)
