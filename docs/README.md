# BasisCore.js developer guide

A task-oriented guide to BasisCore.js 2.39.6. Start with the repository
[README](../README.md) for installation and a quick start, then use these pages as reference.

| Page | Read it for |
|---|---|
| [binding.md](binding.md) | `[##…##]` tokens, `@column@` faces, layouts, face filters, `{{ }}` code blocks, script templates |
| [sources-and-triggers.md](sources-and-triggers.md) | Source ids and rows, `$bc.setSource`, `host.sources`, built-in sources, merging with keys and status, `triggers`, `if` |
| [commands-rendering.md](commands-rendering.md) | `print`, `list`, `view`, `tree`, `chart`, `repeater` |
| [commands-data.md](commands-data.md) | `dbsource`, `inlinesource`, `api`, `call`, `group`, `callback`, `cookie`, `component` |
| [forms-and-schema.md](forms-and-schema.md) | `bc-triggers` on inputs, selects and forms; `schema`, `schemalist`, `schemauploader` |
| [client-side-sql.md](client-side-sql.md) | AlaSQL: face filters, `sort`/`postsql`, joins and SQL members, `$bc.util.source`, `LocalDataBase` |
| [connections.md](connections.md) | The `host` object; `web`, `rest`, `websocket`, `chunkbased`, `local` and `push` connections; server response format; service worker and web push |
| [hooks-and-extensibility.md](hooks-and-extensibility.md) | The `$bc` API, lifecycle hooks, the `events` attribute, user-defined components, start-up order |
| [troubleshooting.md](troubleshooting.md) | Symptom-by-symptom checklist and console messages |

Every example uses `run="atclient"`, the attribute that makes the browser process a `<basis>`
command. Known defects of 2.39.6 are marked where they apply; fixes for some of them are proposed
in pull request #93.

AI coding assistants can use the packaged skill in [`ai/`](../ai/README.md) instead.
