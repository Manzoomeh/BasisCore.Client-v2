# `data-bc-*` DOM attributes — v2.39.6

86 attributes. These decorate ordinary HTML elements;
they are not command attributes.

| attribute | applies to | purpose |
| --- | --- | --- |
| `data-bc-add-item` | schema autocomplete subsystem | Visual container for a selected autocomplete item. |
| `data-bc-answer` | schema answer structure | A rendered answer item or answer block in question layouts. |
| `data-bc-answer-collection` | schema answer structure | Container used when multiple answer blocks or repeated answer UI are present. |
| `data-bc-answer-container` | schema answer structure | Main answer-area wrapper where the actual control UI appears. |
| `data-bc-answer-title` | schema answer structure | Visible answer-side title text element. |
| `data-bc-answer-title-container` | schema answer structure | Wrapper for answer title/caption text near the answer UI. |
| `data-bc-auto-complete` | schema autocomplete subsystem | Generic autocomplete wrapper. |
| `data-bc-auto-complete-container` | schema autocomplete subsystem | Container around autocomplete input and related controls. |
| `data-bc-auto-complete-single-type` | schema autocomplete subsystem | Input area for single-value autocomplete mode. |
| `data-bc-auto-complete-single-type-btn` | schema autocomplete subsystem | Adjacent button/action region for single-value autocomplete. |
| `data-bc-autocomplete-popup` | schema autocomplete subsystem | The popup box itself. |
| `data-bc-autocomplete-popup-container` | schema autocomplete subsystem | Full-screen or overlay popup wrapper for popup autocomplete. |
| `data-bc-body` | popup and HTML dialog layouts | Body/content region inside popup and dialog layouts. |
| `data-bc-btn` | buttons and action helpers | Generic action/button region. |
| `data-bc-btn-add` | buttons and action helpers | Add action button. |
| `data-bc-btn-close` | popup and HTML dialog layouts | Close button for popup and dialog layouts. |
| `data-bc-btn-container` | buttons and action helpers | Container around one or more action buttons. |
| `data-bc-btn-cross` | schema select-list controls | Decorative/action sub-element used in template2 radio layouts. |
| `data-bc-btn-remove` | buttons and action helpers | Remove/delete action for selected item entries. |
| `data-bc-btns` | buttons and action helpers | Buttons wrapper area. |
| `data-bc-caption-title` | miscellaneous structural markers | Caption/title text in certain question-part layouts. |
| `data-bc-content` | miscellaneous structural markers | Generic content wrapper used in question-part layouts. |
| `data-bc-file-input` | schema upload subsystem | Underlying file input element. |
| `data-bc-fm-lookup` | schema lookup subsystem | Main lookup wrapper. |
| `data-bc-fm-simple-autocomplete` | schema autocomplete subsystem | Inline/simple autocomplete wrapper. |
| `data-bc-footer` | schema HTML dialog subsystem | Footer region in HTML field templates. |
| `data-bc-help-btn` | schema helper UIs | Help button element in the schema title/help region. |
| `data-bc-help-tooltip` | schema helper UIs | Help tooltip/overlay element in the schema title/help region. |
| `data-bc-html` | schema HTML dialog subsystem | Main HTML dialog box. |
| `data-bc-html-container` | schema HTML dialog subsystem | Overlay/dialog container for HTML/iframe-based field rendering. |
| `data-bc-html-field-row` | schema HTML dialog subsystem | Field row within HTML content layout. |
| `data-bc-iframe` | schema HTML dialog subsystem | Embedded iframe used by the HTML field subsystem. |
| `data-bc-init` | HTML component initialization | Initialization marker set by generic HTML component handling after bc-triggers listeners are attached; it is… |
| `data-bc-input-overlay` | schema HTML dialog subsystem | Overlay layer covering the input area in HTML layouts. |
| `data-bc-invalid` | validation and state | Invalid-state marker used across multiple controls and question parts; the most useful cross-control… |
| `data-bc-item` | schema select-list controls | Individual item inside a list-like control. |
| `data-bc-item-btn-delete` | schema upload subsystem | Delete/remove button for an uploaded item. |
| `data-bc-item-download` | schema upload subsystem | Download/open link for an uploaded item. |
| `data-bc-item-icon` | schema upload subsystem | File icon or preview image. |
| `data-bc-item-icon-frame` | schema upload subsystem | Frame around the file icon/preview. |
| `data-bc-item-title` | schema upload subsystem | File title or filename text. |
| `data-bc-items` | schema select-list controls | Generic items wrapper used by list-like controls. |
| `data-bc-keyword-verification` | validation and state | State/styling hook related to keyword verification layouts. |
| `data-bc-lookup-select-value` | schema lookup subsystem | The lookup-side selector/input area. |
| `data-bc-lookup-set-value` | schema lookup subsystem | The region where the chosen lookup value is shown or assigned. |
| `data-bc-pair-btn-container` | buttons and action helpers | Container for paired action buttons. |
| `data-bc-part` | schema question-part structure | A generic question part wrapper. |
| `data-bc-part-checkbox` | schema select-list controls | Checkbox-style list item region. |
| `data-bc-part-container` | schema question-part structure | Container around multiple parts or a part region inside a question. |
| `data-bc-part-ctl` | schema question-part structure | Low-level part-control marker, especially visible in unknown-control layouts. |
| `data-bc-part-radio` | schema select-list controls | Radio-style list item region. |
| `data-bc-part-radio-container` | schema select-list controls | Wrapper around radio-list content. |
| `data-bc-part-radio-tab-active` | schema select-list controls | Marker for the currently active radio tab. |
| `data-bc-part-radio-tab-button` | schema select-list controls | A tab-like clickable radio option. |
| `data-bc-part-radio-tab-container` | schema select-list controls | Template2/tab-style radio layout container. |
| `data-bc-part-related-cell` | schema question-part structure | Cell/wrapper used when a part participates in cell/grid layout logic. |
| `data-bc-question` | schema question structure | Main question block rendered by the schema runtime. |
| `data-bc-question-title` | schema question structure | Question label/title text region. |
| `data-bc-result` | schema autocomplete subsystem | Result list container. |
| `data-bc-schema-column` | schema layout | Individual grid/cell column marker. |
| `data-bc-schema-direction` | schema layout / direction state | Runtime-applied direction marker, for example rtl or ltr. |
| `data-bc-schema-grid-container` | schema layout | Grid manager container for schema layout. |
| `data-bc-schema-info-multi` | sub-schema and nested metadata | Metadata indicating multi-answer or multi-instance behavior. |
| `data-bc-schema-info-part` | sub-schema and nested metadata | Internal schema metadata marker related to parts. |
| `data-bc-schema-info-part-` | source-scan anomaly | Anomalous key found in the source scan (86th distinct string); treated as an implementation artifact, not a… |
| `data-bc-schema-info-prpid` | sub-schema and nested metadata | Property id metadata region. |
| `data-bc-schema-info-type` | sub-schema and nested metadata | Schema/control type metadata marker. |
| `data-bc-schema-info-word` | sub-schema and nested metadata | Word/token metadata marker used by the question runtime. |
| `data-bc-schema-main-container` | schema layout | Root schema-rendering container. |
| `data-bc-schema-skin` | schema layout / skin state | Runtime-applied skin marker, for example template1 or template2. |
| `data-bc-schema-unknown-control` | validation and state | Unknown-control fallback marker. |
| `data-bc-search` | schema autocomplete subsystem | Search input inside popup or inline autocomplete layouts. |
| `data-bc-section` | schema layout | Section wrapper inside a schema. |
| `data-bc-section-title` | schema layout | Title region for a schema section. |
| `data-bc-show-search-popup-btn` | schema autocomplete subsystem | Button/trigger used to open popup-style search. |
| `data-bc-sm-sub-schema-container` | sub-schema and nested metadata | Container for nested/sub-schema related UI. |
| `data-bc-text-input` | schema text controls | Text-like field wrapper used by lookup and other text-oriented controls. |
| `data-bc-title` | popup, dialog and item layouts | Title/header text in popup, dialog and item layouts; too generic to use as an unscoped selector. |
| `data-bc-title-container` | schema question structure | Wrapper around the title/help/title-layout region. |
| `data-bc-upload-file-item` | schema upload subsystem | One uploaded-file item entry. |
| `data-bc-upload-file-list` | schema upload subsystem | List container for uploaded items. |
| `data-bc-upload-file-select` | schema upload subsystem | Select/open-file wrapper region. |
| `data-bc-validation-part` | schema question-part structure | Validation-scoped part wrapper used by the question-part subsystem. |
| `data-bc-value` | schema interactive controls | Storage/display slot for a selected value in some interactive controls. |
| `data-bc-view-pass` | schema helper UIs | Password visibility toggle element. |
| `data-bc-view-pass-status` | schema helper UIs | Password visibility state marker. |

## Host configuration keys

| key | default | meaning |
| --- | --- | --- |
| `debug` | False | Debug flag present in the host option surface; the inspected v2.39.6 source does not show it driving a large number of visible… |
| `autoRender` | True | Whether the default $bc instance runs automatically. The library attaches a window.load listener and, if no run has happened yet… |
| `serviceWorker` | False | Service worker registration switch; accepted shapes are false, true, or a string path. true uses the default file path… |
| `dbLibPath` | /alasql.min.js | Path used to lazily load AlaSQL when client-side database functionality is needed and alasql is not already global.… |
| `settings` |  | Dictionary for runtime defaults, binding regexes and connection definitions. Resolved through context.options.getSetting(...) /… |
| `settings['default.binding.regex']` | /\[##([^#]*)##\]/ | Regex for the general [##...##] binding syntax; can be overridden globally or per instance via setOptions. |
| `settings['default.binding.codeblock-regex']` | /{{((?:[^{}][{}]?)*)}}/ | Regex for the {{ javascript }} inline code-block syntax. |
| `settings['default.binding.face-regex']` | /([^@] | ^)@(?:([^@\s]+)@ | ([^@\s]+))/ | Regex for the @...@ face/content-template syntax. |
| `settings['default.call.verb']` | POST | Default HTTP verb the call command falls back to when markup does not override it. |
| `settings['default.dmnid']` |  | Default dmnid value in the shipped default settings. |
| `settings['default.source.verb']` | POST | Default HTTP verb used by source-loading paths when markup does not override it. |
| `settings['default.viewcommand.groupcolumn']` | prpid | Default grouping column inherited by the view command. |
| `settings['default.source.heartbeatverb']` | GET | Default HTTP verb used for source heartbeat requests. |
| `settings['connection.{provider}.{name}']` |  | Connection definitions follow the key convention connection.{provider}.{name}; ConnectionOptionsManager splits every setting key… |
| `sources` |  | Startup in-memory sources prepublished into the root context before commands render. RootContext.addHostOptionsSource() accepts… |
| `repositories` | {} | Custom component repositories, treated as a runtime extension registry (not an ordinary data-source map) so the component.*… |
| `push` |  | Push-notification configuration object (distinct from connection.push.*). Only meaningful when service-worker registration… |
| `push.applicationServerKey` |  | Public VAPID key used for the browser push subscription. |
| `push.url` |  | Endpoint that receives client subscription data. |
| `push.params` |  | Extra values appended to the subscription request. |
| `push.permissionDlg` |  | Selector string or callback used for the permission UI. A selector string makes the runtime toggle the target element's display… |
| `push.permissionSubmit` |  | Selector for the permission-submit control. |
