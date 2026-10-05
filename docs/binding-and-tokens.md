# Binding and tokens

Binding is how a BasisCore Client page reads values out of sources and puts them into markup. The library recognises three syntaxes: `[##source.member.column##]` tokens, which can appear in ordinary text, in HTML attributes and in the attributes of `<basis>` commands; `@column@` placeholders, which are only valid inside `<face>` and `<layout>` templates of the rendering commands; and `{{ ... }}` code blocks, which are JavaScript bodies compiled into async functions and accepted everywhere the other two are. Every attribute a command reads goes through the same token classes, so this page is also the reference for how a command's attribute value is parsed, typed and re-evaluated when a source changes.

## The three syntaxes

| Syntax | Setting key (under `host.settings`) | Default regular expression | Where it is recognised |
| --- | --- | --- | --- |
| `[##expression##]` | `default.binding.regex` | `/\[##([^#]*)##\]/` | Text nodes, attributes of ordinary elements, attributes of `<basis>` commands, templates read with `GetTemplateToken` |
| `{{ javascript }}` | `default.binding.codeblock-regex` | `/{{((?:[^{}][{}]?)*)}}/` | Everywhere `[##...##]` is recognised, plus `<face>` templates |
| `@column@` or `@column` | `default.binding.face-regex` | `/([^@]|^)@(?:([^@\s]+)@\|([^@\s]+))/` | `<face>` templates only (the rendering commands print, list, view, tree) |

All three expressions are read from the options of the context that owns the component (`context.options.getDefault("binding.regex")` and so on), so they can be changed per page or per `$bc.new()` fragment through `host.settings`. See [Configurable patterns](#configurable-patterns).

The scanner that finds `[##...##]` and `{{ }}` in a page (`ComponentCollection.extractTextBaseComponents`) walks every node of the fragments handed to the runtime except:

- the subtree of any `<basis run="atclient">` element (the command owns its own markup and reads its attributes itself),
- the subtree of any element carrying `bc-ignore`,
- comment nodes.

Inside the remaining elements every text node and every attribute value is tested against both regexes. A `<basis>` command, in turn, reads its own attributes through the same `TokenUtil` parser, so `url="[##cms.query.id##]"` on an `api` command and `href="[##cms.query.id##]"` on an `<a>` are parsed identically; the difference is only who re-renders when the source changes (see [Text and attribute components](#text-and-attribute-components)).

## `[##...##]` tokens

### How a string is split into tokens

`TokenUtil.ToToken` scans the string from left to right. At each step it looks for the first `[##...##]` match; if there is none it looks for the first `{{ }}` match; if there is none either, the rest is a literal. The pieces become:

- a **value token** (`StringValue`, `IntegerValue`, `BooleanValue`, `ObjectValue`) for literal text,
- an **object token** (`StringObject`, ...) for each `[##...##]` match, built from the text between the markers,
- a **CodeBlockToken** for each `{{ }}` match,
- and, when the string produced more than one piece, an **array token** (`StringArray`, ...) that holds them all and joins their values with `""` on evaluation.

An empty attribute value produces no token at all (`ToToken` returns `undefined`), which is why every `Get*Token` helper has to be guarded with `?.` by callers.

The default `[##...##]` pattern does not allow `#` inside the brackets, and the default code-block pattern does not allow two brace characters next to each other inside the block (see [Pitfalls](#pitfalls)).

### Token grammar

The text between `[##` and `##]` is a fallback chain of parts separated by `|`. Each part is one of:

```text
source.member                 existence check
source.member.column          value of one column
source.member.a.b.c           nested property path on the row
(literal)                     a literal default, parentheses included
```

Rules applied by `ObjectToken` and `SourceTokenElement`:

- `source` and `member` are lower-cased; together they form the source id `source.member` that is looked up in the context repository (source ids are always lower case). The column path is **not** lower-cased, so `[##db.users.FirstName##]` reads the property `FirstName` exactly.
- Everything after the second dot is the column path and is evaluated as a JavaScript member expression on the row: `a.b.c` becomes `row.a.b.c`. If that throws, `row['a.b.c']` is tried, so a column whose name contains dots is still reachable.
- A part whose first segment is wrapped in parentheses, optionally surrounded by spaces, is a literal. The text inside the parentheses is converted with the token type's `tryParse` (see [Typed tokens](#typed-tokens)); for string tokens it is used verbatim, so `( )` is a single space and `()` is the empty string.
- A part with only one segment (`[##name##]`) is not supported: building the token throws a `TypeError`, because the constructor reads the member segment unconditionally.

### Single row versus many rows

The extractor generated for a column part returns:

- `null` when the source has no rows,
- `rows[0].<column>` when the source has exactly one row (a scalar),
- `rows.map(row => row.<column>)` when it has more than one row (an array).

An array value is not converted further by the string token. When it reaches a text node it is written as `createContextualFragment(array.join(","))`; when it reaches an attribute the DOM stringifies it, which also yields a comma-separated list. If you want one value from a multi-row source, filter it first (an `OnProcessing` hook, a face `filter`, or `$bc.util.source.runSqlAsync`) or render it with a rendering command.

Sources created from a scalar (`$bc.setSource("cms.text1", "hello")`, or an HTML element publishing its value) have one row of the shape `{ value: ... }`, so the column to read is `value`: `[##cms.text1.value##]`.

### Existence check

A two-segment part, `[##source.member##]`, does not read data. It returns the string `"true"` when `tryToGetSource("source.member")` finds the source and `"false"` otherwise, never waits, and ends the chain. The `if` examples use this form: `if="[##cms.user##]"` renders only when `cms.user` has been published.

### Evaluation of a fallback chain

`ObjectToken.getValueAsync(wait = true)` walks the parts from left to right and keeps a running result:

1. A literal part stores its value as the current result and **continues** with the next part. A literal does not end the chain; a later source part that resolves overrides it, and a later source part that does not resolve leaves it in place.
2. A column part first calls `tryToGetSource(source.member)`.
   - If the source is missing and the part is **not the last** part, the part is skipped.
   - If the source is missing and the part **is the last** part: when `source` is `cms`, the chain ends immediately with the current result (the built-in `cms.*` sources are published at start-up or never, so there is nothing to wait for); otherwise, when `wait` is `true`, the token awaits `waitToGetSourceAsync(source.member)` and continues with the source that arrives; when `wait` is `false`, the chain ends with the current result.
   - With a source in hand the extractor runs. If it throws, or returns `null` or `""`, the part is skipped; otherwise its value becomes the result and the chain ends.
3. An existence part ends the chain with `"true"` or `"false"`.

Consequences worth knowing:

- `[##cms.query.id|(0)##]` yields `0` immediately when there is no `id` in the query string.
- `[##app.user.name|(guest)##]` yields `guest` when `app.user` is not yet published; it is re-evaluated when `app.user` arrives, because the token registers a trigger on every source it names (see below).
- `[##(guest)|app.user.name##]` behaves the same way, but if `app.user` never arrives and the caller passed `wait = true` (every command attribute does), the evaluation never completes. Put the literal last so the chain can end without waiting, or make sure the source is published.
- A source that exists but whose column is `null` or `""` falls through to the next part exactly as a missing source does.

### Which sources a token depends on

`getSourceNames()` returns the `source.member` id of every source part in the chain (and, for array tokens, of every member). The text and attribute components register a trigger for each name, so the binding is re-rendered when any of those sources is set, including `cms.*` sources and sources that only appear as fallbacks.

## Typed tokens

`TokenUtil` offers four entry points. They differ only in how a literal default `(x)` and the final value are converted (`tryParse`):

| Method | Literal text | `tryParse` of the result | Notes |
| --- | --- | --- | --- |
| `ToStringToken` | kept as is | identity | Used for every command attribute read with `getAttributeValueAsync` / `getAttributeToken` |
| `ToIntegerToken` | `parseInt(text)` | `parseInt(value)`, `0` on exception | `parseInt("12px")` is `12`; non-numeric text yields `NaN` |
| `ToBooleanToken` | `text` equals `"true"` (case-insensitive) | `value.toLowerCase() === "true"`, `null` stays `null` | Anything other than `true` is `false`; used for `ignoreNullSource`, `preventDefault`, `stopPropagation`, `processRenderedContent`, `preview` on `<member>` |
| `ToObjectToken` | kept as is (a plain attribute without any token returns the raw string) | `eval(value)` | Only applied to literal defaults inside `[##(...)##]` and to mixed strings; no built-in command reads an object token |

Shared behaviour: `getDefault()` returns the value without touching sources (the literal part of a chain, or `null`), `getSourceNames()` lists dependencies, `getValueAsync(wait)` resolves the value. The extracted column value itself is not passed through `tryParse` by `ObjectToken` (only literals and joined array results are), so an integer token over a column returns whatever the row holds.

### String and Element prototype extensions

`src/extension/StringExtensions.ts` and `src/extension/ElementExtensions.ts` add these methods (all `writable` and `configurable`) to every string and every element on the page. They are what commands and user-defined components use to read attributes:

| Member | Returns |
| --- | --- |
| `String.ToStringToken(context)` / `ToIntegerToken` / `ToBooleanToken` / `ToObjectToken` | the corresponding `TokenUtil` token for the string |
| `String.isEqual(other)` | `localeCompare` with `sensitivity: "accent"` equal to 0, so `"AtClient".isEqual("atclient")` is `true`; `other` may be `null` |
| `String.Evaluating()` | `eval` of the string, compared to `"true"`; throws `ClientException` on an evaluation error. Not used by any built-in command |
| `Element.GetStringToken(name, context)` / `GetIntegerToken` / `GetBooleanToken` / `GetObjectToken` | the token for attribute `name`, or `undefined` when the attribute is missing or empty. `getAttribute` is used, so on HTML elements the name is case-insensitive |
| `Element.getTemplate()` | `textContent` when the element has exactly one child and it is `<script type="text/template">`; otherwise `innerHTML` |
| `Element.GetTemplateToken(context)` | `getTemplate().ToStringToken(context)`; used by `list` for `<divider>` |
| `Element.getXMLTemplate()` | the `outerHTML` of the single `<script type="text/template">` child, or `<basis-core-template-tag>innerHTML</basis-core-template-tag>` so that the result is a single-rooted XML document |
| `Element.GetXMLTemplateToken(context)` | `getXMLTemplate().ToStringToken(context)`; used for `<layout>`, `<else-layout>` and the `<incomplete>` element of `list` |
| `Element.isBasisCore()` | `true` for an element named `BASIS` whose `run` attribute equals `atclient` (case-insensitive). This is the only test that makes the runtime process a command |
| `Element.isBasisTag()` | `true` for any element with a `bc-triggers` attribute (see [HTML element binding](html-element-binding.md)) |
| `Element.isIgnoreTag()` | `true` for any element with a `bc-ignore` attribute |

The three `is*` helpers return `false` instead of throwing for non-element nodes.

## Code blocks: `{{ ... }}`

### What a block is

`CodeBlockToken` turns the text between `{{` and `}}` into an `AsyncFunction` with two parameters, `$bc` and `$data`:

```js
async function ($bc, $data) {
  try {
    /* your block */
  } catch (e) {
    console.error(e);
    return e;
  }
}
```

Before compiling, every literal `&quot;` in the block is replaced by `"`. Templates obtained through `innerHTML` or `outerHTML` serialise quotes inside attribute values as `&quot;`, and this replacement lets such blocks compile.

The block body must `return` a value; a block that returns `undefined` or `null` renders as `""`. If the body throws, the error is logged with `console.error` and the **error object itself** is returned, so the rendered text becomes something like `ReferenceError: x is not defined`.

### What `$bc` is inside a block

Inside a block `$bc` is **not** the global `$bc` wrapper. The token is executed as `fn(this.context)`, so `$bc` is the `IContext` that owns the component: the page root context, or the local context of the enclosing `group`, `repeater` or user-defined component. It offers:

| Member | Purpose |
| --- | --- |
| `tryToGetSource(id)` | the `ISource` with that id, or `undefined`; never waits |
| `waitToGetSourceAsync(id)` | a promise that resolves when the source exists (immediately if it already does) |
| `setAsSource(id, data, options?, preview?)` | publish `data` as a new `Source` |
| `setSource(source, preview?)` | publish an existing `ISource` |
| `addOnSourceSetHandler(id, handler)` / `removeOnSourceSetHandler(id, handler)` | subscribe to a source id |
| `options` | the merged host options of this context (`getDefault`, `getSetting`, `settings`, `sources`, ...) |
| `logger` | the context logger |
| `loadPageAsync`, `loadDataAsync`, `getOrLoadDbLibAsync` | the loaders used by `call`, `dbsource` and the SQL utilities |
| `checkSourceHeartbeatAsync(id)` | declared on the interface but throws `Method not implemented` |

Because the parameter shadows the global, `$bc.util` is `undefined` inside a block. Reach the global wrapper through `window.$bc` when you need `$bc.util`, or pass what you need from a page-level function as the examples do (`return await fn($bc, $data)`).

The source object has `id`, `rows`, `keyFieldName`, `statusFieldName`, `mergeType`, `versions` and `extra`; see [Sources and reactivity](sources-and-reactivity.md).

### What `$data` is

`$data` is the current row when the block is evaluated through a face template (`CodeBlockTemplate.getValueAsync(row)` calls `executeAsync(row)`). In every other position - text nodes, element attributes, command attributes such as `if` or `url` - the block is evaluated with `getValueAsync()` and `$data` is `undefined`.

### Automatic triggers from a block

When the token is built, the block text is scanned with

```js
/\$bc\.(?:waitToGetSourceAsync|tryToGetSource)\('(.*)'\)/g
```

and every captured id is reported by `getSourceNames()`. A text or attribute component therefore re-runs a block whenever a source it reads with one of those two calls (written with single quotes and a literal id) is set. Calls written with double quotes, template strings or a variable are not detected and do not create triggers; the block still runs once on page load. The capture is greedy, so put each call on its own line: two calls on the same line are captured as one bogus id.

## Face templates: `@column@`

Face templates belong to the rendering commands (`print`, `list`, `view`, `tree`). This section covers the template language itself; the attributes of `<face>` (`filter`, `rowtype`, `level`) are described on the command pages.

### Parsing

`RawFace` reads each `<face>` with `getXMLTemplate()`, and `ContentTemplate` splits the result with one combined pattern built from the face regex and the code-block regex (`new RegExp(face.source + "|" + block.source, "gi")`). Each match becomes one of:

- `StringTemplate` for literal text,
- `ExpressionTemplate` for `@expr@` (closed form) or `@expr` (open form, ends at the first whitespace or `@`),
- `CodeBlockTemplate` for `{{ }}`.

The face regex requires the character before `@` to be anything but `@` (or the start of the string). The expression may contain any characters except `@` and whitespace, so `@price*2@`, `@tags.length@` and `@(a+b)@` are valid expressions; `@total price@` is not (the open form stops at the space).

### Evaluation

`ExpressionTemplate` compiles one function per expression, on first use, with this body:

```js
const child = '@child';                 // one line per reserved key (tree and view only)
const id = $functionArgumentData["id"];  // one line per own property of the row
const name = $functionArgumentData["name"];
try {
  return <expression>;
} catch (e) {
  if (e instanceof ReferenceError) return "";
  throw e;
}
```

So:

- every own property of the row is a `const` local and the expression is plain JavaScript over those locals;
- an identifier that is not a property of the row raises `ReferenceError`, which renders as `""`; any other error (a `TypeError` from `@address.city@` when `address` is `null`, for example) is thrown and aborts the render;
- the list of locals is taken from the **first row** the expression sees in a render pass. A property that exists only in later rows is a `ReferenceError` for them; a property missing from a later row is simply `undefined`;
- a property whose name is not a valid JavaScript identifier (`first-name`, `2nd`, `class`) makes the generated function fail to compile. The error is logged as `Error in create binding expression for '...'` and rethrown;
- values are concatenated with `+`, so a `null` field prints `null` and an `undefined` field prints `undefined`. Use a code block or `OnProcessing` to normalise such values.

The reserved keys are passed by the command: `tree` and `view` pass `["child"]`. For them, `@child` in a face is replaced before parsing with `<basis-core-template-tag data-type="child"></basis-core-template-tag>`, the slot where child rows are inserted, and the identifier `child` evaluates to the string `@child` instead of a row field. `print` and `list` pass no reserved keys. `@child` inside `<layout>` is handled separately by every rendering command (`RenderableComponent.createContentAsync` replaces it with `<basis-core-template-child-tag>`).

`{{ }}` blocks inside a face receive the row as `$data` and the context as `$bc` (see above).

### `<script type="text/template">` and XML parsing

The rendered string of a face or layout is turned into DOM nodes by `$bc.util.toElement`, which parses it with `DOMParser` as `application/xml` and then rebuilds it with `document.createElementNS`. Two consequences:

- The template must be well-formed XML: close every tag (`<br />`, `<input ... />`), quote every attribute, escape `&` as `&amp;`, and do not use HTML entities such as `&nbsp;`. A parse failure inserts the browser's `<parsererror>` element into the output instead of your markup.
- Elements inside an `<svg>` element are created in the SVG namespace, everything else in the XHTML namespace, so inline SVG in a face renders correctly.

During the rebuild, text nodes are trimmed and whitespace-only text nodes are dropped, so there is no whitespace between adjacent inline elements in the output. `<textarea>` content is copied verbatim.

Wrapping the template in `<script type="text/template">` has two effects. First, the HTML parser does not interpret script content, so markup that is invalid in its position (a `<tr>` outside a `<table>`, a bare `<td>`) survives untouched until the face is rendered. Second, `getXMLTemplate()` uses the script element's `outerHTML` as the single XML root instead of wrapping the content in `<basis-core-template-tag>`. In both cases only the children of the root are inserted into the page; the wrapper never appears in the DOM. The `type` comparison is case-insensitive (`text/Template` works). The script element must be the **only** element child of the `<face>`.

## Text and attribute components

`TextComponent` and `AttributeComponent` are the components created for bindings found outside `<basis>` commands.

- For each `[##...##]` or `{{ }}` match in a text node, a `TextComponent` is created around that match only. A `Range` covering the match is extracted into a `RangeObject`, which leaves two empty text nodes as start and end markers; the extracted text becomes the component's token. The remaining text is scanned again, so a text node with several bindings produces several components.
- For each attribute whose value contains a match, one `AttributeComponent` is created for the whole attribute; its token is the complete attribute value, so literal text around the binding is preserved.

Both have `Priority.none`: they are never run by the priority waves. Their `initializeAsync` evaluates the token once with `wait = false` and writes the result (or `""`) into the range or attribute. A source that is not available yet therefore renders as empty text instead of blocking page initialisation. Both register a trigger for every id returned by `getSourceNames()`; when such a source is set, `renderAsync` evaluates the token again with the default `wait = true` and replaces the content. There is no `if`, no hooks and no busy guard beyond the one described in [Command attributes and lifecycle](command-attributes-and-lifecycle.md).

Markup produced by a token in a text node is parsed as HTML (`Range.createContextualFragment`), which is why the code-block examples can return `<ul>...</ul>` strings. The produced nodes are not scanned for further bindings or commands.

## Configurable patterns

The three regular expressions are ordinary `host.settings` entries and are read from the context that owns the component, so a page can use a different token syntax, or two fragments on the same page can use different syntaxes:

```html
<div id="section-1">
  Time is (local) : [##data.time.hh|(00)##]:[##data.time.mm|(00)##]:[##data.time.ss|(00)##]
</div>
<div class="section-2">
  Time is (UTC) : {data.time.hh|(00)}:{data.time.mm|(00)}:{data.time.ss|(00)}
</div>
<script>
  const bc = $bc.new().addFragment("#section-1").run();
  const bc2 = $bc
    .new()
    .addFragment(".section-2")
    .setOptions({ settings: { "default.binding.regex": /\{([^\}]*)\}/ } })
    .run();
</script>
```

The replacement must be a `RegExp` object with exactly one capture group holding the expression; the parser uses `match[1]` for the token text and `match.index` / `match[0].length` to cut the string. The face pattern is combined with the code-block pattern and used with the `g` flag, so a replacement face regex must keep the same three groups (leading character, closed expression, open expression). Settings keys are matched case-insensitively.

## Examples

### Tokens in text and attributes

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Tokens</title>
</head>
<body>
  <input bc-triggers="keyup" name="cms.text1" />

  <p>Query string id: [##cms.query.id|(none)##]</p>
  <p>Typed text: [##cms.text1.value|( )##]</p>
  <p>Is cms.user published? [##cms.user##]</p>
  <a href="/detail?id=[##cms.query.id|(0)##]&amp;mode=view">Open</a>
  <p>All names: [##inlinesource.print.name##]</p>

  <script>
    const host = {
      sources: {
        "cms.user": [{ id: 1, name: "amir" }],
        "inlinesource.print": [
          { id: 1, name: "qamsari" },
          { id: 2, name: "akaberi" },
          { id: 3, name: "amir" },
        ],
      },
    };
  </script>
</body>
</html>
```

`inlinesource.print` has three rows, so the last paragraph shows `qamsari,akaberi,amir`.

### Code blocks in text, in an attribute and in a face

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
  <title>Code blocks</title>
</head>
<body style="display:{{return 'block';}}">
  <input bc-triggers="keyup" name="cms.text1" />

  {{
    const data = $bc.tryToGetSource('cms.text1');
    return data ? data.rows[0].value : 'not set';
  }}
  <br />
  {{
    const date = new Date();
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }}

  <basis core="print" datamembername="inlinesource.print" run="atclient">
    <layout><ul>@child</ul></layout>
    <face>
      <li>@id @name@{{ return await fn($bc, $data); }}</li>
    </face>
  </basis>

  <script>
    $bc.setSource("inlinesource.print", [
      { id: 1, name: "qamsari", tags: ["A", "B", "C"] },
      { id: 3, name: "akaberi", tags: ["A", "F"] },
      { id: 3, name: "amir", tags: ["B", "T"] },
    ]);

    async function fn(_, $data) {
      const lis = $data.tags.reduce((total, tag) => (total += `<li>${tag}</li>`), "");
      return `<ul>${lis}</ul>`;
    }
  </script>
</body>
</html>
```

The first block names `cms.text1` in a `$bc.tryToGetSource('...')` call, so it is re-evaluated on every key press. The `style` attribute shows a block inside an ordinary attribute; the face block receives the row as `$data`.

### Face template with a `text/template` script

```html
<basis core="print" datamembername="demo.data" run="atclient">
  <layout>
    <script type="text/template">
      <table>
        <thead><tr><td>Id</td><td>Name</td><td>Age</td></tr></thead>
        <tbody>@child</tbody>
      </table>
    </script>
  </layout>
  <face>
    <script type="text/template">
      <tr>
        <td>@id@</td>
        <td>@name@</td>
        <td>@age@ ({{ return $data.age >= 18 ? 'adult' : 'minor'; }})</td>
      </tr>
    </script>
  </face>
</basis>
```

## Pitfalls

- `[##name##]` with a single segment throws while the token is built (`SourceTokenElement` reads `parts[1]` unconditionally); the heartbeat form it was meant for is not implemented (`checkSourceHeartbeatAsync` throws `Method not implemented`). Always write at least `source.member`.
- A command attribute whose last chain part is a non-`cms` source that is never published waits forever, because command attributes are read with `wait = true`. End the chain with a literal, or make sure the source arrives.
- A literal part does not stop the chain. `[##(x)|a.b.c##]` still waits for `a.b` when it is the last part; `[##a.b.c|(x)##]` does not.
- `#` cannot appear inside `[##...##]` with the default pattern, so `[##cms.query.color|(#fff)##]` does not match and is left as literal text.
- Two adjacent brace characters inside a code block end or break the block: `{{ return {a:{b:1}}; }}` is cut at the first `}}`, and `{{ return {}; }}` does not match. Write `{ }` and `} }` with a space, or move the logic into a page function.
- The source-detection regex for code blocks only sees `$bc.waitToGetSourceAsync('...')` and `$bc.tryToGetSource('...')` with single quotes and a literal id, one call per line. Any other way of reading a source does not re-trigger the block.
- Inside a block `$bc` is the context, not the global wrapper; `$bc.util` is `undefined`. Use `window.$bc.util` or pass helpers in from page scripts.
- `@column@` expressions turn row properties into `const` locals: property names that are not valid identifiers or that are JavaScript reserved words make the face fail to compile; `null` and `undefined` values print as the words `null` and `undefined`; a literal `@` followed by non-space text (an e-mail address in a face) is parsed as an expression and usually renders as `""`.
- Face and layout markup is parsed as XML: unclosed `<br>`, unquoted attributes, `&nbsp;` or a bare `&` produce a `<parsererror>` element instead of your template, and whitespace between inline elements is removed.
- A multi-row source read with a column token yields an array; in text and attributes it is written as a comma-separated list.
- A text token that is re-rendered to an empty or `null` value throws `TypeError: Cannot read properties of null (reading 'toString')` (only the first render guards against `null`); an attribute token writes the text `null`. Give every text token that can become empty a fallback such as `|( )`.
- `Element.Get*Token` returns `undefined` for a missing or empty attribute; guard with `?.` before calling `getValueAsync`.
- The open face form `@column` runs to the next whitespace or `@`, so `<li>@name</li>` compiles `name</li>…` as the expression and the face fails; close the placeholder (`@name@`) whenever markup or punctuation follows it. Faces have no `|(default)` syntax: a fallback is a JavaScript expression without spaces, for example `@(mark??'none')@`.
- The text of `<script>` elements is scanned for tokens and code blocks like any other text. An inline script that quotes the token syntax in a string throws at load; mark it with `bc-ignore`.
- A `{{ }}` block in page text that awaits a source nobody has published yet (`await $bc.waitToGetSourceAsync('a.b')`) holds the whole collection in its initialisation phase: no command of that runtime runs until the source exists, and `$bc.setSource` from a page script is deferred too. Prefer `$bc.tryToGetSource('a.b')` with a `null` check, or publish the source first.
- A column whose name contains `-` is evaluated as a subtraction first (`rows[0].min-id`), and the bracket fallback is used only when that throws; with a global named like the suffix the token yields `NaN` silently.
- `ToObjectToken` returns the raw string when the attribute contains no token; only literal defaults inside `(...)` and mixed strings are passed through `eval`.

## Related

- [Command attributes and lifecycle](command-attributes-and-lifecycle.md) - how command attributes are read, `if`, `triggers`, hooks, priority waves
- [Sources and reactivity](sources-and-reactivity.md) - source ids, rows, merge, the built-in `cms.*` sources, contexts
- [HTML element binding](html-element-binding.md) - publishing sources from inputs with `bc-triggers`
- [Host configuration](host-configuration.md) - the `host.settings` keys, including the binding patterns
- [JavaScript API](javascript-api.md) - the global `$bc`, `$bc.util.toElement`, `$bc.util.source`
- [print](commands/print.md), [list](commands/list.md), [view](commands/view.md), [tree](commands/tree.md) - the commands that use face templates

## Source files

- `src/token/TokenUtil.ts`
- `src/token/IToken.ts`
- `src/token/base/ValueToken.ts`, `src/token/base/ObjectToken.ts`, `src/token/base/ArrayToken.ts`
- `src/token/token-element/SourceTokenElement.ts`, `src/token/token-element/ValueTokenElement.ts`
- `src/token/string/*.ts`, `src/token/integer/*.ts`, `src/token/boolean/*.ts`, `src/token/object/*.ts`
- `src/token/CodeBlockToken.ts`
- `src/extension/StringExtensions.ts`, `src/extension/ElementExtensions.ts`
- `src/component/text-base/TextComponent.ts`, `src/component/text-base/AttributeComponent.ts`
- `src/component/renderable/base/template/ContentTemplate.ts`, `ExpressionTemplate.ts`, `CodeBlockTemplate.ts`, `StringTemplate.ts`
- `src/component/renderable/base/RawFace.ts`, `RawFaceCollection.ts`, `FaceCollection.ts`, `FaceRenderResult.ts`, `TreeFaceRenderResult.ts`
- `src/component/renderable/base/RenderableComponent.ts`
- `src/wrapper/UtilWrapper.ts` (`toElement`)
- `src/ComponentCollection.ts` (scanning for text and attribute bindings)
- `src/options/HostOptions.ts` (default patterns)
- `src/context/Context.ts`, `src/context/IContext.ts`
