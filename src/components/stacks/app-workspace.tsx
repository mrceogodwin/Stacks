import { Download, ExternalLink, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { bumpCounter } from "@/lib/studio";
import type { Tone } from "@/lib/catalog";

export type AppMedia = {
  id: string;
  name: string;
  url?: string | null;
  downloadUrl?: string | null;
  videoUrl?: string | null;
};

function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
  return m?.[1] ?? null;
}

export function AppWorkspace({ app }: { app: AppMedia & { tone?: Tone } }) {
  const [status, setStatus] = useState<string | null>(null);
  const openUrl = app.url?.trim() || "";
  const downloadUrl = app.downloadUrl?.trim() || openUrl;
  const videoUrl = app.videoUrl?.trim() || "";
  const yt = videoUrl ? youtubeId(videoUrl) : null;
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `https://stacks.ng/?app=${app.id}`;
    const u = new URL(window.location.origin);
    u.searchParams.set("app", app.id);
    u.hash = "apps";
    return u.toString();
  }, [app.id]);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: app.name, text: `Get ${app.name} on Stacks`, url: shareUrl });
        setStatus("Shared.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied. Send it to someone to come download.");
    } catch {
      setStatus("Share cancelled.");
    }
  }

  async function download() {
    if (!downloadUrl) {
      setStatus("This app is not ready to download yet.");
      return;
    }
    try {
      await bumpCounter({ data: { kind: "app", id: app.id } });
    } catch {
      /* still open the file */
    }
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
    setStatus("Download opened.");
  }

  function openApp() {
    if (!openUrl) {
      setStatus("This app is not ready to open yet.");
      return;
    }
    window.open(openUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-5 space-y-4">
      {yt ? (
        <iframe
          title={`${app.name} how it works`}
          src={`https://www.youtube.com/embed/${yt}`}
          className="aspect-video w-full rounded-2xl border border-line"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : videoUrl ? (
        <video
          className="aspect-video w-full rounded-2xl border border-line bg-navy"
          src={videoUrl}
          controls
          playsInline
          poster="/founder.png"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">
          How it works video lives here once the film is published.
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => void download()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold"
        >
          <Download className="size-4" />
          Download
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold"
        >
          <Share2 className="size-4" />
          Share link
        </button>
        <button
          type="button"
          onClick={openApp}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold"
        >
          <ExternalLink className="size-4" />
          Open app
        </button>
      </div>
      {status ? <p className="text-xs text-dim">{status}</p> : null}
    </div>
  );
}
