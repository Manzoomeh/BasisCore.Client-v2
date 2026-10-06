# BasisCore Client developer reference

This is the complete reference for **BasisCore Client** (`BasisCore.js`) version 2.39.6, the
browser runtime of the BasisCore web programming language. Every page here is written from the
TypeScript in [`src/`](../src) and the runnable pages in [`example/`](../example); where the
library has a limitation or a bug, the page says so.

If you are new to the library, read the pages in the *Foundations* section in order. If you are
looking for one attribute, open the command page and search for it.

Every page has a runnable counterpart under [`tests/`](../tests/README.md): a browser page that
reproduces the examples, asserts what this reference says and reports pass or fail. Open it when
you want to see a feature working, or copy it as a starting point.

## Foundations

| Page | What it covers |
| --- | --- |
| [Getting started](getting-started.md) | Install, the `host` object, the `run="atclient"` rule, how a page is scanned, your first page |
| [Host configuration](host-configuration.md) | Every `host` key and `settings` default, connections, `sources`, `repositories`, `push` |
| [Binding and tokens](binding-and-tokens.md) | `[##…##]` tokens, fallback chains, `@column@` faces, `{{ }}` code blocks, typed tokens |
| [Sources and reactivity](sources-and-reactivity.md) | Sources, merge strategies, row versions, contexts, built-in `cms.*` sources, how commands re-run |
| [Command attributes and lifecycle](command-attributes-and-lifecycle.md) | `if`, `triggers`, `events`, `On*` hooks, priority waves, how output is placed and replaced |
| [HTML element binding](html-element-binding.md) | `bc-triggers` and the other `bc-*` attributes on plain inputs, selects and forms |
| [Connections](connections.md) | `web`, `websocket`, `chunkbased`, `local`, `push` and `rest` providers and the server contract |
| [Client-side SQL](client-side-sql.md) | AlaSQL loading, face filters, `sort`/`postsql`, `inlinesource` SQL and joins, `LocalDataBase` |
| [JavaScript API](javascript-api.md) | `$bc`, `$bc.util`, `$bc.util.source`, `window.basiscore` exports, the context API |

## Commands

Every command is written as `<basis core="…" run="atclient" …>`.

| Family | Commands |
| --- | --- |
| Rendering | [print](commands/print.md) · [list](commands/list.md) · [view](commands/view.md) · [tree](commands/tree.md) · [chart](commands/chart.md) |
| Data | [dbsource](commands/dbsource.md) · [inlinesource](commands/inlinesource.md) · [api](commands/api.md) |
| Composition | [call](commands/call.md) · [group](commands/group.md) · [repeater](commands/repeater.md) |
| Side effects | [callback](commands/callback.md) · [cookie](commands/cookie.md) |
| Forms | [schema](commands/schema.md) · [schemalist](commands/schemalist.md) · [schemauploader](commands/schemauploader.md) |
| HTML elements | [input](commands/input.md) · [select](commands/select.md) · [form](commands/form.md) · [unknown-html](commands/unknown-html.md) |
| Extension | [component](commands/component.md) |

## Schema-driven forms

| Page | What it covers |
| --- | --- |
| [Schema JSON contract](schema/schema-json-contract.md) | The question schema, the answer schema and the result shape, with real samples |
| [Field types](schema/field-types.md) | Every `viewType`, the control behind it, the value it produces, read-only variants |
| [Lookup and autocomplete](schema/lookup-and-autocomplete.md) | `autocomplete`, `reference`, `lookup`, dependencies, sub-schemas, the search server contract |
| [File upload](schema/file-upload.md) | `upload` and `blob` fields, icons, read-only download links |
| [HTML field and dialogs](schema/html-field-and-dialogs.md) | The iframe editor protocol, modal dialogs, popups, helper controls |
| [Validation](schema/validation.md) | Rules, error rendering, cultures and the messages API |
| [Answers and submission](schema/answers-and-submission.md) | Loading answers, added/edited/deleted diffs, publishing results, uploading files |
| [DOM markers](schema/dom-markers.md) | The `data-bc-*` attributes the form writes, for CSS theming and debugging |
| [Displaying saved answers](schema/displaying-answers.md) | Which commands show an object created through a form: `schema` in `view`/`edit` mode, `schemalist`, generic renderers over the record |

## Extending and maintaining

| Page | What it covers |
| --- | --- |
| [User-defined components](user-defined-components.md) | Writing `core="component.…"` classes, the owner API, repositories, schema field components, the IoC container |
| [Service worker and push](service-worker-and-push.md) | Service worker registration, Web Push subscription, push messages as sources |
| [Internals](internals.md) | Bootstrap sequence, class hierarchy, IoC tokens, logging, build pipeline, dev server |
| [Troubleshooting](troubleshooting.md) | Symptoms, error messages and known bugs with their fixes |

## Reading paths

- **Rendering data from a server:** Getting started → Host configuration → Connections →
  [dbsource](commands/dbsource.md) → [print](commands/print.md) → Binding and tokens.
- **Interactive filters without JavaScript:** HTML element binding → Sources and reactivity →
  Client-side SQL (face `filter`).
- **Live data:** Connections (websocket, chunkbased) → Sources and reactivity (merge
  strategies) → [tree](commands/tree.md) or [print](commands/print.md) incremental rendering.
- **Forms:** [schema](commands/schema.md) → Schema JSON contract → Field types → Validation →
  Answers and submission → [schemauploader](commands/schemauploader.md).
- **Showing a saved object:** [Displaying saved answers](schema/displaying-answers.md) →
  [schema](commands/schema.md) (`view` mode) → Field types (read-only controls).
- **Reusable widgets:** User-defined components → [component](commands/component.md) →
  Command attributes and lifecycle.

## Conventions used in these pages

- Attribute tables list the name as written in the examples. HTML lower-cases attribute names,
  so the runtime reads them case-insensitively unless a page says otherwise.
- "Source id" means the lower-cased `name.member` string under which rows are published.
- Code samples are complete pages or complete `<basis>` elements that run against the mock
  servers of `npm run dev` unless they say otherwise.
