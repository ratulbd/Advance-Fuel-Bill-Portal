import { authRouter } from "./auth-router";
import { sheetsRouter } from "./sheets-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  sheets: sheetsRouter,
});

export type AppRouter = typeof appRouter;
