self.addEventListener("push", (event) => {
  let payload = { title: "Rappel Beauty", body: "", url: "/" };
  try {
    const data = event.data ? event.data.json() : {};
    if (data && typeof data === "object") {
      payload = {
        title: typeof data.title === "string" ? data.title.slice(0, 120) : payload.title,
        body: typeof data.body === "string" ? data.body.slice(0, 240) : "",
        url: safeUrl(data.url),
      };
    }
  } catch {
    /* payload illisible : notification générique */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(self.clients.openWindow(url));
});

function safeUrl(url) {
  if (typeof url !== "string") return "/";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "/";
}
