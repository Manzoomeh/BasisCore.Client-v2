/// <reference lib="WebWorker" />

// export empty type because of tsc --isolatedModules flag
export type {};
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", function (e) {
  var body;

  if (e.data) {
    body = e.data.text();
  } else {
    body = "Standard Message";
  }

  var options = {
    body: body + " test1...",

    icon: "images/icon-512x512.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: "explore",
        title: "Go interact with this!",
      },
      {
        action: "close",
        title: "Ignore",
      },
    ],
  };

  self.clients
    .matchAll({ includeUncontrolled: true })
    .then(function (allClients) {
      if (allClients.length > 0) {
        for (const client of allClients) {
          client.postMessage(options);
          console.log("send message for ", client);
        }
      } else {
        e.waitUntil(
          self.registration
            .showNotification("Push Notification", options)
            .then((_) => {
              self.clients.openWindow("/").then((client) => {
                client.postMessage(options);
                console.log("send message for ", client);
              });
            })
        );
      }
    });
});

self.addEventListener("notificationclick", function (e) {
  var notification = e.notification;
  var action = e.action;

  if (action === "close") {
    notification.close();
  } else {
    // Some actions
    self.clients.openWindow("http://www.example.com");
    notification.close();
  }
});
