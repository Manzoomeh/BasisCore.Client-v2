# Forms and schema

BasisCore.js gives you two ways to collect user input:

- **Plain HTML elements** (`<input>`, `<select>`, `<form>` and any other element) that publish a
  source when a DOM event fires. No `<basis>` wrapper is needed.
- **The `schema` family of commands** (`schema`, `schemalist`, `schemauploader`), which build a
  complete form from a JSON question definition, validate it, and hand the answers to your
  server.

Sources, source ids and `triggers` are explained in [sources-and-triggers.md](sources-and-triggers.md);
token syntax such as `[##search.q.value##]` in [binding.md](binding.md).

---

## Part 1 — Binding plain HTML elements

### The minimal pattern

```html
<input name="search.q" bc-triggers="keyup" />
<p>You typed: [##search.q.value|(nothing yet)##]</p>
```

Any element that has a `bc-triggers` attribute is picked up when the page is processed. On each
listed event the element publishes a source; everything that depends on that source re-renders.

### How an element is recognised

| Element | Handled as | Value it publishes |
|---|---|---|
| `<input>` | input | see [Inputs](#inputs) |
| `<select>` | select | `select.value` |
| `<form>` | form | an object built from the form's fields |
| anything else (`<textarea>`, `<button>`, `<div>`, …) | unknown-html | `bc-value`, otherwise the element's `value` property |

Only elements with `bc-triggers` take part; an `<input>` without it is ignored.

### `bc-triggers` — DOM events, not source ids

`bc-triggers` is a space-separated list of **DOM event names** (`keyup change`) passed to
`addEventListener`. It never contains source ids. To make an element re-publish when a *source*
changes, add the ordinary `triggers` attribute (see [sources-and-triggers.md](sources-and-triggers.md)):

```html
<!-- re-publish the current value whenever app.reset changes -->
<input name="filter.city" bc-triggers="change" triggers="app.reset" />
```

Two consequences of how the listener works:

- **`preventDefault()` is called on every listed event.** A `<form bc-triggers="submit">` never
  navigates, which is usually what you want. But `bc-triggers="click"` on a checkbox stops it from
  toggling, and `keydown`/`keypress` on a text field stops typing. Use `change` for checkboxes,
  radios and selects, and `keyup` or `input` for text.
- **Nothing is published at page load.** An element publishes only when one of its events fires
  (or one of its `triggers` sources changes). If other commands need an initial value, set it with
  `$bc.setSource(...)` or put it in `host.sources` (see [connections.md](connections.md)).

### Source id: `bc-name`, then `name`, then `cms.unknown`

The id of the published source is `bc-name` if present, otherwise `name`, otherwise the fixed id
`cms.unknown`. Ids are lower-cased, and both attributes accept tokens. Use `bc-name` when `name`
must keep a different meaning, for example a field name inside a form.

### Published shape

A source is always a list of rows. A plain value (string, number, boolean) is published as
`[{ value: <value> }]`, an object (the form case) as `[<object>]`, and an array as itself.
So an input, select or button value is read as column `value`: `[##filter.size.value##]`.

### Inputs

For `<input>`, the value is chosen as follows:

| Situation | Published value |
|---|---|
| unchecked checkbox | `bc-off-value`, otherwise the string `"off"` |
| `bc-value` is set (and non-empty) | `bc-value` |
| checked checkbox | its `value` attribute (the browser default is `"on"`) |
| radio button | its `value` (each radio publishes when it becomes selected) |
| file input with a file chosen | the browser's placeholder path string, for example `C:\fakepath\photo.jpg` |
| anything else | `input.value` |

A file input therefore **does not publish the file itself**. To send files, use the `schema` +
`schemauploader` pair described in Part 2, or read `input.files` in your own script.

```html
<input type="checkbox" name="filter.instock" bc-triggers="change" bc-value="1" bc-off-value="0" />
```

### Selects

A `<select>` publishes `select.value`, so `bc-value` has no effect on it, and `<select multiple>`
is not supported: only the first selected option is published. Wrap it in a `<form>` (below) to
get every selected value.

### Other elements (unknown-html)

Any other element with `bc-triggers` publishes `bc-value` if present, otherwise its `value`
property. That makes `<textarea>` work out of the box, and lets a button carry a fixed value:

```html
<textarea name="note.text" bc-triggers="keyup"></textarea>
<button bc-name="ui.tab" bc-value="settings" bc-triggers="click">Settings</button>
```

An element with neither `bc-value` nor a `value` property (a `<div>`, a `<span>`) publishes
`[{ value: undefined }]`; this is still enough to fire commands that list the id in `triggers`.

### Forms

A `<form>` publishes **one row that holds the whole form**, built with the browser's `FormData`:

```html
<form name="signup.form" bc-triggers="submit">
  <input name="email" />
  <input type="checkbox" name="topics" value="news" />
  <input type="checkbox" name="topics" value="offers" />
  <button type="submit">Send</button>
</form>
```

Submitting publishes `signup.form` as:

```json
[{ "email": "a@example.com", "topics": ["news", "offers"] }]
```

The usual `FormData` rules apply: fields without a `name`, disabled fields and unchecked
checkboxes are left out; a file field contributes a `File` object; a name that occurs once gives a
single value and a name that occurs several times gives an array. This is also how to collect every
option of a `<select multiple>`.

#### Nested objects: names starting with `_`

A field whose name starts with `_` is expanded into a nested object along its dots, and a segment
written `name__N` becomes item `N` of an array:

```html
<form name="order.form" bc-triggers="submit">
  <input name="_order.customer.name" />
  <input name="_order.lines__0.sku" />
  <input name="_order.lines__1.sku" />
  <button type="submit">Order</button>
</form>
```

publishes

```json
[{ "_order": { "customer": { "name": "…" }, "lines": [ { "sku": "…" }, { "sku": "…" } ] } }]
```

Rules to keep in mind:

- The top-level key keeps its underscore (`_order`).
- A name needs at least one dot after the root (`_order.x`). A bare `_flag` produces an empty
  object, not the field's value.
- A `name__N` segment must be followed by another segment (`lines__0.sku`); it cannot be the last
  one.
- Arrays are compacted: gaps in the indexes are removed, and so are empty-string items in
  multi-value fields, so do not rely on index positions surviving.

### Merging instead of replacing: `bc-merge`, `bc-keyField`, `bc-statusField`

By default each publish **replaces** the source. Three attributes change that:

| Attribute | Meaning |
|---|---|
| `bc-merge` | `replace` (default) or `append` (case-insensitive) |
| `bc-keyField` | column that identifies a row |
| `bc-statusField` | column that says what to do with the row |

With `append` and no key field, the published rows are added to the end of the existing source.
With `append`, a key field **on both the existing and the new source**, and a status field, each
row is applied by its status: `0` add, `1` replace the row with the same key, `2` delete it. Digit
strings from form fields (`"1"`) work because the comparison is loose; words such as `"edited"` are
not recognised and the row is skipped. If the status field is missing, rows are added.

```html
<form name="cart.items" bc-triggers="submit"
      bc-merge="append" bc-keyField="sku" bc-statusField="op">
  <input name="sku" />
  <select name="op"><option value="0">Add</option><option value="1">Update</option>
    <option value="2">Remove</option></select>
  <button type="submit">Apply</button>
</form>
```

The first submit creates `cart.items` with its key field set, so later submits can update and
delete by key. Merge behaviour in general is covered in [sources-and-triggers.md](sources-and-triggers.md).

### Skipping part of the page: `bc-ignore`

An element with `bc-ignore` is skipped **together with its whole subtree**: no `bc-triggers`
elements, no `<basis>` commands and no `[##…##]` tokens inside it are processed. Use it for code
samples or third-party widgets: `<div bc-ignore><code>[##shown.as.is##]</code></div>`.

HTML elements also accept `if`, `OnProcessing` (receives `{ id, value }` and may change both),
`OnRendering` (set `prevent = true` to cancel the publish), `OnRendered` and `OnProcessed`; see
[hooks-and-extensibility.md](hooks-and-extensibility.md).

---

## Part 2 — The `schema` command

`schema` renders a form from a question definition, validates it, and publishes the answer as a
source when a button is clicked.

```html
<button id="save">Save</button>

<basis core="schema" run="atclient"
       schemaUrl="https://example.com/schema/questions?id=1"
       displayMode="new"
       button="#save"
       resultSourceId="profile.answer"
       errorResultSourceId="profile.invalid">
</basis>

<basis core="callback" run="atclient" triggers="profile.answer" method="onAnswer"></basis>
<script>
  function onAnswer(args) {
    console.log(args.source.rows[0]); // the answer object
  }
</script>
```

### Attributes

| Attribute | Default | Meaning |
|---|---|---|
| `schemaUrl` | — | URL of the question definition (fetched with `GET`) |
| `paramUrl` | — | appended to `schemaUrl`; in `edit`/`view` it falls back to the answer's `paramUrl` |
| `displayMode` | `new` | `new`, `edit` or `view` |
| `datamembername` | — | source holding the existing answer (`edit` and `view` only) |
| `button` | — | CSS selector of the element(s) that submit the form |
| `resultSourceId` | — | source that receives the answer |
| `errorResultSourceId` | — | source set when validation fails |
| `qs_<name>` | — | a value made available to option and search URLs (below) |
| `skin` | `default` | `default` or `template2` |
| `direction` | `rtl` | `rtl` or `ltr`; a `direction` in the schema itself wins |
| `cell` | `1` | number of columns in the `default` skin |
| `filesPath` | — | prefix for URLs of files already stored in an answer |
| `options` | — | name of a global object with validation message settings (below) |
| `callback` | — | name of a global function called with `{ element, prpId, typeId, value }` when an autocomplete or reference part gets a value, and when read-only parts render |

The definition is read from the standard response envelope, first source, first row:

```json
{ "sources": [ { "options": {}, "data": [ { "schemaId": "…", "schemaVersion": "…", "lid": 1,
  "paramUrl": "…", "questions": [ … ], "sections": [ … ] } ] } ] }
```

Nothing is rendered when `questions` is missing or empty.

### Display modes

- **`new`** renders an empty form. No data source is used; the form is built once, when the command
  runs.
- **`edit`** waits for the source named in `datamembername`, uses its **first row** as the existing
  answer, and fills the form with it. Only changes are submitted.
- **`view`** also reads the first row of `datamembername`, renders read-only parts, and shows only
  the questions that have an answer. No answer is ever published in `view`.

An answer row (what `edit` and `view` read) has this shape:

```json
{ "schemaId": "…", "schemaVersion": "…", "lid": 1, "paramUrl": "…", "usedForId": 1,
  "properties": [ { "prpId": 10, "answers": [ { "id": 1,
    "parts": [ { "part": 1, "values": [ { "id": 1, "value": "…" } ] } ] } ] } ] }
```

When the answer has a `paramUrl`, it is appended to `schemaUrl`, so give `schemaUrl` as a base URL
in that case.

### The submit button

`button` is a CSS selector evaluated against the **whole document**, not only inside the command,
once when the command initialises. The matched elements must therefore exist at that moment. A
click calls `preventDefault()`, validates every question and then:

- if all questions are valid and something changed, publishes the answer to `resultSourceId`;
- if all questions are valid but nothing changed, publishes nothing;
- if any question is invalid, marks the invalid parts in the form and sets
  `errorResultSourceId` to `true` (row `[{ value: true }]`). On success this source is **not**
  reset, so treat it as an "a validation failed" signal, not as a current state.

Both `button` and `resultSourceId` are required for the button to do anything.

The published answer looks like:

```json
{ "schemaId": "…", "schemaVersion": "…", "lid": 1, "paramUrl": "…",
  "properties": [ { "propId": 10, "multi": false,
    "added": [ { "parts": [ { "part": 1, "values": [ { "value": "…" } ] } ] } ],
    "edited": [ … ], "deleted": [ … ] } ] }
```

The key is `propId` in the result but `prpId` in the definition and the stored answer. In `edit`
mode the result also carries `usedForId` and `ownerid` from the answer being edited.

### `qs_*` values

Every attribute starting with `qs_` becomes a named value, with the `qs_` prefix removed. HTML
attribute names are lower-case, so **`qs_rKey` produces `rkey`**. Write them in lower case to
avoid surprises:

```html
<basis core="schema" run="atclient"
       schemaUrl="https://example.com/schema/questions?id=1"
       qs_rkey="[##session.key.value##]" qs_lang="en">
</basis>
```

These values are not appended to any URL automatically. They are substituted into the `link` of
parts that load data from the server, where the link is a template with `${…}` placeholders:

```json
{ "part": 1, "viewType": "Select", "link": "https://example.com/options?prp=${prpId}&part=${part}&rkey=${rkey}" }
```

### Parts that load from the server

| View type | Request | Placeholders available | Expected response |
|---|---|---|---|
| `Select`, `Checklist`, `Radio` without `fixValues` | `GET link` once | `prpId`, `part`, `qs_*`, dependencies | `[{ "id": 1, "value": "…", "selected": false }]` |
| `Autocomplete`, `Reference` and their `Simple…` forms | `GET link` per search | `term`, `qs_*`, dependencies | `[{ "id": 1, "value": "…" }]` |
| `Lookup` | `GET link` per search | `term`, `qs_*` | `[{ "id": 1, "value": "…" }]` |

When a stored answer holds an id, autocomplete, reference and lookup parts resolve its label with a
`GET` to the link's path plus `?fixid=<id>`, expecting a single `{ "id", "value" }` object.

A part can depend on other parts through `dependency`, an array of
`{ "prpId": 10, "part": 1, "name": "country", "required": false }`. The current value of that
part is JSON-encoded and exposed as `${country}` in the link. Dependencies are honoured by the
select-list types and the autocomplete/reference types; `Lookup` ignores them.

### Validation

Each part may carry `validations`: `required`, `minLength`/`maxLength`, `min`/`max`,
`dataType` (`int` or `float`), `regex`, and for uploads `mimes` and `size`.

Messages are chosen from the schema's `lid`:

| `lid` | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| culture | fa | en | ar | fr | de | es | ru | zh | tr | ka | hy | az | id | th | ur | hi | fa |

Built-in texts exist in Persian and English only; other cultures fall back to English. To load your
own texts, point `options` at a global object:

```html
<script>
  var profileFormOptions = { messagesApi: "https://example.com/messages",
                             validationErrors: { required: "101", regex: "102" } };
</script>
<basis core="schema" run="atclient"
       schemaUrl="https://example.com/schema/questions?id=1"
       options="profileFormOptions">
</basis>
```

The form then posts `{ "sentenceId": ["101", "102"] }` as JSON to `messagesApi/<culture>` (for
example `…/messages/en`) and expects `[{ "id": "101", "title": "…" }]`. If the request fails, the
built-in texts are used.

**Files.** An `Upload` part reads each file into a data URL, so the file travels inside the answer
JSON. A `Blob` part keeps the `File` object in the answer together with the part's `uploadToken`;
such an answer must be sent with `schemauploader`, which uploads the files separately.

---

## `schemalist`

In 2.39.6 `schemalist` is minimal. For every row of its `datamembername` source (each row an
answer), it requests `schemaUrl?id=<schemaId>&ver=<schemaVersion>&lid=<lid>` and appends one
`<div>` per question containing only the question's title. `<face>` templates are read but not
used, and every question in the definition must have a matching property in the answer. For a
real read-only display use `schema` with `displayMode="view"`.

---

## `schemauploader`

`schemauploader` sends a `schema` answer to your server in two phases: the answer JSON first, then
each `Blob` file on its own.

```html
<button id="send">Send</button>

<basis core="schema" run="atclient"
       schemaUrl="https://example.com/schema/questions?id=1"
       button="#send" resultSourceId="ticket.answer">
</basis>

<basis core="schemauploader" run="atclient"
       datamembername="ticket.answer"
       name="ticket"
       url="https://example.com/answers"
       blob="https://example.com/answers/files">
</basis>

<basis core="callback" run="atclient" triggers="ticket.uploading" method="onSent"></basis>
<script>
  function onSent(args) {
    const result = args.source.rows[0].postAnswerResult;
    if (!result.usedforid) console.error("Answer rejected", result);
  }
</script>
```

| Attribute | Meaning |
|---|---|
| `datamembername` | source holding the answer, usually the schema's `resultSourceId` |
| `url` | endpoint for the answer JSON |
| `blob` | endpoint for files; defaults to `url` |
| `name` | prefix of the two status sources |
| `noCache` | **do not set to `true` in 2.39.6** — it throws before any request is sent |

### Phase 1 — the answer

Only the **first row** of the source is used. If that row has a `data` property, the answer is
taken from it. Every `Blob` value in `added` and `edited` is replaced by a generated `blobid`, and
the row is posted as `application/json` to `url`.

The response must be JSON and **must contain `usedforid`**, for example `{ "usedforid": 1 }`.

### Phase 2 — the files

If `usedforid` is present, each file is posted as `multipart/form-data` to `blob`, with
`uploadtoken`, `blobid`, `prpid`, `part`, `usedforid` and `lid` both in the query string and as
form fields; the file itself is the form field named after the file. Each response must be JSON.
If `usedforid` is missing, an error is logged and no file is sent.

### Status sources

| Source | Published when | Row |
|---|---|---|
| `<name>.uploading` | right after the phase 1 response is parsed, whatever it contains | `{ answer, postAnswerResult, fileList }` |
| `<name>.uploaded` | after all files finish — only if `usedforid` was returned **and** there was at least one file | `{ answer, postAnswerResult, fileList, uploadFileResult }` |

For an answer without files, `<name>.uploaded` is never published: watch `<name>.uploading` and
check `postAnswerResult` instead. Neither source is published when `name` is not set. The HTTP
status is not checked, so an error body is still parsed and reported through `.uploading`.

An `OnProcessing` hook receives the phase 1 `Request` and may supply its own `response`; see
[hooks-and-extensibility.md](hooks-and-extensibility.md). For problems that show up only at run
time, see [troubleshooting.md](troubleshooting.md).
