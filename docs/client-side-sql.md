# Client-side SQL

BasisCore Client runs SQL in the browser with [AlaSQL](https://github.com/AlaSQL/alasql), an
in-memory JavaScript SQL engine that treats arrays of objects as tables. The library does not
bundle AlaSQL; it loads `alasql.min.js` on demand from `host.dbLibPath`, or uses an `alasql`
global that the page has already loaded. SQL is used in five places: face `filter` attributes,
`sort` and `postsql` on `<member>` elements, the `sql` and `join` members of `inlinesource`, the
`$bc.util.source` helpers, and the `LocalDataBase` class for localStorage-backed tables. This page
explains how the engine is loaded, what each feature sends to it, the parts of the AlaSQL dialect
that matter here, and the column-array table format shared by `LocalDataBase` and the `local`
connection provider.

## Loading AlaSQL

Every SQL feature except `LocalDataBase` obtains the engine through
`context.getOrLoadDbLibAsync()` (`RootContext`; a `LocalContext` delegates to its owner):

```ts
async getOrLoadDbLibAsync(): Promise<any> {
  if (typeof alasql === "undefined") {
    if (Util.IsNullOrEmpty(this.options.dbLibPath)) {
      throw new ClientException(
        `Error in load 'alasql'. 'DbLibPath' not configure properly in host object.`);
    }
    return await $bc.util.getLibAsync("alasql", this.options.dbLibPath);
  }
  return alasql;
}
```

- If a global `alasql` exists (your own `<script>` tag or bundle), it is used as-is and
  `dbLibPath` is never read.
- Otherwise `$bc.util.getLibAsync("alasql", dbLibPath)` looks for an existing
  `<script src="<dbLibPath>">`, appends one to `<head>` if there is none, waits for its `load`
  event and resolves with the `alasql` global. A `load` error rejects.
- `dbLibPath` defaults to `/alasql.min.js`. The dev server (`npm run dev`) serves
  `node_modules/alasql/dist` at the site root, so the default works there; a deployment must
  copy the file or set `dbLibPath` (any URL). The repository depends on AlaSQL `^1.7.3`.
- Nothing is loaded eagerly: a page without SQL features never requests the script.

The returned object is the `alasql` function itself: `alasql(sql, params)` runs a statement,
`alasql.Database` creates isolated databases, `alasql.databases` lists attached ones.

## Which features need it

| Feature | Statement sent to AlaSQL | Page |
| --- | --- | --- |
| `<face filter="…">` on `print`, `list`, `view`, `tree` | `SELECT * FROM ? [<source id>] where <filter>` | [print](commands/print.md), [list](commands/list.md), [view](commands/view.md), [tree](commands/tree.md) |
| `<member sort="…">` (`dbsource`, `inlinesource`) | `SELECT * FROM ? order by <sort>` | [dbsource](commands/dbsource.md), [inlinesource](commands/inlinesource.md) |
| `<member postsql="…">` | `<postsql>` with `[<name>.<member>]` replaced by `?` | same |
| `<member format="sql">` | the member text, against a `new alasql.Database()` with one table per source | [inlinesource](commands/inlinesource.md) |
| `<member format="join">` | a generated `SELECT … FROM ? AS ltbl <JOIN> ? AS rtbl ON …` | [inlinesource](commands/inlinesource.md) |
| `$bc.util.source.sortAsync / filterAsync / runSqlAsync` | see below | [JavaScript API](javascript-api.md) |
| `LocalDataBase` | your statements, against a `localStorage` database | below |

A `print`, `list`, `view` or `tree` without `filter` attributes, and a `dbsource` without `sort`
or `postsql`, never touch AlaSQL.

## Dialect notes that matter here

- **`?` parameters.** `alasql("SELECT * FROM ?", [rows])` binds the array `rows` to the first
  `?`. The library always passes source rows this way; the rows are used directly, not copied.
- **Bracketed identifiers.** `[book.list]` or `[Price]` quote a name. Source ids contain dots, so a
  table named after a source id must be bracketed; column names with spaces or reserved words must
  be too.
- **Table alias after `?`.** `SELECT * FROM ? [book.list] WHERE …` names the parameter table
  `book.list`, so a filter may write `[book.list].Price > 100`.
- **Column names are JavaScript property names.** `Price` and `price` are different columns;
  keywords (`select`, `order by`) are case-insensitive.
- **Result shape.** A `SELECT` returns an array of plain objects; the library adds `rownumber`
  to member results afterwards, so `rownumber` is not available inside `sort`, `postsql` or a
  `sql` member's statement, only in the published source.
- **Casts.** Values keep their JavaScript types; strings that look like numbers compare as
  strings unless cast (`CAST([Price] AS INT)`).

## Face filters

`RawFaceCollection.processAsync` evaluates the `filter` token of every `<face>` and, when it is
not empty, calls `$bc.util.source.filterAsync(source, filter, context)`:

```ts
lib(`SELECT * FROM ? [${source.id}] where ${filter}`, [source.rows]);
```

So `filter` is a `WHERE` expression, nothing more. The faces of one command share the source but
each runs its own query, and a face without `filter` gets all rows. The attribute is a token, so
`filter="name like '%[##demo.filter-name.value|()##]%'"` filters with a bound value; the value is
pasted into the SQL text, so quote it and expect quotes inside the value to break the statement.

## Member `sort` and `postsql`

`Member.addDataSourceAsync` applies, in this order, to the rows of every member result of
`dbsource` and `inlinesource` (for streaming connections: to every envelope received):

1. `postsql`: `lib(Util.ReplaceEx(postSql, "\\[<name>.<member>\\]", "?"), [rows])`. The
   replacement is a case-insensitive regular expression over the full lower-cased source id, so
   `[Book.List]` and `[book.list]` both become `?`; a different name is left in the statement and
   AlaSQL fails on it.
2. `sort`: `lib("SELECT * FROM ? order by " + sort, [rows])`.
3. `DataUtil.addRowNumber(rows)`: `rownumber` 1..n in the final order.
4. `context.setSource(new Source(id, rows, options), preview)`.

The engine is fetched once per member run even when both attributes are set.

## `inlinesource` members

`format="sql"` creates a fresh `new lib.Database()`, runs `CREATE TABLE [<source id>]` for every
awaited source and assigns `source.rows` to `db.tables[id].data` (same array, so writes mutate
the source), then returns `db.exec(sql)`. `format="join"` runs one generated statement with the two
row arrays as `?` parameters and prefixes every output column with `<source>_<member>_`. Details,
including the bracket auto-detection of source ids, are in [inlinesource](commands/inlinesource.md).

## `$bc.util.source` helpers

`$bc.util.source` is a `SourceWrapper`. All helpers need the `context` (available as
`args.context` in every hook and callback) because that is where `getOrLoadDbLibAsync` lives.

| Method | Returns | Statement |
| --- | --- | --- |
| `sortAsync(source, sort, context)` | `Promise<ISource>` with the same id and cloned options | `SELECT * FROM ? order by <sort>` |
| `filterAsync(source, filter, context)` | `Promise<any[]>` (rows only); the unfiltered `source.rows` when `filter` is empty | `SELECT * FROM ? [<id>] where <filter>` |
| `runSqlAsync(source, sql, context)` | `Promise<ISource>` with the same id and cloned options | `<sql>` with `[<id>]` replaced by `?` |
| `data(id, rows, options?)` | `Data` | none; builds the object `api`'s `OnProcessed` expects |
| `isNullOrEmpty(value)` | `boolean` | none |

`runSqlAsync` works on one source: the only parameter is that source's rows, so the statement
can reference `[<id>]` (or `?`) once. The shipped `dbsource/web-socket/list` example uses it in an
`OnProcessing` hook of `print` to filter and sort a streaming source before rendering:

```js
async function manipulation(args) {
  const sql = `select * from ? ${wherePart ?? ""} ${orderPart ?? ""}`;
  args.source = await $bc.util.source.runSqlAsync(args.source, sql, args.context);
}
```

## `LocalDataBase`

`LocalDataBase` (exported as `basiscore.LocalDataBase` from the bundle; `basiscore` is the
webpack library name assigned on `window`) wraps an AlaSQL `localStorage` database so that tables
survive page loads. It is not used by any command; it is a utility for your own code.

```ts
class LocalDataBase implements IDatabase {
  constructor(databaseName: string, getSchemas: () => Map<string, any>);
  executeAsync<T>(sql: string, params?: any): Promise<T>;
  executeAsTableAsync(sql: string, params?: any): Promise<any[]>;
  dropAsync(): Promise<boolean>;
}
```

- `getSchemas` returns a `Map` from table name to a schema object whose keys are column names and
  whose values are AlaSQL column types, for example `{ id: "INT", name: "STRING" }`.
- The database is initialised lazily on the first `executeAsync`:
  `CREATE localStorage DATABASE IF NOT EXISTS <name>`, then `ATTACH localStorage DATABASE <name>`,
  then `this._db = alasql.databases[<name>]`. Only when the `CREATE` reports `1` (the database did
  not exist yet) are the tables created with `CREATE TABLE IF NOT EXISTS <table> (<col type>, …)`.
  Changing the schema later has no effect on an existing database; call `dropAsync()` first or use
  a new name.
- `executeAsync` runs `this._db.exec(sql, params, callback)` and resolves with the callback's
  result (rows for `SELECT`, affected count for writes).
- `executeAsTableAsync` returns `[[col1, col2, …], [v1, v2, …], …]`: a header row of the first
  row's property names followed by one array per row. With no rows it returns `[[]]`.
- `dropAsync` runs `DROP localStorage DATABASE <name>`, forgets the handle and returns `true` when
  one database was dropped.

`LocalDataBase` reads the `alasql` global directly and does **not** call `getOrLoadDbLibAsync`;
if the script has not been loaded yet, the first call throws `ReferenceError: alasql is not
defined`. Load it first with a `<script>` tag or with
`await $bc.util.getLibAsync("alasql", "/alasql.min.js")`.

## The column-array table format and the `local` connection

The `local` connection provider (`connection.local.<name>` in `host.settings`, configured as
`"<script url>|<function name>"` or `{ Url, Function }`) loads the named global function with
`getLibAsync` and, for every `dbsource` that uses the connection, calls it with the parameters
`{ command, dmnid }`. The function returns, directly or as a promise, an object in the format that
`ConnectionOptions.ConvertObject` understands:

```json
{
  "_": { "any": "settings, ignored by the loader" },
  "list": [
    ["id", "name", "age"],
    [1, "ali", 30],
    [2, "reza", 25]
  ],
  "summary": [
    ["count"],
    [2]
  ]
}
```

- The key `_` is read into `ParsedData.Setting` and not used further.
- Every other key is a table: an array whose first element is the array of column names and whose
  remaining elements are rows as arrays. `ConvertObject` `shift()`s the header out of the array
  (mutating the object you returned) and builds one object per row.
- Tables are converted in property order and mapped onto the `<member>` elements of the `dbsource`
  **by position**; the keys are not matched against member names. No options are carried, so the
  published sources use `mergeType` replace.

`executeAsTableAsync` produces exactly this table shape, which makes a `LocalDataBase` a natural
backing store for a `local` connection (see the last example).

## Examples

### Face filter with a bound value

```html
<input name="demo.filter-name" bc-triggers="keyup" />

<basis core="list" datamembername="local.print" run="atclient" triggers="demo.filter-name">
  <layout><div>@child</div></layout>
  <face filter="name like '%[##demo.filter-name.value|()##]%'">
    <span>@id@ (@name@)</span>
  </face>
  <else-layout>empty</else-layout>
</basis>

<script>
  var host = { dbLibPath: "/alasql.min.js" };
  $bc.setSource("local.print", [
    { id: 1, name: "ali" }, { id: 2, name: "reza" }, { id: 3, name: "mohamad" }
  ]);
</script>
```

### `sort` and `postsql` on a dbsource member

```html
<basis core="dbsource" source="bookapi" name="book" run="atclient">
  <member name="list" postsql="SELECT * FROM [book.list] WHERE [Price] > 10000" sort="[Price] desc"></member>
  <member name="type" sort="Name"></member>
</basis>

<script>
  var host = {
    dbLibPath: "/alasql.min.js",
    settings: { "connection.web.bookapi": "data/book.json", "default.source.verb": "GET" }
  };
</script>
```

### SQL over published sources

```html
<basis core="inlinesource" name="report" run="atclient">
  <member name="avg" format="sql">
    SELECT s.name, AVG(CAST(m.mark AS INT)) AS average
    FROM [db.data1] AS s JOIN [db.data2] AS m ON m.studentid = s.id
    GROUP BY s.name
  </member>
</basis>
```

### Running SQL from a hook

```html
<basis core="print" datamembername="user.list" run="atclient" OnProcessing="topFive">
  <face><div>@name@ (@age@)</div></face>
</basis>

<script>
  async function topFive(args) {
    args.source = await $bc.util.source.runSqlAsync(
      args.source,
      "SELECT * FROM [user.list] ORDER BY age DESC LIMIT 5",
      args.context
    );
  }
</script>
```

### A `LocalDataBase` behind a `local` connection

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="/alasql.min.js"></script>
  <script src="/basiscore.js"></script>
</head>
<body>
  <basis core="dbsource" source="localdb" name="notes" run="atclient" triggers="notes.changed">
    <member name="list"></member>
  </basis>

  <basis core="print" datamembername="notes.list" run="atclient">
    <layout><ul>@child</ul></layout>
    <face><li>@rownumber@. @text@</li></face>
  </basis>

  <button name="notes.changed" bc-triggers="click" bc-value="1">Add note</button>

  <script>
    var host = {
      settings: { "connection.local.localdb": "/notes-provider.js|loadNotes" }
    };
  </script>
</body>
</html>
```

`/notes-provider.js`:

```js
const db = new basiscore.LocalDataBase("notesdb", () => {
  const schemas = new Map();
  schemas.set("notes", { id: "INT", text: "STRING" });
  return schemas;
});

async function loadNotes(params) {
  // params = { command: "<basis core=\"dbsource\" …>", dmnid: null }
  const count = await db.executeAsync("SELECT COUNT(*) AS c FROM notes");
  await db.executeAsync("INSERT INTO notes VALUES (?, ?)", [count[0].c + 1, `note ${count[0].c + 1}`]);
  return {
    _: {},
    list: await db.executeAsTableAsync("SELECT id, text FROM notes ORDER BY id")
  };
}
```

AlaSQL is loaded with a `<script>` tag because `LocalDataBase` needs the global before any
command runs; the `dbsource` then uses the same global. Every click re-runs the `dbsource`, which
calls `loadNotes` again and republishes `notes.list`.

## Pitfalls

- **`Error in load 'alasql'. 'DbLibPath' not configure properly in host object.`** means a SQL
  feature ran with `dbLibPath` empty and no `alasql` global. Set `dbLibPath` or load the script.
- **A failing script load rejects every pending SQL feature.** A wrong `dbLibPath` makes
  `getLibAsync` reject; for `dbsource`/`inlinesource` members this surfaces as an unhandled
  rejection.
- **`LocalDataBase` needs the global up front** (`ReferenceError: alasql is not defined`
  otherwise); it ignores `dbLibPath`.
- **`postsql` and `runSqlAsync` replace one exact id.** The pattern is the full lower-cased
  `name.member` (or `source.id`); any other bracketed table name reaches AlaSQL unchanged.
- **`rownumber` does not exist yet** inside `sort`, `postsql`, `sql` members or `filterAsync`; it
  is added to the published source afterwards. Face filters run on published sources, so they can
  use it.
- **Filter and sort values are spliced into SQL text.** Bound values containing quotes break the
  statement; sanitise them before publishing the source.
- **Sorting streaming data is repeated** on every envelope of a websocket or chunk-based
  `dbsource`; keep `sort` and `postsql` cheap there.
- **`ConvertObject` mutates the object returned by a `local` provider** by removing the header
  rows. A provider that returns the same cached object twice loses its header on the second call;
  build a new object per call.
- **Schema changes in `LocalDataBase` are ignored** for an existing database; drop it or rename it.
- **Mutating statements in `sql` members change the input source**, because the table `data` is
  the source's own row array.
- **Column names are case-sensitive**; `[price]` does not read a `Price` column.

## Related

- [inlinesource](commands/inlinesource.md) - `sql` and `join` members in detail
- [dbsource](commands/dbsource.md) - `sort`, `postsql`, the `local` provider from the command's side
- [Connections](connections.md) - `connection.local.<name>` and the other providers
- [Host configuration](host-configuration.md) - `dbLibPath`
- [JavaScript API](javascript-api.md) - `$bc.util.getLibAsync`, `$bc.util.source`, `window.basiscore` exports
- [print](commands/print.md), [list](commands/list.md), [view](commands/view.md), [tree](commands/tree.md) - face `filter`
- [Sources and reactivity](sources-and-reactivity.md) - what the helpers return
- [Troubleshooting](troubleshooting.md)

## Source files

- `src/context/RootContext.ts` (`getOrLoadDbLibAsync`)
- `src/context/LocalContext.ts`
- `src/wrapper/UtilWrapper.ts` (`getLibAsync`)
- `src/wrapper/SourceWrapper.ts`
- `src/wrapper/ISourceWrapper.ts`
- `src/component/renderable/base/RawFaceCollection.ts` (face `filter`)
- `src/component/source/base/Member.ts` (`sort`, `postsql`)
- `src/component/source/base/SqlMember.ts`
- `src/component/source/base/JoinMember.ts`
- `src/data/DataUtil.ts` (`addRowNumber`)
- `src/repository/LocalDataBase.ts`
- `src/repository/IDatabase.ts`
- `src/options/connection-options/LocalStorageConnectionOptions.ts`
- `src/options/connection-options/ConnectionOptions.ts` (`ConvertObject`)
- `src/options/HostOptions.ts` (`dbLibPath` default)
- `src/index.ts` (`LocalDataBase` export)
- `webpack.config.js` (dev server static path for `alasql.min.js`)
