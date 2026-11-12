import { NextResponse } from "next/server";
import { runInScope, TenantContextError, type TenantScope } from "@/lib/db/tenant-context";

type RouteResult = Response | Promise<Response>;

function scoped(makeScope: () => TenantScope) {
  return <A extends unknown[], R extends RouteResult>(handler: (...args: A) => R) =>
    async (...args: A): Promise<Awaited<R>> => {
      try {
        return await runInScope(makeScope(), () => handler(...args));
      } catch (error) {
        if (error instanceof TenantContextError) {
          return NextResponse.json(
            { error: "Accès refusé.", code: error.code },
            { status: 403 },
          ) as Awaited<R>;
        }
        throw error;
      }
    };
}

/** Route métier : sans institut fixé par le contrôle de session, l'accès à la base est refusé. */
export const tenantRoute = scoped(() => ({ kind: "tenant", organizationId: null }));

/** Site public, réservation, authentification, webhooks : accès non filtré, à protéger dans le code. */
export const publicRoute = scoped(() => ({ kind: "public", reason: "route publique" }));

/** Back-office plateforme. */
export const platformRoute = scoped(() => ({ kind: "platform", reason: "back-office" }));

/** Cron et webhooks de tâches. */
export const jobRoute = scoped(() => ({ kind: "job", reason: "cron" }));

/** Page ou layout serveur qui lit la base : la portée couvre le rendu de cette fonction. */
export function scopedPage<A extends unknown[], R>(kind: "public" | "platform", page: (...args: A) => R) {
  return (...args: A): R => runInScope({ kind, reason: `page ${kind}` }, () => page(...args));
}
