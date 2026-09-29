# Troubleshooting

A checklist for BasisCore.js 2.39.6, organised by what you see. Open the browser console
first: most problems leave a message there, and the table at the end of this page explains
the common ones.

To watch a source while debugging, add a `callback` without a `method`. It prints the
source (object, JSON and a table) every time it changes:

```html
<basis core="callback" run="atclient" triggers="demo.items"></basis>
```

On a `dbsource` member, `preview="true"` prints the member's source the same way.

## Nothing renders

Work through these in order.

**1. The command has no `run="atclient"`.** A `<basis>` element is a client command only
when its `run` attribute equals `atclient` (in any letter case). Without it the library
ignores the element and everything inside it.

```html
<basis core="print" run="atclient" datamembername="demo.items">
  <face><div>@name@</div></face>
</basis>
```

**2. `dataMemberName` does not match the source id.** Source ids are compared in lower
case, so case is not the problem; spelling and structure are:

- a `dbsource` or `inlinesource` named `demo` with `<member name="items">` produces
  `demo.items`;
- `$bc.setSource("demo.items", …)` produces exactly the id you pass;
- an `api` response without a `sources` envelope is stored under its `name` attribute, or
  `cms.api` when there is none.

Look for the log line `<id> Added... <n> Row(s)` to see the id that was really stored.

**3. The source was never stored because `mergeType` is a string.** `mergeType` must be
the number `0` (replace) or `1` (append), or `basiscore.MergeType.replace` /
`basiscore.MergeType.append`. With `{ mergeType: "append" }` the source is not stored,
although the console still prints `Added...`. Note the lower-case enum members:
`basiscore.MergeType.Append` is `undefined` and silently means replace. See
[sources-and-triggers.md](sources-and-triggers.md).

**4. `host` was defined too late or not globally.** The `host` object is read once, the
first time the library needs its settings: at the first `$bc` call that starts an
instance, or on `window` `load`. Define it before that, in a classic (non-module) script
at the top level:

```html
<script>
  var host = {
    settings: {
      "connection.web.main": "https://example.com/data",
      "default.dmnid": "1",
    },
  };
</script>
<script src="basiscore.min.js"></script>
```

A `host` declared inside a function or a `type="module"` script is not seen. Connections
are covered in [connections.md](connections.md).

**5. Automatic rendering was switched off by an early `$bc` call.** The library renders on
`load` only if no instance exists yet. Calling `$bc.setOptions`, `$bc.addFragment`,
`$bc.new()` or reading `$bc.global` before `load` creates one, so nothing runs until you
call `$bc.run()` yourself. `host.autoRender = false` has the same effect by design.

**6. Table rows were dropped by the HTML parser.** The browser removes `<tr>` and `<td>`
that are not inside a table, and moves a `<basis>` element out of a `<table>`, before the
library sees the page. Wrap each template in `<script type="text/template">` as the only
child of `<face>` or `<layout>`:

```html
<basis core="list" run="atclient" datamembername="demo.items">
  <layout>
    <script type="text/template">
      <table><tbody>@child</tbody></table>
    </script>
  </layout>
  <face>
    <script type="text/template">
      <tr><td>@id@</td><td>@name@</td></tr>
    </script>
  </face>
</basis>
```

**7. A face binding swallowed the following markup.** `@name` ends at the next `@` or
whitespace, so `<li>@name</li>` reads the column `name</li>` and fails with
`Error in create binding expression for 'name</li>'`. Write `@name@`. Binding forms are
described in [binding.md](binding.md).

**8. One command failed during start-up.** An exception while commands start stops every
command of that instance. The most common cause is an `events` item with a dot in its
selector, such as `.btn.click`, which ends in a `querySelectorAll` `SyntaxError`. See
[Events do not fire](#events-do-not-fire).

**9. The `if` attribute is false.** `if` is evaluated as JavaScript after bindings are
filled in. A runtime error in the expression counts as false and is not logged; only a
syntax error is logged, as `Error in parse 'if' attribute expression in command: '<expr>'`.

**10. An ancestor has `bc-ignore`.** Elements with `bc-ignore`, and everything inside
them, are skipped.

## `Command 'X' has N member(s) but M result(s) returned from source!`

A `dbsource` expects exactly one result set per `<member>` element, in the same order.
`N` counts every `<member>` inside the command; `M` is the length of the `sources` array
in the response. The server must answer:

```json
{
  "sources": [
    { "options": { "tableName": "items" }, "data": [{ "id": 1, "name": "Alpha" }] }
  ]
}
```

Results are matched to members by position, not by `tableName`. Fix the stored procedure
or remove the extra member. When the named connection does not exist the error is
`In 'host.settings' object, property '<source>' not configured!`; the setting key must be
`connection.<provider>.<source>`, and the connection name itself cannot contain a dot.
See [commands-data.md](commands-data.md) and [connections.md](connections.md).

## The source updates but the view does not

**The command does not subscribe to that source.** A renderer re-runs only for the source
in its `dataMemberName`. Any other source it reads — in `if`, in another attribute, in a
face, or in an `OnProcessing` hook — must be listed in `triggers`:

```html
<basis core="print" run="atclient" datamembername="demo.items"
       if="[##demo.filter.enabled##]" triggers="demo.filter">
  <face><div>@name@</div></face>
</basis>
```

**An existence check without a column never waits.** `[##demo.user##]`, with no column,
evaluates to `true` or `false` immediately. In a command attribute it is read only when
the command runs, so without `triggers="demo.user"` the command keeps the first answer.
With a column, `[##demo.user.name##]` waits until `demo.user` exists (except for `cms.*`
sources), which delays that command instead.

**A code block uses double quotes.** Inside `{{ … }}`, `$bc` is the current context. Text
and attribute bindings re-render automatically only when the block calls
`$bc.waitToGetSourceAsync('id')` or `$bc.tryToGetSource('id')` with **single** quotes:

```html
<span>{{ const s = $bc.tryToGetSource('demo.user'); return s ? s.rows[0].name : ""; }}</span>
```

The same call with `"demo.user"` still returns the value once, but is never refreshed.
Prefer `tryToGetSource` in text and attribute bindings: a `waitToGetSourceAsync` there
holds back the start of every command in the instance until that source exists.

**The update arrived while the command was still rendering.** A renderer that is busy
ignores a new trigger instead of queuing it. If updates arrive in quick bursts, set the
final value after the burst, or merge the data into one `setSource` call.

**The rows were changed in place.** Editing `source.rows` directly notifies nobody. Call
`setSource` with the new data.

**`mergeType` is a string.** See item 3 of [Nothing renders](#nothing-renders).

## GET requests fail, or the server receives `dmnid=null`

In 2.39.6 a `dbsource` sends two parameters: `command` (the command's markup with its
bindings filled in) and `dmnid`. Three problems affect them. Fixes for the first two are proposed
in pull request #93 and are not released yet; the third is a current limitation. Until then use
the workarounds.

- **`dmnid=null`.** `dmnid` comes from `host.settings["default.dmnid"]`, which is empty by
  default. An empty value is sent as the text `null`. Set it explicitly:

  ```js
  var host = { settings: { "default.dmnid": "1" } };
  ```

- **GET with a lower-case verb fails.** For data requests only the exact string `GET`
  puts the parameters in the query string. `"verb": "get"` (or
  `"default.source.verb": "get"`) sends a GET request with a body, which the browser
  rejects before sending. Write the verb in upper case:

  ```js
  var host = {
    settings: {
      "connection.web.main": { url: "https://example.com/data", verb: "GET" },
    },
  };
  ```

- **`call` with `method="get"` sends no parameters.** A GET `call` requests the URL and
  file name only; `pagesize` and the other values are not sent. Use `POST` when the
  server needs them.

With GET the whole `command` markup travels in the URL, so long commands can exceed
server URL limits. POST is the default and avoids this.

## `Can't add fragment for already builded bc object.`

`addFragment` was called on an instance that has already run. The sibling message
`Can't set option for already builded bc object.` has the same cause for `setOptions`.
Usually an earlier `$bc.setSource(...)` or `$bc.run()` started the default instance
first. Configure, then run:

```js
$bc.addFragment("#app").setOptions({ settings: { "default.dmnid": "1" } }).run();
$bc.setSource("demo.items", [{ id: 1, name: "Alpha" }]);
```

For a second, independent area use `$bc.new()`; see
[hooks-and-extensibility.md](hooks-and-extensibility.md).

## `Error in load 'alasql'. 'DbLibPath' not configure properly in host object.`

Face `filter`, member `sort` and `postsql`, `inlinesource` members with `format="sql"` or
`format="join"`, and the `$bc.util.source` query helpers need the alasql library. If
`alasql` is not already on the page, it is loaded from `host.dbLibPath`, which defaults to
`/alasql.min.js`.

- This message means `dbLibPath` is empty. Set it to a URL that serves the file.
- If `dbLibPath` is set but the file is missing, the console shows a failed request for
  that URL and the operation fails without a readable message.

Loading alasql yourself with a `<script>` tag before the library also works. See
[client-side-sql.md](client-side-sql.md).

## A `style_` or `qs_` attribute is ignored

HTML lower-cases attribute names before the library reads them.

- **Chart `style_` attributes.** `style_width`, `style_height` and `style_opacity` work,
  but `style_backgroundColor` becomes `backgroundcolor`, which the chart does not know.
  Put camel-case keys and arrays in `chartStyle`, a JavaScript expression:

  ```html
  <basis core="chart" run="atclient" datamembername="demo.sales" charttype="bar"
         group="month" y="total"
         chartstyle="{ backgroundColor: '#f5f5f5', color: ['#004B85', '#FF7A00'] }"></basis>
  ```

- **Schema `qs_` attributes.** `qs_UserId` is sent as the parameter `userid`. Read the
  parameter in lower case on the server. See [forms-and-schema.md](forms-and-schema.md).

## A `view` shows only the group headers

In 2.39.6 `view` renders each group's level-1 face, but its level-2 rows are not inserted into
`@child`. This is a defect in the library, not in your markup. Use `tree` with a parent row per
group, or nested `print` commands, until it is fixed. See
[commands-rendering.md](commands-rendering.md).

## A chart shows nothing

- `chartType` must be exactly one of `bar`, `stacked`, `line`, `funnel`, `donut`,
  `halfdonut`, in lower case. Anything else throws `Chart type <value> is not supported`.
- `group` names the category or label column for `bar`, `stacked`, `donut`, `halfdonut`
  and `funnel`; `y` names the value column. Without `group` the labels are empty.
- `line` uses `x` and `y`. For text values on the x axis add `isStringLineChart="true"`.
- Boolean options (`legend`, `hover`, `grid`, `axisLabel`, `horizontal`) are on only when
  the value is the text `true`.
- The chart draws only after its `dataMemberName` source exists.

## Events do not fire

`events="<target>.<event>"` is cut at dots: the target is the text before the first dot and
the event is the text up to the second dot.

| You wrote | Result | Write instead |
|---|---|---|
| `.save-btn.click` | empty selector; start-up of the instance stops | `#save.click` or `[data-role='save'].click` |
| `button.primary.click` | listens for an event named `primary` | `button[class~='primary'].click` |
| `form input.keyup` | two items, `form` and `input.keyup` | `input[name='q'].keyup` |

Also check that:

- the element exists when the command starts; elements added later are not bound;
- the command's `if` is true, because `if` is checked on every event.

## The schema error source only says `true`

`errorResultSourceId="schema.errors"` stores a single row `{ value: true }` when
validation fails. It carries no field list, and it is not reset when a later attempt
succeeds. Bind it as `[##schema.errors.value##]`, and use `resultSourceId` (filled only on
success, and only when the `button` attribute is set) to detect a valid submission. The
field messages are shown by the form itself. See
[forms-and-schema.md](forms-and-schema.md).

## A user-defined component does nothing

- The console shows `'<key>' related repository setting not found`: no
  `host.repositories` entry matches the key or any of its prefixes.
- `<Name> is not defined`: the `local.` class did not exist when the command started.
- A later `Cannot read properties of undefined (reading 'runAsync')` follows either of the
  above; fix the first error.

Successful loads log `<name> loaded from local`, `<name> loaded from basiscore` or
`<key> loaded from <url>`.

## Console messages

| Message | Meaning |
|---|---|
| `<id> Added... <n> Row(s)` | A source was stored for the first time. |
| `<id> Updated... <n> Row(s)` | An existing source changed. |
| `handler Added for <id>...` | A command or binding now listens to `<id>`. |
| `handler removed for <id>...` | A listener was removed, usually because its command was disposed. |
| `wait for <id>` | Something is waiting for `<id>`; if no `Added` line follows, the source never arrives. |
| a bare lower-case word such as `document` or `timer` | Printed once per `events` item as it is bound; harmless. |
| `Selector '<s>' don't refer to any element(s).` | `addFragment` matched nothing. |
| `No element(s) selected for start rendering!` | `run()` after `addFragment` calls that all matched nothing. |
| `In 'host.settings' object, property '<key>' not configured!` | Missing connection or setting. |
| `HTTP error! status: <code>` | The data server answered with an error status. |
| `@child place holder not found in layout template` | A `layout` has no `@child`. |
| `Tree command has no root record in data member '<id>' …` | No row has the `nullvalue` in the parent-id column. |
| `error in execute callback method '<name>'.` | The `callback` method threw; the error follows. |
| `Source attribute can't change when socket is open . …` | A streaming `dbsource` changed its `source` attribute. |
