# Client-side SQL

BasisCore.js uses [AlaSQL](https://github.com/AlaSQL/alasql) to filter, sort, join and reshape
sources in the browser. AlaSQL is not part of the BasisCore.js bundle; it is loaded the first time a
feature needs it.

Sources, their ids and how they are published are described in
[sources-and-triggers.md](sources-and-triggers.md).

## Loading AlaSQL

When a feature needs AlaSQL, BasisCore.js uses the global `alasql` if the page already has one.
Otherwise it adds a `<script>` tag for `host.dbLibPath` and waits for it to load. The default path is
`/alasql.min.js`, relative to the site root.

```html
<script>
  var host = {
    dbLibPath: "/assets/vendor/alasql.min.js",
  };
</script>
```

If `dbLibPath` is set to an empty value and no global `alasql` exists, the feature fails with
`Error in load 'alasql'. 'DbLibPath' not configure properly in host object.` If the file cannot be
loaded, the feature fails with the script's load error.

These features need AlaSQL:

| Feature | Where |
|---|---|
| `filter` on a `<face>` | rendering commands; see [binding.md](binding.md) |
| `sort` and `postsql` on a `<member>` | `dbsource` and `inlinesource` |
| `format="join"` and `format="sql"` members | `inlinesource` |
| `sortAsync`, `filterAsync` with a condition, `runSqlAsync` | `$bc.util.source` |
| `LocalDataBase` | needs a global `alasql`; it does not load the library itself |

## Sorting and reshaping a member

`<member>` elements of `dbsource` and `inlinesource` accept two attributes that post-process their
rows before the source is published:

| Attribute | Value |
|---|---|
| `postsql` | a full AlaSQL query; `[<source id>]` stands for the member's rows |
| `sort` | the text of an `ORDER BY` clause |

The source id of a member is `<command name>.<member name>` in lower case. `postsql` runs first, then
`sort`, and then every row receives a `rownumber` column counting from 1. `rownumber` therefore cannot
be used in `postsql` or `sort`.

```html
<basis core="dbsource" source="main" name="shop" run="atclient">
  <member name="products"
          postsql="SELECT id, name, price FROM [shop.products] WHERE inStock = 1"
          sort="price desc"></member>
</basis>
```

Both attributes accept tokens, for example `sort="[##ui.sort.value|(name)##]"`. The connection named
in `source` is configured as described in [connections.md](connections.md).

## Combining sources with inlinesource

`inlinesource` builds new sources from sources that already exist on the page. Each `<member>` must
have `format="join"` or `format="sql"`; a member without one of these formats stops the command with
an error. Rows cannot be written inline.

Write every `<member>` with an explicit closing tag. The browser does not treat `<member ... />` as
self-closing, so the following members would end up inside it.

An `inlinesource` runs once when the page starts. Each member waits until every source it reads has
been published, and rendering commands on the page start only after that. To recompute the members
when their inputs change, list the inputs in `triggers`.

### Join members

```html
<basis core="inlinesource" name="report" triggers="shop.orders shop.customers" run="atclient">
  <member name="orders" format="join" jointype="leftjoin"
          lefttblcol="shop.orders.customerId"
          righttblcol="shop.customers.id"></member>
</basis>

<basis core="print" datamembername="report.orders" run="atclient">
  <face><p>Order @shop_orders_id@: @shop_customers_name??'unknown'@</p></face>
</basis>
```

| Attribute | Value |
|---|---|
| `jointype` | required: `innerjoin`, `leftjoin` or `rightjoin` |
| `lefttblcol` | `source.member.column` of the left side |
| `righttblcol` | `source.member.column` of the right side |

Both column references must have exactly three parts, and the column name cannot contain a dot. The
join matches rows where the left column equals the right column.

Every output column is renamed to `<source>_<member>_<column>`, using the source and member exactly
as written in `lefttblcol` and `righttblcol`. In the example, `shop.orders` has the columns `id`,
`customerId` and `total`, so the result has `shop_orders_id`, `shop_orders_customerId`,
`shop_orders_total`, `shop_customers_id` and `shop_customers_name`. The column list is taken from
the first row of each source, so a source with no rows contributes no columns, and a `rownumber`
column of an input is left out.

### SQL members

A member with `format="sql"` runs the query in its body. Each source it reads becomes a table named
after the source id in square brackets.

```html
<basis core="inlinesource" name="report" triggers="shop.orders shop.customers" run="atclient">
  <member name="totals" format="sql" sort="total desc">
    SELECT c.name AS name, SUM(o.total) AS total
    FROM [shop.orders] AS o
    JOIN [shop.customers] AS c ON o.customerId = c.id
    GROUP BY c.name
  </member>
</basis>

<basis core="print" datamembername="report.totals" run="atclient">
  <face><p>@name@: @total@</p></face>
</basis>
```

The sources to load are found by collecting every name in square brackets in the query. Do not use
square brackets for anything else, such as quoting a column name: the member would wait for a source
of that name. Alternatively, list the sources in `datamembername`, separated by commas without spaces:
`datamembername="shop.orders,shop.customers"`.

Write table names in lower case, as source ids are stored. The body may contain tokens such as
`[##cms.query.year|(2026)##]`; they are replaced before the query runs. Put spaces around `<` in the
body so the browser does not read it as the start of a tag.

## `$bc.util.source` helpers

These helpers work on a source object in your own code. They do not publish anything; pass the result
to `$bc.setSource` if other commands should see it.

| Method | Returns |
|---|---|
| `sortAsync(source, orderBy, context)` | a new source with the same id and options, rows ordered by the `ORDER BY` text |
| `filterAsync(source, where, context)` | an array of the rows matching the `WHERE` text; all rows when `where` is empty |
| `runSqlAsync(source, sql, context)` | a new source with the same id and options, holding the query result; `[<source id>]` in the query stands for the source's rows |

A `callback` command provides both the source and the context:

```html
<basis core="callback" triggers="shop.orders" method="summariseOrders" run="atclient"></basis>
<script>
  async function summariseOrders(args) {
    const result = await $bc.util.source.runSqlAsync(
      args.source,
      "SELECT customerId, SUM(total) AS total FROM [shop.orders] GROUP BY customerId",
      args.context
    );
    $bc.setSource("shop.ordertotals", result.rows);

    const large = await $bc.util.source.filterAsync(args.source, "total > 100", args.context);
    console.log(large.length + " large orders");
  }
</script>
```

## Local databases

`LocalDataBase` keeps an AlaSQL database in `localStorage`. It is exported by the library as
`basiscore.LocalDataBase` (it is not a member of `$bc`) and uses the global `alasql`, so load AlaSQL
with a script tag before using it.

```html
<script src="/alasql.min.js"></script>
<script>
  const notes = new basiscore.LocalDataBase("notesdb", () =>
    new Map([["notes", { id: "INT", text: "STRING" }]])
  );

  async function addNote(id, text) {
    await notes.executeAsync("INSERT INTO notes VALUES (?, ?)", [id, text]);
    const rows = await notes.executeAsync("SELECT * FROM notes");
    $bc.setSource("app.notes", rows);
  }
</script>
```

The constructor takes the database name and a function returning a `Map` from table name to a
`{ column: type }` object. Those tables are created only when the database is first created in the
browser; later changes to the function are not applied to an existing database.

| Method | Returns |
|---|---|
| `executeAsync(sql, params?)` | the AlaSQL result of the statement |
| `executeAsTableAsync(sql, params?)` | an array whose first item is the list of column names, followed by one array of values per row |
| `dropAsync()` | `true` when the database was dropped |

A `LocalDataBase` is independent of the source repository; publish its rows yourself, as above.

## Common mistakes

- Serving the page without `/alasql.min.js` and without setting `dbLibPath`: face filters, `sort`
  and `postsql` fail on first use.
- Omitting `jointype` on a join member. There is no default.
- Writing `lefttblcol="orders.customerId"`. The reference needs `source.member.column`.
- Reading join output by the original column names instead of `<source>_<member>_<column>`.
- Writing JSON rows inside an `inlinesource` member. Publish them with `$bc.setSource` or
  `host.sources` instead.
- Using `rownumber` in `postsql` or `sort`.
- Calling `new $bc.LocalDataBase(...)`, or creating a `LocalDataBase` before AlaSQL is loaded.
