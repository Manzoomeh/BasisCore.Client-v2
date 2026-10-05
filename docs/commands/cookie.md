# cookie

`cookie` writes one browser cookie by assigning a string to `document.cookie`. It is the
declarative counterpart of `document.cookie = "name=value;max-age=…;path=…"`: the attributes can be
bound to sources with tokens, and `triggers` makes the command write the cookie again whenever a
source changes. Use it to persist a small value such as a selected language, a view mode or a
timestamp across page loads. The command writes only; reading cookies is done through the
built-in `cms.cookie` source, which is a snapshot taken when the page is initialised and is not
updated by this command.

## How a cookie command runs

Each run resolves the four attributes and builds the cookie string:

```js
var str = `${name.trim()}=${value || ""}`;
if (maxAge) str += `;max-age=${maxAge}`;
if (path)   str += `;path=${path.trim()}`;
document.cookie = str;
```

`CookieComponent` extends `CommandComponent` with the default `Priority.low`, so it runs in the
same wave as the rendering commands during the initial processing, then once more for every source
in `triggers` or every `events` occurrence. It does not publish a source and does not return a
value.

## Attributes

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | string | | Must be `cookie`. |
| `run` | string | | Must be `atclient`. |
| `name` | string | | Cookie name. Required: a missing attribute makes `name.trim()` throw a `TypeError`. Trimmed. Tokens allowed. |
| `value` | string | `""` | Cookie value, written as-is (no encoding). An unresolved or empty value writes `name=`. Tokens allowed. |
| `max-age` | string | | Lifetime in seconds, appended as `;max-age=<value>` when non-empty. `"0"` is non-empty and is appended, which deletes the cookie. |
| `path` | string | | Appended as `;path=<value>` when non-empty, trimmed. `path=""` writes no path and the browser uses the current document path. |
| `triggers` | string | | Space separated source ids; each publication writes the cookie again with freshly resolved tokens. |
| `events` | string | | DOM, window, document or timer events that write the cookie again. |
| `if` | string | | JavaScript expression evaluated before every run. |
| `ignoreNullSource` | boolean | `false` | `true` skips the initial run; the cookie is then written only on triggers. |
| `OnRendering`, `OnRendered` | string | | Generic hooks around every run. |

`domain`, `expires`, `secure`, `samesite` and `httponly` are not read. A cookie that needs them
has to be written by the server or by your own JavaScript. `OnProcessing` and `OnProcessed` have
no effect.

## `cms.cookie` is a snapshot

`BasisCoreRootContext` reads `document.cookie` once, when the root context is created, splits it on
`;` and `=` and publishes the pairs as the single-row source `cms.cookie`. Nothing in the library
publishes it again: the `cookie` command writes to `document.cookie` and stops there, so
`[##cms.cookie.last_time##]` keeps showing the value the page started with until the next full
load. This is what the shipped `cookie/simpe` example relies on: it displays the previous visit's
time while writing the current one. If the page must react to the value immediately, keep it in a
normal source (for example `ui.lang`) and use the cookie only as persistence.

The snapshot does not trim the leading space that browsers put after each `;`, so a cookie that
was not the first in `document.cookie` is published under a key beginning with a space and cannot
be addressed with a token.

## Examples

### Remember the time of the last visit

From `example/component/management/cookie/simpe/index.html`.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="/basiscore.js"></script>
</head>
<body>
  Last visit: [##cms.cookie.last_time|(not set)##]<br />
  Now: [##cms.cms.time2##]

  <basis core="cookie" name="last_time" value="[##cms.cms.time2##]" max-age="55" path="" run="atclient"></basis>
</body>
</html>
```

Reloading within 55 seconds shows the previous `time2`; the cookie string written is
`last_time=HHmmss;max-age=55`.

### Value from a source published in JavaScript

```html
Cookie value: [##local.cookie.value|()##]

<basis core="cookie" name="lid" value="[##local.cookie.value##]" max-age="55" path="/" run="atclient"></basis>

<script>
  $bc.setSource("local.cookie", 345);
</script>
```

A scalar passed to `setSource` becomes one row `{ value: 345 }`, hence `local.cookie.value`.

### Rewrite the cookie whenever a source changes

From `example/component/management/cookie/dynamic/index.html`.

```html
[##data.time.value|(not set)##]

<basis core="cookie" name="last_time" value="[##data.time.value|(none)##]" max-age="55" path=""
       run="atclient" triggers="data.time"></basis>

<script>
  function setTimeSource() {
    $bc.setSource("data.time", new Date().getUTCMilliseconds());
  }
  setTimeSource();
  setInterval(setTimeSource, 2000);
</script>
```

Every `setSource` re-runs the command with the new value.

### Persist a user preference

```html
<select name="ui.lang" bc-triggers="change">
  <option value="en">English</option>
  <option value="fa">Persian</option>
</select>

<basis core="cookie" name="lang" value="[##ui.lang.value##]" max-age="2592000" path="/"
       run="atclient" triggers="ui.lang" ignoreNullSource="true"></basis>
```

`ignoreNullSource="true"` prevents the initial run from writing `lang=` before the user has
chosen anything. On the next page load the choice is available as `[##cms.cookie.lang##]`.

### Delete a cookie

```html
<basis core="cookie" name="lang" value="" max-age="0" path="/" run="atclient"></basis>
```

Writes `lang=;max-age=0;path=/`, which removes the cookie for that path.

## Pitfalls

- **`cms.cookie` does not change after a write.** It is a startup snapshot; bind your UI to the
  source you write from, not to `cms.cookie`.
- **`name` is required.** Without it the run throws a `TypeError` (`Cannot read properties of null`),
  which the runtime does not catch; it shows up as an unhandled promise rejection.
- **A `value` token without a fallback waits.** `value="[##ui.lang.value##]"` suspends the run
  until `ui.lang` is published, and the cookie is written at that moment; with a fallback
  (`[##ui.lang.value|()##]`) the initial run writes `name=` immediately. Choose the fallback plus
  `ignoreNullSource="true"` when the cookie must only be written after the user acts. Tokens on
  `cms.*` sources never wait.
- **No encoding is applied.** Values containing `;`, `,` or `=` corrupt the cookie string; encode
  them in JavaScript before publishing the source.
- **`path=""` is not `path=/`.** An empty path omits the attribute and the browser scopes the
  cookie to the current directory, so another page may not see it.
- **No `secure`, `samesite`, `domain` or `expires`**, and `HttpOnly` cookies cannot be created from
  JavaScript at all.
- **Cookies published in `cms.cookie` after the first one carry a leading space** in their key.

## Related

- [Sources and reactivity](../sources-and-reactivity.md) - the built-in `cms.*` sources
- [Binding and tokens](../binding-and-tokens.md) - tokens and fallbacks in attribute values
- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md) - `triggers`, `events`, `ignoreNullSource`
- [HTML element binding](../html-element-binding.md) - publishing input values with `bc-triggers`
- [callback](callback.md) - running JavaScript when a source changes

## Source files

- `src/component/management/CookieComponent.ts`
- `src/component/CommandComponent.ts`
- `src/component/ElementBaseComponent.ts`
- `src/context/BasisCoreRootContext.ts` (`cms.cookie`)
