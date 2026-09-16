import { createMiddleware } from "@tanstack/react-start";

/** Session if present, null if signed out. Used by public tools that debit a premium wallet. */
export const optionalAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser(context.bearerToken);
    return next({
      context: {
        userId: user?.id ?? null as string | null,
        userEmail: user?.email ?? null as string | null,
      },
    });
  });
