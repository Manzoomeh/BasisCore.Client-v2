# Server-searched fields: autocomplete, reference, lookup and server-loaded lists

Five `viewType` values let a schema part search a server endpoint while the user types instead of shipping a fixed list: `autocomplete`, `reference`, `simpleautocomplete`, `simplereference` and `lookup`. The list controls `select`, `checklist` and `radio` can also load their items from a server endpoint when they have no `fixValues`. All of them use the same request pattern: `part.link` is a URL template with `${name}` placeholders, filled from the typed term, the `qs_*` attributes of the `schema` command and, where supported, the current values of other parts declared in `part.dependency`. This page documents the UI of each control, the exact requests, the expected responses, how saved ids are resolved back to text, cascading through `dependency`, and sub-schemas attached to list items.

## The five search controls at a glance

| `viewType` | Class (`question.multi` false / true) | UI | Select gesture | `dependency` |
|---|---|---|---|---|
| `autocomplete` | `AutoCompleteSingleType` / `AutoCompleteMultiType` | label + button opening `SearchPopup` | double-click in popup | yes |
| `reference` | `ReferenceSingleType` / `ReferenceMultiType` | identical to `autocomplete` | double-click in popup | yes |
| `simpleautocomplete` | `AutoCompleteSimpleType` | inline text box with dropdown list | click | yes (also within the same question) |
| `simplereference` | `ReferenceSimpleType` | identical to `simpleautocomplete` | click | yes (also within the same question) |
| `lookup` | `Lookup` | text box + id box with inline result list | double-click | no |

`autocomplete` and `reference` are the same code (`AutoFillSingleType`, `AutoFillMultiType`); `simpleautocomplete` and `simplereference` are the same code (`AutoFillSimpleType`). The two names exist so that a server can distinguish the semantic kind of the relation; the client treats them identically.

## The request to `part.link`

### Searching

Every search builds the URL with `Util.formatString(part.link, params)`. `formatString` evaluates `part.link` as a JavaScript template literal whose variables are the keys of `params`, so a placeholder is written `${term}`, `${rkey}`, `${data1}` and so on. Two consequences follow:

- a placeholder whose key is absent from `params` throws a `ReferenceError` and no request is made;
- values are inserted verbatim, without URL encoding.

The parameters are:

| Key | Present for | Value |
|---|---|---|
| `term` | all five search controls | the current text of the search box |
| `prpId`, `part` | `select`/`checklist`/`radio` loading from `link` | the question `prpId` and the part number |
| every `qs_<name>` attribute of `<basis core="schema">` | all | the attribute value, with the `qs_` prefix removed (bindings resolved; attribute names are lower-cased by the DOM, so `qs_rKey="..."` becomes `${rkey}`) |
| every `dependency[].name` | controls that support `dependency` | the current value of the referenced part (see below) |

The request is `fetch(url, { method: "GET" })` and the response is parsed as JSON. The response of a search must be an array of `IFixValue`:

```json
[
  { "id": 5248, "value": "kilowatt" },
  { "id": 5247, "value": "kilovolt-ampere" }
]
```

`id` is what gets stored; `value` is displayed. The reference server (`server/schema-server.js`) implements `/schema/autocomplete` and `/schema/lookup`: with `?term=` it returns at most ten items whose `value` contains the term; with `?fixid=` it returns the single matching item.

### Resolving a saved id

When a part has a saved answer, the stored value is an id. The autocomplete family and `lookup` resolve it to a display text with one extra request:

```text
<part.link without its query string>?fixid=<id>
```

`getValueAsync(id)` splits `part.link` at the first `?`, appends `?fixid=<id>` and formats the result with the `qs_*` parameters only. The server must answer with a single `IFixValue` object (not an array). The text of the resolved item is shown in the label, the search box or the lookup title box.

Because the id is appended to the path part of `link`, a link such as `/schema/autocomplete?term=${term}&rkey=${rkey}` is resolved through `/schema/autocomplete?fixid=12`; the `rkey` parameter is not sent in that request.

## `autocomplete` and `reference`, single value

Layout (`auto-fill-single-type.html`):

```html
<div data-bc-auto-complete-container>
  <label data-bc-add-item data-bc-auto-complete-single-type data-bc-auto-complete data-sys-auto-complete></label>
  <button data-bc-btn="add" data-sys-plus data-bc-auto-complete-single-type-btn>+</button>
</div>
```

- Clicking the button while it is in the `add` state collects the query parameters and opens a `SearchPopup`. When a result is double-clicked, `setValue` writes `item.value` into the label, stores `item.id` as the selected id, calls the `callback` option (if any) with `{ element, prpId, typeId, value: item }`, refreshes the question's add/remove buttons, and the button switches to `data-bc-btn="remove"` (`data-sys-minus`).
- Clicking the button in the `remove` state clears the selection (label emptied, selected id `null`) and switches back to `add`.
- In `displayMode="view"` or when `question.disabled` is true the button is removed and the label takes the full width.

## `autocomplete` and `reference`, multiple values (`question.multi: true`)

`AutoFillMultiType` renders only the label (`auto-fill-multi-type.html`). It replaces the click handler of the question's own `+` button (`Question.replaceAddClick`): instead of adding an empty row, the `+` button opens a `SearchPopup` in multi mode. Each double-clicked result:

- fills the current label if it has no selection yet;
- otherwise calls `QuestionContainer.addQuestion({ parts: [{ part, values: [{ value: item.id }] }] })`, which appends a new row for the same question. `QuestionPartFactory` receives that row with `answer` set to `null` (the local value has no `id`) and the row's control resolves the text through `?fixid=` and reports the value as *added*.

The popup stays open until its close button is clicked, so several values can be picked in one session. Rows are removed with the question's `-` buttons.

## `simpleautocomplete` and `simplereference`

Layout (`auto-fill-simple-type.html`):

```html
<div data-bc-fm-simple-autocomplete data-bc-auto-complete>
  <input data-bc-search type="text" data-sys-input-text />
  <ul data-bc-result data-sys-search-result></ul>
</div>
```

- `keyup` on the input requests `part.link` with the current text and rebuilds the `<ul>`; each result is `<li data-bc-value="<value>" data-sys-hover data-sys-text>value</li>`.
- Focusing the input shows the list; a click anywhere outside the list and the input hides it.
- A single click on a result selects it: the input receives `item.value`, the selected id is stored, the `callback` option is invoked and the `<li>` is removed.
- `question.multi` is not consulted: the question's `+` button adds ordinary rows.

The selected id changes only on a click. Text typed after a selection is not matched against the list, so the visible text and the stored id can disagree. Validation and the produced value use the stored id.

## `lookup`

Layout (`lookup/assets/layout.html`):

```html
<div data-bc-fm-lookup>
  <div>
    <span data-bc-lookup-select-value data-bc-auto-complete>
      <input type="text" data-bc-text-input data-sys-input-text />
    </span>
    <span data-bc-lookup-set-value data-sys-select-lookup></span>
  </div>
  <ul data-bc-result data-sys-search-result></ul>
</div>
```

- `keyup` on the text box requests `part.link` with `term` and the `qs_*` parameters only (`lookup` ignores `part.dependency`).
- Results are listed in the `<ul>`; a double-click selects: the id is written into the right-hand span and stored, the title into the text box, and the list is cleared.
- When `isDisabled` the input is disabled; when `isReadonly` it is read-only; in both cases no search handler is attached.

`lookup` is the only control that stores the title together with the id: added values are `{ value: <id>, title: "<text>" }` and edited values `{ id, value, title }`. Validation runs on the text of the box, not on the id, so a `required` rule is satisfied by any typed text even when nothing was double-clicked.

## `SearchPopup`

`SearchPopup` is created by the single and multi autocomplete/reference controls and appended to `document.body`:

```html
<div data-bc-autocomplete-popup-container data-bc-schema-direction="rtl" data-bc-schema-skin="default">
  <div data-bc-autocomplete-popup data-sys-autocomplete-popup>
    <div data-bc-title data-sys-autocomplete-popup-header>
      <button data-bc-btn-close data-sys-text>X</button>
    </div>
    <div data-bc-body data-sys-autocomplete-popup-body>
      <input data-bc-search type="text" data-sys-input-text />
      <ul data-bc-result data-sys-search-result></ul>
    </div>
  </div>
</div>
```

The direction and skin of the owning form are copied onto the container because the popup lives outside the form's `[data-bc-schema-main-container]`. The constructor receives the `link`, a selection callback, the multi flag and the already resolved query parameters; every `keyup` formats `link` with `{ term, ...params }` and rebuilds the list. A double-click calls the callback with the item; when it returns `true` the `<li>` is removed, and in single mode the whole popup is removed as well. The close button removes the popup. The popup is 400px wide with a backdrop (`rgba(0,0,0,0.4)`, `z-index: 999999999`).

## Cascading with `part.dependency`

A part can declare that its search needs the current value of other parts:

```json
"dependency": [
  { "name": "data1", "prpId": 130602, "part": 1, "required": false },
  { "name": "data2", "prpId": 1355,   "part": 1, "required": false }
]
```

`IDependency` fields: `name` is the placeholder key added to the URL parameters, `prpId` and `part` identify the source part, `required` controls what happens when that part is empty.

Resolution happens at query time (when the popup is opened, on every `keyup` of the simple variants, or when a list control loads its items), so the latest values are used. The implementation asks every question container for its current values (`getAllValuesAsync`) and then, for each dependency:

- when the source part has values, the parameter is set: a single value for one part value, an array when the row has several values;
- when it has none and `required` is false, the parameter is set to the empty string;
- when it has none and `required` is true, a `required` validation error is displayed on the source part.

Three controls implement this, with differences you need to know:

| Implementation | Used by | Value encoding | Same-question dependency |
|---|---|---|---|
| `ListBaseType.getQueryStringParamsAsync` | `select`, `checklist`, `radio` loading from `link` | `JSON.stringify` of the value (a string arrives quoted, an array as a JSON array) | no |
| `AutoFillType.getQueryStringParamsAsync` | `autocomplete`, `reference` (single and multi) | raw value (an array is inserted as its comma-joined string) | no |
| `AutoFillSimpleType.getQueryStringParamsAsync` | `simpleautocomplete`, `simplereference` | raw value when the dependency points at the same question (same row); `JSON.stringify` for other questions | yes: when `prpId` equals the question's own `prpId`, the value is taken from the same row of a multi-row question |

The same-question form is what the reference schema `1161` uses for its "product" question: part 1 is a `select` loaded from `/schema/fix-data/${prpId}/${part}?rkey=${rkey}` and part 2 is a `simpleautocomplete` with `link: "/schema/autocomplete?term=${term}&data=${data}"` and `dependency: [{ "name": "data", "prpId": 3544, "part": 1, "required": true }]`, so each row searches products within the category chosen in that row.

The dependency loop is asynchronous and the required-error path is awaited inside it, so an empty required dependency does not cancel the search: the `required` error is shown on the source part regardless. For `autocomplete` and `reference` the popup still opens and, when the user types, the request is sent with an empty parameter. For `simpleautocomplete`, `simplereference` and the list controls the URL is formatted as soon as the loop returns, before the awaited branch has set the parameter, so `formatString` throws a `ReferenceError` (`<name> is not defined`) and no request is sent. Treat `required` as a visual hint rather than a gate.

A dependency on a `prpId` that does not exist in the schema leaves its `name` undefined, which makes the URL formatting throw and the search return nothing.

## Lists loaded from `link`: `select`, `checklist`, `radio`

When a list part has no `fixValues`, `ListBaseType.loadFromServerAsync` is started from the constructor:

```text
GET <formatString(part.link, { prpId, part, ...qs_*, ...dependency })>
```

and `fillUI` is called with the returned `IFixValue[]`. The reference server serves `/schema/fix-data/:prpId/:part` from `server/schemas/data.json`; the example link `/schema/fix-data/${prpId}/${part}?rkey=${rkey}` resolves to `/schema/fix-data/13057/1?rkey=123` with `qs_rkey="123"` on the command. The request is made once, when the control is created, and also in `view` mode (to translate the saved id into text). There is no refresh when a dependency changes later.

## Sub-schemas on list items (`fixValues[].schema`)

An item of `select`, `checklist` or `radio` (from `fixValues` or from `link`) can carry a nested schema:

```json
{ "id": 2, "value": "Other",
  "schema": { "schemaId": 1164, "paramUrl": "/1164", "lid": 1, "schemaVersion": "1.1" } }
```

`ListBaseType.fillUI` sets `hasSubSchema` when any item has `schema`. Selecting such an item (change event, or initial selection) calls `loadSubSchemaAsync`, which writes a nested `schema` command into the item's `[data-bc-sm-sub-schema-container]` and processes it with a new `ComponentCollection`:

```html
<Basis core="schema" run="atclient"
       schemaUrl="<parent schemaUrl>"
       datamembername="sub-schema.<random>"
       paramUrl="<item.schema.paramUrl>"
       displayMode="<parent displayMode, or new when there is no saved sub-answer>"
       callback="<parent callback>" schemaCallback="<parent schemaCallback>" cell="<parent cell>">
</Basis>
```

The nested schema is therefore fetched from `schemaUrl + paramUrl` exactly like the parent. `schemaId`, `schemaVersion` and `lid` of the item are written into the generated tag (as `id`, `version`, `lid`) but the `schema` command does not read those attributes, so `paramUrl` is what identifies the sub-schema. The `skin` and `direction` attributes are not forwarded: a nested form renders with the default skin and its own direction default. Deselecting the item (or selecting another `select` option) disposes the nested collection and empties the container.

When the saved answer of the parent value contains `answer` (an `IAnswerSchema`), the nested command is run with that answer as its source, so the nested form opens in the parent's display mode with its values.

On submission:

- `getSubSchemaValueAsync(id)` calls `getAnswersAsync(false)` on the nested `SchemaComponent` and attaches the resulting `IUserActionResult` as `answer` on the parent part value: `{ value: "2", answer: { lid, schemaId, properties: [...] } }`;
- `select` also calls `allSubSchemaIsOkAsync`, which runs the nested validation (`getAnswersAsync(true)`) and adds a `sub-schema` error to the parent part when it fails;
- `checklist` and `radio` do not run that check: an invalid nested form simply yields no `answer` for the item, and the nested form publishes to its own `errorResultSourceId` if one was configured.

Sub-schemas are a feature of the list controls only. `autocomplete`, `reference`, `simpleautocomplete`, `simplereference` and `lookup` ignore a `schema` property on their results.

## Examples

### Schema parts

```json
{ "prpId": 130602, "title": "Country", "multi": false,
  "parts": [{ "part": 1, "viewType": "autocomplete",
              "link": "/schema/autocomplete?term=${term}", "validations": { "required": true } }] },

{ "prpId": 130631, "title": "Cities", "multi": true,
  "parts": [{ "part": 1, "viewType": "autocomplete", "caption": "City",
              "link": "/schema/autocomplete?term=${term}&rkey=${rkey}&d1=${data1}&d2=${data2}",
              "dependency": [
                { "name": "data1", "prpId": 130602, "part": 1, "required": false },
                { "name": "data2", "prpId": 1355,   "part": 1, "required": false }
              ] }] },

{ "prpId": 1355, "title": "Lookup", "multi": true,
  "parts": [{ "part": 1, "viewType": "lookup", "link": "/schema/lookup?term=${term}" }] },

{ "prpId": 3544, "title": "Product", "multi": true,
  "parts": [
    { "part": 1, "viewType": "select", "caption": "Category",
      "link": "/schema/fix-data/${prpId}/${part}?rkey=${rkey}", "validations": { "required": true } },
    { "part": 2, "viewType": "simpleautocomplete", "caption": "Product name",
      "link": "/schema/autocomplete?term=${term}&data=${data}",
      "dependency": [{ "name": "data", "prpId": 3544, "part": 1, "required": true }] }
  ] }
```

### Page

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
         qs_rKey="123">
  </Basis>
  <basis core="callback" run="atclient" triggers="demo.data"></basis>
</body>
</html>
```

With the schema above, typing `ab` in the Cities popup after choosing a country with id `42` requests `/schema/autocomplete?term=ab&rkey=123&d1=42&d2=` and a saved city id `7` is resolved through `/schema/autocomplete?fixid=7`.

### Sub-schema example

`example/component/renderable/schema/sub-schema/new/index.html` renders schema `1163`, whose `select`, `checklist` and `radio` items all carry `"schema": { "schemaId": 1164, "paramUrl": "/1164", ... }`:

```html
<Basis core="schema" run="atclient" schemaUrl="/schema/questions" paramUrl="/1163"
       displayMode="new" button="[data-btn-add]" resultSourceId="demo.data">
</Basis>
```

Selecting an item loads `/schema/questions/1164` into the item's sub-schema container.

### Minimal server (reference implementation)

```js
router.get("/autocomplete", (req, res) => {
  if (req.query.term) {
    res.json(items.filter((x) => x.value.indexOf(req.query.term) > -1).slice(0, 10));
  } else if (req.query.fixid) {
    res.json(items.find((x) => x.id == req.query.fixid));
  }
});
```

## Pitfalls

- `part.link` is a template literal: every `${name}` must be supplied, or the request is never sent (`ReferenceError`). Attribute names are lower-cased by the DOM, so `qs_rKey` is available as `${rkey}`.
- Values are inserted without `encodeURIComponent`. List controls pass dependency values JSON-encoded, so a string arrives surrounded by quotes (`data="5248"`).
- `?fixid=` requests drop the query string of `link`, including `${term}` and any `qs_*` parameters that were part of it; the server must answer `fixid` without them.
- Selection in `SearchPopup` and `lookup` is by double-click; a single click does nothing. The simple variants select on a single click.
- `lookup` validates the typed text, not the selected id, and ignores `dependency`.
- `simpleautocomplete`/`simplereference` keep the previously selected id when the user edits the text afterwards.
- A `required` dependency does not block the search in the popup controls; it only displays the error on the source part. In the simple variants and the list controls an empty required dependency makes the URL formatting throw a `ReferenceError`, so that search is lost.
- `select`/`checklist`/`radio` request their list once at creation; changing a dependency later does not reload them.
- Multi-value `autocomplete`/`reference` hijack the question's `+` button; rows added through the popup are reported as added values without `id`.
- Nested sub-schemas always render with the default skin, and only `select` propagates nested validation errors to the parent part.

## Related

- [field-types.md](field-types.md)
- [schema-json-contract.md](schema-json-contract.md)
- [validation.md](validation.md)
- [answers-and-submission.md](answers-and-submission.md)
- [html-field-and-dialogs.md](html-field-and-dialogs.md)
- [dom-markers.md](dom-markers.md)
- [../commands/schema.md](../commands/schema.md)

## Source files

- `src/component/renderable/schema/part-control/auto-fill/AutoFillType.ts`
- `src/component/renderable/schema/part-control/auto-fill/AutoFillSingleType.ts`
- `src/component/renderable/schema/part-control/auto-fill/AutoFillMultiType.ts`
- `src/component/renderable/schema/part-control/auto-fill/AutoFillSimpleType.ts`
- `src/component/renderable/schema/part-control/auto-fill/SearchPopup.ts`
- `src/component/renderable/schema/part-control/auto-fill/auto-complete/*.ts`, `reference/*.ts`
- `src/component/renderable/schema/part-control/auto-fill/assets/*.html`, `style.css`
- `src/component/renderable/schema/part-control/lookup/Lookup.ts`, `assets/layout.html`
- `src/component/renderable/schema/part-control/ListBaseType.ts`
- `src/component/renderable/schema/part-control/select/SelectType.ts`
- `src/component/renderable/schema/part-control/select-list/SelectListType.ts`
- `src/component/renderable/schema/question/Question.ts` (`replaceAddClick`)
- `src/component/renderable/schema/SchemaComponent.ts` (`qs_*` collection)
- `src/Util.ts` (`formatString`, `getDataAsync`)
- `server/schema-server.js`
