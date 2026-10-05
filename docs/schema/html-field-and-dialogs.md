# The `html` field, modal dialogs and helper UIs

The `html` `viewType` delegates the editing of a part to an external page: the schema runtime opens `part.link` inside an iframe in a modal dialog and exchanges JSON messages with it through `window.postMessage`. The same modal markup, a popup used by the search controls, a CSS-only help tooltip and a password visibility toggle complete the set of helper user interfaces that the schema runtime adds around its controls. This page documents the exact message protocol, the sizing rules, the DOM of the dialogs, and the small helpers, so that you can write an embedded editor page or style the dialogs.

## The `html` field (`HTMLFieldType`)

### Part markup

```html
<div data-bc-part data-bc-part-related-cell>
  <div data-bc-html-field-row>
    <input data-bc-text-input type="text" disabled />
    <div data-bc-input-overlay></div>
  </div>
  <ul data-bc-validation-part></ul>
</div>
```

The disabled text box shows `JSON.stringify(value)` of the current value. `[data-bc-input-overlay]` is an absolutely positioned cover over the input, so that a click anywhere on the part reaches the part element. The click handler of `[data-bc-part]` opens the dialog.

### Dialog markup

The dialog (`html/assets/HTMLLayout.html`) is created once per part and appended to the question's part container (`[data-bc-part-container]`), hidden with `display: none`:

```html
<div data-bc-html-container>
  <div data-bc-html data-sys-html>
    <div data-bc-title data-sys-html-header>
      <button data-bc-btn-close data-sys-text>X</button>
    </div>
    <div data-bc-body data-sys-html-body></div>
    <div data-bc-footer data-sys-html-footer></div>
  </div>
</div>
```

Opening sets `display: block`, clears `[data-bc-body]` and appends a hidden `<iframe data-bc-iframe src="<part.link>">` followed by a `<div>` with the text `loading ...`. `part.link` is used verbatim; no `${...}` placeholders or `qs_*` parameters are applied. The footer is empty; the bundled CSS styles buttons inside `[data-sys-html-footer]` but nothing places any.

Closing (`onClose`) sets `display: none` and rewrites the text box from the current value. It is triggered by:

- a click on `[data-bc-btn-close]`;
- a click anywhere on `[data-bc-html-container]`, which includes clicks that bubble from the dialog box itself (but not clicks inside the iframe document);
- the `isLoaded: false` and `isSubmited` messages described below.

### Message protocol

All messages are JSON **strings** (`JSON.stringify` on both sides). Messages whose `data` is not valid JSON are ignored. The host does not check `event.origin`.

Host to embedded page, sent once from the iframe `load` event:

```json
{ "mode": "new" }
```

when the part has no value yet, or the current value spread into the message when it has one:

```json
{ "name": "test", "email": "test", "mode": "edit" }
```

Embedded page to host (`window.parent.postMessage(JSON.stringify(...))`):

| Message | Effect in the host |
|---|---|
| `{ "isLoaded": true }` | the iframe is shown, the `loading ...` text hidden and the iframe sized (see below) |
| `{ "isLoaded": false }` | the dialog closes, the message listener is removed, the value is unchanged |
| `{ "isSubmited": true, ...fields }` | `isSubmited` is removed from the object; when at least one field remains it becomes the new value and the question's add/remove buttons are refreshed; the dialog closes and the listener is removed |

The spelling is `isSubmited` (one `t`). A submission that carries only `isSubmited` closes the dialog and keeps the previous value. A message can contain both `isLoaded` and `isSubmited`; both branches run in that order.

Messages are posted without a target origin, so the browser delivers them only to a same-origin document, and the host also reads `iframe.contentDocument` to measure the page. `part.link` must therefore be served from the same origin as the host page.

### Sizing

On `isLoaded: true` the host measures the embedded document:

```js
height = doc.documentElement.scrollHeight || doc.body.offsetHeight;
width  = doc.documentElement.scrollWidth  || doc.body.offsetWidth;
iframe.style.height = Math.min(max_height || 300, Math.max(min_height || 300, height)) + "px";
iframe.style.width  = Math.min(max_width  || 450, Math.max(min_width  || 450, width))  + "px";
```

The bounds are the `min_width`, `max_width`, `min_height` and `max_height` attributes of the `<basis core="schema">` element (strings converted with `Number`). Without them the iframe is always 450 by 300 pixels, because the minimum and maximum defaults are equal. The measurement runs once per open; later changes of the embedded page size are not tracked.

### Value lifecycle

- A saved answer value (`answer.values[0].value`, an object such as `{ "email": "test", "name": "test" }`) is the initial value and is shown as JSON in the text box.
- `getAddedAsync` returns `{ part, values: [{ value: <object> }] }` when there is no saved answer and a value was submitted.
- `getEditedAsync` returns `{ part, values: [{ id, value: <object> }] }` when a new object was submitted (compared by reference with the saved one).
- `getDeletedAsync` only returns a result when the value is an empty object, which the protocol never produces, so an `html` value cannot be deleted through the dialog.
- `getValidationErrorsAsync` returns `null`: `validations` on an `html` part, including `required`, are ignored.
- `getValuesAsync` returns the raw value object instead of a `{ part, values }` structure, so `html` values are not usable as `dependency` parameters of other parts.

In `displayMode="view"` the part is rendered by `ReadOnlyText`, which prints `[object Object]`.

For a question that is not `multi`, the `html` row keeps the pair button container minus its add button; when the row has a saved answer, `updateButtonState` shows its remove button, which discards the saved value (reported in `deleted`) and shows an empty row.

### Writing the embedded page

The reference server (`server/schema-server.js`, route `/html`) serves a minimal editor. Cleaned up:

```html
<div style="height:400px;width:600px">
  <label for="name">Name:</label> <input id="name" name="name" /><br /><br />
  <label for="email">Email:</label> <input id="email" name="email" type="email" /><br /><br />
  <button onclick="onSubmit()">submit</button>
  <script>
    function post(values) { window.parent.postMessage(JSON.stringify(values)); }
    function setValues(values) {
      Object.keys(values).forEach((k) => (document.getElementById(k).value = values[k]));
    }
    function onSubmit() {
      const values = {};
      if (document.getElementById("name").value)  values.name  = document.getElementById("name").value;
      if (document.getElementById("email").value) values.email = document.getElementById("email").value;
      post({ ...values, isSubmited: true });
    }
    window.addEventListener("message", (e) => {
      const answer = JSON.parse(e.data);
      if (!answer.mode) return;
      const mode = answer.mode;
      delete answer.mode;
      if (mode == "edit") setValues(answer);
      post({ isLoaded: true });
    });
  </script>
</div>
```

The listener must be registered before the iframe `load` event fires (inline in the document is enough). Lay out the content before sending `isLoaded: true`, because the size is measured at that moment.

## `SearchPopup`

The autocomplete and reference controls open a second kind of dialog, appended to `document.body` and removed when closed or, in single mode, when a value is picked:

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

Because it is outside the form, the popup repeats the form's `data-bc-schema-direction` and `data-bc-schema-skin` on its container so that direction and skin selectors keep working. Behaviour is described in [lookup-and-autocomplete.md](lookup-and-autocomplete.md).

## Styling of both dialogs

Both containers are `position: fixed`, full-size, `background-color: rgba(0, 0, 0, 0.4)` and `z-index: 999999999`. The boxes are centred with `top: 50%` and a direction-dependent transform (`[data-bc-schema-direction="rtl"]` uses `left: 50%; translateX(-50%)`, `ltr` uses `right: 50%; translateX(50%)`); the `html` dialog takes the direction from its ancestor `[data-bc-schema-main-container]`, the popup from its own attribute. `[data-bc-title]` is a 20px line with a dashed bottom border and `#f7f7f7` background; `[data-bc-body]` has `min-height: 50px`, white background and rounded bottom corners (`5px`, `4px` under `template2`). The popup box is 400px wide; the `html` dialog box is sized by its iframe. `[data-bc-iframe]` has a 2px `#d8e2e6` border.

## Help tooltip

When a question has `help`, `QuestionContainer` keeps the `<a data-bc-help-btn>` icon next to the title and copies the text into `data-bc-help-tooltip`:

```html
<div data-bc-title-container>
  <span data-bc-question-title data-bc-schema-info-prpid="13050" data-sys-text>Generator name</span>
  <a data-bc-help-btn data-bc-help-tooltip="Help text ...">
    <svg>...</svg>
  </a>
</div>
```

Without `help` the anchor is removed. The tooltip is pure CSS: `[data-bc-help-tooltip]:hover:before` renders `content: attr(data-bc-help-tooltip)` in a dark rounded box (`max-width: 300px`, 12px font, 0.5s fade) above the icon, with a small arrow from `:after`. Horizontal placement follows `data-bc-schema-direction`. There is no click handler; the text is shown as plain text, so HTML inside `help` is not interpreted.

## Password visibility toggle

`PasswordType` (`viewType: "password"`) renders

```html
<input type="password" data-bc-text-input data-sys-input-text />
<span data-bc-view-pass data-bc-view-pass-status="hide" data-sys-text><svg>eye</svg></span>
```

A click on the span toggles `data-bc-view-pass-status` between `hide` and `show`, switches the `type` of the `input[data-bc-text-input]` found inside the closest `[data-bc-part]` between `password` and `text`, and replaces the icon (open eye for `hide`, crossed eye for `show`) through `innerHTML`. The span is positioned absolutely inside the answer container, on the left for `rtl` and on the right for `ltr`.

## Keyword verification colour

The bundled stylesheet (`question/assets/style.css`) colours any option, list item or result marked `data-bc-keyword-verification="false"` in orange (`#FFA500`) inside radio and checkbox parts, native selects, the search popup results and the lookup results. The runtime never writes this attribute; it is available for markup added by your own code, for example through the `callback` option, and only the exact value `"false"` matches.

## Examples

### Schema with an `html` part

```json
{ "prpId": 51, "title": "Contact", "parts": [{ "part": 1, "viewType": "html", "link": "/schema/html" }] }
```

### Page with explicit iframe bounds

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body dir="rtl">
  <Basis core="api" url="/schema/answers?id=[##inline.object.id##]" method="get" run="atclient"></Basis>
  <button data-btn-edit>Save</button>
  <Basis core="schema" datamembername="answer.data" run="atclient"
         schemaUrl="/schema/questions" displayMode="edit"
         button="[data-btn-edit]" resultSourceId="demo.data"
         min_width="200" max_width="800" min_height="200" max_height="600"
         direction="rtl">
  </Basis>
  <basis core="callback" run="atclient" triggers="demo.data"></basis>
  <script>
    const host = { sources: { "inline.object": [{ id: 1423330 }] } };
  </script>
</body>
</html>
```

Opening the `Contact` part loads `/schema/html` in the dialog, posts `{"email":"test","name":"test","mode":"edit"}` to it, and after the page answers `{"isLoaded":true}` the iframe is sized between 200 and 800 pixels wide and 200 and 600 pixels high. Submitting `{"isSubmited":true,"name":"x","email":"y"}` stores `{ "name": "x", "email": "y" }`, which appears in `demo.data` as `edited: [{ id, parts: [{ part: 1, values: [{ id, value: { name: "x", email: "y" } }] }] }]`.

### Styling the dialog

```css
[data-bc-schema-main-container] [data-bc-html-container] { background-color: rgba(0, 0, 0, 0.6); }
[data-bc-html-container] [data-bc-title] { background-color: #004b85; color: #fff; }
[data-bc-autocomplete-popup-container] [data-bc-autocomplete-popup] { width: 520px; }
```

## Pitfalls

- `isSubmited` is spelled with a single `t`; `isSubmitted` is ignored.
- The host posts `{mode}` on the iframe `load` event; a listener registered later misses it.
- `part.link` must be same-origin: the message is sent without a target origin and the host reads the iframe document to size it.
- Without `min_*`/`max_*` attributes the iframe is fixed at 450 by 300 pixels.
- Clicking inside the dialog box but outside the iframe (for example on the title bar) closes the dialog.
- Closing with the X button or the backdrop does not remove the `message` listener; it stays registered until an `isLoaded: false` or `isSubmited` message arrives, and every new open adds another listener.
- `validations` on an `html` part are ignored, and a submitted value cannot be deleted from the dialog.
- `html` values render as `[object Object]` in `view` mode.
- `help` text is shown as plain text; it is not sanitised for use elsewhere, but the tooltip itself cannot render markup.
- `data-bc-keyword-verification` is a CSS hook only.

## Related

- [field-types.md](field-types.md)
- [lookup-and-autocomplete.md](lookup-and-autocomplete.md)
- [dom-markers.md](dom-markers.md)
- [validation.md](validation.md)
- [answers-and-submission.md](answers-and-submission.md)
- [../commands/schema.md](../commands/schema.md)

## Source files

- `src/component/renderable/schema/part-control/html/HTMLFieldType.ts`
- `src/component/renderable/schema/part-control/html/assets/layout.html`, `HTMLLayout.html`, `style.css`
- `src/component/renderable/schema/part-control/auto-fill/SearchPopup.ts`, `assets/popup-layout.html`, `assets/style.css`
- `src/component/renderable/schema/part-control/text/PasswordType.ts`, `assets/password-layout.html`
- `src/component/renderable/schema/question-container/QuestionContainer.ts`, `assets/layout.html`, `assets/style.css`
- `src/component/renderable/schema/question/Question.ts`, `assets/style.css`
- `src/component/renderable/schema/SchemaComponent.ts` (`min_width`, `max_width`, `min_height`, `max_height`)
- `src/component/renderable/schema/IFormMakerOptions.ts`
- `server/schema-server.js` (route `/html`)
