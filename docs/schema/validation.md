# Schema validation

Every part of a question schema may carry a `validations` object. When the user submits a `schema` form (or when `getAnswersAsync` is called from script), each editable part computes its current value and runs it through `QuestionPart.ValidateValue`, which produces a list of typed, localized errors. Errors are rendered under the part, the submission is rejected, and optionally a flag is published to `errorResultSourceId`. This page describes every rule exactly as the library applies it, the error object, the DOM markers, the built-in message catalog, and the `options` attribute that fetches translated messages from a server.

## When validation runs

Validation is part of the submit pipeline, not of typing:

```text
SchemaComponent.getAnswersAsync(throwError)
  for each QuestionContainer: getUserActionAsync()
    for each row (Question): getValidationErrorsAsync()
      for each part: getValidationErrorsAsync()  ->  ValidateValue(value[, subSchemaFailed])
    any error  -> throw Error("invalid")  (caught by SchemaComponent, hasValidationError = true)
    no error   -> getChangeValuesAsync()
```

Each part decides what value it hands to `ValidateValue`:

| Control | Value passed to ValidateValue |
|---|---|
| `text`, `textarea`, `password`, `color`, `time` | the input's string value |
| `select` | the selected option's value string, or `null` when the option with id `0` is selected; a failing sub-schema sets the second argument |
| `checklist`, `radio` | array of the selected fix value ids (numbers) |
| `autocomplete`, `reference`, `simpleautocomplete`, `simplereference` | the selected id (number) or `null` |
| `lookup` | the selected id |
| `upload`, `blob` | array of `{ name, size, type }` for every file not marked for deletion (existing and newly chosen) |
| `component.*` | if the component manager implements `validateAsync(validations)`, its result is used as the `IValidationError` directly; otherwise, if it implements `getValuesForValidateAsync()`, that value is validated; otherwise a console warning is printed and the part counts as valid |
| `html` | never validated (`getValidationErrorsAsync` returns `null`), even with `required: true` |
| read-only controls (`view` mode) | not validated; calling `getAnswersAsync` on a `view` form throws inside every container and reports a validation failure |

A part without a `validations` object passes unless a sub-schema error is being added.

## The rules

`ValidateValue(userValue, addSubSchemaError = false)` works in this order. `isArray` is `Array.isArray(userValue)`; `hasValue` is `userValue.length > 0` for arrays and `userValue && userValue.toString() != ""` otherwise.

| Order | Error type | Trigger | Applies to | Message placeholders |
|---|---|---|---|---|
| 1 | `sub-schema` | `addSubSchemaError` is `true` (a nested schema failed its own validation) | select, checklist, radio with sub-schema options | none |
| 2 | `required` | `validations.required` and not `hasValue` | all | none |
| 3 | `type` | `validations.dataType` set, scalar value, value does not match `int` (`/^[+-]?\d+$/`) or float (`/^[+-]?\d+(\.\d+)?$/`) | scalars only | `${dataType}` |
| 4 | `regex` | `validations.regex` set, scalar value, `new RegExp(regex).test(value.toString())` is false | scalars only | none |
| 5 | `length` | `validations.minLength` truthy and `value.length < minLength`, or `validations.maxLength` truthy and `value.length > maxLength` | scalars and arrays | `${minLength}`, `${maxLength}` (`null` when not configured) |
| 6 | `range` | `validations.min` truthy and `value < min`, or `validations.max` truthy and `value > max` | scalars only | `${min}`, `${max}` (`null` when not configured) |
| 7 | `size` | `validations.size` truthy, array value, sum of `file.size` greater than `size` | arrays (files) | `${size}` formatted as `"n KB"` etc. |
| 8 | `mime` | `validations.mimes` set, array value, at least one file whose `type` equals no `mimes[].mime` | arrays (files) | `${mimesArray}` (array of allowed mimes, joined with `,` when inserted) |
| 9 | `mime-size` | `validations.mimes` set, array value, the last file that matched a mime entry is outside `[minSize, maxSize]` of that entry | arrays (files) | `${mimeSizeArray}` (text such as `image/jpeg : 10 Bytes - 9.77 KB`) |

Rules 3 to 9 run only when `hasValue` is true: an optional field that is left empty never fails `regex`, `type`, `length` or `range`. To demand both presence and format, set `required: true` together with the other rule; both errors can appear in the same list.

Details worth knowing:

- `dataType`: only the string `"int"` selects the integer pattern; any other value (`"float"`, `"decimal"`, a typo) uses the float pattern. Scientific notation (`1e5`) and thousands separators fail both.
- `regex` is applied to `value.toString()` with no flags. Backslashes must be escaped once for JSON (`"^\\d+$"`).
- `length` is applied to arrays as well, where `value.length` is the number of selected items: `"maxLength": 10` on a `checklist` limits the number of checked boxes. Applied to a number (autocomplete, reference, lookup ids) `value.length` is `undefined`, the comparison is false and the rule fails for every value; do not combine `minLength`/`maxLength` with those controls.
- `range` compares with the JavaScript `>=` and `<=` operators on the raw value. A text input delivers a string, which is coerced to a number; a non-numeric string gives `NaN` comparisons that fail, so `"abc"` produces both a `type` error (if `dataType` is set) and a `range` error.
- `size` is the total of all files in the part, in bytes, compared with `>=` (`size >= sum` is ok).
- `mime` and `mime-size` share one loop. `mimeOk` becomes false if any file has an unknown type. `mimeSizeOk` is overwritten on every file that has a known type, so only the last such file decides the `mime-size` error; a too-large first file followed by a valid second file passes.
- A JavaScript exception inside a rule (for example an invalid regex) is caught, logged with `console.error("Error in apply ... validation")` and the rule is skipped.

### Zero limits are ignored

Every limit is tested with a truthiness check (`if (this.part.validations.min)`), so `min: 0`, `max: 0`, `minLength: 0`, `maxLength: 0` and `size: 0` are the same as not setting the rule. `"validations": { "min": 0, "dataType": "int" }` accepts `-5`. Use `"regex": "^\\d+$"` for non-negative integers.

### Sub-schema validation

For `select`, `checklist` and `radio` parts whose fix values carry a `schema`, `getValidationErrorsAsync` first calls `getAnswersAsync(true)` on every currently rendered nested `schema` command. If any of them throws, `ValidateValue` is called with `addSubSchemaError = true`. The nested parts render their own errors as usual.

The built-in catalog has no text for `sub-schema`: its entry is an empty object. Looking the message up returns `undefined` and the placeholder replacement throws a `TypeError` inside `ValidateValue`, before any other rule is evaluated. The exception propagates to `getUserActionAsync`, so the submission is still rejected and `errorResultSourceId` is still published, but the parent part does not receive the `data-bc-invalid` marker and its own `required`/`length` rules are not evaluated in that pass. Supplying a `sub-schema` message through the `options` attribute (see below) makes the parent part render the error normally.

## Error object

Each failing part returns one `IValidationError`:

```ts
{
  part: 2,                       // part number
  title: "Speed (rpm)",          // part.caption
  errors: [
    { type: "required", description: "this field is required.", params: {} },
    { type: "range", description: "the entered number should be in range of 200 and 4000. ",
      params: { min: 200, max: 4000 } }
  ]
}
```

`ValidationHandler.getError(part, type, params)` (used for dependency errors) builds the same shape with `title` set to the error type instead of the caption.

## DOM rendering

Every part is a `<div data-bc-part>` that contains the control and an empty `<ul data-bc-validation-part></ul>`. After validation, `QuestionPart.updateUIAboutError(error)`:

- on failure sets the attribute `data-bc-invalid=""` on the `[data-bc-part]` element and fills the list with one `<li> * {description} </li>` per error;
- on success removes `data-bc-invalid` and empties the list.

The stylesheet shipped with the part (`question-part/assets/style.css`) hides `[data-bc-validation-part]` unless the part carries `data-bc-invalid`, and then shows it as a red (`#B40020`, `14px`) list without bullets, padded on the right for `[data-bc-schema-direction="rtl"]` and on the left for `ltr`. The `data-bc-invalid` attribute itself has no visual rule of its own, so highlighting the control is left to page CSS, for example:

```css
[data-bc-part][data-bc-invalid] input,
[data-bc-part][data-bc-invalid] select,
[data-bc-part][data-bc-invalid] textarea { border-color: #B40020; }
```

Errors are only recalculated on the next submit; they do not clear while the user types.

### Dependency errors

A part with `dependency[]` entries that have `required: true` validates the referenced parts when it loads its data (option list or search request), not at submit time: empty referenced parts get a `required` error rendered through the same `updateUIAboutError`, the load is aborted with `Error("Has empty required part!")`, and the markers are cleared the next time the dependent load finds a value. See [lookup-and-autocomplete.md](lookup-and-autocomplete.md).

## Messages and cultures: ValidationHandler

`SchemaComponent` creates one `ValidationHandler(schema.lid, options)` per render. The `lid` is mapped to a culture code (`1` = `fa`, `2` = `en`, `3` = `ar`, `4` = `fr`, `5` = `de`, `6` = `es`, `7` = `ru`, `8` = `zh`, `9` = `tr`, `10` = `ka`, `11` = `hy`, `12` = `az`, `13` = `id`, `14` = `th`, `15` = `ur`, `16` = `hi`; anything else = `fa`).

The built-in catalog contains `fa` and `en` texts for eight types and an empty entry for `sub-schema`:

| Type | `en` | `fa` |
|---|---|---|
| `required` | `this field is required.` | `پر کردن این فیلد الزامیست` |
| `regex` | `invalid format` | `فرمت وارد شده صحیح نیست.` |
| `type` | `invalid type of variable.` | `عدد وارد شده صحیح نیست` |
| `length` | `the length of string should be in range of ${minLength} and ${maxLength}.` | `طول رشته وارد شده باید در بازه ${minLength} و ${maxLength} باشد` |
| `range` | `the entered number should be in range of ${min} and ${max}. ` | `عدد وارد شده باید در بازه ${min} و ${max} باشد` |
| `size` | `the file size is more than valid size (${size}) ` | `حجم فایل بیشتر از حجم مجاز (${size}) است.` |
| `mime` | `the file mime is not in valid mimes (${mimesArray})` | `نوع فایل در بین انواع فایل مجاز (${mimesArray}) نیست` |
| `mime-size` | `the file size are not in valid mime size array (${mimeSizeArray})` | `سایز فایل در بین سایزهای فایل مجاز (${mimeSizeArray}) نیست` |
| `sub-schema` | (none) | (none) |

Lookup order for a message: the entry for the current culture, else the `en` entry. A form with `lid: 4` (`fr`) therefore shows English messages unless French texts are fetched.

Placeholders of the form `${name}` are replaced with `params[name]`; unknown placeholders stay in the text. A `length` rule with only `maxLength` renders `null` for `${minLength}`.

## Fetching messages from a server: the options attribute

```html
<basis core="schema" run="atclient" schemaUrl="/schema/questions/1161" displayMode="new"
       button="[data-btn-add]" resultSourceId="demo.data"
       options="optionsConfig"></basis>
<script>
  var optionsConfig = {
    validationErrors: {
      required: 111, type: 222, regex: 333, length: 444,
      range: 555, size: 666, mime: 777, "mime-size": 888
    },
    messagesApi: "/validation"
  };
</script>
```

`options` is evaluated with `eval`, so it may be a global variable name or an inline object literal. The object has two members:

| Member | Type | Description |
|---|---|---|
| `validationErrors` | `{ [errorType]: sentenceId }` | Maps an error type (`required`, `regex`, `type`, `length`, `range`, `size`, `mime`, `mime-size`, `sub-schema`) to the id of a sentence on the server. Types that are omitted keep the built-in text. |
| `messagesApi` | string | Base URL. The request goes to `${messagesApi}/${culture}`. |

Protocol, as implemented in `ValidationHandler.fetchPromiseAsync` and mocked by `server/validation-server.js`:

```http
POST /validation/fa
Content-Type: application/json

{ "sentenceId": [111, 222, 333, 444, 555, 666, 777, 888] }
```

```json
[
  { "id": 111, "title": "خطای مربوط به : پر کردن این فیلد الزامیست" },
  { "id": 444, "title": "خطای مربوط به : طول رشته وارد شده باید در بازه ${minLength} و ${maxLength} باشد" }
]
```

- The body lists `Object.values(validationErrors)` under `sentenceId`.
- For every returned `{ id, title }` the handler finds the key of `validationErrors` whose value is strictly equal (`===`) to `id` and stores `title` as the message of that type for the current culture. Titles may contain the same `${placeholders}` as the built-in texts.
- The request is sent lazily, once per rendered form, the first time an error message is needed; the promise is cached.
- Any failure (network error, non-JSON body, an `id` that matches no key) falls back to the built-in catalog for everything.
- Because matching uses `===`, the ids returned by the server must have the same type as the configured ones (numbers against numbers, strings against strings).
- Both `validationErrors` and `messagesApi` must be present for the request to be sent. When they are not, the handler resolves the built-in catalog immediately but still issues a request to the literal URL `undefined/<culture>`; its failure is swallowed.

The mock server answers `/validation/fa` and `/validation/ar` with Persian and Arabic texts for the eight sentence ids above.

## errorResultSourceId

When the submit button is clicked, `getAnswersAsync(false)` runs. If any container reported a validation error and the command has an `errorResultSourceId` attribute, the command calls `context.setAsSource(errorResultSourceId, true)`. The source receives one row `{ value: true }`; it carries no error details. Nothing is published to this source when validation passes, and the `resultSourceId` source is untouched on failure.

`getAnswersAsync(true)` (used for nested schemas, and available to scripts) throws `Error("invalid")` instead of publishing.

```html
<basis core="callback" run="atclient" triggers="demo.error" method="onInvalid"></basis>
<script>
  function onInvalid(args) {
    // args.source.rows[0].value === true
    document.querySelector("[data-bc-part][data-bc-invalid]")?.scrollIntoView();
  }
</script>
```

Note that `errorResultSourceId` is evaluated inside `getAnswersAsync`, so it is also honoured when `getAnswersAsync(false)` is called from script.

## Examples

### Part definitions

```json
{
  "prpId": 13057,
  "title": "Emergency power",
  "multi": true,
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
      "caption": "Web site",
      "validations": { "regex": "^https?:\\/\\/.+$" }
    }
  ]
}
```

- Part 1 with option `0` selected: `required`.
- Part 2 empty: `required` only. Part 2 = `"12.5"`: `type` and `range`. Part 2 = `"5000"`: `range`.
- Part 3 empty: valid. Part 3 = `"basiscore.com"`: `regex`.

### Files

```json
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
```

Two JPEG files of 600 bytes each: `size` (total 1200 > 1000). One PDF: `mime` with `${mimesArray}` = `image/jpeg,image/png`. One 20 000-byte PNG: `mime-size` with `${mimeSizeArray}` = ` image/jpeg : 10 Bytes - 9.77 KB ,  image/png : 10 Bytes - 9.77 KB`.

### Complete page with server-side messages

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body dir="rtl">
  <button data-btn-add>Add</button>
  <basis core="schema" run="atclient"
         schemaUrl="/schema/questions/1161"
         displayMode="new"
         button="[data-btn-add]"
         resultSourceId="demo.data"
         errorResultSourceId="demo.error"
         options="optionsConfig"
         qs_rKey="www">
  </basis>
  <div id="errorResultSourceId"></div>
  <basis core="callback" run="atclient" triggers="demo.data"></basis>
  <basis core="callback" run="atclient" triggers="demo.error" method="onSource"></basis>
  <script>
    function onSource(args) {
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
</html>
```

## Pitfalls

- Only `required` fires on an empty value; `regex`, `type`, `length` and `range` are skipped for empty input.
- `0` as a limit (`min`, `max`, `minLength`, `maxLength`, `size`) disables that rule.
- `minLength`/`maxLength` on `autocomplete`, `reference` or `lookup` parts fail for every value because the value is a number.
- `dataType` other than `"int"` means float; there is no validation of the `dataType` value itself.
- `mime-size` only reflects the last file whose type is in `mimes`.
- `html` parts are never validated; `required` on them has no effect.
- The `sub-schema` type has no built-in text; without a message from `options` the parent part is not marked, although the submission is still rejected.
- Messages exist only in `fa` and `en`; any other `lid` shows English text unless `messagesApi` supplies translations. `lid` values outside 1..16 become `fa`.
- Server sentence ids are matched with `===`; `"111"` does not match `111`.
- `errorResultSourceId` receives only `true` and only on failure; it is never reset.
- Validation runs only on submit. There is no live validation while typing.
- Setting `options` without `messagesApi` (or without `validationErrors`) still triggers a request to `undefined/<culture>`; the failure is swallowed, but it shows up in the network log.

## Related

- [../commands/schema.md](../commands/schema.md)
- [schema-json-contract.md](schema-json-contract.md)
- [field-types.md](field-types.md)
- [answers-and-submission.md](answers-and-submission.md)
- [lookup-and-autocomplete.md](lookup-and-autocomplete.md)
- [file-upload.md](file-upload.md)
- [dom-markers.md](dom-markers.md)
- [../user-defined-components.md](../user-defined-components.md)
- [../commands/callback.md](../commands/callback.md)
- [../troubleshooting.md](../troubleshooting.md)

## Source files

- `src/component/renderable/schema/question-part/QuestionPart.ts` (`ValidateValue`, `updateUIAboutError`, `formatBytes`)
- `src/component/renderable/schema/question-part/assets/layout.html`, `layout_template2.html`, `style.css`
- `src/component/ValidationHandler.ts`
- `src/component/renderable/schema/IValidationError.ts`
- `src/component/renderable/schema/IQuestionSchema.ts` (`IValidationOptions`, `IMimes`, `IDependency`)
- `src/component/renderable/schema/SchemaComponent.ts` (`getAnswersAsync`, `options`, `errorResultSourceId`)
- `src/component/renderable/schema/question-container/QuestionContainer.ts`, `question/Question.ts` (aggregation)
- `src/component/renderable/schema/part-control/text-area/TextBaseType.ts`, `select/SelectType.ts`, `select-list/SelectListType.ts`, `auto-fill/AutoFillType.ts`, `upload/UploadType.ts`, `html/HTMLFieldType.ts`, `component-container/ComponentContainer.ts` (values passed to validation)
- `src/component/renderable/schema/part-control/ListBaseType.ts` (`allSubSchemaIsOkAsync`, dependency errors)
- `src/component/user-define-component/ISchemaBaseComponent.ts`
- `server/validation-server.js`
