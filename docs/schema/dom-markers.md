# DOM markers written by the schema runtime

The `schema` command does not use CSS classes to identify what it renders. Every element it creates carries `data-bc-*` attributes that name the element's role (and that the runtime itself uses in `querySelector` calls) and `data-sys-*` attributes that exist only as styling hooks for the bundled and host stylesheets. This page is the inventory of both families, grouped by the area of the form that writes them, with the element each marks and its meaning. Use it to theme a form, to target elements in tests, or to find your way around the rendered tree in the browser inspector. Markers are listed as they appear in `src/component/renderable/schema/**/assets/*.html` and in the TypeScript that sets attributes at run time.

## Conventions

- Most markers are valueless (`data-bc-part=""`). The ones that carry a value are called out.
- `data-bc-*` markers are read back by the runtime; renaming them in a copied template breaks behaviour. `data-sys-*` markers are never read by code.
- A few attributes without the `data-bc-` prefix are also written and are listed at the end.
- Markers that only appear in the bundled CSS, and are never written by the runtime, are listed separately so that you do not wait for them.

## Form root and layout

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-schema-main-container` | root `<div>` created by `SchemaComponent.initUIAsync` | contains the whole rendered form; `* { box-sizing: border-box }` is applied inside it |
| `data-bc-schema-direction` = `rtl` or `ltr` | root `<div>`; also the `SearchPopup` container | text direction, from the schema JSON `direction` or the `direction` attribute (default `rtl`); every direction-aware rule in the bundled CSS keys on it |
| `data-bc-schema-skin` = `default` or `template2` | root `<div>`; also the `SearchPopup` container | active skin, from the `skin` attribute |
| `data-bc-section` | `<fieldset>` per schema section | section wrapper; sections without any `[data-bc-question]` are hidden by CSS |
| `data-bc-section-title` | `<legend>` (default) or `<div>` (`template2`) | section title |
| `data-bc-schema-column` | `<div>` per column, default skin | one of the `cell` columns that questions are distributed into round-robin (`QuestionCellManager`) |
| `data-bc-schema-grid-container` | `<div>`, `template2` | flex-wrap grid that receives questions sized by `gridColumns` and `colSpan` (`QuestionGridManager`) |

## Question block (`QuestionContainer`)

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-question` | `<div>` per question | question root; also carries `data-colSpan` (see below) and the question's `cssClass` |
| `data-bc-title-container` | `<div>` | holds the question title and the help icon |
| `data-bc-question-title` | `<span>` | question title text |
| `data-bc-schema-info-prpid` = `prpId` | on the title `<span>` | property id of the question |
| `data-bc-help-btn` | `<a>` with an SVG | help icon; removed when the question has no `help` |
| `data-bc-help-tooltip` = help text | on the help `<a>` | text displayed by the CSS tooltip on hover |
| `data-bc-answer-container` | `<div>` | holds captions and all answer rows of the question |
| `data-bc-schema-info-multi` = `1` or `0` | on the answer container | whether the question accepts several answers |
| `data-bc-schema-info-type` = `typeId` | on the answer container | question type id (only when present in the schema) |
| `data-bc-schema-info-word` = `wordId` | on the answer container | word id (only when present) |
| `data-bc-schema-info-part` = count | on the answer container | number of parts; the bundled CSS derives part widths from it (`[data-bc-schema-info-part="3"] [data-bc-part-related-cell] { width: calc(33.3333% - 10px) }`) |
| `data-bc-schema-info-part-<index>-type` = `viewType` | on the answer container | the `viewType` of each part, `index` starting at 0 |
| `data-bc-answer-title-container` | `<div>` | row of column captions; removed when the question has a single part |
| `data-bc-answer-title` | `<div>` per part, default skin | caption of one part (`part.caption`); also carries `data-bc-part-related-cell` and `data-sys-text` |
| `data-bc-answer-collection` | `<div>` | container of the answer rows |

## Answer row (`Question`)

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-answer` | `<div>` per row | one answer of the question (several when `multi`) |
| `data-bc-part-container` | `<div>` | receives the `[data-bc-part]` of every part of the row |
| `data-bc-pair-btn-container` | `<div>` | holds the remove and add buttons shown on the last row of an edited multi question |
| `data-bc-btns` | `<button>` | generic marker of the two paired buttons |
| `data-bc-btn-remove` | `<button>` | removes this row (saved rows are reported as deleted) |
| `data-bc-btn-add` | `<button>` | adds a new empty row |
| `data-bc-btn` = `add` or `remove` | `<button>` | single toggling button of a row; `add` on the last row, `remove` on the others; multi-value autocomplete/reference controls reroute its `add` click to the search popup |
| `data-sys-plus`, `data-sys-minus` | on buttons | styling state of the add and remove buttons |
| `data-sys-plus-icon`, `data-sys-minus-icon` | `<path>` inside the SVG icons | icon paths |

## Part wrapper (`QuestionPart`)

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-part` | `<div>` per part (also the button block of a row) | part wrapper; gets the part's `cssClass` |
| `data-bc-part-related-cell` | same `<div>`, and caption divs | marks elements that share the per-part width computed from `data-bc-schema-info-part` |
| `data-bc-caption-title` | `<div><span></span></div>`, `template2` only | floating caption of the part (filled when the question has several parts; the span is removed otherwise) |
| `data-bc-content` | placeholder `<div>` in the layout | replaced by the control markup; never present in the final DOM |
| `data-bc-validation-part` | `<ul>` | validation message list, hidden unless the part is invalid |
| `data-bc-invalid` | on `[data-bc-part]` | set by `updateUIAboutError` when the part has validation errors; removed when they clear; the bundled CSS turns borders red under it |

## Text controls (`text`, `textarea`, `time`, `color`, `password`)

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-text-input` | `<input>`, `<textarea>`, or the read-only `<label>` | the element whose value is read and written |
| `data-sys-input-text` | `<input>` and read-only `<label>` | styling of single-line inputs |
| `data-sys-textarea` | `<textarea>` | styling of multi-line inputs |
| `data-sys-input-disabled` | read-only `<textarea>` (`view` mode) | styling of the disabled text area |
| `data-bc-view-pass` | `<span>` after a password input | eye toggle |
| `data-bc-view-pass-status` = `hide` or `show` | on the toggle `<span>` | whether the password is masked |
| `data-sys-text` | on the toggle and on many text-bearing elements | generic text styling hook |

## List controls (`select`, `checklist`, `radio`)

| Marker | Element | Meaning |
|---|---|---|
| `data-sys-select-option` | `<select>` | styling of the native select |
| `data-bc-sm-sub-schema-container` | `<div>` after the select, after the radio items, or inside each checklist item | receives the nested `schema` command of a sub-schema item |
| `data-bc-part-checkbox` | `<div>` | checklist control root |
| `data-bc-part-radio` | `<div>` | radio control root |
| `data-sys-part-checkbox` | both roots | shared styling of list controls |
| `data-bc-items` | `<div>` | container of the generated items |
| `data-bc-item` | `<div>` per item, `template2` radio | tab item wrapper |
| `data-bc-part-radio-container` | `<div>`, `template2` radio | flex row holding the tab bar and the clear button |
| `data-bc-part-radio-tab-container` | `<div>`, `template2` radio | tab bar; hides the real radio inputs |
| `data-bc-part-radio-tab-button` | `<label>` per item, `template2` radio | clickable tab; carries `tab-button-status="active"` when selected |
| `data-bc-part-radio-tab-active` | `<span>`, `template2` radio | sliding highlight moved with `translateX` |
| `data-bc-btn-cross` | `<button>`, `template2` radio | clears the selection; removed when the part is `required` |
| `data-sys-cross-icon` | `<path>` of the clear icon | icon path |
| `data-sys-text` | item `<div>`s | item text styling |

## Autocomplete, reference and lookup

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-auto-complete-container` | `<div>` | single-value `autocomplete`/`reference` root |
| `data-bc-add-item` | `<label>` | shows the selected item's text (single and multi variants) |
| `data-bc-auto-complete` | `<label>`, the simple variant root, and the lookup input wrapper | shared marker of search-based controls (the `template2` CSS draws a search icon after it) |
| `data-bc-auto-complete-single-type` | `<label>` | the single-variant label |
| `data-bc-auto-complete-single-type-btn` | `<button>` | the open/clear button of the single variant; its `data-bc-btn` is `add` or `remove` |
| `data-sys-auto-complete` | `<label>` | styling of the selection label |
| `data-bc-fm-simple-autocomplete` | `<div>` | `simpleautocomplete`/`simplereference` root |
| `data-bc-search` | `<input>` | search box of the simple variants and of the popup |
| `data-bc-result` | `<ul>` | result list of the simple variants, the popup and `lookup` |
| `data-sys-search-result` | `<ul>` | result list styling |
| `data-bc-value` = item text | generated `<li>` | the `value` of the result item |
| `data-sys-hover` | generated `<li>` | hover styling of result items |
| `data-bc-fm-lookup` | `<div>` | `lookup` root |
| `data-bc-lookup-select-value` | `<span>` | wraps the lookup text box (`[data-bc-text-input]`) |
| `data-bc-lookup-set-value` | `<span>` | displays the selected id |
| `data-sys-select-lookup` | the id `<span>` | styling of the id box |

### `SearchPopup` (appended to `document.body`)

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-autocomplete-popup-container` | `<div>` | fixed backdrop; also carries `data-bc-schema-direction` and `data-bc-schema-skin` |
| `data-bc-autocomplete-popup` | `<div>` | 400px dialog box |
| `data-sys-autocomplete-popup` | dialog box | styling |
| `data-bc-title` | `<div>` | header holding the close button |
| `data-sys-autocomplete-popup-header` | header | styling |
| `data-bc-btn-close` | `<button>` | removes the popup |
| `data-bc-body` | `<div>` | holds `[data-bc-search]` and `[data-bc-result]` |
| `data-sys-autocomplete-popup-body` | body | styling |

## File controls (`upload`, `blob`)

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-upload-file-select` | `<div>` | wraps the file input (hidden native button under `template2`) |
| `data-bc-file-input` | `<input type="file">` | the picker; `multiple` follows `part.multiple` |
| `data-bc-upload-file-list` | `<div>` | list of file items (the only element of the read-only control) |
| `data-bc-upload-file-item` | `<div>` per file | one file |
| `data-bc-item-btn-delete` | `<span>` | delete icon (editable control only) |
| `data-sys-text-delete` | `<path>` of the delete icon | icon path |
| `data-bc-item-download` | `<a href download>` | download link (`filesPath + url`) |
| `data-bc-item-icon-frame` | `<div>` | 52px icon frame |
| `data-bc-item-icon` | `<img>` | MIME icon or thumbnail |
| `data-bc-item-title` | `<span>` | file name, forced `direction: ltr`, single line with ellipsis |

## `html` field and its dialog

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-html-field-row` | `<div>` | flex row of the disabled text box and its overlay |
| `data-bc-text-input` | `<input disabled>` | shows the JSON of the current value |
| `data-bc-input-overlay` | `<div>` | transparent cover so clicks reach the part and open the dialog |
| `data-bc-html-container` | `<div>` | fixed backdrop of the dialog, `display: none` when closed |
| `data-bc-html` | `<div>` | dialog box |
| `data-sys-html` | dialog box | styling |
| `data-bc-title` | `<div>` | header with the close button |
| `data-sys-html-header` | header | styling |
| `data-bc-btn-close` | `<button>` | closes the dialog |
| `data-bc-body` | `<div>` | receives the iframe and the loading text |
| `data-sys-html-body` | body | styling |
| `data-bc-footer` | `<div>` | empty footer |
| `data-sys-html-footer` | footer | styling (button rules exist, nothing fills them) |
| `data-bc-iframe` | `<iframe>` | the embedded editor page |

## Unknown `viewType`

| Marker | Element | Meaning |
|---|---|---|
| `data-bc-part-ctl` | `<label>` | control placeholder of `UnknownType` |
| `data-bc-schema-unknown-control` | same `<label>` | red "Unknown-control - <viewType>" text |

## Attributes without the `data-bc-` prefix

| Attribute | Element | Meaning |
|---|---|---|
| `data-colSpan` = `colSpan` or `1` | `[data-bc-question]` | column span used by the `template2` grid manager |
| `data-part-btn-container` | the `[data-bc-part]` holding a row's buttons, and the clear-button wrapper of the `template2` radio | button block marker |
| `tab-button-status` = `active` or empty | `[data-bc-part-radio-tab-button]` | selected tab of the `template2` radio |
| `data-schema-id`, `data-lid`, `data-param-url`, `data-schema-version` | `<option>` elements of `select` | the sub-schema descriptor of a `fixValues` item with `schema` |
| `datamembername` = `sub-schema.<random>` | generated nested `<basis core="schema">` | source id of the nested form's answer |

## Markers that appear only in CSS

These selectors exist in the bundled stylesheets but no template or TypeScript writes them. They take effect only on markup you add yourself.

| Marker | Where it is styled |
|---|---|
| `data-bc-keyword-verification="false"` | `question/assets/style.css`: orange text for options, list items and results |
| `data-bc-btn-container` | `question/assets/style.css`: same width rules as `[data-bc-part-container]` |
| `data-bc-show-search-popup-btn` | `question/assets/style.css`; it belongs to `auto-fill/assets/layout.html`, a template no control imports |

## Outside the schema runtime: `data-bc-init`

`HTMLComponent` (the component behind bound HTML elements with `bc-triggers`) sets `data-bc-init=""` on the element once its event listeners are attached, skips the attachment when the attribute is already present, and removes it in `disposeAsync`. It is the only `data-bc-*` marker written outside the schema subsystem. See [../html-element-binding.md](../html-element-binding.md).

## Examples

### Inspecting a rendered question

```html
<div data-bc-schema-main-container data-bc-schema-direction="rtl" data-bc-schema-skin="default">
  <div data-bc-schema-column>
    <div data-bc-question data-colspan="1" class="css_13057">
      <div data-bc-title-container>
        <span data-bc-question-title data-bc-schema-info-prpid="13057" data-sys-text>Emergency power</span>
        <a data-bc-help-btn data-bc-help-tooltip="help data"><svg>...</svg></a>
      </div>
      <div data-bc-answer-container data-bc-schema-info-multi="1" data-bc-schema-info-part="2"
           data-bc-schema-info-part-0-type="select" data-bc-schema-info-part-1-type="text">
        <div data-bc-answer-title-container>
          <div data-bc-answer-title data-bc-part-related-cell data-sys-text><span>Unit</span></div>
          <div data-bc-answer-title data-bc-part-related-cell data-sys-text><span>Speed (rpm)</span></div>
        </div>
        <div data-bc-answer-collection>
          <div data-bc-answer>
            <div data-bc-part-container>
              <div data-bc-part data-bc-part-related-cell class="css_13057_1">
                <select data-sys-select-option>...</select>
                <div data-bc-sm-sub-schema-container></div>
                <ul data-bc-validation-part></ul>
              </div>
              <div data-bc-part data-bc-part-related-cell class="css_13057_2" data-bc-invalid>
                <input type="text" data-bc-text-input data-sys-input-text />
                <ul data-bc-validation-part><li> * required </li></ul>
              </div>
            </div>
            <div data-bc-part data-part-btn-container>
              <div data-bc-pair-btn-container>...</div>
              <button data-bc-btn="add" data-sys-plus><svg>...</svg></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Theming with the markers

```css
/* brand colour for inputs and the selected radio tab, both skins */
[data-bc-schema-main-container] [data-bc-answer-container] input[type="text"]:focus,
[data-bc-schema-main-container] [data-bc-answer-container] select:focus {
  border-color: #0a7d5c;
  box-shadow: none;
}
[data-bc-schema-skin="template2"] [data-bc-part-radio-tab-active] {
  background-color: #0a7d5c;
}

/* invalid parts: red caption and message list */
[data-bc-part][data-bc-invalid] [data-bc-caption-title] span,
[data-bc-part][data-bc-invalid] [data-bc-validation-part] li {
  color: #b40020;
}

/* direction-aware spacing of the question title */
[data-bc-schema-direction="rtl"] [data-bc-title-container] { padding-right: 8px; }
[data-bc-schema-direction="ltr"] [data-bc-title-container] { padding-left: 8px; }

/* hide the generic MIME icon frame and show file names only */
[data-bc-upload-file-list] [data-bc-item-icon-frame] { display: none; }

/* dim the search popup backdrop less */
[data-bc-autocomplete-popup-container] { background-color: rgba(0, 0, 0, 0.2); }
```

Selectors rooted at `[data-bc-schema-main-container]` do not reach the `SearchPopup`, which lives under `<body>`; target `[data-bc-autocomplete-popup-container]` (optionally with `[data-bc-schema-skin]`) for it.

## Pitfalls

- `data-bc-*` markers are selectors used by the runtime (`querySelector("[data-bc-text-input]")`, `closest("[data-bc-part]")`, ...). Adding the same attribute to your own elements inside a form can make the runtime pick the wrong element.
- Attribute names are lower-cased by the HTML parser: `data-colSpan` is `data-colspan` in the DOM and in CSS selectors.
- `data-bc-schema-direction` and `data-bc-schema-skin` are set only on the root container and on the popup; a nested sub-schema form has its own root with its own values (nested forms always render with the default skin).
- `data-bc-invalid` is toggled on the part wrapper, never on the input itself.
- `data-bc-keyword-verification`, `data-bc-btn-container` and `data-bc-show-search-popup-btn` are never rendered by the library.
- In `view` mode, text parts render a `<label data-bc-text-input>` instead of an `<input>`, so input-based selectors do not match.

## Related

- [field-types.md](field-types.md)
- [html-field-and-dialogs.md](html-field-and-dialogs.md)
- [lookup-and-autocomplete.md](lookup-and-autocomplete.md)
- [file-upload.md](file-upload.md)
- [validation.md](validation.md)
- [../commands/schema.md](../commands/schema.md)
- [../html-element-binding.md](../html-element-binding.md)

## Source files

- `src/component/renderable/schema/SchemaComponent.ts` (root container, direction, skin)
- `src/component/renderable/schema/QuestionCellManager.ts`, `QuestionGridManager.ts`
- `src/component/renderable/schema/section/assets/layout.html`, `layout_template2.html`
- `src/component/renderable/schema/question-container/QuestionContainer.ts`, `assets/layout.html`, `assets/style.css`
- `src/component/renderable/schema/question/Question.ts`, `assets/layout.html`, `assets/style.css`
- `src/component/renderable/schema/question-part/QuestionPart.ts`, `assets/layout.html`, `assets/layout_template2.html`, `assets/style.css`
- `src/component/renderable/schema/part-control/**/assets/*.html` and `*.css`
- `src/component/renderable/schema/part-control/select/SelectType.ts` (option attributes)
- `src/component/renderable/schema/part-control/select-list/radio/RadioListTypeTemplate2.ts` (`tab-button-status`)
- `src/component/renderable/schema/part-control/auto-fill/SearchPopup.ts`
- `src/component/renderable/schema/part-control/ListBaseType.ts` (nested `datamembername`)
- `src/component/html-element/HTMLComponent.ts` (`data-bc-init`)
