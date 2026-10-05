# Schema JSON contract

The `schema` command (and `schemalist`, `schemauploader`) exchange three JSON documents with the server: the question schema that describes the form, the answer schema that holds previously saved values, and the user action result that the client produces when the user submits. This page lists every field of those documents as declared in the TypeScript interfaces of the library, states which fields the renderer actually reads, shows how the server wraps them in the standard response envelope, and gives trimmed real samples taken from the mock server shipped with the repository.

## Overview

```text
IQuestionSchema  (server -> client)   what to render
  sections[]      ISection
  questions[]     IQuestion
    parts[]       IQuestionPart
      validations IValidationOptions
      fixValues[] IFixValue  (optional, may carry a nested ISchema)
      dependency[] IDependency

IAnswerSchema    (server -> client)   what was saved before (edit / view)
  properties[]    IAnswerProperty
    answers[]     IAnswerPart         one per answer row
      parts[]     IPartCollection
        values[]  IPartValue          may carry a nested IAnswerSchema

IUserActionResult (client -> server)  what changed
  properties[]    IUserActionProperty
    added[] / edited[] / deleted[]   IUserActionAnswer
      parts[]     IUserActionPart
        values[]  IUserActionPartValue  may carry a nested IUserActionResult
```

All three documents share the header fields of `ISchema`.

## ISchema (shared header)

| Field | Type | Description |
|---|---|---|
| `schemaId` | string (numbers are accepted) | Identifier of the schema. Copied from the loaded schema into the result. |
| `schemaVersion` | string (numbers are accepted) | Version of the schema. Copied into the result. |
| `paramUrl` | string | Path suffix appended to the `schemaUrl` attribute when the schema is fetched (for example `/1161`). In `edit`/`view` mode the answer's `paramUrl` selects the schema. |
| `lid` | number | Language id. Selects the culture of validation messages (see the table below) and is copied into the result. |
| `direction` | `"rtl"` \| `"ltr"` (optional) | Text direction of the form. Overrides the command's `direction` attribute. |

## Question schema: IQuestionSchema

| Field | Type | Read by the renderer | Description |
|---|---|---|---|
| `schemaId`, `schemaVersion`, `paramUrl`, `lid`, `direction` | see ISchema | yes | Header. |
| `schemaName` | string | no | Display name; declared only. |
| `baseVocab` | string | no | Vocabulary base URL; declared only. |
| `sections` | `ISection[]` | yes | Optional grouping containers. A question refers to a section by `sectionId`. |
| `questions` | `IQuestion[]` | yes | The properties of the form, rendered in array order. An empty or missing array renders nothing. |

### ISection

| Field | Type | Read | Description |
|---|---|---|---|
| `id` | number | yes | Matched against `question.sectionId`. |
| `title` | string \| `{ value: string; id: number }` | yes | Section heading. A string is used as is; an object contributes its `value`. Missing title removes the heading element. |
| `titleData` | `{ value: string; id: number }` | no | Declared only. |
| `description` | string | no | Declared only; not rendered. |
| `gridColumns` | number (optional) | yes (`template2` skin only) | Number of grid columns for the questions of this section. See [../commands/schema.md](../commands/schema.md). |

### IQuestion

| Field | Type | Read | Description |
|---|---|---|---|
| `prpId` | number | yes | Property id. Key used to match answers (`IAnswerProperty.prpId`) and reported as `propId` in the result. Written to `data-bc-schema-info-prpid`. |
| `typeId` | number | yes | Property type id. Written to `data-bc-schema-info-type` and passed to the `callback` function. Not interpreted by the renderer. |
| `ord` | number | no | Declared only; questions are rendered in array order. |
| `vocab` | string | no | Declared only. |
| `title` | string | yes | Question label. |
| `wordId` | number | yes | Written to `data-bc-schema-info-word`; otherwise not interpreted. |
| `multi` | boolean | yes | `true` enables repeated answer rows with add/remove buttons and is echoed as `multi` in the result. |
| `sectionId` | number | yes | Id of the owning section. Questions without it (or whose section is not found) are placed outside sections. |
| `cssClass` | string | yes | Added to the `[data-bc-question]` element's class list. |
| `help` | string (optional) | yes | Tooltip text of the help button (`data-bc-help-tooltip`). Without it the button is removed. |
| `disabled` | boolean (optional) | yes | Disables every part of the question (controls get the `disabled` attribute) and removes the add button of multi questions. |
| `useInList` | boolean (optional) | no | Declared only. |
| `parts` | `IQuestionPart[]` | yes | The controls of one answer row. A question with several parts renders them side by side with their captions. |
| `colSpan` | number (optional) | yes (`template2` skin only) | Number of grid columns the question spans inside its section. Default `1`. Written to `data-colSpan`. |

### IQuestionPart

| Field | Type | Read | Description |
|---|---|---|---|
| `part` | number | yes | Part number inside the question (1-based in the samples). Key used to match `IPartCollection.part` and reported back as `part`. |
| `viewType` | string | yes | Control type, compared case-insensitively. Built-in values: `text`, `textarea`, `password`, `color`, `time`, `select`, `checklist`, `radio`, `autocomplete`, `simpleautocomplete`, `reference`, `simplereference`, `lookup`, `html`, `upload`, `blob`, and any `component.<name>` (a user-defined component). Unknown values render a placeholder. See [field-types.md](field-types.md). The `ViewType` union type in the source also lists `Datepicker` and `Popup`, which have no control of their own. |
| `cssClass` | string | yes | Added to the `[data-bc-part]` element. |
| `validations` | `IValidationOptions` | yes | Validation rules, see below and [validation.md](validation.md). |
| `caption` | string (optional) | yes | Part caption. Rendered as a column header (`default` skin) or above the part (`template2`) when the question has more than one part; also used as the `title` of validation errors. |
| `link` | string (optional) | yes | URL template for controls that load data: fix values for `select`/`checklist`/`radio` without `fixValues`, search endpoint for `autocomplete`/`reference`/`lookup`, iframe page for `html`. Placeholders `${prpId}`, `${part}`, `${term}`, `${<qs name>}` and `${<dependency name>}` are substituted with `Util.formatString`. |
| `uploadToken` | string (optional) | yes (`blob` only) | Copied into every new file value produced by a `blob` part and forwarded by `schemauploader`. |
| `fixValues` | `IFixValue[]` (optional) | yes | Inline option list for `select`, `checklist`, `radio`. When absent those controls GET `link` and expect an `IFixValue[]` body. |
| `dependency` | `IDependency[]` (optional) | yes | Other parts whose current values are injected into `link` before loading. |
| `method` | `"POST"` \| `"GET"` (optional) | no | Declared only; all built-in loaders use GET. |
| `disabled` | boolean (optional) | yes | The control is disabled when the part has an existing answer (`isDisabled` is `question.disabled || (part.disabled && answer)`). On the last row of a multi question it also keeps the add button visible. |
| `readonly` | boolean (optional) | yes | Sets the `readonly` attribute on the control, but only when the question has more than one part. |
| `options` | any (optional) | yes (`component.*` only) | Stored as a global and passed to the user-defined component through its `options` attribute. |
| `multiple` | boolean (optional) | yes (`upload`/`blob`) | Allows several files; otherwise a new file replaces the current one. |
| `formIdContent` | string (optional) | no | Declared only. |
| `placeHolder` | string (optional) | yes (`text`, `textarea`, `password`, `color`, `time`) | Placeholder attribute of the input. |

### IValidationOptions

| Field | Type | Description |
|---|---|---|
| `required` | boolean | Value must be non-empty. |
| `dataType` | `"int"` \| `"float"` | Numeric format check. |
| `regex` | string | Regular expression source passed to `new RegExp()`. |
| `minLength`, `maxLength` | number | Bounds on `value.length` (string length, or number of selected items for arrays). |
| `min`, `max` | number | Numeric range. |
| `size` | number | Maximum total size in bytes of the selected files. |
| `mimes` | `IMimes[]` | Allowed MIME types, each with `{ mime: string; minSize: number; maxSize: number }`. |

The exact semantics, including which rules are skipped for empty values and the zero-limit behaviour, are in [validation.md](validation.md).

### IFixValue

| Field | Type | Description |
|---|---|---|
| `id` | number | Option value. For `select` an option with id `0` acts as "no selection": it is never reported and selecting it after an existing answer reports a deletion. |
| `value` | string | Option text. |
| `selected` | boolean (optional) | Pre-selected in `new` mode (ignored when an answer exists). |
| `schema` | `ISchema` (optional) | Marks a sub-schema option: when selected, a nested `schema` command for `schema.paramUrl` is rendered below the option. See [lookup-and-autocomplete.md](lookup-and-autocomplete.md) and [answers-and-submission.md](answers-and-submission.md). |

### IDependency

| Field | Type | Description |
|---|---|---|
| `prpId` | number | Property whose value is needed. |
| `part` | number | Part of that property. |
| `name` | string | Placeholder name used in `link` (`${name}`). |
| `required` | boolean | When `true` and the referenced part is empty, the referenced part is marked with a `required` error and the dependent load is aborted. |

When the referenced part has one value, the placeholder receives that value; with several values (multi questions) it receives the array of values. `select`, `checklist` and `radio` JSON-encode the value; `autocomplete`, `reference` and `lookup` pass it raw.

## Answer schema: IAnswerSchema

The answer is the first row of the source named by `datamembername`.

| Field | Type | Description |
|---|---|---|
| `schemaId`, `schemaVersion`, `paramUrl`, `lid`, `direction` | see ISchema | Header; `paramUrl` selects the schema to load when the `paramUrl` attribute is absent. |
| `usedForId` | number | Id of the record the answer belongs to. Copied into the result. |
| `ownerid` | number (optional) | Owner id. Copied into the result. |
| `lastUpdate` | string | Declared only; not read. |
| `properties` | `IAnswerProperty[]` | One entry per answered property. |

### IAnswerProperty

| Field | Type | Description |
|---|---|---|
| `prpId` | number | Matches `IQuestion.prpId`. Properties with no matching question are ignored; in `view` mode questions with no matching property are not rendered. |
| `answers` | `IAnswerPart[]` | One entry per answer row. Each entry becomes one row in the form. |

### IAnswerPart

| Field | Type | Description |
|---|---|---|
| `id` | number (optional) | Row id. Reported back as `id` of `added`/`edited`/`deleted` entries and as `{ id }` when a whole row is removed. |
| `parts` | `IPartCollection[]` | Values per part. |

### IPartCollection

| Field | Type | Description |
|---|---|---|
| `part` | number | Matches `IQuestionPart.part`. |
| `values` | `IPartValue[]` | One value for single-valued controls, several for `checklist`, multi `upload`, and multi autocomplete/reference. |

### IPartValue

| Field | Type | Description |
|---|---|---|
| `id` | number (optional) | Value id. Echoed back in `edited` and `deleted` entries. |
| `value` | any | Control-specific value: string for text controls, number (fix value id) for lists, `{ time, timeid }` for time pickers, `{ name, type, size?, url?, image? }` for files, an arbitrary object for `html` parts. |
| `answer` | `IAnswerSchema` (optional) | Saved answers of the sub-schema attached to this fix value. |

Servers may add fields that are not declared (the samples contain `title`, `moreInfo`, `URI`, `typeid`); the renderer ignores them.

## User action result: IUserActionResult

Produced by `getAnswersAsync` and published to `resultSourceId`. See [answers-and-submission.md](answers-and-submission.md) for how the lists are computed.

| Field | Type | Description |
|---|---|---|
| `schemaId`, `schemaVersion`, `paramUrl`, `lid` | from the loaded schema | Header. `direction` is not included. |
| `usedForId` | number (optional) | From the answer (`undefined` in `new` mode). |
| `ownerid` | number (optional) | From the answer. |
| `properties` | `IUserActionProperty[]` | Only properties with at least one change. |

```ts
interface IUserActionProperty {
  propId: number;                 // question.prpId
  multi: boolean;                 // question.multi
  added?: IUserActionAnswer[];    // present only when non-empty
  edited?: IUserActionAnswer[];
  deleted?: IUserActionAnswer[];
}
interface IUserActionAnswer {
  id?: number;                    // answer row id (absent for new rows)
  parts?: IUserActionPart[];      // absent when a whole row was removed
}
interface IUserActionPart {
  part: number;
  values: IUserActionPartValue[];
}
interface IUserActionPartValue {
  id?: number;                    // existing value id (edited / deleted)
  value?: any;                    // new value
  answer?: IUserActionResult;     // nested sub-schema changes
}
```

`IAnswerValues` (`{ propId, multi, values?: IUserActionAnswer[] }`) is the shape returned by `QuestionContainer.getAllValuesAsync`; it is used internally for dependency resolution and is not published.

## Validation error: IValidationError

Returned by each part's `getValidationErrorsAsync` and rendered into the part's error list:

```ts
interface IValidationError {
  part: number;      // part number
  title: string;     // part caption (or the error type for dependency errors)
  errors: Array<{
    type: "required" | "regex" | "range" | "type" | "length" | "sub-schema" | "size" | "mime" | "mime-size";
    description: string;   // localized message with placeholders resolved
    params?: any;          // the placeholder values
  }>;
}
```

## callback parameter: IEditParams

```ts
interface IEditParams {
  element: Element;  // the [data-bc-part] element
  prpId: number;
  typeId: number;
  value: any;        // IPartValue or IFixValue depending on the control
}
```

## lid to culture mapping

`ValidationHandler` converts `lid` to a culture code used to select validation messages and to build the `messagesApi` URL:

| lid | culture | lid | culture |
|---|---|---|---|
| 1 | `fa` | 9 | `tr` |
| 2 | `en` | 10 | `ka` |
| 3 | `ar` | 11 | `hy` |
| 4 | `fr` | 12 | `az` |
| 5 | `de` | 13 | `id` |
| 6 | `es` | 14 | `th` |
| 7 | `ru` | 15 | `ur` |
| 8 | `zh` | 16 | `hi` |

Any other value (including a missing `lid`) maps to `fa`. Built-in messages exist only for `fa` and `en`; other cultures fall back to `en` unless messages are supplied through `messagesApi`.

## Server envelope

Both the question schema and the answer are delivered inside the standard BasisCore response envelope:

```json
{
  "setting": { "keepalive": true },
  "sources": [
    {
      "options": {
        "tableName": "answer.data",
        "keyFieldName": null,
        "statusFieldName": null,
        "mergeType": 0
      },
      "data": [ { "...": "the schema or the answer object" } ]
    }
  ]
}
```

- The default schema loader of the `schema` command reads `sources[0].data[0]` and ignores `options`.
- When the answer is loaded by an `api` command, every entry of `sources` becomes a source named by `options.tableName` with `data` as its rows. With the envelope above, `datamembername="answer.data"` therefore receives the answer as `rows[0]`.
- A `schemaCallback` function is free to use any transport, but it must return the inner object, not the envelope.

The mock server (`server/schema-server.js`) serves `GET /schema/questions/:id` from `server/schemas/questions/<id>.json`, `GET /schema/answers?id=` from `server/schemas/answers/<id>.json`, `GET /schema/fix-data/:prpId/:part` with an `IFixValue[]` body, and `GET /schema/autocomplete?term=` / `GET /schema/lookup?term=` with `{ id, value }[]` bodies.

## Examples

### Question schema (trimmed from `server/schemas/questions/1161.json`)

```json
{
  "setting": { "keepalive": true },
  "sources": [
    {
      "options": { "tableName": "answer.data", "keyFieldName": null, "statusFieldName": null, "mergeType": 0 },
      "data": [
        {
          "schemaId": 1161,
          "paramUrl": "/1161",
          "schemaVersion": 1.1,
          "lid": 1,
          "baseVocab": "http://schema.site/FA/vo",
          "sections": [
            { "id": 1, "title": "Sec 1", "description": "Simple description" },
            { "id": 2 }
          ],
          "questions": [
            {
              "prpId": 55,
              "typeId": 150,
              "title": "Web site",
              "multi": true,
              "parts": [
                {
                  "part": 1,
                  "viewType": "text",
                  "validations": {
                    "required": true,
                    "regex": "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)"
                  }
                }
              ]
            },
            {
              "prpId": 13057,
              "typeId": 262,
              "title": "Emergency power",
              "multi": true,
              "sectionId": 1,
              "cssClass": "css_13057",
              "help": "help data",
              "parts": [
                {
                  "part": 1,
                  "viewType": "select",
                  "caption": "Unit",
                  "link": "/schema/fix-data/${prpId}/${part}?rkey=${rkey}",
                  "validations": { "required": true }
                },
                {
                  "part": 2,
                  "viewType": "text",
                  "caption": "Speed (rpm)",
                  "validations": { "required": true, "min": 200, "max": 4000, "dataType": "int" }
                },
                {
                  "part": 3,
                  "viewType": "text",
                  "caption": "Power"
                }
              ]
            },
            {
              "prpId": 130601,
              "typeId": 128,
              "title": "Voltage",
              "multi": true,
              "sectionId": 3,
              "parts": [
                {
                  "part": 1,
                  "viewType": "checklist",
                  "validations": { "required": true, "maxLength": 10 },
                  "fixValues": [
                    { "id": 4, "value": "110" },
                    { "id": 5, "value": "220" },
                    { "id": 6, "value": "R1", "selected": true }
                  ]
                }
              ]
            },
            {
              "prpId": 130631,
              "typeId": 128,
              "title": "Country",
              "multi": true,
              "sectionId": 3,
              "parts": [
                {
                  "part": 1,
                  "viewType": "autocomplete",
                  "caption": "Country",
                  "link": "/schema/autocomplete?term=${term}&rkey=${rkey}&d1=${data1}",
                  "dependency": [
                    { "name": "data1", "prpId": 130602, "part": 1, "required": false }
                  ]
                }
              ]
            },
            {
              "prpId": 33333,
              "typeId": 123,
              "title": "Files",
              "multi": false,
              "parts": [
                {
                  "part": 1,
                  "viewType": "upload",
                  "multiple": true,
                  "validations": {
                    "size": 1000,
                    "mimes": [
                      { "mime": "image/jpeg", "minSize": 10, "maxSize": 10000 },
                      { "mime": "image/png", "minSize": 10, "maxSize": 10000 }
                    ]
                  }
                }
              ]
            },
            {
              "prpId": 140603,
              "typeId": 128,
              "title": "Time",
              "multi": false,
              "parts": [
                {
                  "part": 1,
                  "viewType": "component.bc.timepicker",
                  "options": {},
                  "validations": { "required": true }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Note that `sectionId: 3` has no matching section in `sections`, so those questions are rendered outside sections. This is how the sample behaves; it is not an error.

### Question schema with a sub-schema option (from `server/schemas/questions/1163.json`)

```json
{
  "prpId": 2,
  "typeId": 128,
  "title": "Voltage",
  "multi": true,
  "parts": [
    {
      "part": 1,
      "viewType": "select",
      "fixValues": [
        { "id": 0, "value": "Please choose" },
        { "id": 4, "value": "110",
          "schema": { "schemaId": 1164, "paramUrl": "/1164", "lid": 1, "schemaVersion": 1.1 } },
        { "id": 5, "value": "220" },
        { "id": 6, "value": "R1", "selected": true }
      ]
    }
  ]
}
```

### Answer (trimmed from `server/schemas/answers/1423330.json` and `1423332.json`)

```json
{
  "setting": { "keepalive": true },
  "sources": [
    {
      "options": { "tableName": "answer.data", "keyFieldName": null, "statusFieldName": null, "mergeType": 0 },
      "data": [
        {
          "usedForId": 1423330,
          "schemaId": 1161,
          "paramUrl": "/1161",
          "schemaVersion": 1.1,
          "lastUpdate": "",
          "lid": 1,
          "properties": [
            {
              "prpId": 55,
              "answers": [
                { "id": 12361, "parts": [ { "part": 1, "values": [ { "id": 33, "value": "http://www.basiscore.com" } ] } ] }
              ]
            },
            {
              "prpId": 13057,
              "answers": [
                {
                  "id": 45615,
                  "parts": [
                    { "part": 1, "values": [ { "id": 59757, "value": 5248 } ] },
                    { "part": 2, "values": [ { "id": 85257, "value": "1000" } ] }
                  ]
                },
                {
                  "id": 156852,
                  "parts": [
                    { "part": 1, "values": [ { "id": 78517, "value": 5247 } ] },
                    { "part": 2, "values": [ { "id": 79457, "value": "1500" } ] },
                    { "part": 3, "values": [ { "id": 78737, "value": "250" } ] }
                  ]
                }
              ]
            },
            {
              "prpId": 130601,
              "answers": [
                { "id": 8456215, "parts": [ { "part": 1, "values": [ { "id": 78854, "value": 5 }, { "id": 78855, "value": 6 } ] } ] }
              ]
            },
            {
              "prpId": 22222,
              "answers": [
                {
                  "id": 1785,
                  "parts": [
                    {
                      "part": 1,
                      "values": [
                        { "id": 222, "value": { "name": "readme.txt", "url": "/files/readme.txt", "type": "text/plain" } },
                        { "id": 555, "value": { "name": "sample.jpg", "image": "files/sample.jpg", "url": "/files/sample.jpg", "type": "image/jpg" } }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "prpId": 140603,
              "answers": [
                { "id": 12365, "parts": [ { "part": 1, "values": [ { "id": 33, "value": { "time": "02:00", "timeid": 120 } } ] } ] }
              ]
            },
            {
              "prpId": 2,
              "answers": [
                {
                  "id": 8456251,
                  "parts": [
                    {
                      "part": 1,
                      "values": [
                        {
                          "id": 78854,
                          "value": 4,
                          "answer": {
                            "usedForId": 1423332,
                            "schemaId": 1164,
                            "paramUrl": "/1164",
                            "schemaVersion": 1.1,
                            "lid": 1,
                            "properties": [
                              { "prpId": 55, "answers": [ { "id": 123152, "parts": [ { "part": 1, "values": [ { "id": 56987, "value": "nested text" } ] } ] } ] }
                            ]
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### User action result

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
      "edited": [
        { "id": 45615, "parts": [ { "part": 2, "values": [ { "id": 85257, "value": "1200" } ] } ] }
      ],
      "added": [
        { "parts": [ { "part": 1, "values": [ { "value": "3" } ] }, { "part": 2, "values": [ { "value": "900" } ] } ] }
      ],
      "deleted": [
        { "id": 156852 }
      ]
    }
  ]
}
```

## Pitfalls

- `IAnswerProperty.prpId` must equal `IQuestion.prpId` with loose equality (`==`); a string `"55"` matches the number `55`, but a typo renders an empty row in `edit` mode and nothing in `view` mode.
- `IPartCollection.part` is matched with strict equality (`===`) against `IQuestionPart.part`: `"1"` does not match `1`.
- `fixValues[].id` are compared with `==` against answer values, but `select` compares the option's string value against `"0"` to detect "no selection". Do not use `0` as a real option id for `select`.
- `schemaName`, `baseVocab`, `ord`, `vocab`, `useInList`, `section.description`, `section.titleData`, `part.method`, `part.formIdContent` and `answer.lastUpdate` are declared in the interfaces but never read; sending them has no effect.
- `direction` in the schema beats the `direction` attribute of the command.
- `lid` outside 1..16 silently becomes `fa`.
- The default loader reads only `sources[0].data[0]`; a schema delivered as a bare object (no envelope) fails with an empty form. Use `schemaCallback` for such endpoints.

## Related

- [../commands/schema.md](../commands/schema.md)
- [field-types.md](field-types.md)
- [validation.md](validation.md)
- [answers-and-submission.md](answers-and-submission.md)
- [lookup-and-autocomplete.md](lookup-and-autocomplete.md)
- [file-upload.md](file-upload.md)
- [html-field-and-dialogs.md](html-field-and-dialogs.md)
- [dom-markers.md](dom-markers.md)
- [../commands/api.md](../commands/api.md)
- [../commands/schemalist.md](../commands/schemalist.md)
- [../commands/schemauploader.md](../commands/schemauploader.md)
- [../connections.md](../connections.md)

## Source files

- `src/component/renderable/schema/ISchema.ts`
- `src/component/renderable/schema/IQuestionSchema.ts`
- `src/component/renderable/schema/IAnswerSchema.ts`
- `src/component/renderable/schema/IUserActionResult.ts`
- `src/component/renderable/schema/IValidationError.ts`
- `src/component/renderable/schema/IFormMakerOptions.ts` (`IEditParams`, `DisplayMode`, `HtmlDirection`, `Skin`)
- `src/component/renderable/schema/SchemaComponent.ts` (default loader, header fields of the result)
- `src/component/renderable/schema/question-container/QuestionContainer.ts`, `question/Question.ts`, `question-part/QuestionPart.ts` (which fields are read)
- `src/component/renderable/schema/part-control/ListBaseType.ts`, `select/SelectType.ts`, `select-list/SelectListType.ts` (fix values, dependency, sub-schema)
- `src/component/renderable/schema/part-control/upload/UploadType.ts`, `BlobType.ts`, `IFileValue.ts`, `IBlobValue.ts`
- `src/component/ValidationHandler.ts` (lid to culture)
- `src/component/source/APIComponent.ts` (envelope to sources)
- `src/type-alias.ts` (`IServerResponse`)
- `server/schema-server.js`, `server/schemas/questions/*.json`, `server/schemas/answers/*.json`
