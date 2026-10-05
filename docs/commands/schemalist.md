# `schemalist`

`schemalist` is a source-bound command that takes saved schema answers (`IAnswerSchema` records, the same shape the `schema` command consumes in `edit` and `view` mode), downloads the question schema that each record belongs to, and renders one `<div>` per question containing the question title. It is the list-oriented companion of `schema`: where `schema` renders one answer as a form, `schemalist` walks a set of answer records and emits a flat title list for each of them. Its templating hooks (`<face>`) are parsed but not applied in this version, so the output is limited to question titles.

## What it does

`SchemaListComponent` extends `SourceBaseComponent`:

1. `initializeAsync` reads the `schemaUrl` attribute token and parses the `<face>` children of the command element into a `SchemaFaceCollection`.
2. When the source named by `datamembername` is available, `renderSourceAsync` treats every row as an `IAnswerSchema` and calls `renderAnswerAsync` for each.
3. `renderAnswerAsync` resolves `schemaUrl` and calls `SourceMaker.makeAsync(answer, schemaUrl)`, which:
   - builds the URL `schemaUrl?id=<answer.schemaId>&ver=<answer.schemaVersion>&lid=<answer.lid>` with `Util.formatUrl` (the three parameters are URL-encoded and always appended after a `?`);
   - fetches it with GET and reads the schema as `response.sources[0].data[0]` (the standard `IServerResponse` envelope);
   - for every question of the schema, finds the answer property with the same `prpId` and produces an `ISchemaSource` item `{ schemaId: null, prpId, typeId, title, answers }`, where `answers` is the nested array `answers[].parts[].values[].value` of the saved property.
4. For every item, a `<div>` with the text of `item.title` is appended to the command output (`setContent(div, true)`).

The `ISchemaSource` items and the `SchemaFaceCollection` are built but never combined: `renderAnswerAsync` ends with the statement `this._faces;`, which does nothing. Only the titles reach the page.

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `core` | string | required | `schemalist` |
| `run` | string | required | `atclient` |
| `datamembername` | source id | required | source whose rows are `IAnswerSchema` records; the command runs when that source is published |
| `schemaUrl` | URL | none | base URL of the question-schema endpoint; the command appends `?id=&ver=&lid=` taken from each answer record |
| `viewMode` | string | none | present in the shipped example but not read by the component |
| `<face schemaIds="a b">` | child element | none | parsed by `SchemaFace` (`schemaIds` is split on spaces, the body is read as a `ContentTemplate`) but never used for rendering |

The generic command attributes (`triggers`, `OnProcessing`, `OnProcessed`, `OnRendering`, `OnRendered`) come from the base classes; see [../command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md). `OnProcessing` receives the source before rendering and may replace it.

## Expected data

Each source row must look like the answers served by `server/schema-server.js` at `/schema/answers?id=`:

```json
{
  "usedForId": 1423330,
  "schemaId": 1161,
  "paramUrl": "/1161",
  "schemaVersion": "1.1",
  "lid": 1,
  "lastUpdate": "",
  "properties": [
    { "prpId": 13050, "answers": [ { "id": 1, "parts": [ { "part": 1, "values": [ { "id": 10, "value": "Generator A" } ] } ] } ] }
  ]
}
```

The schema endpoint must answer `GET <schemaUrl>?id=1161&ver=1.1&lid=1` with the usual envelope:

```json
{ "sources": [ { "data": [ { "schemaId": 1161, "questions": [ { "prpId": 13050, "title": "Generator name", "typeId": 1, "parts": [] } ] } ] } ] }
```

Every question of the schema must have a matching property in the answer record. `SourceMaker` dereferences `answer.answers` for the property found by `prpId` without a null check, so a question without a saved property throws and nothing is rendered for that record.

Note the difference with the `schema` command, which fetches `schemaUrl + paramUrl` (for example `/schema/questions/1161`). `schemalist` always passes `id`, `ver` and `lid` as query parameters, so the two commands need either two endpoints or one endpoint that accepts both forms. The reference server only implements the path form (`/schema/questions/:id`).

## Examples

### Shipped example

`example/component/renderable/schema-list/simple/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Schema List Command</title>
</head>
<body dir="rtl">
  <Basis core="api" url="/schema/answers?id=[##inline.object.id##]" method="get" run="atclient">
  </Basis>
  <Basis core="schemalist" datamembername="answer.data" run="atclient" schemaUrl="/schema/questions" viewMode="true">
    <face schemaIds="e">
      <div>
        @prp[12].title @type[151].title @prp[40].value() @type[34].value(",")
      </div>
    </face>
  </Basis>
  <script>
    const host = { sources: { "inline.object": [{ id: 1423330 }] } };
  </script>
</body>
</html>
```

The `api` command publishes `answer.data` with one row (the answer record). `schemalist` then requests `/schema/questions?id=1161&ver=1.1&lid=1` and, for a server that answers that URL, renders:

```html
<div>Generator name</div>
<div>Emergency power</div>
<div>Voltage</div>
...
```

The `<face>` body (including the `@prp[...]`/`@type[...]` notation) and `viewMode` have no effect.

### Minimal page

```html
<Basis core="api" url="/my/answers?owner=[##inline.object.id##]" method="get" run="atclient"></Basis>
<Basis core="schemalist" run="atclient" datamembername="answer.data" schemaUrl="/my/schema"></Basis>
```

## Pitfalls

- `<face>` templates are not applied; do not expect anything other than question titles in the output.
- `schemaUrl` always gets `?id=...&ver=...&lid=...` appended, even when it already contains a query string (which produces two `?`).
- A question without a corresponding `properties[]` entry in the record aborts the rendering of that record with a `TypeError`.
- A failing schema request (for example a 404 on the reference server's `/schema/questions` without a path id) rejects while parsing the response and nothing is rendered.
- The command only renders; it does not react to clicks and does not publish any source.
- `SchemaListComponent` is registered under the token `schemalist` with the default (`low`) priority, like the `schema` command.

## Related

- [schema.md](schema.md)
- [schemauploader.md](schemauploader.md)
- [api.md](api.md)
- [../schema/schema-json-contract.md](../schema/schema-json-contract.md)
- [../schema/answers-and-submission.md](../schema/answers-and-submission.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md)
- [../command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md)

## Source files

- `src/component/renderable/schema-list/SchemaListComponent.ts`
- `src/component/renderable/schema-list/SourceMaker.ts`
- `src/component/renderable/schema-list/SchemaFace.ts`
- `src/component/renderable/schema-list/ISchemaSource.ts`
- `src/component/renderable/schema/IAnswerSchema.ts`, `IQuestionSchema.ts`
- `src/component/SourceBaseComponent.ts`
- `src/Util.ts` (`formatUrl`, `getDataAsync`)
- `src/tsyringe.config.ts` (registration)
- `server/schema-server.js`
