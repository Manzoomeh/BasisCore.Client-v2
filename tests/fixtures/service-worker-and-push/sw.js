/*
 * Service worker used by tests/foundations/service-worker-and-push*.html.
 *
 * It follows the worker contract described in docs/service-worker-and-push.md:
 *   - handle `push` events and forward the JSON payload `{ type, message }`
 *     unchanged to every open page with `client.postMessage(...)`
 *     (`includeUncontrolled: true`, so pages outside the worker's scope or
 *     loaded before the worker took control are included);
 *   - when no page is open, show a notification instead;
 *   - on `notificationclick`, read the payload from `e.notification.data`
 *     (the documented fix for the shipped example, which reads `e.data`).
 *
 * Test hook: a real push event cannot be delivered headless, so a page can
 * post `{ type: "simulate-push", payload }` to the worker and the payload goes
 * through the same `broadcast` function as a real push payload would.
 */
self.addEventListener("install", function () {
  self.skipWaiting();
});

function broadcast(payload) {
  return self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then(function (allClients) {
    if (allClients.length > 0) {
      for (const client of allClients) {
        client.postMessage(payload);
      }
      return true;
    }
    return false;
  });
}

self.addEventListener("push", function (e) {
  const message = e.data ? e.data.json() : { message: "Standard Message" };
  e.waitUntil(
    broadcast(message).then(function (delivered) {
      if (delivered) {
        return;
      }
      const options = {
        body: message.offlineMessage ?? (e.data ? e.data.text() : ""),
        vibrate: [100, 50, 100],
        data: message,
        actions: [{ action: "close", title: "Ignore" }]
      };
      if (message.url) {
        options.actions.push({ action: "explore", title: "Visit" });
      }
      return self.registration.showNotification("Push Notification", options);
    })
  );
});

self.addEventListener("notificationclick", function (e) {
  const notification = e.notification;
  if (e.action === "explore" && notification.data && notification.data.url) {
    e.waitUntil(self.clients.openWindow(notification.data.url).then(() => notification.close()));
  } else {
    notification.close();
  }
});

/* test hook: simulate a push payload from a page */
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "simulate-push") {
    broadcast(e.data.payload);
  }
});
