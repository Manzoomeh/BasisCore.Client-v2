# Sources and triggers

Every piece of data on a BasisCore.js page lives in a **source**: a named list of rows kept in the
page's source repository. Commands such as `dbsource`, `api` and `inlinesource` publish sources,
rendering commands display them, and publishing a source again re-runs everything that depends on it.

This page covers how sources are identified, published and merged, and how commands react to them.
How values are read out of sources is covered in [binding.md](binding.md).

## Source ids and rows

A source id has the form `name.member`, for example `shop.products`. Ids are stored in lower case, so
`Shop.Products` and `shop.products` are the same source. Bindings read the first two parts of a token
as the id, so give every source you want to bind a two-part id.

A source always holds an array of rows. Published data is normalised like this:

| Published data | Rows |
|---|---|
| an array | the array itself |
| an object | `[object]` |
| a string, number or boolean | `[{ value: data }]` |

A scalar is therefore read with its `value` column: `[##app.title.value##]`.

## Publishing from JavaScript

```js
$bc.setSource(id, data, options);
```

| Option | Meaning |
|---|---|
| `mergeType` | `0` replace (default) or `1` append; see [Merging](#merging) |
| `keyFieldName` | column that identifies a row when appending |
| `statusFieldName` | column that says whether an appended row is added, edited or deleted |
| `extra` | any value you want to keep with the source |

```js
$bc.setSource("app.title", "Order history");
$bc.setSource("shop.products", [
  { id: 1, name: "Pen", price: 2.5, inStock: 1 },
  { id: 2, name: "Ink", price: 7, inStock: 0 },
]);
```

`$bc.setSource` builds the page if it has not been built yet, and applies the data once all commands
on the page are initialised. The source is therefore not readable immediately after the call. Call it
after the page has been parsed, for example from an event handler; an earlier call starts rendering
before the rest of the page exists.

## Initial sources in `host`

Sources that must exist from the start go in `host.sources`. Each entry is either an array of rows or
an object with `data` and optional `options`. Keys are lower-cased.

```html
<script>
  var host = {
    sources: {
      "app.config": [{ currency: "USD", pageSize: 20 }],
      "shop.cart": {
        data: [],
        options: { keyFieldName: "id", statusFieldName: "status" },
      },
    },
  };
</script>
```

The object form uses `data`, not `rows`. An entry such as `{ rows: [...] }` produces a single row with
an undefined `value`.

## Built-in sources

BasisCore.js publishes these sources when the page starts. Tokens that read a `cms.` source never
wait for it, so give them a fallback: `[##cms.query.id|(0)##]`.

| Source | Content |
|---|---|
| `cms.query` | one row with a column per query-string parameter; values are URL-decoded. Published only when the URL has a query string. |
| `cms.cookie` | one row with a column per cookie. Published only when `document.cookie` is not empty. |
| `cms.request` | `requestId` (always `-1`), `hostip` (the page's host name) and `hostport` (the page's port, empty for the default port). |
| `cms.cms` | the date and time when the page started: `date`, `time`, `date2`, `time2`, `date3`. |

`cms.cookie` splits `document.cookie` on `;` without trimming and does not decode values. Every cookie
name after the first keeps its leading space, so a token can only read the first cookie. Read other
cookies in code, for example `$bc.tryToGetSource('cms.cookie').rows[0][' theme']`.

`cms.cms` is set once and does not advance. Its formats are:

| Column | Format |
|---|---|
| `date` | `yyyy/MM/dd` |
| `time` | `HH:mm` |
| `date2` | `yyyyMMdd` |
| `time2` | `HHmmss` |
| `date3` | `yyyy.MM.dd` |

In 2.39.6 the month is zero-based (January is `00`) and the day is the day of the week (`00` for
Sunday to `06` for Saturday), not the day of the month. On Tuesday 29 September 2026, `date` is
`2026/08/02`. A fix is proposed in pull request #93 and is not released yet; until then, compute
dates in your own code and publish them as a source.

## Merging

When a source is published under an id that already exists, the `mergeType` of the new data decides
what happens. `MergeType` is numeric:

| Value | Name | Effect |
|---|---|---|
| `0` | replace | the new rows replace all existing rows (default) |
| `1` | append | the new rows are merged into the existing rows |

The enum is also available as `basiscore.MergeType.replace` and `basiscore.MergeType.append`. Pass the
number or the enum member, never the string `"append"`: a string is kept as the merge type, matches
neither value, and the repository is left unchanged.

### Append without a key

If either the existing source or the new data has no `keyFieldName`, append adds the new rows to the
end.

```js
$bc.setSource("ui.log", [{ text: "Started" }]);
$bc.setSource("ui.log", [{ text: "Saved" }], { mergeType: 1 });
// ui.log now has two rows
```

### Append with a key and a status

When both the existing source and the new data have a `keyFieldName`, each new row is processed by its
status. The status values are numbers:

| Status | Meaning |
|---|---|
| `0` | added: the row is appended |
| `1` | edited: the row with the same key is replaced |
| `2` | deleted: the row with the same key is removed |

The status names are not exported; use the numbers. Without `statusFieldName`, every row counts as
added. With `statusFieldName`, a row whose status is missing or not one of these values is ignored,
and an edited or deleted row whose key is not found is ignored.

```js
const opts = { mergeType: 1, keyFieldName: "id", statusFieldName: "status" };

// create the source with its key, so later appends can match rows
$bc.setSource("shop.cart", [{ id: 1, name: "Pen", qty: 2 }], {
  keyFieldName: "id",
  statusFieldName: "status",
});

$bc.setSource("shop.cart", [
  { id: 1, name: "Pen", qty: 3, status: 1 }, // edit row 1
  { id: 2, name: "Ink", qty: 1, status: 0 }, // add row 2
], opts);

$bc.setSource("shop.cart", [{ id: 1, status: 2 }], opts); // delete row 1
```

The key comes from the existing source's options, so set `keyFieldName` when the source is first
created (in `host.sources` or in the first `setSource` call). Replacing a source also replaces its
options, so a replace without `keyFieldName` removes the key.

## Publishing from page elements

Any element with `bc-triggers` publishes a source when one of the listed DOM events fires.

```html
<input type="text" name="filter.keyword" bc-triggers="keyup change" />
<select name="filter.status" bc-triggers="change">
  <option value="all">All</option>
  <option value="open">Open</option>
</select>
<button type="button" bc-triggers="click" bc-name="ui.clicks" bc-value="clicked" bc-merge="append">
  Log click
</button>
```

| Attribute | Meaning |
|---|---|
| `bc-triggers` | space-separated DOM event names |
| `bc-name` | source id; falls back to `name` |
| `bc-value` | value to publish; falls back to the element's value |
| `bc-off-value` | value of an unchecked checkbox (default `off`) |
| `bc-merge` | `replace` or `append` (here the name is used, not the number) |
| `bc-keyField`, `bc-statusField` | key and status column names for appending |

The element publishes its value as a scalar, so `filter.keyword` holds one row `{ value: "..." }` and
is read as `[##filter.keyword.value##]`. It publishes only when one of its events fires, not when the
page loads, and it calls `preventDefault()` on the event.

## Reacting to sources

**`datamembername`** names the source a rendering command displays. The command renders when the page
starts if the source already exists, and again every time the source is published.

**`triggers`** is a space-separated list of additional source ids. It works on every command. When one
of them is published, the command runs again; a rendering command re-renders its own
`datamembername` source. This is how a command reacts to a value that only appears in its attributes
or in a face filter:

```html
<input type="number" name="filter.max" bc-triggers="change" />

<basis core="print" datamembername="shop.products" triggers="filter.max" run="atclient">
  <face filter="price <= [##filter.max.value|(1000000)##]"><p>@name@: @price@</p></face>
  <else-layout><p>Nothing in this price range.</p></else-layout>
</basis>
```

`callback` runs a global function each time one of its `triggers` is published. When the page
starts, it also runs once for each of its `triggers` sources that already exists.

```html
<basis core="callback" triggers="shop.cart" method="onCartChanged" run="atclient"></basis>
<script>
  function onCartChanged(args) {
    console.log(args.source.id, args.source.rows.length);
  }
</script>
```

Page text and attributes that contain tokens subscribe to their sources automatically; see
[binding.md](binding.md).

A rendering command that is still busy rendering ignores triggers that arrive in the meantime.
Publish a final state rather than a rapid series of partial updates.

## Controlling when a command runs

**`if`** is evaluated before every run. Its value, after tokens are replaced, is run as a JavaScript
expression; when it is false the command does not run, and for most commands the output of the
previous run stays on the page. Tokens are inserted without quotes, so quote string values yourself:

```html
<basis core="print" datamembername="shop.orders" run="atclient"
       if="'[##cms.query.tab|(orders)##]' == 'orders'">
  <face><p>@id@</p></face>
</basis>
```

**`ignoreNullSource="true"`** skips the run at page start. The command runs only when one of its
sources is published.

## Common mistakes

- Using a one-part id such as `products`. Tokens need `name.member`.
- Passing `mergeType: "append"` in JavaScript options. Use `1` or `basiscore.MergeType.append`.
- Referring to `basiscore.DataStatus`. It is not exported; use `0`, `1` and `2`.
- Using `{ rows: [...] }` in `host.sources`. The property is `data`.
- Creating a source without `keyFieldName` and later appending with a key: rows are added, not merged.
- Setting `statusFieldName` but sending rows without a status: they are ignored.
- Putting source ids in `bc-triggers`. It takes DOM event names; source ids go in `triggers`.
- Putting `bc-triggers="click"` on a link or submit button and expecting navigation or submission.
- Relying on `cms.cms.date` in 2.39.6.
