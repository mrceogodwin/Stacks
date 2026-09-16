import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  FileCode,
  FileDown,
  FileText,
  Heart,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { downloadTextResult, downloadUrlFile } from "@/lib/export-result";
import { pollPublishedVideo, runPublishedTool } from "@/lib/studio";
import { fillToolTemplate, isPremiumTool, kindForCategory, toolCost, type StacksTool, type ToolKind } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const FAV_KEY = "stacks-tool-favs";
const SAVE_KEY = "stacks-tool-saves";

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyFields(tool: StacksTool): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of tool.inputs ?? []) next[field.name] = "";
  return next;
}

export function ToolWorkspace({ tool }: { tool: StacksTool & { kind?: ToolKind } }) {
  const kind = tool.kind ?? kindForCategory(tool.category);
  const fieldsDef = tool.inputs?.length ? tool.inputs : null;
  const [prompt, setPrompt] = useState("");
  const [fields, setFields] = useState<Record<string, string>>(() => emptyFields(tool));
  const [out, setOut] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const premium = isPremiumTool(tool);
  const cost = toolCost(tool);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fav, setFav] = useState(() => readList(FAV_KEY).includes(tool.id));

  const canShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  function packedInput() {
    if (fieldsDef) {
      const filled = { ...fields };
      if (kind !== "chat" && prompt.trim() && !filled.prompt) filled.prompt = prompt.trim();
      return filled;
    }
    return { prompt: prompt.trim() };
  }

  async function pollVideo(requestId: string) {
    for (let i = 0; i < 18; i++) {
      setStatus(`Rendering video… ${i + 1}/18`);
      await wait(4000);
      const poll = await pollPublishedVideo({ data: { requestId } });
      if (!poll.ok) {
        setStatus(poll.error);
        return;
      }
      if (poll.status === "done" && poll.videoUrl) {
        setVideoUrl(poll.videoUrl);
        setOut(null);
        setStatus("Video ready. Download MP4 below.");
        return;
      }
    }
    setStatus("Video is still rendering. Hit Run again in a moment.");
  }

  async function run() {
    const packed = packedInput();
    const missing = (fieldsDef ?? []).filter((f) => f.required && !packed[f.name]?.trim());
    if (missing.length) {
      setStatus(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    const input =
      tool.userPromptTemplate && fieldsDef
        ? fillToolTemplate(tool.userPromptTemplate, packed)
        : packed.prompt || Object.values(packed).filter(Boolean).join("\n");
    if (!input) {
      setStatus("Tell the tool what you need first.");
      return;
    }
    setBusy(true);
    setStatus(kind === "video" ? "Starting video…" : kind === "audio" ? "Mixing audio…" : "Running…");
    try {
      const res = await runPublishedTool({ data: { toolId: tool.id, input, fields: packed } });
      if (!res.ok) {
        setOut(null);
        setImageUrl(null);
        setVideoUrl(null);
        setAudioUrl(null);
        setStatus(
          "login" in res && res.login
            ? "Premium tools need an account. Open Account, register, pay, then run again."
            : res.error,
        );
        return;
      }
      setImageUrl(res.imageUrl || null);
      setVideoUrl(res.videoUrl || null);
      setAudioUrl(res.audioUrl || null);
      if (res.requestId) {
        setOut(null);
        await pollVideo(res.requestId);
        return;
      }
      setOut(kind === "image" || kind === "video" || kind === "audio" ? null : res.text || null);
      if (kind === "image") setStatus(res.imageUrl ? "Image ready. Download PNG below." : "No image returned.");
      else if (kind === "video") setStatus(res.videoUrl ? "Video ready. Download MP4 below." : "No video returned.");
      else if (kind === "audio") setStatus(res.audioUrl ? "Audio ready. Download WAV below." : "No audio returned.");
      else setStatus("Ready. Download as DOC, PDF, TXT or HTML.");
    } catch {
      setStatus("Could not reach the tool.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadResult() {
    if (kind === "audio") {
      if (!audioUrl) {
        setStatus("Run the audio tool first.");
        return;
      }
      await downloadUrlFile(audioUrl, `${tool.id}.wav`);
      setStatus("Audio download started.");
      return;
    }
    if (kind === "video") {
      if (!videoUrl) {
        setStatus("Run the video tool first.");
        return;
      }
      await downloadUrlFile(videoUrl, `${tool.id}.mp4`);
      setStatus("Video download started.");
      return;
    }
    if (kind === "image") {
      if (!imageUrl) {
        setStatus("Run the image tool first.");
        return;
      }
      await downloadUrlFile(imageUrl, `${tool.id}.png`);
      setStatus("Image download started.");
      return;
    }
    if (!out) {
      setStatus("Run the tool first.");
      return;
    }
    downloadTextResult(tool.name, out, "doc");
    setStatus("Downloaded as DOC.");
  }

  function downloadFormat(format: "txt" | "pdf" | "html" | "doc") {
    if (!out) {
      setStatus("Run the tool first.");
      return;
    }
    downloadTextResult(tool.name, out, format);
    setStatus(`Downloaded as ${format.toUpperCase()}.`);
  }

  async function copyResult() {
    const text = videoUrl || imageUrl || audioUrl || out;
    if (!text) {
      setStatus("Run the tool first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied.");
    } catch {
      setStatus("Could not copy.");
    }
  }

  async function shareResult() {
    const text = out || videoUrl || imageUrl || audioUrl || `${tool.name} on Stacks`;
    try {
      if (canShare) {
        await navigator.share({ title: tool.name, text, url: "https://stacks.ng" });
        setStatus("Shared.");
        return;
      }
      await navigator.clipboard.writeText(`${tool.name}\n${text}\nhttps://stacks.ng`);
      setStatus("Share text copied.");
    } catch {
      setStatus("Share cancelled.");
    }
  }

  function saveResult() {
    if (!out && !imageUrl && !videoUrl && !audioUrl) {
      setStatus("Run the tool first.");
      return;
    }
    const saves = readList(SAVE_KEY);
    const payload = JSON.stringify({
      id: tool.id,
      name: tool.name,
      out,
      imageUrl,
      videoUrl,
      audioUrl,
      at: Date.now(),
    });
    try {
      localStorage.setItem(`${SAVE_KEY}:${tool.id}`, payload);
      writeList(SAVE_KEY, Array.from(new Set([tool.id, ...saves])));
      setStatus("Saved on this device.");
    } catch {
      setStatus("Could not save.");
    }
  }

  function toggleFav() {
    const ids = readList(FAV_KEY);
    const next = fav ? ids.filter((id) => id !== tool.id) : Array.from(new Set([tool.id, ...ids]));
    writeList(FAV_KEY, next);
    setFav(!fav);
    setStatus(fav ? "Removed from favorites." : "Saved to favorites.");
  }

  const downloadLabel = kind === "video" ? "MP4" : kind === "image" ? "PNG" : kind === "audio" ? "WAV" : "Download";

  const actions = [
    {
      label: busy ? "Running" : "Run",
      icon: Sparkles,
      onClick: () => void run(),
      primary: true,
    },
    {
      label: "Regenerate",
      icon: RefreshCw,
      onClick: () => void run(),
    },
    { label: downloadLabel, icon: Download, onClick: () => void downloadResult() },
    { label: "Copy", icon: Copy, onClick: () => void copyResult() },
    { label: "Share", icon: Share2, onClick: () => void shareResult() },
    { label: "Save", icon: Save, onClick: saveResult },
    {
      label: fav ? "Saved" : "Favorite",
      icon: Heart,
      onClick: toggleFav,
    },
    {
      label: "Clear",
      icon: Trash2,
      onClick: () => {
        setOut(null);
        setImageUrl(null);
        setVideoUrl(null);
        setAudioUrl(null);
        setPrompt("");
        setFields(emptyFields(tool));
        setStatus("Cleared.");
      },
    },
  ];

  return (
    <div className="mt-5 space-y-3">
      {premium ? (
        <p className="rounded-2xl border border-line bg-navy/50 px-4 py-3 text-sm text-muted">
          Premium · {cost} generation{cost === 1 ? "" : "s"} per run.{" "}
          <a href="/account" className="font-semibold text-primary-bright">
            Wallet & payment
          </a>
        </p>
      ) : null}
      {fieldsDef ? (
        <div className="grid gap-3">
          {fieldsDef.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.14em] text-dim uppercase">
                {field.label}
                {field.required ? <span className="text-primary-bright"> *</span> : null}
              </span>
              {field.type === "select" ? (
                <select
                  className="field"
                  value={fields[field.name] ?? ""}
                  onChange={(e) => setFields((prev) => ({ ...prev, [field.name]: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  className="field min-h-24"
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  value={fields[field.name] ?? ""}
                  onChange={(e) => setFields((prev) => ({ ...prev, [field.name]: e.target.value }))}
                />
              ) : (
                <input
                  type={field.type === "url" ? "url" : "text"}
                  className="field"
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  value={fields[field.name] ?? ""}
                  onChange={(e) => setFields((prev) => ({ ...prev, [field.name]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          className="field min-h-24"
          placeholder={
            kind === "video"
              ? "Describe the video you want…"
              : kind === "image"
                ? "Describe the image you want…"
                : "Tell the tool what you need…"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              disabled={busy && action.label !== "Clear"}
              onClick={action.onClick}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold",
                action.primary
                  ? "border-transparent bg-primary text-fg"
                  : "border-line bg-white/5 text-fg hover:border-primary-bright/40",
              )}
            >
              <Icon className={cn("size-3.5", action.label === "Saved" && "fill-current")} />
              {action.label}
            </button>
          );
        })}
      </div>
      {status ? (
        <p className="text-xs text-dim">
          {status}{" "}
          {status.toLowerCase().includes("account") ? (
            <a href="/account" className="text-primary-bright">
              Open Account
            </a>
          ) : null}
        </p>
      ) : null}
      {imageUrl ? (
        <div className="space-y-3">
          <img src={imageUrl} alt="" className="mt-2 w-full rounded-2xl" />
          <button
            type="button"
            onClick={() => void downloadResult()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:border-primary-bright/40"
          >
            <ImageIcon className="size-3.5" />
            Download PNG
          </button>
        </div>
      ) : null}
      {videoUrl ? (
        <div className="space-y-3">
          <video src={videoUrl} controls playsInline className="mt-2 w-full rounded-2xl" />
          <button
            type="button"
            onClick={() => void downloadResult()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:border-primary-bright/40"
          >
            <Video className="size-3.5" />
            Download MP4
          </button>
        </div>
      ) : null}
      {audioUrl ? (
        <div className="space-y-3">
          <audio src={audioUrl} controls className="mt-2 w-full" />
          <button
            type="button"
            onClick={() => void downloadResult()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:border-primary-bright/40"
          >
            <Download className="size-3.5" />
            Download WAV
          </button>
        </div>
      ) : null}
      {out && kind === "chat" ? (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap rounded-2xl border border-line bg-navy/60 p-4 text-sm text-muted">{out}</p>
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.16em] text-dim uppercase">Download this result</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadFormat("doc")}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:border-primary-bright/40"
              >
                <FileText className="size-3.5" />
                DOC
              </button>
              <button
                type="button"
                onClick={() => downloadFormat("pdf")}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:border-primary-bright/40"
              >
                <FileDown className="size-3.5" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => downloadFormat("txt")}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:border-primary-bright/40"
              >
                <FileText className="size-3.5" />
                TXT
              </button>
              <button
                type="button"
                onClick={() => downloadFormat("html")}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:border-primary-bright/40"
              >
                <FileCode className="size-3.5" />
                HTML
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
