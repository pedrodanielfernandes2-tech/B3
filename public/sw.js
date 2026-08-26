self.addEventListener("push", (event) => {
  let payload = { title: "Painel B3", body: "Novo alerta" };
  try {
    payload = event.data.json();
  } catch (e) {
    /* usa o payload padrão se não vier JSON */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Painel B3", {
      body: payload.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => "focus" in c);
      if (existing) return existing.focus();
      return self.clients.openWindow("/");
    })
  );
});
