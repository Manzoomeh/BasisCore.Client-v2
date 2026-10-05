# component

`component` runs a JavaScript class of your own as a BasisCore command. The class name is part of
the `core` attribute (`core="component.local.Clock"`, `core="component.bc.watermark"`), the class
is loaded from the page, from the library's built-ins or from a script URL listed in
`host.repositories`, and an instance is created with an *owner* object that gives it access to
the command's content, attributes, sources and settings. Use it for widgets, third-party library
wrappers and custom schema fields. The owner API and the component class contract are described
in full in [User-defined components](../user-defined-components.md); this page covers the command
itself.

## Attributes

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `core` | `component.<key>` | required | `component` selects the command; `<key>` (everything after the first dot) names the class to load. |
| `run` | `atclient` | required | Only `run="atclient"` elements are processed. |
| `if`, `triggers`, `events`, `OnRendering`, `OnRendered`, `ignoreNullSource` | common | | See [Command attributes and lifecycle](../command-attributes-and-lifecycle.md). |
| any other attribute | | | Not interpreted by the command; the component class reads them through the owner (`getAttributeValueAsync` and friends). |

`component` has the default priority (`low`).

## Resolving the class

The collection takes the part of `core` before the first dot (`component`) to pick the command
class `UserDefineComponent`. During `initializeAsync` the command passes the rest of `core` to
`$bc.util.getComponentAsync(context, key)`, which resolves it in one of three ways:

| `core` value | Rule | Result |
| --- | --- | --- |
| `component.local.<expr>` | `eval(<expr>)`, where `<expr>` is everything after `local.` | A constructor reachable as a global expression, for example `Clock` or `myApp.widgets.Clock`. |
| `component.basiscore.<name>` | `eval("basiscore.<name>")` | A built-in class exported by the library global `basiscore`. The only one is `basiscore.exposer`. |
| `component.<a>.<b>...` (anything else) | Walk `host.repositories`: try the full key, then drop the last segment and try again, until a URL is found | The script at that URL is loaded with `$bc.util.getLibAsync(fullKey, url)` and the constructor is `eval(fullKey)` once the script has run. |

Examples of the repository walk for `core="component.bc.watermark"`: the key `bc.watermark` is
looked up first, then `bc`. The script found must define the global object path `bc.watermark`
(the *full* key, not the shortened one). `getLibAsync` skips the download when `typeof
bc.watermark` is already defined, reuses an existing `<script src="…">` with the same URL, and
otherwise appends a new `<script>` to `<head>` and waits for its `load` event.

If no rule yields a constructor a `ClientException` with the message
`'<key>' related repository setting not found` is thrown. The exception is caught inside
`initializeAsync` and only rejects the command's `onInitialized` promise; nothing is written to
the console at that point. The following run then fails with a `TypeError` because
`manager` is undefined.

## Lifecycle

1. `initializeAsync`: common attributes are read, the class is resolved and instantiated with
   `Reflect.construct(Class, [owner])` where `owner` is the `UserDefineComponent` instance. If
   the instance has an `initializeAsync` method it is awaited. Then `owner.onInitialized`
   resolves with the owner.
2. Each run (first processing, then every `triggers` source set or `events` entry): after `if`
   and `OnRendering`, `manager.runAsync(source)` is called if the method exists; `source` is the
   `ISource` that triggered the run or `undefined` on the first run. Its return value is passed
   to `OnRendered` as `result` when it is not `null`.
3. `disposeAsync`: `manager.disposeAsync()` is called if it is a function (errors are logged as
   `error in dispose component`), then every collection created through
   `owner.processNodesAsync` is disposed, then the command unregisters its triggers.

The command's `<basis>` element is removed from the document when the command is created and
replaced by an empty range; the component decides what to render by calling `owner.setContent`.
Until it does, nothing is shown.

## The built-in exposer component

`core="component.basiscore.exposer"` loads `ExposerComponent`, a small class that bridges a
command to page JavaScript. It reads two attributes of its own element:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `Component` | string (token) | none | During `initializeAsync`, the exposer instance is stored as a global variable with this name (`window[name] = exposer`). |
| `Method` | string (token) | none | On every run, `eval(Method)` is called with `(exposer, source)`: the exposer instance and the triggering source. |

The object stored globally is the exposer instance, not the command. It carries the owner in its
`owner` property (declared private in TypeScript but present at runtime), so page scripts can
reach the full owner API through `window[name].owner`. Both attributes are ordinary attributes
and are only interpreted by this class; they have no effect on other commands or on other
component classes.

## Examples

### Page-local class

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="/basiscore.js"></script>
  <title>Component - Simple</title>
</head>
<body>
  <button bc-value="0" bc-triggers="click" name="event.click">Click to refresh</button>
  <Basis core="component.local.DemoComponent" run="atclient" triggers="event.click"></Basis>
  <script>
    class DemoComponent {
      constructor(owner) {
        this.owner = owner;
      }
      async initializeAsync() {
        console.log('initializeAsync');
      }
      async runAsync(source) {
        const date = new Date();
        const node = this.owner.toNode(`<div>${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}</div>`);
        this.owner.setContent(node);
      }
    }
  </script>
</body>
</html>
```

The class is defined after the element; that is fine because the page is rendered on `window`
`load`, after all inline scripts have run.

### Reading a host setting

```html
<Basis core="component.local.DemoWithSetting" run="atclient" triggers="event.click"></Basis>
<script>
  const host = {
    settings: {
      "time-component": { millisecond: false, headerMessage: "My timer" },
    },
  };
  class DemoWithSetting {
    constructor(owner) {
      this.owner = owner;
      this.defaultSetting = { millisecond: true, headerMessage: "default header", footerMessage: "default footer" };
    }
    async runAsync() {
      const date = new Date();
      const userSetting = this.owner.getSetting("time-component", null);
      const setting = $bc.util.defaultsDeep(userSetting, this.defaultSetting);
      this.owner.setContent(this.owner.toNode(
        `<div>${setting.headerMessage}<br/>${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}${setting.millisecond ? `:${date.getMilliseconds()}` : ""}<br/>${setting.footerMessage}</div>`));
    }
  }
</script>
```

### Options from a face

```html
<Basis core="print" datamembername="inlineSource.print" run="atclient">
  <face>
    <Basis core="component.local.DemoWithSetting" run="atclient"
           options="{{ return window.$bc.util.storeAsGlobal($data.options); }}"> </Basis>
  </face>
</Basis>
<script>
  const host = {
    sources: {
      "inlineSource.print": [
        { id: 1, name: "a", options: { id: 12, data: "p" } },
        { id: 2, name: "b", options: { id: 13, data: "q" } },
      ],
    },
  };
  class DemoWithSetting {
    constructor(owner) { this.owner = owner; }
    async initializeAsync() {
      const options = window[await this.owner.getAttributeValueAsync("options")];
      console.log(options); // { id: 12, data: "p" } for the first row
    }
  }
</script>
```

`print` writes one `<basis>` per row and each is processed as its own `component` command. An
attribute cannot carry an object: `options="@options@"` renders the row value as text
(`[object Object]`), and `getAttributeObjectValueAsync` returns the attribute text as it is (no
expression is evaluated; a bound `[##...##]` token resolves like in `getAttributeValueAsync`). The
code block above stores the row's object as a global with a random name and writes that name into
the attribute, the same technique the `schema` command uses for its field components; the class
reads the object back from `window`.

### Exposer

```html
<Basis core="component.basiscore.exposer" run="atclient"
       component="global_variable_component" method="runInLoad"></Basis>
<script>
  function runInLoad(component, source) {
    console.log(component, source, global_variable_component);
    console.log(component.owner.node); // the <basis> element
  }
</script>
```

### Class loaded from a repository

```html
<script>
  const host = {
    repositories: {
      "bc.watermark": "https://github.com/Manzoomeh/Components/releases/download/v2.0/basiscore.watermark.component.js",
    },
  };
</script>
<Basis core="component.bc.watermark" run="atclient"
       wm-element="#main-svg" wm-background="watermark.bg" wm-items="watermark.items"
       wm-btn="#result" wm-resultId="wm.k"></Basis>
<fieldset>
  <legend>Watermark Image</legend>
  <input type="file" bc-triggers="change" name="watermark.bg" />
</fieldset>
<svg xmlns="http://www.w3.org/2000/svg" id="main-svg" width="0" height="0"></svg>
<button id="result">Generate</button>
<img src="[##wm.k.value##]" />
```

`bc.watermark` is looked up in `host.repositories`, the script is injected, and the constructor
is taken from the global `bc.watermark`. The `wm-*` attributes belong to that component's own
contract; the library only passes the element through.

## Pitfalls

- `core="component"` without a key, or a key with no `local.` / `basiscore.` prefix and no
  matching `repositories` entry, fails with `'<key>' related repository setting not found`. The
  error is only visible as a rejected `onInitialized` promise and a later `TypeError` on run.
- The repository script must define the *full* key as a global path (`bc.watermark`), even when
  the matching `repositories` entry is a prefix (`bc`).
- `local.<expr>` is evaluated with `eval` in the library's scope; the constructor must be a
  global, not a `let`/`const` declared inside a module or a function.
- `getLibAsync` resolves `eval(fullKey)` as soon as the script's `load` event fires. Scripts that
  define the object asynchronously are not supported.
- Nothing is rendered unless the class calls `owner.setContent`; the original inner markup of
  the `<basis>` element is removed from the page with the element.
- `OnRendered` is skipped only when `runAsync` returns `null`; a class without `runAsync` still fires `OnRendered` with `result: undefined`.
- `Component` and `Method` are read only by `component.basiscore.exposer`. On any other command
  they are plain attributes.
- `repositories` is a top-level `host` key, not a `settings` entry.

## Related

- [User-defined components](../user-defined-components.md) (owner API, class contract, schema fields, container)
- [Host configuration](../host-configuration.md) (`repositories`, `settings`)
- [Command attributes and lifecycle](../command-attributes-and-lifecycle.md)
- [JavaScript API](../javascript-api.md) (`$bc.util.getLibAsync`, `$bc.util.storeAsGlobal`)
- [schema](schema.md), [callback](callback.md)

## Source files

- `src/component/user-define-component/UserDefineComponent.ts`
- `src/component/user-define-component/ComponentContainer.ts`
- `src/component/user-define-component/IUserDefineComponent.ts`
- `src/component/user-define-component/IComponentManager.ts`
- `src/component/user-define-component/component/ExposerComponent.ts`
- `src/wrapper/UtilWrapper.ts` (`getComponentAsync`, `getLibAsync`, `storeAsGlobal`)
- `src/ComponentCollection.ts` (`core` prefix extraction)
- `src/tsyringe.config.ts` (`component` registration)
- `src/index.ts` (`basiscore.exposer` export)
