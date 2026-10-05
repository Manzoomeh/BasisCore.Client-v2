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
`headers`). Whatever the route returns is **always serialised as JSON** with the status given by
the route's `status` field (default 200); a `Response` instance returned by a route is
stringified too, so it cannot be used to serve HTML or a chunked stream. Unmatched requests go
to the real network. The full reference is `runtime/BasisCore_Mock_1.md` in the kit repository
(its note that a route may return a `Response` as-is does not hold for this version).

Details of this mock version that matter when asserting requests: `ctx.url` is a `URL` object
(use `ctx.url.pathname` and `ctx.url.search`), request headers are read from
`ctx.request.headers` (there is no `ctx.headers`), and `BasisCoreMock.state().log[].url` holds the
path name only.

For a non-JSON answer (an HTML fragment, a streamed `chunkbased` body) a test page either serves
a static file from `tests/fixtures/` or wraps `window.fetch` itself before the library loads.

Only `fetch` is intercepted. `XMLHttpRequest` (used by `call` and `web`-connection page loads),
`WebSocket` and service workers are not; the tests that need those install their own small
fakes inside the page.
