# inlinesource

`inlinesource` creates new sources from sources that already exist in the context, entirely in the
browser. Each `<member>` describes one derived source: either a SQL statement (`format="sql"`) that
can read several published sources as tables, or a declarative two-source join
(`format="join"`). The member waits until its input sources are published, runs the query with
AlaSQL, and publishes the result as `<name>.<member>`. Use it to join, filter, aggregate or
reshape data before a rendering command consumes it, without writing JavaScript. It needs AlaSQL,
so `dbLibPath` must point to `alasql.min.js` or the `alasql` global must already be loaded (see
[Client-side SQL](../client-side-sql.md)).

## How an inlinesource runs

1. `initializeAsync` reads `name`.
2. `runAsync` converts every `<member>` child to a member object with `SourceUtil.ConvertToMember`,
   which looks at `format` (case-insensitive): `join` creates a `JoinMember`, `sql` a `SqlMember`.
   Any other value, or a missing `format`, returns `null`; the command then immediately calls
   `AddDataSourceExAsync` on that `null` and a `TypeError` is thrown. There is no silent skip.
3. Each member's `ParseDataAsync` waits for its input sources with
   `context.waitToGetSourceAsync(id)`. This never times out: a source that is never published
   leaves the member pending forever.
4. The query runs through the AlaSQL library obtained from `context.getOrLoadDbLibAsync()`.
5. The result rows go through `postsql`, then `sort`, then a `rownumber` column is added, and the
   source `<name>.<member>` (lower case) is published with default options (`mergeType` replace,
   no key or status field). All members run in parallel (`Promise.all`).

`inlinesource` has `Priority.normal` and `allowMultiProcess = true`. It runs once in the normal
wave of the initial processing and again for every source listed in `triggers`. It does **not**
re-run by itself when one of its input sources changes later; list the inputs in `triggers` if
the derived source must follow them.

## Attributes of the command

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | string | | Must be `inlinesource`. |
| `run` | string | | Must be `atclient`. |
| `name` | string | | Prefix of the published source ids. |
| `triggers` | string | | Space separated source ids that re-run the command. Use it to recompute when inputs change. |
| `events` | string | | DOM, window, document or timer events that re-run the command. |
| `if` | string | | JavaScript expression evaluated before every run. |
| `ignoreNullSource` | boolean | `false` | When `true`, the initial run (no incoming source) is skipped. |
| `OnRendering`, `OnRendered` | string | | Global function names called around every run. |

`OnProcessing` and `OnProcessed` have no effect on `inlinesource`.

## Attributes common to every `<member>`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | string | | Second part of the published source id. |
| `format` | string | | `sql` or `join` (case-insensitive). Required; anything else throws. |
| `preview` | boolean | `false` | Dump the published source to the console. |
| `sort` | string | | `ORDER BY` clause applied to the result: `SELECT * FROM ? order by <sort>`. |
| `postsql` | string | | SQL applied to the result; `[<name>.<member>]` is replaced by `?`. |

## `format="sql"` members

The text content of the member is the SQL statement. It is a string token, so `[##…##]` tokens
inside it are resolved before anything else happens.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `datamembername` | string | | Comma separated list of the source ids the statement reads. When present, exactly these sources are awaited. |

When `datamembername` is absent the member scans the resolved SQL with the regular expression
`\[([^\]]+)\]` and treats **every** bracketed identifier as a source id. That works when only table
names are bracketed (`SELECT id, name FROM [db.data1]`); it does not work when columns are bracketed
too (`SELECT [name] FROM [db.data1]` waits for a source called `name` forever).

Execution:

```js
var db = new lib.Database();              // a fresh in-memory AlaSQL database per run
db.exec(`CREATE TABLE [${source.id}]`);   // one table per awaited source
db.tables[source.id].data = source.rows;  // the table shares the source's row array
return db.exec(sql);                      // the rows of the SELECT become the member's data
```

Table names are therefore the full lower-cased source ids, written in brackets because they
contain dots: `[db.data1]`, `[cms.query]`, `[book.list]`. The table `data` is the same array
object as the source's `rows`, so `UPDATE`, `DELETE` or `INSERT` statements change the input
source in place; keep the statement a `SELECT`.

## `format="join"` members

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `lefttblcol` | string | | `source.member.column` of the left side: the first two parts are the source id, the third the join column. |
| `righttblcol` | string | | Same for the right side. |
| `jointype` | string | | `innerjoin`, `leftjoin` or `rightjoin` (case-insensitive). Any other value produces a plain `JOIN`. Required in practice: the code falls back to `innerjoin` only when the attribute is present but resolves to nothing; an absent attribute throws `TypeError: Cannot read properties of undefined (reading 'getValueAsync')`. |

Both column references are split with `split(".", 3)`. Fewer than three parts throws
`InvalidPropertyValueException` (`LeftDataMember` or `RightTableColumn`); parts beyond the third
are dropped silently. The member waits for both sources, then builds and runs:

```sql
SELECT ltbl.[id] AS [db_data1_id], ltbl.[name] AS [db_data1_name],
       rtbl.[studentid] AS [db_data2_studentid], rtbl.[mark] AS [db_data2_mark]
FROM ? AS ltbl LEFT JOIN ? AS rtbl ON ltbl.id = rtbl.studentid
```

- Output columns are named `<source>_<member>_<field>`, so the two sides can never collide and
  templates must use the prefixed names (`@db_data1_name@`, not `@name@`).
- The column list of each side is taken from the **first row** of that source and `rownumber` is
  left out. A side with no rows contributes no columns at all (the shipped
  `inlinesource/empty-source` example right-joins an empty left source and only gets the right
  columns).
- The `ON` clause uses the raw column names without brackets.

## Examples

### Join two sources published from JavaScript

From `example/component/source/inlinesource/simple/index.html`.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body>
  <basis core="inlinesource" name="list" run="atclient">
    <member name="star" format="join" jointype="leftjoin"
            lefttblcol="db.data1.id" righttblcol="db.data2.studentid"></member>
  </basis>

  <basis core="print" datamembername="list.star" run="atclient">
    <layout><ul>@child</ul></layout>
    <face><li>@db_data1_name@: @(db_data2_mark??'no-mark')@</li></face>
  </basis>

  <basis core="callback" run="atclient" triggers="list.star"></basis>

  <script>
    var host = { dbLibPath: "/alasql.min.js" };
    $bc.setSource("db.data1", [
      { id: 1, name: "ali" },
      { id: 2, name: "reza" },
      { id: 3, name: "mohamad" }
    ]);
    $bc.setSource("db.data2", [
      { studentid: 1, mark: "20" },
      { studentid: 1, mark: "19" },
      { studentid: 2, mark: "13" }
    ]);
  </script>
</body>
</html>
```

The published rows have the columns `db_data1_id`, `db_data1_name`, `db_data2_studentid`,
`db_data2_mark` and `rownumber`. A left row without a match has no `db_data2_*` values, so the
face uses a JavaScript expression as fallback; face expressions have no `|(default)` syntax and
may not contain spaces (see [Binding and tokens](../binding-and-tokens.md)).

### SQL over several sources

```html
<basis core="inlinesource" name="report" run="atclient">
  <member name="marks" format="sql" sort="total desc">
    SELECT s.name, COUNT(m.mark) AS exams, SUM(CAST(m.mark AS INT)) AS total
    FROM [db.data1] AS s
    LEFT JOIN [db.data2] AS m ON m.studentid = s.id
    GROUP BY s.name
  </member>
</basis>

<basis core="print" datamembername="report.marks" run="atclient">
  <layout><table><tbody>@child</tbody></table></layout>
  <face><tr><td>@rownumber@</td><td>@name@</td><td>@exams@</td><td>@total@</td></tr></face>
</basis>
```

Only the table names are bracketed, so auto-detection finds exactly `db.data1` and `db.data2`.

### Bracketed columns with an explicit `datamembername`

```html
<basis core="inlinesource" name="catalog" run="atclient">
  <member name="expensive" format="sql" datamembername="book.list">
    SELECT [id], [BookName], [Price] FROM [book.list] WHERE [Price] > 10000
  </member>
</basis>
```

Without `datamembername` this member would wait for sources named `id`, `BookName` and `Price`.

### Recomputing when an input changes

```html
<input name="filter.name" bc-triggers="keyup" />

<basis core="inlinesource" name="view" run="atclient" triggers="filter.name">
  <member name="rows" format="sql" datamembername="db.data1">
    SELECT * FROM [db.data1] WHERE name LIKE '%[##filter.name.value|()##]%'
  </member>
</basis>

<basis core="print" datamembername="view.rows" run="atclient">
  <face><div>@name@</div></face>
</basis>
```

The token inside the SQL is resolved on every run; `triggers="filter.name"` makes the command run
again on every key press. Without `triggers` the statement would be evaluated once.

## Pitfalls

- **A member without `format="sql"` or `format="join"` throws a `TypeError`** (the member object is
  `null`). Because `runAsync` rejects, the rejection is unhandled and, on the initial page
  processing, the low-priority wave with every rendering command does not start.
- **An input that is never published blocks the page the same way.** `waitToGetSourceAsync` has no
  timeout; while the member waits, `runAsync` of the command does not resolve and the rendering
  wave of the initial processing waits with it. Check the ids in `datamembername`, `lefttblcol` and
  `righttblcol` (they are lower-cased for the lookup) and make sure something publishes them.
- **Auto-detection brackets everything.** Any `[x]` in the SQL is a source id when
  `datamembername` is absent. Bracket only table names, or list the sources explicitly.
- **No spaces in `datamembername`.** The value is split on `,` without trimming, so
  `"a.b, c.d"` waits for `" c.d"`, which never exists.
- **Derived sources do not follow their inputs.** Publish `db.data1` again and `list.star` keeps
  its old rows unless `db.data1` is in `triggers`.
- **`jointype` must be written.** A join member without the attribute throws a `TypeError`
  (`Cannot read properties of undefined (reading 'getValueAsync')`) before it waits for anything,
  and the rejection blocks the rendering wave like a missing `format` does.
- **Join output columns are renamed** to `<source>_<member>_<field>`; templates written for the
  original names render empty values.
- **Join columns come from the first row.** Sources whose first row lacks a property, or that are
  empty, lose those columns in the output.
- **`postsql` must name the full id** (`[list.star]`, lower case); a different name is passed to
  AlaSQL unchanged and fails.
- **Published options are always the defaults** (`mergeType` replace): `inlinesource` passes no
  options to `addDataSourceAsync`, so appended inputs produce a replaced output.
- **The SQL table shares the source array.** Mutating statements change the input source's rows.

## Related

- [Client-side SQL](../client-side-sql.md) - AlaSQL loading, dialect notes, `sort`/`postsql`
- [dbsource](dbsource.md) - loading sources from a connection
- [api](api.md) - loading sources from a REST endpoint
- [Sources and reactivity](../sources-and-reactivity.md) - how sources are published and awaited
- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md) - `triggers`, `events`, `if`
- [Binding and tokens](../binding-and-tokens.md) - tokens inside SQL text and attributes
- [JavaScript API](../javascript-api.md) - `$bc.setSource`

## Source files

- `src/component/source/InlineSourceComponent.ts`
- `src/component/source/SourceUtil.ts`
- `src/component/source/MemberBaseSourceComponent.ts`
- `src/component/source/base/InMemoryMember.ts`
- `src/component/source/base/SqlMember.ts`
- `src/component/source/base/JoinMember.ts`
- `src/component/source/base/Member.ts`
- `src/enum.ts` (`JoinType`)
- `src/context/Context.ts` (`waitToGetSourceAsync`)
- `src/context/RootContext.ts` (`getOrLoadDbLibAsync`)
