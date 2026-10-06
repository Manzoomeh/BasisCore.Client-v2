# Displaying saved answers

An object created through a schema form is stored by the server as an **answer**
(`IAnswerSchema`: `usedForId`, `schemaId`, `schemaVersion`, `lid`, `paramUrl` and `properties[]`,
see [Schema JSON contract](schema-json-contract.md)). This page lists the commands that can show
such an object back to the user, what each one renders, and when to pick which. All of them read
the answer from an ordinary source, so the first step is always the same: publish the record with
`api`, `dbsource` or `host.sources`, then point the display command at that source.

## Which command shows what

| Command | Renders | Knows the schema | Use it when |
| --- | --- | --- | --- |
| `schema` with `displayMode="view"` | The answered questions as read-only controls (labels, disabled text areas, checked and disabled check boxes, download links for files), laid out by the schema's sections and skin | yes, fetched from `schemaUrl` + the answer's `paramUrl` | A detail page: show one object exactly as the form that created it, without letting the user change it |
| `schema` with `displayMode="edit"` | The same object as an editable, pre-filled form; the button publishes only what changed (`IUserActionResult`) | yes | An edit page; see [Answers and submission](answers-and-submission.md) |
| `schemalist` | One `<div>` per question title, for every answer record in the source | yes, fetched with `?id=&ver=&lid=` per record | A quick list of which questions a set of records answers; in 2.39.6 it shows titles only (its `<face>` is parsed but not applied) |
| `print`, `list`, `repeater`, `[##...##]` tokens | Whatever your own face or token writes from the record's fields | no | A summary card, a table row or a single value (`usedForId`, one property) where you know the property structure yourself |

`schema` in `view` mode is the schema-aware way to display an object; the generic renderers are
for hand-written summaries.

## Loading the record

The display commands wait for the source named in `datamembername` and read **its first row** as
the answer. The reference server publishes an answer under `answer.data`:

```html
<basis core="api" run="atclient" method="get" url="/schema/answers?id=[##inline.object.id##]"></basis>
```

A `dbsource` member or a `host.sources` entry works the same way as long as the row is an
`IAnswerSchema` object. A source with several records shows only the first one in `schema`; give
`schemalist` the whole set, or run one `schema` per record inside a `repeater`.

## `schema` in view mode

```html
<basis core="schema" run="atclient"
       datamembername="answer.data"
       schemaUrl="/schema/questions"
       displayMode="view"
       callback="onCreateAnswerPart"></basis>
```

- `QuestionPartFactory` picks the read-only control for every `viewType` ([Field types](field-types.md)): text parts become `<label data-bc-text-input>`, a select becomes a label with the chosen item's text, a checklist renders only the selected items, checked and disabled, `upload`/`blob` parts render their download list.
- Questions that have **no property in the answer are skipped**; the output is not a read-only mirror of the full schema.
- No add/remove buttons and no submit wiring: `button` and `resultSourceId` are ignored.
- `callback` (evaluated with `eval`) is called once per rendered value with `{ element, prpId, typeId, value }`; use it to turn a label into a link or to format a value. It is not a submit hook.
- `displayMode` is a token, so `displayMode="[##cms.form.value|(view)##]"` with `triggers="cms.form"` switches the same element between `view` and `edit` (a checkbox with `bc-value="view" bc-off-value="edit"` is enough).

## `schemalist`

```html
<basis core="schemalist" run="atclient" datamembername="list.answers" schemaUrl="/schema/questions"></basis>
```

For every row of the source it requests `<schemaUrl>?id=<schemaId>&ver=<schemaVersion>&lid=<lid>`
and appends one `<div>` per question with the question title. Every question of the schema must
have a saved property in the record, otherwise that record throws and renders nothing. Values are
not rendered in this version.

## Generic renderers over the record

The record is a normal source, so tokens and faces can read it directly:

```html
Object [##answer.data.usedForId##] uses schema [##answer.data.schemaId##]
```

To list the values, flatten `properties[].answers[].parts[].values[]` once in JavaScript and
publish the flat rows as a second source; a `print` then renders them like any other data:

```html
<basis core="callback" run="atclient" triggers="answer.data" method="flattenAnswer"></basis>
<basis core="print" run="atclient" datamembername="answer.values">
  <layout><script type="text/template"><table>@child</table></script></layout>
  <face><script type="text/template"><tr><td>@prpId@</td><td>@value@</td></tr></script></face>
</basis>
<script>
  function flattenAnswer(args) {
    const rows = [];
    for (const p of args.source.rows[0].properties)
      for (const a of p.answers) for (const part of a.parts) for (const v of part.values)
        rows.push({ prpId: p.prpId, part: part.part, value: v.value });
    $bc.setSource("answer.values", rows);
  }
</script>
```

This shows raw values (a select stores the chosen item's `id`, not its text) and needs you to know
the property ids; prefer `schema` in `view` mode when the page should look like the form.

## Examples

### Detail page: view mode fed by `api`

```html
<basis core="api" run="atclient" method="get" url="/schema/answers?id=[##inline.object.id##]"></basis>
<basis core="schema" run="atclient" datamembername="answer.data"
       schemaUrl="/schema/questions" displayMode="view"></basis>
<script>
  const host = { sources: { "inline.object": [{ id: 1423330 }] } };
</script>
```

### View or edit on the same element

```html
<label><input type="checkbox" bc-triggers="change" name="cms.form" bc-value="view" bc-off-value="edit" checked /> read only</label>
<basis core="schema" run="atclient" datamembername="answer.data" schemaUrl="/schema/questions"
       displayMode="[##cms.form.value|(view)##]" triggers="cms.form"></basis>
```

### Titles of several records

```html
<basis core="schemalist" run="atclient" datamembername="list.answers" schemaUrl="/schema/questions"></basis>
<script>
  $bc.setSource("list.answers", [answerA, answerB]);
</script>
```

The runnable version of these examples is `tests/schema/displaying-answers.html`.

## Pitfalls

- `schema` renders nothing until the `datamembername` source exists, and only `rows[0]`.
- `view` mode skips unanswered questions; an empty record renders an empty form.
- `schemalist` needs a schema endpoint that accepts `?id=&ver=&lid=`; the `schema` command fetches `schemaUrl + paramUrl` (a path), so the two commands may need two endpoints.
- A `schemalist` record that lacks a property for one of the schema's questions throws (`Cannot read properties of undefined (reading 'answers')`) and renders nothing.
- Read-only date parts (`component.calendar.datepicker`) throw when the answer has no saved value for them; a question whose first part is `html` keeps a visible remove button in `view` mode (both listed in [troubleshooting](../troubleshooting.md)).
- Tokens over the raw record show stored values, not display texts: a select answer is the item `id`.

## Related

- [schema](../commands/schema.md) - attributes, display modes, `callback`
- [schemalist](../commands/schemalist.md) - the title list command
- [Answers and submission](answers-and-submission.md) - the answer shape and what `edit` mode publishes
- [Field types](field-types.md) - the read-only control of every `viewType`
- [DOM markers](dom-markers.md) - the `data-bc-*` attributes of the read-only controls
- [print](../commands/print.md), [repeater](../commands/repeater.md) - hand-written rendering
- [api](../commands/api.md) - loading the record

## Source files

- `src/component/renderable/schema/SchemaComponent.ts` (`runAsync`, the `view` branch)
- `src/component/renderable/schema/part-control/QuestionPartFactory.ts` (read-only switch)
- `src/component/renderable/schema-list/SchemaListComponent.ts`
- `src/component/renderable/schema-list/SourceMaker.ts`
