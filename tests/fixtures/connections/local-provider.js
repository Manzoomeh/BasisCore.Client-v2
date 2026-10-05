/*
 * Data function for a `local` connection
 * (`"connection.local.cache": "/tests/fixtures/connections/local-provider.js|getTables"`).
 * It is loaded on first use with $bc.util.getLibAsync and called with { command, dmnid }.
 * The result uses the column-array table format: the first array of every table is the
 * list of column names, every following array is one row. Tables are mapped onto the
 * <member> elements of the dbsource by position.
 */
window.__localProviderCalls = window.__localProviderCalls || [];

async function getTables(parameters) {
  window.__localProviderCalls.push(parameters);
  return {
    _: { source: "local-provider.js" },
    list: [
      ["id", "name", "age"],
      [1, "ali", 30],
      [2, "sara", 25],
      [3, "reza", 41]
    ],
    summary: [
      ["count", "Oldest"],
      [3, "reza"]
    ]
  };
}
