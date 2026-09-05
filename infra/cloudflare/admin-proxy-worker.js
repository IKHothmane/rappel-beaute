/**
 * Cloudflare Worker — admin.rappelbeauty.com → Railway
 *
 * Body POST lu en arrayBuffer pour éviter les body vides (cause fréquente de 401).
 */
export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const originUrl = new URL("https://rappel-beaute-staging.up.railway.app");
    originUrl.pathname = incomingUrl.pathname;
    originUrl.search = incomingUrl.search;

    // __host seulement pour les pages (pas les API)
    if (
      !incomingUrl.pathname.startsWith("/api/") &&
      !originUrl.searchParams.has("__host")
    ) {
      originUrl.searchParams.set("__host", "admin");
    }

    const headers = new Headers(request.headers);
    headers.set("Host", originUrl.host);
    headers.set("X-Forwarded-Host", "admin.rappelbeauty.com");
    headers.set("X-Rappel-Public-Host", "admin.rappelbeauty.com");
    headers.set("X-Rappel-Domain", "admin");
    headers.set("X-Forwarded-Proto", "https");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    return fetch(originUrl.toString(), init);
  },
};
