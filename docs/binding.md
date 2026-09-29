# Binding

BasisCore.js fills markup from sources with three syntaxes:

| Syntax | Where it works | Reads from |
|---|---|---|
| `[##source.member.column##]` | text and attribute values anywhere on the page, and attributes of `<basis>` commands | the source repository |
| `@column@` | inside `<face>` templates of rendering commands | the row being rendered |
| `{{ ... }}` | text, attribute values and face templates | JavaScript you write |

Sources themselves (what they are, how they are published and merged) are covered in
[sources-and-triggers.md](sources-and-triggers.md).

## Source tokens

A token names a source and a column. The first two dot-separated parts are the source id; the rest
is the column.

```html
<p>Order [##shop.order.id##] for [##shop.order.customer##]</p>
<a href="/orders/[##shop.order.id##]">Details</a>
```

Source ids are matched case-insensitively. The column can be a property path, so
`[##app.user.address.city##]` reads `address.city` from the row.

What the token returns depends on the number of rows in the source:

| Rows | Result |
|---|---|
| 1 | the column value of that row |
| more than 1 | an array with the column value of every row (joined with commas when written into text) |
| 0, or the value is `null` or `""` | nothing; the next fallback is tried |

Text and attribute tokens outside `<basis>` elements subscribe to the sources they name. When a
source is published again, the text or attribute is updated. Tokens in the attributes of a `<basis>`
command do not subscribe the command; to make a command re-run when such a source changes, list it
in `triggers` (see [sources-and-triggers.md](sources-and-triggers.md)).

A value written into a text node is inserted as HTML, not as plain text.

### Fallback chains

Separate alternatives with `|`. A part in parentheses is a literal value.

```html
<span>[##cms.query.page|(1)##]</span>
<span>[##app.user.nickname|app.user.name|(Guest)##]</span>
```

The parts are tried from left to right and the first non-empty value wins. A source that does not
exist yet is skipped, unless it is the last part:

- In the attributes of a command, a missing source in the last part makes the command wait until the
  source is published.
- In page text and attributes, the token renders empty and is filled in when the source arrives.
- Sources whose id starts with `cms.` are never waited for.

End a chain with a literal when the command should not wait. A literal cannot contain `.` or `|`:
`(1.5)` is read as a source name, not as a value.

### Checking whether a source exists

A token without a column, such as `[##app.user##]`, returns the text `true` if the source exists and
`false` if it does not. It does not wait. This is useful in `if`:

```html
<basis core="print" datamembername="app.user" if="[##app.user##]" run="atclient">
  <face><p>Signed in as @name@</p></face>
</basis>
```

Because a token without a column is an existence check, a value published as a scalar must be read
through its `value` column. Form elements publish exactly that shape: a text input named
`search.term` publishes one row `{ value: "..." }`.

```html
<input type="text" name="search.term" bc-triggers="keyup" />
<p>You searched for: [##search.term.value|()##]</p>
```

`[##search.term##]` in this example prints `true`, not the search text.

## Faces

Rendering commands (`print`, `list`, `view`, `tree`) render one `<face>` per row. Inside a face,
`@column@` reads a column of the current row.

```html
<basis core="print" datamembername="shop.products" run="atclient">
  <face>
    <div class="product">
      <h3>@name@</h3>
      <span>@price.toFixed(2)@</span>
    </div>
  </face>
</basis>
```

The text between the two `@` characters is a JavaScript expression evaluated with the row's columns
as variables. It cannot contain spaces. Rules to keep in mind:

- Always close the expression with a second `@`. The form `@name` without the closing `@` is also
  recognised, but it runs to the next whitespace, so `@name</td>` is read as the expression
  `name</td>` and fails.
- An unknown column renders as an empty string.
- A `null` value renders as the text `null`. Write `@note??''@` for a column that can be null.
- Any `@word` in a face is read as an expression, so literal text such as an e-mail address is
  broken. Put such text in a column and bind it, or produce it in a `{{ }}` block.

### Layout and else-layout

`<layout>` wraps the rendered rows; `@child` marks where they go. `<else-layout>` is rendered instead
when no row produced output, either because the source is empty or because no face matched.

```html
<basis core="print" datamembername="shop.products" run="atclient">
  <layout><ul class="products">@child</ul></layout>
  <face><li>@name@</li></face>
  <else-layout><p>No products found.</p></else-layout>
</basis>
```

Layouts are not bound to a row: `@column@` does not work in them, but `[##...##]` tokens and
`{{ }}` blocks do.

### Several faces and face filters

When a command has more than one face, each row is rendered with the first face that matches it, in
document order. A row that matches no face is skipped. Put specific faces before a general one.

`filter` selects the rows a face applies to. It is an AlaSQL `WHERE` condition over the column names
of the source, not face syntax, and it requires AlaSQL (see
[client-side-sql.md](client-side-sql.md)).

```html
<basis core="print" datamembername="shop.products" run="atclient">
  <face filter="inStock = 1"><li>@name@</li></face>
  <face><li class="sold-out">@name@ (sold out)</li></face>
</basis>
```

String values need SQL quotes: `filter="status = 'active'"`. The filter may contain source tokens,
for example `filter="categoryId = [##cms.query.cat|(0)##]"`.

`rowtype="odd"` or `rowtype="even"` restricts a face by row position. Counting starts at zero, so the
first rendered row is `even`.

### Levels in tree and view

In `tree` and `view`, `level` selects faces by depth. Separate several levels with `|`.

- `tree` numbers levels from `1` at the root; a row without children also has the level `end`. The
  columns are set with `idcol` (default `id`), `parentidcol` (default `parentid`) and `nullvalue`,
  the parent value of root rows (default `0`). `@child` inside a face marks where the children go.
- `view` groups rows by `groupcol` (default `prpid`). Level `1` renders the first row of each group
  as its header, level `2` renders every row of the group into the header's `@child`. In 2.39.6
  the level-2 rows do not appear; see [commands-rendering.md](commands-rendering.md).

```html
<basis core="tree" datamembername="site.menu" run="atclient">
  <layout><ul class="menu">@child</ul></layout>
  <face level="end"><li><a href="@url@">@title@</a></li></face>
  <face><li>@title@<ul>@child</ul></li></face>
</basis>
```

Use `level` only in `tree` and `view` faces.

## Templates are parsed as XML

After binding, the output of a face, layout or else-layout is parsed as XML. It must be well-formed:
close every element, quote every attribute and write `&#160;` instead of HTML-only entities such as
`&nbsp;`.

The browser parses the page before BasisCore.js sees it, which causes two problems:

- `<br/>` and `<img ... />` are serialised back as `<br>` and `<img ...>`, which is not valid XML.
- Table rows, cells and options outside a table or select are moved or dropped by the HTML parser.

Wrap such templates in `<script type="text/template">`. The script must be the only element inside
the face or layout; its content is kept as written.

```html
<basis core="print" datamembername="shop.products" run="atclient">
  <layout>
    <script type="text/template">
      <table class="grid">
        <thead><tr><th>Name</th><th>Price</th></tr></thead>
        <tbody>@child</tbody>
      </table>
    </script>
  </layout>
  <face>
    <script type="text/template">
      <tr><td><img src="@thumb@" alt="" /></td><td>@name@</td><td>@price@</td></tr>
    </script>
  </face>
</basis>
```

The same applies to `<option>` rows: put the `<select>` in the layout and the option in the face,
both inside script templates.

## Code blocks

`{{ ... }}` runs JavaScript and inserts the value it returns. The code is the body of an async
function with two parameters:

| Parameter | Value |
|---|---|
| `$bc` | the context of the command or page; it provides `tryToGetSource(id)` and `waitToGetSourceAsync(id)` |
| `$data` | the current row inside a face; `undefined` elsewhere |

The block must `return` a value; without it, nothing is inserted. Errors are logged to the console.

```html
<basis core="print" datamembername="shop.orders" run="atclient">
  <face>
    <script type="text/template">
      <li>#@id@ {{ return $data.total > 100 ? '<b>large</b>' : 'regular'; }}</li>
    </script>
  </face>
</basis>
```

Inside a face without a script template, the browser escapes `<`, `>` and `&` in the code, which
breaks it; use a script template whenever the code contains those characters.

Outside faces, code blocks in text and attributes are re-evaluated when a source they read is
published. A source is tracked only when the code calls `$bc.tryToGetSource('id')` or
`$bc.waitToGetSourceAsync('id')` with the id as a single-quoted literal. Write one such call per line;
an id in a variable or in double quotes is not tracked.

```html
<p>{{
  const cart = $bc.tryToGetSource('shop.cart');
  return cart ? cart.rows.length + ' items' : 'Cart is empty';
}}</p>
```

Prefer `tryToGetSource` in page text and attributes. `waitToGetSourceAsync` there holds up the start
of every command on the page until the source exists.

Do not put two closing or opening braces next to each other inside a block (`}}` ends the block);
separate them with a space or a line break.

## Binding settings

The three patterns are host settings and can be replaced in `host.settings`:

| Setting | Default |
|---|---|
| `default.binding.regex` | `/\[##([^#]*)##\]/` |
| `default.binding.codeblock-regex` | `/{{((?:[^{}][{}]?)*)}}/` |
| `default.binding.face-regex` | `/([^@]|^)@(?:([^@\s]+)@|([^@\s]+))/` |

```html
<script>
  var host = {
    settings: {
      "default.binding.regex": /\{%([^%]*)%\}/,
    },
  };
</script>
```

Values must be `RegExp` objects with the same capture groups as the defaults: group 1 of the token
and code-block patterns is the expression, and the face pattern keeps its three groups. Change them
only when another template engine on the page uses the same delimiters.

## Common mistakes

- Writing `@column@` inside a face filter. Filters use plain column names: `filter="inStock = 1"`.
- Reading an input with `[##search.term##]`. That is an existence check; use
  `[##search.term.value##]`.
- Putting `<tr>` or `<option>` directly in a face, or `<br/>` in a template without a script wrapper.
- Printing a multi-row source with a token. Use a rendering command for collections.
- Expecting a command to re-run when a token in one of its attributes changes. Add the source to
  `triggers`.
- Forgetting `return` in a code block, or passing the source id in a variable when it should be
  tracked.
