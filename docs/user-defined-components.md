# User-defined components

A user-defined component is a plain JavaScript class that BasisCore instantiates for a
`<basis core="component.<key>" run="atclient">` element. The class receives an *owner* object
implementing `IUserDefineComponent`, through which it renders content, reads attributes,
publishes and reads sources, processes nested BasisCore markup and reaches the dependency
container. The same mechanism powers custom fields of the `schema` command. This page is the
guide: the class contract, the full owner API, loading from a repository, schema field
components, the IoC container and a complete worked example. The command itself (resolution
rules, attributes, the built-in exposer) is documented in [component](commands/component.md).

## Writing a component class

The class needs only a constructor. The three lifecycle methods are optional and detected by
name:

```js
class Clock {
  constructor(owner) {          // owner: IUserDefineComponent
    this.owner = owner;
  }
  async initializeAsync() {}    // once, before the first run
  async runAsync(source) {}     // on every run; source is the triggering ISource or undefined
  async disposeAsync() {}       // when the command is disposed
}
```

Sequence, as implemented by `UserDefineComponent`:

1. The command resolves the class (see [component](commands/component.md)) and calls
   `Reflect.construct(Class, [owner])`.
2. If `initializeAsync` exists it is awaited. Then `owner.onInitialized` resolves. If anything
   throws, `onInitialized` rejects instead and the error is not logged.
3. On each run (`if` true, `OnRendering` not prevented) `runAsync(source)` is awaited if it
   exists. A non-`null` return value is handed to the `OnRendered` hook as `result`.
4. On disposal `disposeAsync` is awaited if it is a function; an exception is logged as
   `error in dispose component` and does not stop disposal. Collections created with
   `owner.processNodesAsync` are disposed next, then the command's triggers are removed.

The `<basis>` element is removed from the document when the command is created. The component
must call `owner.setContent(...)` to show anything.

## The owner API (`IUserDefineComponent`)

The owner is the `UserDefineComponent` instance. The table lists every member of the
`IUserDefineComponent` interface.

| Member | Type | Description |
| --- | --- | --- |
| `content` | `DocumentFragment` | The fragment the original `<basis>` element was moved into when the command was created. `content.firstChild` is the element itself; its child nodes are the markup written inside the tag. |
| `range` | `RangeObject` | The output range between the two marker text nodes. `range.setContent(node, append)` inserts (append `true` keeps existing output), `range.deleteContents()` clears it. |
| `triggers` | `string[]` | The space-separated ids of the `triggers` attribute, or `undefined` when none. |
| `priority` | `Priority` | Always `low` for user-defined components. |
| `dc` | `DependencyContainer` | The command's own child container (see [The IoC container](#the-ioc-container)). |
| `toNode(rawHtml)` | `DocumentFragment` | Parses HTML with `createContextualFragment`; scripts inside execute on insertion. |
| `toHTMLElement(rawXml)` | `HTMLElement` | Parses the string as XML and rebuilds it as HTML elements in the HTML namespace. Whitespace-only text is dropped. A parse error yields the browser's `parsererror` element, as the result itself or, depending on the XML parser, inside the partially rebuilt element. |
| `setContent(newContent)` | `void` | Replaces the range content with the node or fragment. |
| `getAttributeValueAsync(name, defaultValue?)` | `Promise<string>` | Attribute as a string token: bindings are resolved and waited for; a single-token attribute returns the bound value as-is (an object stays an object). `defaultValue` (default `null`) is used when the attribute is missing or resolves to `null`. |
| `getAttributeBooleanValueAsync(name, defaultValue?)` | `Promise<boolean>` | `"true"` (case-insensitive) or a bound value; `defaultValue` defaults to `false`. |
| `getAttributeToken(name)` | `IToken<string>` | The string token itself (`getValueAsync(wait?)`, `getSourceNames()`, `getDefault()`), or `undefined` when the attribute is absent or empty. |
| `addTrigger(sourceIds)` | `void` | Registers additional source ids; a `setSource` on any of them re-runs the component (`runAsync` receives that source). |
| `setSource(sourceId, data, options?, preview?)` | `void` | Publishes a source into the component's context (same rules as `$bc.setSource`: arrays are rows, an object is one row, a primitive becomes `{ value }`). `preview` logs the source. |
| `tryToGetSource(sourceId)` | `ISource` | Returns the source from this context or its owners, or `undefined`. |
| `waitToGetSourceAsync(sourceId)` | `Promise<ISource>` | Resolves immediately if the source exists, otherwise when it is first set. |
| `getDefault(key, defaultValue?)` | `T` | Reads the setting `default.<key>`. `defaultValue` defaults to `null`, so a missing key returns `null` and never throws. |
| `getSetting(key, defaultValue)` | `T` | Reads `host.settings[key]` (case-insensitive key match). When the key is missing or falsy: returns `defaultValue` if it is not `undefined`, otherwise throws `ConfigNotFoundException`. Pass `null` explicitly to make the setting optional. |
| `processNodesAsync(nodes)` | `Promise<IComponentCollection>` | Resolves a new `ComponentCollection` from `dc` (same context as the component), processes `nodes` (tokens, `<basis>` commands, `bc-triggers` elements) and returns the collection. Collections are disposed with the component. |
| `disposeAsync()` | `Promise<void>` | Disposes the command (see sequence above). |
| `disposed` | `boolean` | `true` after `disposeAsync` has run. |
| `storeAsGlobal(data, name?, prefix?, postfix?)` | `string` | `window[name] = data`; without `name` a random name `<prefix>_<timestamp>_<random>_<postfix>` is generated. Returns the name. |
| `getRandomName(prefix?, postfix?)` | `string` | The random name generator used above. |
| `format(pattern, ...params)` | `string` | Intended as `$bc.util.format`, but the owner forwards `params` as one array argument, so `{0}` is replaced by all parameters joined with commas and `{1}` onward stay unreplaced. Call `$bc.util.format(pattern, a, b)` directly instead. |
| `getLibAsync(objectName, url)` | `Promise<any>` | Loads a script once and resolves `eval(objectName)` (same loader used for repositories). |
| `manager` | `IComponentManager` | Your class instance. |
| `onInitialized` | `Promise<IUserDefineComponent>` | Resolves with the owner after `initializeAsync` completed; rejects if class loading or initialization failed. |
| `node` | `Element` | The original `<basis>` element (detached from the document). Read your own attributes or inner template from it (`node.innerHTML`, `node.querySelector`). |

The runtime object also has `toElement(rawXml)` (like `toHTMLElement` but keeps the SVG
namespace for `<svg>` subtrees), `getAttributeObjectValueAsync(name, defaultValue?)` (same
resolution as `getAttributeValueAsync` through an object token: a plain attribute value is returned
as text, nothing is evaluated) and
`context` (the `IContext`), which are inherited from the command base classes but not declared in
the interface.

### Rendering patterns

- Static markup: `owner.setContent(owner.toNode(html))`.
- Markup containing tokens or commands: insert it and then process it.

```js
async runAsync() {
  const fragment = this.owner.toNode(`
    <h3>[##cms.cms.time##]</h3>
    <basis core="print" datamembername="app.rows" run="atclient">
      <face><li>@name@</li></face>
    </basis>`);
  const nodes = [...fragment.childNodes];
  this.owner.setContent(fragment);
  await this.owner.processNodesAsync(nodes);
}
```

Capture `childNodes` before `setContent` (the fragment is emptied when inserted), and call
`processNodesAsync` after insertion so the `<basis>` elements have a parent when their range is
created.

- Using the element's own inner markup as a template: `owner.node.innerHTML` or
  `owner.content.firstChild.cloneNode(true).childNodes`.

### Reacting to sources

```html
<Basis core="component.local.Badge" run="atclient" triggers="cart.items"></Basis>
<script>
  class Badge {
    constructor(owner) { this.owner = owner; }
    async runAsync(source) {
      source = source ?? this.owner.tryToGetSource("cart.items");
      const count = source?.rows.length ?? 0;
      this.owner.setContent(this.owner.toNode(`<span>${count}</span>`));
      this.owner.setSource("cart.count", count);   // publishes { value: count }
    }
  }
</script>
```

The first run has no `source`; later runs receive the source named in `triggers`.

## Loading a component from a repository

`host.repositories` maps key prefixes to script URLs:

```html
<script>
  const host = {
    repositories: {
      "bc": "https://cdn.example.com/basiscore.components.js",
      "bc.watermark": "https://github.com/Manzoomeh/Components/releases/download/v2.0/basiscore.watermark.component.js",
    },
  };
</script>
<Basis core="component.bc.watermark" run="atclient" wm-element="#main-svg"></Basis>
<Basis core="component.bc.datepicker" run="atclient"></Basis>
```

For `core="component.bc.datepicker"` the key is `bc.datepicker`. It is looked up as is, then
shortened segment by segment (`bc`) until an entry exists. The matching URL is passed to
`getLibAsync("bc.datepicker", url)`, which:

1. returns `eval("bc.datepicker")` at once if `typeof bc.datepicker` is not `"undefined"`;
2. otherwise finds or creates `<script src="<url>">` in `<head>`, waits for `load`, logs
   `bc.datepicker loaded from <url>` and resolves `eval("bc.datepicker")`;
3. rejects on the script's `error` event.

Consequences for the script you publish: it must assign the constructor to the global path that
equals the full key (`window.bc = window.bc || {}; bc.datepicker = class { ... }`), it may bundle
several components under one prefix (`"bc": url` serves `bc.datepicker`, `bc.timepicker`, ...),
and it is downloaded once per page regardless of how many components use it.

`repositories` is a top-level `host` key. It is merged like every host option, so a `group` with
`options="{ repositories: {...} }"` can add repositories for its scope.

## Schema field components (`ISchemaBaseComponent`)

A `schema` question part whose `viewType` starts with `component.` is rendered by the schema's
`ComponentContainer` part control, which creates a user-defined component and talks to its
manager through `ISchemaBaseComponent`:

```ts
interface ISchemaBaseComponent {
  setValues(values: Array<IPartValue>);
  validateAsync(options: IValidationOptions): Promise<IValidationError>;
  getValuesForValidateAsync(): Promise<any> | Promise<Array<any>>;
  getAddedValuesAsync(): Promise<Array<IUserActionPartValue>>;
  getEditedValuesAsync(baseValues: Array<IPartValue>): Promise<Array<IUserActionPartValue>>;
  getDeletedValuesAsync(baseValues: Array<IPartValue>): Promise<Array<IUserActionPartValue>>;
  getValuesAsync(): Promise<Array<IUserActionPartValue>>;
}
```

`IPartValue` is `{ id?: number; value: any; answer?: IAnswerSchema }`; `IUserActionPartValue`
is `{ id?: number; value?: any; answer?: IUserActionResult }`; `IValidationError` is
`{ part: number; title: string; errors: Array<{ type, description, params? }> }`.

How the part control drives the component (`src/component/renderable/schema/part-control/component-container/ComponentContainer.ts`):

1. Its layout is a single `<basis run="atclient"></basis>`. The control sets
   `core="<viewType>"` on it (for example `component.bc.datepicker`).
2. If the part has `options`, the object is stored as a global with a random name
   (`$bc.util.storeAsGlobal(part.options)`) and the name is written to the element as
   `options="<globalName>"`. Read it with
   `window[await owner.getAttributeValueAsync("options")]`; the attribute holds the global's
   name, not the object, and no attribute getter evaluates it.
3. A separate runtime is started for the element: `$bc.new().addFragment(element).run()`. It
   has no `setOptions`, so it uses the global `host` object (and therefore `host.repositories`).
   The command is fetched with `GetCommandListByCore(viewType)[0]`.
4. When the form edits an existing answer, `command.onInitialized.then(x =>
   x.manager.setValues(answer.values))` pushes the stored values into the component.
5. Validation (`getValidationErrorsAsync`) runs only when the part has `validations`:
   `validateAsync(part.validations)` if the method exists; otherwise
   `getValuesForValidateAsync()` and the built-in rules (`required`, `dataType`, `regex`,
   length and range) are applied to the returned value(s); otherwise a console warning
   `No validation process detect...`. Exceptions are logged as `Error in validation process`.
6. Collecting the result: `getAddedValuesAsync()` for a part without a base answer,
   `getEditedValuesAsync(answer.values)` and `getDeletedValuesAsync(answer.values)` for a part
   with one, and `getValuesAsync()` when the form asks for the current values of an unanswered
   part. Each returns the array that becomes `{ part, values }` in the result, or a falsy value
   to contribute nothing. A missing method produces a console warning naming the `viewType`;
   an exception is logged and treated as no values.

Minimal schema field:

```js
class RatingField {
  constructor(owner) {
    this.owner = owner;
    this.value = null;
  }
  async initializeAsync() {
    this.options = window[await this.owner.getAttributeValueAsync("options")] ?? { max: 5 };
    const node = this.owner.toHTMLElement(`<input type="number" min="0" max="${this.options.max}" />`);
    node.addEventListener("change", () => (this.value = node.valueAsNumber));
    this.input = node;
    this.owner.setContent(node);
  }
  setValues(values) {                       // edit mode
    this.id = values[0]?.id;
    this.value = values[0]?.value ?? null;
    this.input.value = this.value ?? "";
  }
  async getValuesForValidateAsync() {       // let the built-in rules validate
    return this.value;
  }
  async getAddedValuesAsync() {
    return this.value == null ? null : [{ value: this.value }];
  }
  async getEditedValuesAsync(baseValues) {
    const old = baseValues[0];
    return old && old.value !== this.value ? [{ id: old.id, value: this.value }] : null;
  }
  async getDeletedValuesAsync(baseValues) {
    return this.value == null && baseValues.length ? [{ id: baseValues[0].id }] : null;
  }
  async getValuesAsync() {
    return this.value == null ? [] : [{ value: this.value }];
  }
}
```

Use it with a question part such as
`{ "part": 1, "viewType": "component.local.RatingField", "validations": { "required": true }, "options": { "max": 10 } }`.
The example pages `example/component/renderable/schema/user-defined-component/new` and `edit`
use `component.bc.datepicker` loaded from `repositories`.

## The IoC container

BasisCore wires its classes with tsyringe. Every command is resolved from a child container of
the collection that found it, and `owner.dc` is that child container. Tokens you will meet:

| Token | Registered by | Value |
| --- | --- | --- |
| `IHostOptions` | `BCWrapper.run()` (runtime container), `group` with `options` | The raw options object; `HostOptions` is built from it. |
| `root.nodes` | `BCWrapper.run()` | The elements passed to `addFragment` (or `document.documentElement`). |
| `dc` | every container that creates children | The container itself. |
| `root.context` | `BasisCore` | The `BasisCoreRootContext` of the runtime. |
| `context` | `BasisCore`, `ComponentCollection`, `group`, `repeater` | The `IContext` of the current scope (root, `LocalRootContext` or `LocalContext`). |
| `host_options` | `BasisCoreRootContext` | The root `HostOptions` instance; injected into every `LocalContext`. |
| `element` | `ComponentCollection.createCommandComponent` | The `<basis>` element of the command. |
| `parent.dc` | `ComponentCollection`, `group`, `repeater` | The container the current one was created from. |
| `parent.context` | `group`, `repeater` | The enclosing context, used as owner of the new local context. |
| `IBasisCore`, `ILogger`, `IContextRepository`, `ILocalContext`, and one token per command name (`print`, `call`, `component`, ...) | `src/tsyringe.config.ts` | Class registrations on the global container. |

Hierarchy: global container (class registrations) -> runtime container per `$bc.new().run()`
(`IHostOptions`, `root.nodes`, `dc`, then `root.context`, `context`, `host_options`) -> one child
per command (`element`, `context`, `dc`, `parent.dc`) -> deeper children created by `group`
(`parent.context`, `dc`, `parent.dc`, `IHostOptions`, `context`) and `repeater` (per row).

From a component, `owner.dc.resolve("context")` is the same object as `owner.context`,
`owner.dc.resolve("parent.dc")` is the collection's container, and `owner.dc.resolve("root.context")`
is the root context of the runtime. Registering on `owner.dc` is visible only to collections
created through `owner.processNodesAsync`; to make a service visible to sibling commands,
register it on an ancestor (`owner.dc.resolve("parent.dc").register(...)`).

### The `scheduler` token

`schemauploader` is the only command that looks for an optional registration: before uploading
each file it calls `container.isRegistered("scheduler", true)` (the `true` searches parent
containers). If found, `resolve("scheduler").startPost(formData, url, fileName, null, false)`
is called and its `task` promise awaited instead of a plain `fetch` POST. The expected shape is

```ts
interface IScheduler {
  startPost(data: FormData, url: string, title: string,
            callback?: (report: { percent: number; title: string; cancel?: boolean; error?: string }) => void,
            cancelable?: boolean): { task: Promise<any>; cancel?: () => void; /* ... */ };
}
```

Register it on a container above the `schemauploader` command before the upload happens, for
example from a component on the same page:

```js
this.owner.dc.resolve("parent.dc").register("scheduler", { useValue: myUploadQueue });
```

### `IDependencyContainer`

The package exports the TypeScript interface `IDependencyContainer`
(`src/IDependencyContainer.ts`) describing the container methods used by the library:
`register` (with `useValue`, `useFactory`, `useToken` or `useClass` providers),
`registerSingleton`, `registerType`, `registerInstance`, `resolve`, `resolveAll`,
`isRegistered(token, recursive?)`, `reset`, `clearInstances` and `createChildContainer`, plus
the `Lifecycle` enum and provider types. It is a type only; `owner.dc` is the tsyringe
`DependencyContainer` that implements it.

## Examples

A date picker component, modelled on `example/component/user-component/calender`: it injects
its stylesheet once, renders an input, fetches the month data when the input is clicked and
publishes the chosen day as a source named by the `result` attribute.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="/basiscore.js"></script>
  <title>Component - Date picker</title>
</head>
<body>
  <Basis core="component.local.DatePicker" run="atclient" result="form.date" culture="fa"></Basis>
  <p>Selected: [##form.date.value|(nothing yet)##]</p>

  <script>
    class DatePicker {
      static get style() {
        return `<style data-datepicker-style>
          .dp-box { border: 1px solid #ccc; width: 280px; position: absolute; background: #fff; }
          .dp-body { display: grid; grid-template-columns: repeat(7, 1fr); }
          .dp-day { padding: 6px; text-align: center; cursor: pointer; }
          .dp-day:hover, .dp-today { background: #f2fbfd; }
        </style>`;
      }

      constructor(owner) {
        this.owner = owner;
        this.onDocumentClick = (e) => {
          if (!e.target.closest(".dp-box") && e.target !== this.input) this.box.style.display = "none";
        };
      }

      async initializeAsync() {
        if (!document.querySelector("[data-datepicker-style]")) {
          document.head.append(this.owner.toNode(DatePicker.style));
        }
        this.resultId = await this.owner.getAttributeValueAsync("result", "datepicker.value");
        this.culture = await this.owner.getAttributeValueAsync("culture", "en");
        this.url = this.owner.getSetting("datepicker.url", "/calendar.json");

        const fragment = this.owner.toNode(`
          <div class="dp-wrapper">
            <input type="text" class="dp-input" readonly />
            <div class="dp-box" style="display:none"></div>
          </div>`);
        this.input = fragment.querySelector(".dp-input");
        this.box = fragment.querySelector(".dp-box");
        this.input.addEventListener("click", () => this.openAsync());
        document.body.addEventListener("click", this.onDocumentClick, true);
        this.owner.setContent(fragment);
      }

      async runAsync(source) {
        // Re-runs come from `triggers`; nothing to redraw unless a source asks for it.
        if (source) this.input.value = source.rows[0]?.value ?? "";
      }

      async openAsync() {
        const response = await fetch(`${this.url}?culture=${this.culture}`);
        const days = await response.json();   // [{ id, label, today }, ...]
        this.box.innerHTML = `<div class="dp-body">${days
          .map((d) => `<div class="dp-day${d.today ? " dp-today" : ""}" data-id="${d.id}">${d.label}</div>`)
          .join("")}</div>`;
        this.box.querySelectorAll(".dp-day").forEach((el) =>
          el.addEventListener("click", (e) => this.select(e.currentTarget)));
        this.box.style.display = "block";
      }

      select(dayElement) {
        const value = dayElement.getAttribute("data-id");
        this.input.value = dayElement.textContent;
        this.box.style.display = "none";
        this.owner.setSource(this.resultId, value);   // published as { value }
      }

      async disposeAsync() {
        document.body.removeEventListener("click", this.onDocumentClick, true);
      }
    }
  </script>
</body>
</html>
```

Points illustrated: `getAttributeValueAsync` with defaults, `getSetting` with an explicit
default, one-time DOM setup in `initializeAsync`, `setContent` with a fragment whose elements
were captured before insertion, `setSource` to publish into the page (the `[##form.date.value##]`
token outside the component updates), and listener cleanup in `disposeAsync`.

To ship the same class from a repository, wrap it as `window.bc = window.bc || {};
bc.datepicker = DatePicker;` in `basiscore.datepicker.component.js`, add
`repositories: { "bc.datepicker": "<url>" }` to `host`, and use
`core="component.bc.datepicker"`; nothing in the class changes.

## Pitfalls

- A class that cannot be loaded does not log anything; the symptom is a rejected
  `onInitialized` promise and a `TypeError` on the first run. Await
  `GetCommandListByCore("component.x.y")[0].onInitialized` while developing to see the cause.
- `getSetting(key)` without a second argument throws `ConfigNotFoundException` when the key is
  absent. Pass `null` or a default.
- `owner.format` mangles its parameters (they arrive as one array). Use `$bc.util.format`.
- `getAttributeValueAsync` waits for bound sources that do not exist yet; reading an attribute
  bound to a source that is never set blocks `initializeAsync` and the first run forever.
- Elements inside a fragment are detached once `setContent` inserts the fragment's children;
  query them from the fragment before insertion (as in the worked example) or from
  `document` afterwards.
- `processNodesAsync` creates a collection with the component's own context. Commands inside
  it that set sources publish to that context, which is the page context for a top-level
  component but a row context when the component sits inside a `repeater`.
- `toHTMLElement`/`toElement` parse XML: unclosed tags such as `<br>` or `<input>` and raw `&`
  produce a `parsererror` element instead of (or, depending on the browser, next to) the
  markup. Use `toNode` for HTML.
- The schema runtime created for a field component (`$bc.new().run()`) is a separate BasisCore
  instance with its own root context: sources set by the field are not visible to the page's
  main runtime.
- Multiple instances of the same class on one page each get their own owner; store state on
  `this`, not on the class or in globals, unless sharing is intended.

## Related

- [component](commands/component.md)
- [schema](commands/schema.md), [Field types](schema/field-types.md), [Validation](schema/validation.md), [Answers and submission](schema/answers-and-submission.md)
- [schemauploader](commands/schemauploader.md) (`scheduler`)
- [Host configuration](host-configuration.md) (`repositories`, `settings`)
- [Sources and reactivity](sources-and-reactivity.md)
- [Command attributes and lifecycle](command-attributes-and-lifecycle.md)
- [JavaScript API](javascript-api.md)
- [Internals](internals.md)
- [group](commands/group.md), [repeater](commands/repeater.md)

## Source files

- `src/component/user-define-component/UserDefineComponent.ts`
- `src/component/user-define-component/ComponentContainer.ts`
- `src/component/user-define-component/IUserDefineComponent.ts`
- `src/component/user-define-component/IComponentManager.ts`
- `src/component/user-define-component/ISchemaBaseComponent.ts`
- `src/component/user-define-component/component/ExposerComponent.ts`
- `src/component/renderable/schema/part-control/component-container/ComponentContainer.ts`
- `src/component/renderable/schema/part-control/component-container/assets/layout.html`
- `src/component/renderable/schema/part-control/QuestionPartFactory.ts`
- `src/component/renderable/SchemaUploader.ts` (`scheduler`)
- `src/component/ElementBaseComponent.ts`, `src/component/CommandComponent.ts`, `src/component/Component.ts`
- `src/RangeObject/RangeObject.ts`
- `src/wrapper/UtilWrapper.ts`
- `src/options/HostOptions.ts` (`getSetting`, `getDefault`, `repositories`)
- `src/IDependencyContainer.ts`, `src/tsyringe.config.ts`
- `src/BasisCore.ts`, `src/wrapper/BCWrapper.ts`, `src/context/BasisCoreRootContext.ts`
- `src/ComponentCollection.ts`
