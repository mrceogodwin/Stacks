import { createFileRoute } from "@tanstack/react-router";
import { TOOLS, PREMIUM_TOOLS } from "@/lib/catalog";

export const Route = createFileRoute("/api/tools")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          ok: true,
          tools: TOOLS.map((t) => ({ id: t.id, name: t.name, category: t.category, kind: t.kind })),
          premium: PREMIUM_TOOLS.map((t) => ({ id: t.id, name: t.name, cost: t.cost })),
          flagship: [
            "logo-animator",
            "caption-studio",
            "image-editor",
            "audio-editor",
            "file-converter",
            "media-import",
          ],
        });
      },
    },
  },
});
