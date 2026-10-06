(function () {
  var script =
    document.currentScript ||
    document.querySelector('script[data-public-id][src*="assistant.js"]');
  if (!script) return;
  var publicId = script.getAttribute("data-public-id");
  if (!publicId) return;
  var base = new URL(script.src);
  var frameUrl =
    new URL("/api/public/assistant/frame/", base).href +
    "?publicId=" +
    encodeURIComponent(publicId);

  var iframe = document.createElement("iframe");
  iframe.title = "Rappel Beauty Assistant";
  iframe.setAttribute(
    "style",
    "position:fixed;right:16px;bottom:16px;width:min(380px,calc(100vw - 32px));height:560px;max-height:calc(100vh - 32px);border:0;border-radius:20px;box-shadow:0 12px 40px rgba(31,26,23,.18);z-index:2147483000;background:#fff7f8;",
  );

  function targetOrigin() {
    try {
      return new URL(frameUrl).origin;
    } catch (error) {
      return base.origin;
    }
  }

  window.addEventListener("message", function (event) {
    var data = event.data || {};
    if (event.source !== iframe.contentWindow) return;
    if (data.source !== "rappel-assistant" || data.type !== "ready") return;
    if (data.publicId !== publicId) return;
    fetch(new URL("/api/public/assistant/session/", base).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: publicId }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (result) {
        if (!iframe.contentWindow) return;
        if (!result.ok || !result.body.token) {
          iframe.contentWindow.postMessage(
            {
              source: "rappel-assistant",
              type: "error",
              message: result.body.error || "Ce site n'est pas autorisé à afficher l'assistant.",
            },
            targetOrigin(),
          );
          return;
        }
        iframe.contentWindow.postMessage(
          { source: "rappel-assistant", type: "session", token: result.body.token },
          targetOrigin(),
        );
      })
      .catch(function () {
        if (!iframe.contentWindow) return;
        iframe.contentWindow.postMessage(
          {
            source: "rappel-assistant",
            type: "error",
            message: "Impossible d'ouvrir l'assistant.",
          },
          targetOrigin(),
        );
      });
  });

  iframe.src = frameUrl;
  document.body.appendChild(iframe);
})();
