/*
 * bc-test.js - in-page functional test harness for BasisCore Client.
 *
 * Load it as the FIRST script of a test page so that it can record every
 * uncaught error. Then load the library, write the markup under test and
 * register tests:
 *
 *   bcTest.test("renders one <li> per row", async (t) => {
 *     const items = await t.waitFor(() => t.$$("#team li"), (l) => l.length === 2);
 *     t.equal(t.text(items[0]), "Sara - Designer");
 *   });
 *
 * Tests start automatically after the window `load` event (BasisCore itself
 * starts on `load`, so the markup is being processed while the tests poll
 * with `t.waitFor`). Results are rendered into the page, exposed as
 * `window.__bcTest`, posted to a parent window (tests/index.html) and written
 * to the console as one `[bc-test] ...` line that tests/run.js reads.
 *
 * Kinds of test:
 *   bcTest.test(name, fn)    - passes when fn resolves without a failed assertion
 *   bcTest.defect(name, fn)  - documents a known defect: fn asserts the defective
 *                              behaviour; when the assertion stops holding the
 *                              test is reported as "fixed" and fails the page, so
 *                              the documentation gets updated
 *   bcTest.skip(name, why)   - reported but not run (needs a user gesture, a
 *                              real server, ...)
 *   bcTest.allowError(regex) - an uncaught error matching regex is expected and
 *                              does not fail the page
 */
(function (global) {
  "use strict";

  if (global.bcTest) {
    return;
  }

  var state = {
    name: null,
    doc: null,
    status: "registering",
    tests: [],
    errors: [],
    allowedErrors: [],
    console: [],
    started: false,
    startedAt: null
  };

  /* ------------------------------------------------------------------ */
  /* error and console capture                                           */
  /* ------------------------------------------------------------------ */

  global.addEventListener("error", function (ev) {
    var err = ev.error;
    state.errors.push({
      message: String(ev.message || (err && err.message) || "unknown error"),
      stack: err && err.stack ? String(err.stack) : null,
      source: ev.filename ? ev.filename + ":" + ev.lineno : null,
      kind: "error"
    });
  });

  global.addEventListener("unhandledrejection", function (ev) {
    var reason = ev.reason;
    state.errors.push({
      message: String(reason && reason.message ? reason.message : reason),
      stack: reason && reason.stack ? String(reason.stack) : null,
      source: null,
      kind: "unhandledrejection"
    });
  });

  var BANNER = /Welcome|follow us|version:|___|\\_|^\s*$/;
  ["log", "info", "warn", "error", "debug"].forEach(function (level) {
    var original = console[level] ? console[level].bind(console) : null;
    console[level] = function () {
      var text = Array.prototype.map
        .call(arguments, function (a) {
          if (typeof a === "string") return a;
          try {
            return a instanceof Error ? a.message : JSON.stringify(a);
          } catch (e) {
            return String(a);
          }
        })
        .join(" ");
      if (!BANNER.test(text) && text.indexOf("[bc-test]") !== 0) {
        state.console.push({ level: level, text: text });
      }
      if (original) original.apply(null, arguments);
    };
  });

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function isEmptyCollection(v) {
    return (
      v == null ||
      v === false ||
      ((Array.isArray(v) || (typeof v === "object" && typeof v.length === "number" && typeof v.item === "function")) &&
        v.length === 0)
    );
  }

  function describe(v) {
    if (typeof v === "string") return JSON.stringify(v);
    if (v instanceof Element) return "<" + v.tagName.toLowerCase() + ">";
    try {
      return JSON.stringify(v);
    } catch (e) {
      return String(v);
    }
  }

  function stable(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map(function (k) {
          return JSON.stringify(k) + ":" + stable(v[k]);
        })
        .join(",") +
      "}"
    );
  }

  function AssertionError(message) {
    this.name = "AssertionError";
    this.message = message;
    this.stack = new Error(message).stack;
  }
  AssertionError.prototype = Object.create(Error.prototype);

  function fail(message) {
    throw new AssertionError(message);
  }

  function resolveElement(target) {
    if (typeof target === "string") {
      var el = document.querySelector(target);
      if (!el) fail("no element matches " + JSON.stringify(target));
      return el;
    }
    if (!target) fail("expected an element or a selector, got " + describe(target));
    return target;
  }

  function normalizeText(s) {
    return String(s == null ? "" : s)
      .replace(/\s+/g, " ")
      .trim();
  }

  function makeContext(test) {
    var t = {
      /* assertions */
      fail: fail,
      ok: function (value, message) {
        if (!value) fail((message || "expected a truthy value") + " (got " + describe(value) + ")");
      },
      equal: function (actual, expected, message) {
        if (actual !== expected) {
          fail((message || "values differ") + ": expected " + describe(expected) + ", got " + describe(actual));
        }
      },
      notEqual: function (actual, unexpected, message) {
        if (actual === unexpected) {
          fail((message || "values should differ") + ": both are " + describe(actual));
        }
      },
      deepEqual: function (actual, expected, message) {
        if (stable(actual) !== stable(expected)) {
          fail((message || "structures differ") + ": expected " + stable(expected) + ", got " + stable(actual));
        }
      },
      match: function (value, regex, message) {
        if (!regex.test(String(value))) {
          fail((message || "value does not match " + regex) + ": got " + describe(value));
        }
      },
      notMatch: function (value, regex, message) {
        if (regex.test(String(value))) {
          fail((message || "value should not match " + regex) + ": got " + describe(value));
        }
      },
      includes: function (haystack, needle, message) {
        var hit =
          typeof haystack === "string"
            ? haystack.indexOf(needle) !== -1
            : Array.prototype.indexOf.call(haystack, needle) !== -1;
        if (!hit) fail((message || "value not found") + ": " + describe(needle) + " in " + describe(haystack));
      },
      throws: function (fn, regex, message) {
        var threw = false;
        try {
          fn();
        } catch (e) {
          threw = true;
          if (regex && !regex.test(String(e && e.message ? e.message : e))) {
            fail((message || "error message does not match " + regex) + ": " + describe(e && e.message));
          }
        }
        if (!threw) fail(message || "expected the function to throw");
      },
      rejects: function (promise, regex, message) {
        return Promise.resolve(promise).then(
          function () {
            fail(message || "expected the promise to reject");
          },
          function (e) {
            if (regex && !regex.test(String(e && e.message ? e.message : e))) {
              fail((message || "rejection message does not match " + regex) + ": " + describe(e && e.message));
            }
          }
        );
      },

      /* DOM helpers */
      $: function (selector, root) {
        return (root || document).querySelector(selector);
      },
      $$: function (selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
      },
      text: function (target) {
        return normalizeText(resolveElement(target).textContent);
      },
      html: function (target) {
        return resolveElement(target).innerHTML;
      },
      fire: function (target, type, init) {
        var el = resolveElement(target);
        var ev = new Event(type, Object.assign({ bubbles: true, cancelable: true }, init || {}));
        el.dispatchEvent(ev);
        return ev;
      },
      click: function (target) {
        var el = resolveElement(target);
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: global }));
      },
      setValue: function (target, value, events) {
        var el = resolveElement(target);
        el.value = value;
        (events || ["input", "keyup", "change"]).forEach(function (type) {
          el.dispatchEvent(new Event(type, { bubbles: true }));
        });
      },

      /* waiting */
      sleep: sleep,
      waitFor: function (fn, predicate, options) {
        if (predicate && typeof predicate !== "function") {
          options = predicate;
          predicate = null;
        }
        options = options || {};
        var timeout = options.timeout || 5000;
        var interval = options.interval || 40;
        var deadline = Date.now() + timeout;
        var lastError = null;
        return new Promise(function (resolve, reject) {
          (function poll() {
            var value;
            try {
              value = fn();
              lastError = null;
              var ok = predicate ? predicate(value) : !isEmptyCollection(value);
              if (ok) return resolve(value);
            } catch (e) {
              lastError = e;
            }
            if (Date.now() >= deadline) {
              return reject(
                new AssertionError(
                  (options.message || "waitFor timed out after " + timeout + " ms") +
                    (lastError ? " (last error: " + lastError.message + ")" : " (last value: " + describe(value) + ")")
                )
              );
            }
            setTimeout(poll, interval);
          })();
        });
      },
      waitForText: function (target, expected, options) {
        return t.waitFor(
          function () {
            var el = typeof target === "string" ? document.querySelector(target) : target;
            return el ? normalizeText(el.textContent) : null;
          },
          function (txt) {
            if (txt == null) return false;
            return expected instanceof RegExp ? expected.test(txt) : txt === expected;
          },
          Object.assign({ message: "text of " + describe(target) + " never became " + describe(String(expected)) }, options || {})
        );
      },
      waitForConsole: function (regex, options) {
        return t.waitFor(
          function () {
            return state.console.filter(function (m) {
              return regex.test(m.text);
            });
          },
          Object.assign({ message: "no console message matched " + regex }, options || {})
        );
      },
      consoleMessages: function (regex) {
        return state.console
          .filter(function (m) {
            return !regex || regex.test(m.text);
          })
          .map(function (m) {
            return m.text;
          });
      },
      errors: function (regex) {
        return state.errors.filter(function (e) {
          return !regex || regex.test(e.message);
        });
      },
      waitForError: function (regex, options) {
        return t.waitFor(
          function () {
            return t.errors(regex);
          },
          Object.assign({ message: "no uncaught error matched " + regex }, options || {})
        );
      },

      /* BasisCore helpers */
      source: function (sourceId, wrapper) {
        var w = wrapper || (global.$bc && global.$bc.global);
        var core = w && w.basiscore;
        if (!core || !core.context) return null;
        return core.context.tryToGetSource(sourceId);
      },
      waitForSource: function (sourceId, predicate, options) {
        if (predicate && typeof predicate !== "function") {
          options = predicate;
          predicate = null;
        }
        return t.waitFor(
          function () {
            return t.source(sourceId, options && options.wrapper);
          },
          function (src) {
            return src != null && (!predicate || predicate(src));
          },
          Object.assign({ message: "source " + sourceId + " was never published" }, options || {})
        );
      },
      rows: function (sourceId, wrapper) {
        var src = t.source(sourceId, wrapper);
        return src ? src.rows : null;
      },

      /* bookkeeping */
      note: function (message) {
        test.notes.push(String(message));
      }
    };
    return t;
  }

  /* ------------------------------------------------------------------ */
  /* registration                                                        */
  /* ------------------------------------------------------------------ */

  function register(kind, name, fn, options) {
    var test = {
      kind: kind,
      name: String(name),
      fn: fn,
      timeout: (options && options.timeout) || 15000,
      reason: options && options.reason,
      status: "pending",
      error: null,
      notes: [],
      ms: 0
    };
    state.tests.push(test);
    if (state.started) {
      queue = queue.then(function () {
        return runTest(test);
      }).then(finish);
    }
    return test;
  }

  var api = {
    page: function (meta) {
      if (meta && meta.name) state.name = meta.name;
      if (meta && meta.doc) state.doc = meta.doc;
    },
    test: function (name, fn, options) {
      return register("test", name, fn, options);
    },
    defect: function (name, fn, options) {
      return register("defect", name, fn, options);
    },
    skip: function (name, reason) {
      return register("skip", name, null, { reason: reason });
    },
    allowError: function (regex) {
      state.allowedErrors.push(regex);
    },
    sleep: sleep,
    get state() {
      return state;
    }
  };

  /* ------------------------------------------------------------------ */
  /* execution                                                           */
  /* ------------------------------------------------------------------ */

  function runTest(test) {
    if (test.kind === "skip") {
      test.status = "skipped";
      render();
      return Promise.resolve();
    }
    var started = Date.now();
    var ctx = makeContext(test);
    var timer;
    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(new AssertionError("test timed out after " + test.timeout + " ms"));
      }, test.timeout);
    });
    return Promise.race([
      Promise.resolve().then(function () {
        return test.fn(ctx);
      }),
      timeoutPromise
    ])
      .then(
        function () {
          test.status = test.kind === "defect" ? "defect" : "passed";
        },
        function (e) {
          if (test.kind === "defect") {
            test.status = "fixed";
            test.error =
              "The documented defect no longer reproduces (" +
              (e && e.message ? e.message : e) +
              "). Update docs/troubleshooting.md, README.md and AGENTS.md, then turn this bcTest.defect into bcTest.test.";
          } else {
            test.status = "failed";
            test.error = e && e.message ? e.message : String(e);
            if (e && e.stack && !(e instanceof AssertionError)) test.error += "\n" + e.stack;
          }
        }
      )
      .then(function () {
        clearTimeout(timer);
        test.ms = Date.now() - started;
        render();
      });
  }

  function unexpectedErrors() {
    return state.errors.filter(function (e) {
      return !state.allowedErrors.some(function (re) {
        return re.test(e.message);
      });
    });
  }

  function summary() {
    var counts = { passed: 0, failed: 0, defect: 0, fixed: 0, skipped: 0 };
    state.tests.forEach(function (t) {
      if (counts[t.status] != null) counts[t.status]++;
    });
    var errors = unexpectedErrors();
    var ok = counts.failed === 0 && counts.fixed === 0 && errors.length === 0;
    return {
      name: state.name,
      doc: state.doc,
      url: location.pathname,
      status: state.status,
      ok: ok,
      counts: counts,
      tests: state.tests.map(function (t) {
        return { kind: t.kind, name: t.name, status: t.status, error: t.error, reason: t.reason, notes: t.notes, ms: t.ms };
      }),
      uncaughtErrors: errors.map(function (e) {
        return e.message;
      }),
      expectedErrors: state.errors.length - errors.length,
      console: state.console
    };
  }

  var queue = Promise.resolve();

  function start() {
    if (state.started) return;
    state.started = true;
    state.startedAt = Date.now();
    state.status = "running";
    if (!state.name) {
      state.name = (document.title || location.pathname).replace(/^[✓✗⚠] /, "");
    }
    if (!state.doc && document.body && document.body.getAttribute("data-doc")) {
      state.doc = document.body.getAttribute("data-doc");
    }
    render();
    state.tests.forEach(function (test) {
      queue = queue.then(function () {
        return runTest(test);
      });
    });
    queue = queue.then(finish);
  }

  var finishedCount = -1;
  function finish() {
    // called after the queue drains; a late registration re-enters here
    if (state.tests.some(function (t) { return t.status === "pending"; })) return;
    if (finishedCount === state.tests.length) return;
    finishedCount = state.tests.length;
    state.status = "done";
    var s = summary();
    global.__bcTest = s;
    document.title = (s.ok ? "✓ " : "✗ ") + state.name;
    render();
    console.log("[bc-test] " + JSON.stringify({ ok: s.ok, name: s.name, counts: s.counts, uncaughtErrors: s.uncaughtErrors }));
    try {
      if (global.parent && global.parent !== global) {
        global.parent.postMessage({ type: "bc-test-result", result: s }, "*");
      }
    } catch (e) {
      /* cross-origin parent: ignore */
    }
  }

  /* ------------------------------------------------------------------ */
  /* report rendering                                                    */
  /* ------------------------------------------------------------------ */

  var panel = null;

  function render() {
    if (!document.body) return;
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "bc-test-report";
      document.body.insertBefore(panel, document.body.firstChild);
    }
    var s = summary();
    var rows = state.tests
      .map(function (t) {
        var label =
          t.status === "passed"
            ? "PASS"
            : t.status === "failed"
            ? "FAIL"
            : t.status === "defect"
            ? "KNOWN DEFECT"
            : t.status === "fixed"
            ? "FIXED?"
            : t.status === "skipped"
            ? "SKIP"
            : "...";
        var detail = t.error ? "<pre>" + escapeHtml(t.error) + "</pre>" : "";
        if (t.reason) detail += "<div class=\"bc-test-reason\">" + escapeHtml(t.reason) + "</div>";
        if (t.notes.length) detail += "<div class=\"bc-test-notes\">" + t.notes.map(escapeHtml).join("<br />") + "</div>";
        return (
          "<li class=\"bc-test-" + t.status + "\"><span class=\"bc-test-badge\">" + label + "</span> " +
          escapeHtml(t.name) + (t.ms ? " <small>" + t.ms + " ms</small>" : "") + detail + "</li>"
        );
      })
      .join("");
    var errors = s.uncaughtErrors.length
      ? "<li class=\"bc-test-failed\"><span class=\"bc-test-badge\">FAIL</span> uncaught errors<pre>" +
        escapeHtml(s.uncaughtErrors.join("\n")) + "</pre></li>"
      : "";
    var docLink = state.doc
      ? " &middot; <a href=\"/" + escapeHtml(state.doc) + "\">" + escapeHtml(state.doc) + "</a>"
      : "";
    panel.className = s.status === "done" ? (s.ok ? "bc-test-ok" : "bc-test-ko") : "bc-test-running";
    panel.innerHTML =
      "<header><strong>" + escapeHtml(state.name || "") + "</strong>" + docLink +
      " <span class=\"bc-test-counts\">" + (s.status === "done" ? (s.ok ? "all good" : "FAILURES") : "running") +
      " &middot; " + s.counts.passed + " passed, " + s.counts.failed + " failed, " + s.counts.defect +
      " known defect(s), " + s.counts.fixed + " fixed?, " + s.counts.skipped + " skipped</span></header><ol>" +
      rows + errors + "</ol>";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
    });
  }

  /* ------------------------------------------------------------------ */
  /* bootstrap                                                           */
  /* ------------------------------------------------------------------ */

  if (document.readyState === "complete") {
    setTimeout(start, 0);
  } else {
    global.addEventListener("load", function () {
      // let BasisCore's own load listener run first
      setTimeout(start, 0);
    });
  }

  global.bcTest = api;
})(window);
