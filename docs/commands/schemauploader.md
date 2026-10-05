# `schemauploader`

`schemauploader` persists a schema answer that contains files in two steps: it posts the answer JSON to a server endpoint, waits for an identifier (`usedforid`) in the response, and then uploads every `File` found in the answer as a separate `multipart/form-data` request tagged with that identifier. It is the server-side counterpart of the `blob` field type: the `schema` command collects the `File` objects, publishes the answer to a source, and `schemauploader`, bound to that source, performs the network work and reports progress through two published sources.

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `core` | string | required | `schemauploader` |
| `run` | string | required | `atclient` |
| `datamembername` | source id | required | source holding the answer; only the **first row** is processed, each time the source is published |
| `url` | URL | none | endpoint that receives the answer JSON (`POST`, `Content-Type: application/json`) |
| `blob` | URL | `url` | endpoint that receives each file (`POST multipart/form-data`); may already contain a query string |
| `name` | string | none | prefix of the published status sources `<name>.uploading` and `<name>.uploaded`; without it nothing is published |
| `noCache` | `true`/`false` | `false` | intended to add `pragma: no-cache` and `cache-control: no-cache` to the JSON request; see Pitfalls |
| `Content-Type` | string | none | read into a token but never used; the JSON request always sends `application/json` |
| `OnProcessing` | function name | none | callback invoked twice per run (see below) |
| `OnProcessed` | function name | none | accepted by the base class but never invoked by this command |

Attribute names are case-insensitive in HTML (`noCache` and `nocache` are the same attribute).

## Step-by-step flow

Given a source row `row` (the first row of `datamembername`):

1. **Locate the answer.** `source = row.data ?? row`. The row can be the `IUserActionResult` itself (what `schema` publishes to `resultSourceId`) or a wrapper object with the answer under `data` and any extra fields beside it.
2. **Extract files.** For every `property` in `source.properties`, every answer in `property.added` and `property.edited`, every `part` and every `value`: when `value.value.content instanceof File`, the command
   - creates `{ blobid: $bc.util.getRandomName("blob"), file: value.value.content, uploadtoken: value.value.uploadToken, part: part.part, prpid: property.propId }` and pushes it to `fileList`;
   - replaces `value.value.content` by the generated `blobid` string.
   `deleted` answers are not scanned. Values whose `content` is a string (the data URLs produced by `upload` parts) are left untouched and travel inside the JSON.
3. **Post the answer.** `POST url` with header `Content-Type: application/json` and body `JSON.stringify(row)` (the whole row, wrapper included, after the `File` replacement).
4. **`OnProcessing` hook.** If set, the function is called with `{ context, node, request }` where `request` is the `Request` about to be sent. If the function assigns `args.response` (a `Response` or a promise of one), that response is used instead of `fetch(request)`.
5. **Read the result** as JSON: `{ usedforid?, errorid?, message? }`.
6. **Publish `<name>.uploading`** (when `name` is set): `{ answer: source, postAnswerResult, fileList }`.
7. **Check `usedforid`.** When it is missing or falsy, `console.error("The 'usedforid' property not set in result returned from <url>", postAnswerResult)` and the run ends; no file is uploaded and `<name>.uploaded` is not published.
8. **Upload each file** (only when `fileList` is not empty), all in parallel:
   - `baseUrl = blob ?? url`;
   - `blobUrl = baseUrl + ("?" or "&") + "uploadtoken=<uploadtoken>&blobid=<blobid>&prpid=<prpid>&part=<part>&usedforid=<usedforid>&lid=<source.lid>"`;
   - a `FormData` with fields `blobid`, `uploadtoken`, `usedforid`, `lid`, `prpid`, `part` and the file appended under its own file name (`formData.append(file.name, file)`);
   - if a service named `scheduler` is registered in the dependency container, `scheduler.startPost(formData, blobUrl, file.name, null, false).task` is awaited; otherwise `fetch(blobUrl, { method: "POST", body: formData })` and the JSON of the response.
   The library itself registers no `scheduler`; the branch exists for hosts that provide one.
9. **Publish `<name>.uploaded`** (when `name` is set and at least one file was uploaded): `{ answer: source, postAnswerResult, fileList, uploadFileResult }`, where `uploadFileResult` is the array of parsed upload responses in `fileList` order.

The command is a `SourceBaseComponent`: `SourceBaseComponent.runAsync` already calls `OnProcessing` once with `{ source }` before `renderSourceAsync` runs (the hook may replace `args.source`). `SchemaUploader` then calls the same function again with `{ request }`. An `OnProcessing` handler must therefore check which property it received.

## Published sources

With `name="uploader"`:

| Source | Published | Row shape |
|---|---|---|
| `uploader.uploading` | after the JSON post returns, before any file upload, even when `usedforid` is missing | `{ answer, postAnswerResult, fileList }` |
| `uploader.uploaded` | after all file uploads finish; only when `usedforid` was returned and `fileList` was not empty | `{ answer, postAnswerResult, fileList, uploadFileResult }` |

`fileList` items are `{ blobid, file, uploadtoken, part, prpid }`; `answer` is the (mutated) `IUserActionResult`, whose file values now contain `blobid` strings in `content`. Both sources have a single row; read them with `args.source.rows[0]` in a `callback` command.

## Server contract

The reference implementation is `server/blob-server.js`:

```js
router.post("/answer-json", (req, res) => {
  res.json({ errorid: 4, message: "successful", usedforid: "sample-returnObject" });
});
router.post("/answer-blob", (req, res) => {
  res.json({ status: "ok" });
});
```

The JSON endpoint receives the answer with every `File` replaced by a `blobid` and must return `usedforid`. The blob endpoint receives, per file, the identifiers both in the query string and in the form body, and the binary under its original file name. `lid` comes from `source.lid`, which `schema` copies from the schema (`IUserActionResult.lid`).

Request made for one file against the example configuration:

```text
POST /blob/answer-blob?uploadtoken=upload-token-value&blobid=blob_1700000000000_k3j4h5_&prpid=2&part=1&usedforid=sample-returnObject&lid=1
Content-Type: multipart/form-data

blobid=blob_1700000000000_k3j4h5_
uploadtoken=upload-token-value
usedforid=sample-returnObject
lid=1
prpid=2
part=1
photo.jpg=<binary>
```

## Examples

### Simple (`example/component/renderable/schema-uploader/Simple/index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body dir="rtl">
  <button data-btn-add>Add</button>
  <Basis core="schema" run="atclient" schemaUrl="/schema/questions/1166" displayMode="new"
         button="[data-btn-add]" resultSourceId="demo.data" qs_rKey="www" qs_name="haha">
  </Basis>
  <Basis core="schemauploader" run="atclient"
         datamembername="demo.data" name="uploader"
         url="/blob/answer-json" blob="/blob/answer-blob">
  </Basis>
  <basis core="callback" run="atclient" triggers="demo.data uploader.uploading uploader.uploaded"></basis>
</body>
</html>
```

Schema `1166` has an `upload` part and a `blob` part with `uploadToken: "upload-token-value"` ([../schema/file-upload.md](../schema/file-upload.md)). Clicking **Add** publishes `demo.data`; the uploader posts the answer to `/blob/answer-json`, receives `usedforid: "sample-returnObject"`, uploads each blob file to `/blob/answer-blob` and publishes `uploader.uploading` and `uploader.uploaded`.

### Blob endpoint with a query string (`Simple-with-query-string`)

```html
<Basis core="schemauploader" run="atclient" datamembername="demo.data" name="uploader"
       url="/blob/answer-json" blob="/blob/answer-blob?key1=hi&key2=12">
</Basis>
```

The file requests go to `/blob/answer-blob?key1=hi&key2=12&uploadtoken=...`.

### Wrapper object with extra data (`ComplexObject`)

```html
<Basis core="schema" run="atclient" schemaUrl="/schema/questions/1166" displayMode="new"
       button="[data-btn-add]" resultSourceId="demo.data">
</Basis>
<Basis core="schemauploader" run="atclient" datamembername="demo.data-ex" name="uploader"
       url="/blob/answer-json" blob="/blob/answer-blob">
</Basis>
<basis core="callback" run="atclient" triggers="demo.data" method="onSource"></basis>
<basis core="callback" run="atclient" triggers="uploader.uploading uploader.uploaded"></basis>
<script>
  function onSource(arg) {
    arg.context.setAsSource("demo.data-ex", { data: arg.source.rows[0], extraData: "extra value" });
  }
</script>
```

The body posted to `/blob/answer-json` is `{ "data": { ...answer with blobids... }, "extraData": "extra value" }`; files are extracted from `data`.

### Intercepting the JSON request

```html
<Basis core="schemauploader" run="atclient" datamembername="demo.data" name="uploader"
       url="/blob/answer-json" blob="/blob/answer-blob" OnProcessing="beforePost">
</Basis>
<script>
  async function beforePost(args) {
    if (args.request) {
      const headers = new Headers(args.request.headers);
      headers.set("Authorization", "Bearer " + token);
      args.response = fetch(new Request(args.request, { headers }));
    }
  }
</script>
```

## Pitfalls

- `noCache="true"` throws: the code calls `.append` on the plain header object of the request (`(init.headers as Headers).append(...)`), which is not a `Headers` instance, so the run fails before the JSON post. Leave `noCache` unset.
- `Content-Type` is read but has no effect; the JSON request always uses `application/json`.
- `OnProcessed` is never called; observe `<name>.uploading` and `<name>.uploaded` instead.
- `OnProcessing` runs twice per publish (once with `source`, once with `request`).
- Only `rows[0]` is processed; bind the command to a single-answer source.
- Without `usedforid` in the JSON response, files are never uploaded and only an error is logged.
- `<name>.uploaded` is not published when the answer contained no `File` (for example only `upload` parts).
- Only `File` objects under `added` and `edited` are uploaded; `upload` parts (data URLs) are sent inline in the JSON and can make the body large.
- `source.lid.toString()` requires `lid` on the answer; `schema` always sets it from the schema JSON.
- The answer object is mutated in place: after the run, the row published by `schema` contains `blobid` strings where the `File` objects were.
- `SchemaUploader` has the default (`low`) priority; the `scheduler` service is optional and provided by the host, not by the library.

## Related

- [schema.md](schema.md)
- [schemalist.md](schemalist.md)
- [callback.md](callback.md)
- [api.md](api.md)
- [../schema/file-upload.md](../schema/file-upload.md)
- [../schema/answers-and-submission.md](../schema/answers-and-submission.md)
- [../sources-and-reactivity.md](../sources-and-reactivity.md)
- [../command-attributes-and-lifecycle.md](../command-attributes-and-lifecycle.md)

## Source files

- `src/component/renderable/SchemaUploader.ts`
- `src/component/SourceBaseComponent.ts`
- `src/component/ElementBaseComponent.ts` (`OnProcessing`, `OnProcessed` wiring)
- `src/CallbackArgument.ts` (`APIProcessingCallbackArgument`, `SourceCallbackArgument`)
- `src/component/renderable/schema/part-control/upload/BlobType.ts`, `IBlobValue.ts`
- `src/component/renderable/schema/IUserActionResult.ts`
- `src/tsyringe.config.ts` (registration)
- `server/blob-server.js`
