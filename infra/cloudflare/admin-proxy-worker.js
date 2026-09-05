/**
 * Cloudflare Worker — admin.rappelbeauty.com → Railway
 * Coller dans Cloudflare → Deploy
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    const originUrl = new URL(
      "https://rappel-beaute-staging.up.railway.app",
    );

    originUrl.pathname = url.pathname;
    originUrl.search = url.search;

    // Pages only — pas les API
    if (
      !url.pathname.startsWith("/api/") &&
      !originUrl.searchParams.has("__host")
    ) {
      originUrl.searchParams.set("__host", "admin");
    }

    const headers = new Headers(request.headers);

    // Next.js doit voir le hostname public admin
    headers.set("X-Forwarded-Host", "admin.rappelbeauty.com");
    headers.set("X-Rappel-Public-Host", "admin.rappelbeauty.com");
    headers.set("X-Rappel-Domain", "admin");
    headers.set("X-Forwarded-Proto", "https");

    // Railway attend son propre Host
    headers.set("Host", originUrl.host);

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    // Lire le body en mémoire — évite body vide sur POST login
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    const response = await fetch(originUrl.toString(), init);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
