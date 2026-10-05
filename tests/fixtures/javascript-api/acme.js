// Fixture for the repository prefix lookup: host.repositories["acme"] serves the key
// "acme.tools.box", so the script must define window.acme.tools.box.
window.acme = { tools: { box: class AcmeBox {} } };
