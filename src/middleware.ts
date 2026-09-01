import { parseSessionTokenEdge } from "@/lib/auth/session-edge";
import { SESSION_COOKIE } from "@/lib/auth/types";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const QUERY_HOST = "__host";
const COOKIE_HOST = "__rappel_host";

type Domain = "www" | "app" | "admin";

function parseDomain(value: string | null | undefined): Domain | null {
  if (value === "www" || value === "app" || value === "admin") return value;
  return null;
}

function domainFromHost(hostHeader: string | null): Domain {
  const hostname = (hostHeader ?? "").split(":")[0].toLowerCase();
  if (hostname.startsWith("app.")) return "app";
  if (hostname.startsWith("admin.")) return "admin";
  return "www";
}

function resolveDomain(request: NextRequest): Domain {
  return (
    parseDomain(request.nextUrl.searchParams.get(QUERY_HOST)) ??
    parseDomain(request.cookies.get(COOKIE_HOST)?.value) ??
    domainFromHost(request.headers.get("host"))
  );
}

const APP_PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/activate"];
const ADMIN_PUBLIC_PATHS = ["/login", "/403"];

function isPublicPath(domain: Domain, path: string): boolean {
  const list = domain === "admin" ? ADMIN_PUBLIC_PATHS : APP_PUBLIC_PATHS;
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

function preserveHostParam(url: URL, domain: Domain) {
  if (domain !== "www") {
    url.searchParams.set(QUERY_HOST, domain);
  }
}

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionTokenEdge(token);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") === "http"
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 308);
  }

  if (path.startsWith("/api/")) {
    return NextResponse.next();
  }

  const domain = resolveDomain(request);
  const queryHost = parseDomain(request.nextUrl.searchParams.get(QUERY_HOST));
  const headers = new Headers(request.headers);
  headers.set("x-rappel-domain", domain);

  const session = await getSession(request);

  if (domain === "app") {
    const isPublic = isPublicPath(domain, path) || path === "/book" || path.startsWith("/book/");
    if (!isPublic) {
      if (!session) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login/";
        loginUrl.searchParams.set("next", path);
        preserveHostParam(loginUrl, domain);
        return NextResponse.redirect(loginUrl);
      }
      if (session.scope === "platform") {
        const forbidden = request.nextUrl.clone();
        forbidden.pathname = "/login/";
        preserveHostParam(forbidden, domain);
        return NextResponse.redirect(forbidden);
      }
    }
  }

  if (domain === "admin") {
    const isPublic = isPublicPath(domain, path);
    if (!isPublic) {
      if (!session || session.scope !== "platform") {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login/";
        preserveHostParam(loginUrl, domain);
        return NextResponse.redirect(loginUrl);
      }
    } else if (session?.scope === "platform" && path.startsWith("/login")) {
      const dash = request.nextUrl.clone();
      dash.pathname = "/dashboard/";
      preserveHostParam(dash, domain);
      return NextResponse.redirect(dash);
    }
  }

  if (domain === "www") {
    const res = NextResponse.next({ request: { headers } });
    if (queryHost) {
      res.cookies.set(COOKIE_HOST, queryHost, { path: "/", sameSite: "lax" });
    }
    return res;
  }

  const url = request.nextUrl.clone();

  if (domain === "admin") {
    url.pathname =
      path === "/" || path === ""
        ? "/domains/admin/dashboard"
        : path.startsWith("/domains/admin")
          ? path
          : `/domains/admin${path}`;
  } else {
    url.pathname =
      path === "/" || path === ""
        ? "/domains/app/dashboard"
        : path.startsWith("/domains/app")
          ? path
          : `/domains/app${path}`;
  }

  const res = NextResponse.rewrite(url, { request: { headers } });
  if (queryHost) {
    res.cookies.set(COOKIE_HOST, queryHost, { path: "/", sameSite: "lax" });
  }
  return res;
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
