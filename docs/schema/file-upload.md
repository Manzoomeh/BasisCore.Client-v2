# File fields: `upload` and `blob`

Two `viewType` values put files into a schema answer. `upload` reads each picked file in the browser and stores it as a base64 data URL inside the answer JSON. `blob` keeps the browser `File` object together with the part's `uploadToken`, so that the `schemauploader` command can post the answer first and the binary files afterwards. Both share one UI (`UploadType`), one read-only renderer (`ReadOnlyUploadType`) and one MIME icon table (`ExtensionList`). This page covers the UI, the in-memory file state, the produced values, deletion tracking, validation, the `filesPath` prefix, and the hand-off to `schemauploader`.

## Editable UI

Layout (`upload/assets/layout.html`):

```html
<div data-bc-upload-file-select><input type="file" data-bc-file-input data-sys-input-text /></div>
<div data-bc-upload-file-list></div>
```

- `part.multiple: true` sets the `multiple` attribute on the input; otherwise it is removed.
- The `change` event reads `input.files`, adds every file to the list and resets `input.value` to `""`, so the same file can be picked again later.
- Each file is rendered from `image-layout.html` into `[data-bc-upload-file-list]`:

```html
<div data-bc-upload-file-item>
  <span data-bc-item-btn-delete><svg>...</svg></span>
  <a data-bc-item-download href="<filesPath + url>" download="<name>">
    <div data-bc-item-icon-frame><img data-bc-item-icon></div>
    <span data-bc-item-title data-sys-text><name></span>
  </a>
</div>
```

The icon `src` is set after the template is parsed: `"/" + file.image` when the file info has a non-empty `image`, otherwise `ExtensionList[file.type]`, falling back to `ExtensionList["???"]`. No thumbnail is generated for newly picked images; they get the generic image icon of their MIME type.

When `multiple` is false, adding a file first clears the in-memory map and the list, so the new file replaces whatever was displayed.

Under `skin="template2"` the native file button is hidden with CSS and a folder icon is drawn after the input.

## In-memory file state

Every entry is an `IFileInfo` (`upload/IFileInfo.ts`):

| Field | New file (picked now) | Saved file (from the answer) |
|---|---|---|
| `id` | absent | `IPartValue.id` |
| `name` | `File.name` | `value.name` |
| `type` | `File.type` | `value.type` |
| `size` | `File.size` | `value.size ?? 0` |
| `url` | `null` | `value.url ?? null` |
| `image` | absent | `value.image ?? null` |
| `data` | the `File` | `null` |
| `mustDelete` | `false` | `false` until the delete icon is clicked |

Entries are keyed by a random local id (`$bc.util.getRandomName("uploader_")`).

Saved values therefore have this shape in the answer JSON (see `server/schemas/answers/1423330.json`):

```json
{ "id": 9001, "value": { "name": "sample.jpg", "type": "image/jpg",
                         "url": "/component/renderable/schema/edit/assets",
                         "image": "component/renderable/schema/edit/assets/" } }
```

`url` and `image` are optional. `url` is used verbatim after `filesPath`; the library does not append the file name to it.

## Deleting

The delete icon (`[data-bc-item-btn-delete]`) removes the item element and then:

- for a saved file (`file.id` set) marks the entry `mustDelete = true` and keeps it in the map;
- for a new file removes the entry from the map, so it never appears in any result.

## Produced values

`UploadType.getChangedAsync` converts every entry that still has `data` (new files) with `CreateFileValueAsync` and returns `{ part, values: [{ value: <IFileValue> }, ...] }` or `null`.

| Method | Condition | Result |
|---|---|---|
| `getAddedAsync` | no saved answer | new files (`getChangedAsync`) |
| `getEditedAsync` | saved answer | new files (`getChangedAsync`); they carry no `id` |
| `getDeletedAsync` | saved answer | `{ part, values: [{ id, value: { name, type } }] }` for entries with `mustDelete` |
| `getValuesAsync` | always | new files (`getChangedAsync`) |

### `upload`: data URLs

`UploadType.CreateFileValueAsync` uses `FileReader.readAsDataURL` and resolves

```json
{ "content": "data:image/png;base64,iVBORw0...", "name": "logo.png", "size": 18244, "type": "image/png" }
```

The whole file travels inside the JSON answer (base64 adds roughly one third to the size). Reading happens at submit time, in parallel for all files.

### `blob`: `File` plus `uploadToken`

`BlobType` overrides `CreateFileValueAsync` and resolves an `IBlobValue`:

```json
{ "content": "<File object>", "name": "logo.png", "size": 18244, "type": "image/png",
  "uploadToken": "upload-token-value" }
```

`uploadToken` is copied from `part.uploadToken`. The `File` object is not serialisable (`JSON.stringify` turns it into `{}`), so a `blob` answer must be handed to `schemauploader`, which replaces the `File` by a generated blob id before posting and uploads the binary separately.

## Validation

`getValidationErrorsAsync` passes the array of `{ name, size, type }` of all entries not marked `mustDelete` to `QuestionPart.ValidateValue`. Rules that apply to arrays are:

- `required`: fails when the array is empty;
- `size`: the sum of all `size` values must not exceed `validations.size` (bytes);
- `mimes`: an array of `{ mime, minSize, maxSize }`; every file's `type` must match one entry (`mime` error otherwise) and its `size` must fall within that entry's bounds (`mime-size` error otherwise).

Example from schema `1165`:

```json
"validations": {
  "mimes": [
    { "mime": "image/jpeg", "minSize": 10, "maxSize": 10000 },
    { "mime": "image/png",  "minSize": 10, "maxSize": 10000 }
  ],
  "size": 100000000
}
```

Saved files are validated too, with `size` taken from the answer (`0` when absent). A saved file without `size` whose type is listed in `mimes` with a `minSize` greater than zero fails the `mime-size` rule on every submit. The messages are described in [validation.md](validation.md).

## MIME icons: `ExtensionList`

`upload/ExtensionList.ts` maps MIME types to icon URLs under `https://basispanel.ir/asset/component/filemanager/images/` (`file-pdf-64.png`, `file-zip-64.png`, `file-jpg-64.png`, `file-video-64.png`, ...). Covered families: text, JSON, archives, Office documents, PDF, audio, XML, fonts, images (webp, bitmap, ico, svg, gif, png, jpg), video, JavaScript and CSS. `application/octet-stream` maps to the PDF icon. Unknown types use the `"???"` entry, `file-unknown-64.png`. The icons are loaded from that external host; an offline page shows broken images.

## Read-only rendering and `filesPath`

In `displayMode="view"` both `upload` and `blob` are rendered by `ReadOnlyUploadType`: only `[data-bc-upload-file-list]` with items from `readonly-image-layout.html` (same as the editable item without the delete icon). Every item is a download link:

```text
href = filesPath + value.url
download = value.name
```

`filesPath` is the `filesPath` attribute of `<basis core="schema">` (`IFormMakerOptions.filesPath`, empty string by default). In the edit example it is `filesPath="siteName/"`, which turns `url: "/component/renderable/schema/edit/assets"` into `siteName//component/renderable/schema/edit/assets`. Newly picked files have `url: null`, so their link is `filesPath + "null"` until the page is reloaded with the saved answer. Saved files rendered read-only always have `size: 0`.

## From answer to server: `schemauploader`

A `blob` answer is completed by the `schemauploader` command (full reference: [../commands/schemauploader.md](../commands/schemauploader.md)). In short:

1. `schema` publishes the `IUserActionResult` to `resultSourceId`.
2. `schemauploader`, bound to that source through `datamembername`, walks `properties[].added` and `properties[].edited`, and for every part value whose `value.content instanceof File` generates a `blobid`, remembers `{ blobid, file, uploadtoken, part, prpid }` and replaces `value.content` by the `blobid`.
3. The answer is posted as JSON to `url`. The response must contain `usedforid`.
4. Every remembered file is posted as `multipart/form-data` to `blob` (or `url` when `blob` is absent) with `uploadtoken`, `blobid`, `prpid`, `part`, `usedforid` and `lid` both in the query string and in the form body, plus the file under its own name.
5. `<name>.uploading` and `<name>.uploaded` sources report progress.

`upload` values contain data URL strings, not `File` objects, so `schemauploader` posts them inline with the JSON and performs no second step for them.

## Examples

### Schema with both kinds of file part

Served as `/schema/questions/1166`:

```json
{ "sources": [{ "data": [{
  "schemaId": 1161, "schemaVersion": "1.1", "lid": 1, "paramUrl": "/1166",
  "questions": [
    { "prpId": 1, "title": "File", "multi": false,
      "parts": [{ "part": 1, "viewType": "upload", "validations": { "required": false } }] },
    { "prpId": 2, "title": "Blob", "multi": false,
      "parts": [{ "part": 1, "viewType": "blob", "multiple": true,
                  "uploadToken": "upload-token-value", "validations": { "required": false } }] }
  ]
}] }] }
```

### New answer with files, uploaded in two phases

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
         schemaUrl="/schema/questions/1166"
         displayMode="new"
         button="[data-btn-add]"
         resultSourceId="demo.data"
         errorResultSourceId="demo.error">
  </Basis>
  <Basis core="schemauploader" run="atclient"
         datamembername="demo.data"
         name="uploader"
         url="/blob/answer-json"
         blob="/blob/answer-blob">
  </Basis>
  <basis core="callback" run="atclient"
         triggers="demo.data uploader.uploading uploader.uploaded"
         method="onUpload"></basis>
  <script>
    function onUpload(args) {
      console.log(args.source.id, args.source.rows[0]);
    }
  </script>
</body>
</html>
```

The `demo.data` row for a new answer with one `upload` file and one `blob` file looks like:

```json
{
  "lid": 1, "schemaId": 1161, "schemaVersion": "1.1", "paramUrl": "/1166",
  "properties": [
    { "propId": 1, "multi": false,
      "added": [{ "parts": [{ "part": 1, "values": [
        { "value": { "content": "data:text/plain;base64,aGVsbG8=", "name": "readme.txt", "size": 5, "type": "text/plain" } }
      ] }] }] },
    { "propId": 2, "multi": false,
      "added": [{ "parts": [{ "part": 1, "values": [
        { "value": { "content": "<File>", "name": "photo.jpg", "size": 18244, "type": "image/jpeg",
                     "uploadToken": "upload-token-value" } }
      ] }] }] }
  ]
}
```

### Editing saved files

```html
<Basis core="api" url="/schema/answers?id=[##inline.object.id##]" method="get" run="atclient"></Basis>
<button data-btn-edit>Save</button>
<Basis core="schema" datamembername="answer.data" run="atclient"
       schemaUrl="/schema/questions" displayMode="edit"
       button="[data-btn-edit]" resultSourceId="demo.data"
       filesPath="siteName/">
</Basis>
<script>
  const host = { sources: { "inline.object": [{ id: 1423330 }] } };
</script>
```

Removing a saved file and adding a new one produces, for that property, `edited: [{ id, parts: [{ part: 1, values: [{ value: {content, name, size, type} }] }] }]` and `deleted: [{ id, parts: [{ part: 1, values: [{ id: <fileId>, value: { name, type } }] }] }]`.

## Pitfalls

- `blob` values hold a `File`; serialising the answer yourself (for example with `api` instead of `schemauploader`) sends `"content": {}`.
- In single-file mode, picking a new file replaces a saved file in the UI without reporting the saved file as deleted; the server receives an added file and still holds the old one.
- New files are reported under `edited` without `id` when the question already had an answer.
- Download links of new files point to `filesPath + "null"`.
- `filesPath` is concatenated as-is; make sure exactly one slash separates it from `url`.
- Saved files without `size` count as 0 bytes for `mimes` `minSize` checks.
- `url` is not combined with `name`; store the full path of the file in `url`.
- Icons are fetched from `basispanel.ir`.

## Related

- [field-types.md](field-types.md)
- [validation.md](validation.md)
- [answers-and-submission.md](answers-and-submission.md)
- [schema-json-contract.md](schema-json-contract.md)
- [dom-markers.md](dom-markers.md)
- [../commands/schemauploader.md](../commands/schemauploader.md)
- [../commands/schema.md](../commands/schema.md)

## Source files

- `src/component/renderable/schema/part-control/upload/UploadType.ts`
- `src/component/renderable/schema/part-control/upload/BlobType.ts`
- `src/component/renderable/schema/part-control/upload/ReadOnlyUploadType.ts`
- `src/component/renderable/schema/part-control/upload/ExtensionList.ts`
- `src/component/renderable/schema/part-control/upload/IFileInfo.ts`, `IFileValue.ts`, `IBlobValue.ts`
- `src/component/renderable/schema/part-control/upload/assets/layout.html`, `image-layout.html`, `readonly-layout.html`, `readonly-image-layout.html`, `style.css`
- `src/component/renderable/schema/question-part/QuestionPart.ts` (`ValidateValue`: `size`, `mimes`)
- `src/component/renderable/SchemaUploader.ts`
- `server/blob-server.js`
