/*
 * Data function for the `localdb` connection of tests/foundations/client-side-sql-localdb.html.
 * A LocalDataBase (AlaSQL localStorage database) is the backing store; every call inserts one
 * note and returns the table in the column-array format that a `local` connection expects.
 * `alasql` must already be a global when loadNotes runs: LocalDataBase does not load it.
 */
const db = new basiscore.LocalDataBase("notesdb", () => {
  const schemas = new Map();
  schemas.set("notes", { id: "INT", text: "STRING" });
  return schemas;
});

window.__notesProviderCalls = window.__notesProviderCalls || [];

async function loadNotes(params) {
  // params = { command: "<basis core=\"dbsource\" ...>", dmnid: null }
  window.__notesProviderCalls.push(params);
  const count = await db.executeAsync("SELECT COUNT(*) AS c FROM notes");
  await db.executeAsync("INSERT INTO notes VALUES (?, ?)", [count[0].c + 1, `note ${count[0].c + 1}`]);
  return {
    _: {},
    list: await db.executeAsTableAsync("SELECT id, text FROM notes ORDER BY id")
  };
}
