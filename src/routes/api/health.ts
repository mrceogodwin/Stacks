import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          ok: true,
          service: "stacks",
          mode: "client-heavy",
          note: "Flagship windows run on the visitor device. API routes are rate-limited.",
        });
      },
    },
  },
});
