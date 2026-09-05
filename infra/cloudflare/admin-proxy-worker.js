/**
 * Cloudflare Worker — admin.rappelbeauty.com → Railway
 *
 * OBLIGATOIRE : ces headers, sinon Next.js voit Host=*.railway.app → vitrine.
 */
export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const originUrl = new URL("https://rappel-beaute-staging.up.railway.app");
    originUrl.pathname = incomingUrl.pathname;
    originUrl.search = incomingUrl.search;

    if (!originUrl.searchParams.has("__host")) {
      originUrl.searchParams.set("__host", "admin");
    }

    const headers = new Headers(request.headers);
    headers.set("Host", originUrl.host);
    headers.set("X-Forwarded-Host", "admin.rappelbeauty.com");
    headers.set("X-Rappel-Public-Host", "admin.rappelbeauty.com");
    headers.set("X-Rappel-Domain", "admin");
    headers.set("X-Forwarded-Proto", "https");

    return fetch(
      new Request(originUrl.toString(), {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : request.body,
        redirect: "manual",
      }),
    );
  },
};
