# Mock back end used by the tests

`BasisCore_Mock_1.js` (version 1.4.1) is taken unchanged from the
[basiscore-client-kit](https://github.com/git-manzoomehweb/basiscore-client-kit)
repository (`runtime/BasisCore_Mock_1.js`), where it is published under an MIT-style licence.

It patches `window.fetch` so that `dbsource`, `api`, `call`, `schema` and `schemauploader` can be
exercised without a server. A test page loads it before the library, registers routes, then loads
`dist/basiscore.js`:

```html
<script src="/tests/harness/mock/BasisCore_Mock_1.js"></script>
<script>
  BasisCoreMock.route({
    url: "/db",
    method: "POST",
    bodyMatch: /FROM\s+products/i,
    response: () => BasisCoreMock.bc.api(rows, { tableName: "shop.products", keyField: "id" })
  });
</script>
<script> const host = { settings: { "connection.web.shop": "/db" } }; </script>
<script src="/dist/basiscore.js"></script>
```

Routes receive a context (`url`, `pathname`, `method`, `query`, `params`, `body`, `bodyJSON`,
`headers`) and may return a plain object (serialised as JSON), a `Response` instance (used as
is, which is how the tests serve HTML fragments and chunked streams), or
`{ __status, __body }` for an error. Unmatched requests go to the real network. The full
reference is `runtime/BasisCore_Mock_1.md` in the kit repository.

Only `fetch` is intercepted. `XMLHttpRequest` (used by `call` and `web`-connection page loads),
`WebSocket` and service workers are not; the tests that need those install their own small
fakes inside the page.
