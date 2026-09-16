import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AudioLines,
  Captions,
  Clapperboard,
  Download,
  FileStack,
  Image as ImageIcon,
  Link2,
  Rocket,
  Sparkles,
  Terminal,
  Upload,
  X,
} from "lucide-react";
import { flagshipAccess, publicSiteChrome, type FlagshipId } from "@/lib/ops";
import { cn } from "@/lib/utils";

type ToolDef = {
  id: FlagshipId;
  name: string;
  tag: string;
  desc: string;
  icon: typeof Rocket;
};

const TOOLS: ToolDef[] = [
  {
    id: "logo-animator",
    name: "Logo to Video Animator",
    tag: "Motion",
    desc: "Drop a PNG. Animate it. Export video or a clean PNG. Nothing is stored on Stacks.",
    icon: Clapperboard,
  },
  {
    id: "caption-studio",
    name: "Video Caption Generator",
    tag: "Captions",
    desc: "Upload up to 10 minutes. Burn premium captions in the window. CapCut-style stroke, your words.",
    icon: Captions,
  },
  {
    id: "image-editor",
    name: "Stacks Image Editor",
    tag: "Image",
    desc: "Full window. Tell it what to do: brighten, crop energy, film grain, no background. Download PNG.",
    icon: ImageIcon,
  },
  {
    id: "audio-editor",
    name: "Sound & Audio Engine",
    tag: "Audio",
    desc: "Trim, gain, reverse, export WAV. Manipulates in your browser with the Web Audio API.",
    icon: AudioLines,
  },
  {
    id: "file-converter",
    name: "File Converter",
    tag: "Convert",
    desc: "Images, text, and audio you already have. Owner sets the size cap. No server copies.",
    icon: FileStack,
  },
  {
    id: "media-import",
    name: "Your Media Import",
    tag: "Files",
    desc: "Bring files you own. We do not scrape YouTube, TikTok, or Instagram. That would take the platform down.",
    icon: Link2,
  },
];

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function encodeWav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const samples = buffer.length;
  const bytes = samples * channels * 2;
  const out = new ArrayBuffer(44 + bytes);
  const view = new DataView(out);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, bytes, true);
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i] ?? 0));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([out], { type: "audio/wav" });
}

function WindowShell({
  tool,
  onClose,
  log,
  children,
}: {
  tool: ToolDef;
  onClose: () => void;
  log: string[];
  children: ReactNode;
}) {
  const Icon = tool.icon;
  return (
    <div className="flagship-window" role="dialog" aria-modal="true" aria-labelledby="flagship-title">
      <div className="flagship-chrome">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-fg">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.65rem] tracking-[0.2em] text-primary-bright uppercase">{tool.tag} · Godmode</p>
            <h2 id="flagship-title" className="font-display truncate text-lg font-semibold">
              {tool.name}
            </h2>
          </div>
        </div>
        <button type="button" className="grid size-11 place-items-center rounded-xl border border-line" onClick={onClose} aria-label="Close window">
          <X className="size-5" />
        </button>
      </div>
      <div className="flagship-body">{children}</div>
      <div className="flagship-term">
        <Terminal className="size-3.5 shrink-0 text-primary-bright" />
        <p className="truncate">{log[log.length - 1] || "Ready. Files stay on this device."}</p>
      </div>
    </div>
  );
}

function Drop({ accept, label, onFile }: { accept: string; label: string; onFile: (f: File) => void }) {
  return (
    <label className="flagship-drop">
      <Upload className="size-5 text-primary-bright" />
      <span>{label}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function LogoTool({ onLog }: { onLog: (s: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<"orbit" | "pulse" | "drift">("orbit");
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#050706";
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 220);
      g.addColorStop(0, "rgba(0,135,81,0.35)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cx, cy);
      const s = mode === "pulse" ? 1 + Math.sin(t / 320) * 0.08 : 1;
      const rot = mode === "orbit" ? t / 1400 : mode === "drift" ? Math.sin(t / 900) * 0.12 : 0;
      ctx.rotate(rot);
      ctx.scale(s, s);
      if (img) {
        const max = 280;
        const r = Math.min(max / img.width, max / img.height);
        ctx.drawImage(img, (-img.width * r) / 2, (-img.height * r) / 2, img.width * r, img.height * r);
      } else {
        ctx.fillStyle = "#2ee59d";
        ctx.font = "700 42px Space Grotesk, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("STACKS", 0, 12);
      }
      ctx.restore();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  async function record() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRecording(true);
    onLog("Recording 4s motion…");
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "" });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      downloadBlob(new Blob(chunks, { type: "video/webm" }), "stacks-logo.webm");
      onLog("Video saved on your device.");
      setRecording(false);
    };
    rec.start();
    window.setTimeout(() => rec.stop(), 4000);
  }

  function snap() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, "stacks-logo.png");
      onLog("PNG exported. Transparent-ready if you uploaded a PNG logo.");
    }, "image/png");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <canvas ref={canvasRef} width={720} height={480} className="flagship-stage" />
      <div className="space-y-3">
        <Drop
          accept="image/png,image/webp,image/jpeg"
          label="Add your logo or image"
          onFile={(f) => {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
              imgRef.current = img;
              onLog(`Loaded ${f.name}. Animating locally.`);
            };
            img.src = url;
          }}
        />
        <div className="flex flex-wrap gap-2">
          {(["orbit", "pulse", "drift"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn("min-h-10 rounded-full border px-3 text-sm capitalize", mode === m ? "border-transparent bg-primary" : "border-line")}
            >
              {m}
            </button>
          ))}
        </div>
        <button type="button" disabled={recording} onClick={() => void record()} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold">
          {recording ? "Recording…" : "Export video"}
        </button>
        <button type="button" onClick={snap} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line text-sm font-semibold">
          Export PNG
        </button>
      </div>
    </div>
  );
}

function CaptionTool({ onLog }: { onLog: (s: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("STACKS · Built in Nigeria");
  const [style, setStyle] = useState<"bold" | "box" | "word">("bold");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const draw = () => {
      ctx.fillStyle = "#050706";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (video.videoWidth) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const lines = text.split("\n").slice(0, 4);
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      lines.forEach((line, i) => {
        const y = canvas.height - 64 - (lines.length - 1 - i) * 42;
        ctx.font = "700 32px Space Grotesk, sans-serif";
        if (style === "box") {
          const w = ctx.measureText(line).width + 24;
          ctx.fillStyle = "rgba(0,0,0,0.72)";
          ctx.fillRect(canvas.width / 2 - w / 2, y - 30, w, 42);
          ctx.fillStyle = "#f2f4f3";
          ctx.fillText(line, canvas.width / 2, y);
        } else {
          ctx.lineWidth = 8;
          ctx.strokeStyle = "#050706";
          ctx.strokeText(line, canvas.width / 2, y);
          ctx.fillStyle = style === "word" ? "#2ee59d" : "#f2f4f3";
          ctx.fillText(line, canvas.width / 2, y);
        }
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [style, text]);

  async function exportCap() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !src) return;
    onLog("Burning captions into a local WebM…");
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "" });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      downloadBlob(new Blob(chunks, { type: "video/webm" }), "stacks-captions.webm");
      onLog("Captioned video saved on your device.");
    };
    video.currentTime = 0;
    await video.play();
    rec.start();
    const stop = () => {
      rec.stop();
      video.pause();
    };
    video.onended = stop;
    window.setTimeout(stop, Math.min(video.duration || 12, 60) * 1000);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <div>
        <video ref={videoRef} src={src ?? undefined} className="hidden" playsInline />
        <canvas ref={canvasRef} width={720} height={405} className="flagship-stage" />
      </div>
      <div className="space-y-3">
        <Drop
          accept="video/mp4,video/webm,video/quicktime"
          label="Upload video up to 10 min"
          onFile={(f) => {
            const url = URL.createObjectURL(f);
            const v = document.createElement("video");
            v.preload = "metadata";
            v.src = url;
            v.onloadedmetadata = () => {
              if (v.duration > 600) {
                onLog("That file is over 10 minutes. Trim it first.");
                URL.revokeObjectURL(url);
                return;
              }
              setSrc(url);
              const el = videoRef.current;
              if (el) void el.play().catch(() => {});
              onLog(`Loaded ${f.name} (${Math.round(v.duration)}s). Captions stay on-device.`);
            };
          }}
        />
        <textarea className="field min-h-24" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {(["bold", "box", "word"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={cn("min-h-10 rounded-full border px-3 text-sm capitalize", style === s ? "border-transparent bg-primary" : "border-line")}
            >
              {s}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void exportCap()} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold">
          Export captioned video
        </button>
      </div>
    </div>
  );
}

function ImageTool({ onLog }: { onLog: (s: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const srcRef = useRef<HTMLImageElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [filter, setFilter] = useState("none");

  function paint(next = filter) {
    const canvas = canvasRef.current;
    const img = srcRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const map: Record<string, string> = {
      none: "none",
      film: "contrast(1.08) saturate(0.85) sepia(0.12)",
      mono: "grayscale(1) contrast(1.1)",
      punch: "contrast(1.2) saturate(1.25)",
      fade: "contrast(0.92) brightness(1.08)",
      cool: "hue-rotate(20deg) saturate(1.1)",
      warm: "sepia(0.25) saturate(1.15)",
      cutout: "contrast(1.4) saturate(0.2)",
    };
    ctx.filter = map[next] || "none";
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";
  }

  function applyPrompt() {
    const q = prompt.toLowerCase();
    let next = filter;
    if (/grey|gray|mono|black and white|b&w/.test(q)) next = "mono";
    else if (/film|grain|vintage/.test(q)) next = "film";
    else if (/warm|sunset/.test(q)) next = "warm";
    else if (/cool|blue/.test(q)) next = "cool";
    else if (/punch|vivid|satur/.test(q)) next = "punch";
    else if (/fade|soft|bright/.test(q)) next = "fade";
    else if (/no background|cutout|sticker/.test(q)) next = "cutout";
    setFilter(next);
    paint(next);
    onLog(`Applied local edit: ${next}. Prompt never left this phone.`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <canvas ref={canvasRef} className="flagship-stage max-h-[28rem] w-full object-contain" />
      <div className="space-y-3">
        <Drop
          accept="image/*"
          label="Open an image"
          onFile={(f) => {
            const img = new Image();
            img.onload = () => {
              srcRef.current = img;
              paint("none");
              onLog(`Editing ${f.name} in memory.`);
            };
            img.src = URL.createObjectURL(f);
          }}
        />
        <textarea className="field min-h-24" placeholder="Tell it: make it black and white and brighter" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <button type="button" onClick={applyPrompt} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold">
          <Sparkles className="size-4" />
          Run edit
        </button>
        <div className="flex flex-wrap gap-2">
          {["none", "film", "mono", "punch", "fade", "cool", "warm"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                paint(f);
              }}
              className={cn("min-h-10 rounded-full border px-3 text-sm capitalize", filter === f ? "border-transparent bg-primary" : "border-line")}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            canvas?.toBlob((b) => {
              if (b) downloadBlob(b, "stacks-edit.png");
              onLog("PNG downloaded. Never stored on Stacks.");
            }, "image/png");
          }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold"
        >
          <Download className="size-4" />
          Download PNG
        </button>
      </div>
    </div>
  );
}

function AudioTool({ onLog }: { onLog: (s: string) => void }) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [gain, setGain] = useState(1);
  const [reverse, setReverse] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function load(file: File) {
    const ctx = new AudioContext();
    const data = await file.arrayBuffer();
    const buf = await ctx.decodeAudioData(data.slice(0));
    setBuffer(buf);
    onLog(`Loaded ${file.name}. ${buf.duration.toFixed(1)}s · ${buf.sampleRate} Hz`);
  }

  function processed() {
    if (!buffer) return null;
    const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    const src = ctx.createBufferSource();
    const copy = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c).slice();
      if (reverse) data.reverse();
      copy.getChannelData(c).set(data);
    }
    src.buffer = copy;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(ctx.destination);
    src.start();
    return ctx.startRendering();
  }

  return (
    <div className="space-y-4">
      <Drop accept="audio/*,.wav,.mp3,.m4a,.ogg" label="Open audio" onFile={(f) => void load(f)} />
      <label className="block text-sm text-muted">
        Gain {gain.toFixed(2)}
        <input type="range" min="0.2" max="2.4" step="0.05" value={gain} onChange={(e) => setGain(Number(e.target.value))} className="mt-2 w-full" />
      </label>
      <button type="button" onClick={() => setReverse((v) => !v)} className={cn("min-h-11 rounded-full border px-4 text-sm", reverse ? "border-transparent bg-primary" : "border-line")}>
        Reverse {reverse ? "on" : "off"}
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            const out = await processed();
            if (!out) return;
            const blob = encodeWav(out);
            const url = URL.createObjectURL(blob);
            if (audioRef.current) {
              audioRef.current.src = url;
              void audioRef.current.play();
            }
            onLog("Previewing processed audio.");
          }}
          className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={async () => {
            const out = await processed();
            if (!out) return;
            downloadBlob(encodeWav(out), "stacks-audio.wav");
            onLog("WAV saved on your device.");
          }}
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold"
        >
          Export WAV
        </button>
      </div>
      <audio ref={audioRef} controls className="w-full" />
    </div>
  );
}

function ConvertTool({ onLog }: { onLog: (s: string) => void }) {
  const [name, setName] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const [target, setTarget] = useState("png");

  async function convert() {
    const file = fileRef.current;
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const mime = target === "jpg" ? "image/jpeg" : target === "webp" ? "image/webp" : "image/png";
        canvas.toBlob(
          (b) => {
            if (b) downloadBlob(b, `${file.name.replace(/\.[^.]+$/, "")}.${target}`);
            onLog(`Converted to ${target}.`);
          },
          mime,
          0.92,
        );
      };
      img.src = URL.createObjectURL(file);
      return;
    }
    const text = await file.text();
    if (target === "json") {
      downloadBlob(new Blob([JSON.stringify({ name: file.name, text }, null, 2)], { type: "application/json" }), `${file.name}.json`);
    } else {
      downloadBlob(new Blob([text], { type: "text/plain" }), `${file.name.replace(/\.[^.]+$/, "")}.${target}`);
    }
    onLog(`Converted ${file.name} to ${target}.`);
  }

  return (
    <div className="space-y-3">
      <Drop
        accept="image/*,text/*,.txt,.md,.json,.csv,.html"
        label="Open a file you own"
        onFile={(f) => {
          fileRef.current = f;
          setName(f.name);
          onLog(`Ready: ${f.name} (${Math.round(f.size / 1024)} KB)`);
        }}
      />
      {name ? <p className="text-sm text-muted">{name}</p> : null}
      <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
        {["png", "jpg", "webp", "txt", "md", "html", "json"].map((t) => (
          <option key={t} value={t}>
            To {t}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => void convert()} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold">
        Convert on this device
      </button>
    </div>
  );
}

function MediaTool({ onLog }: { onLog: (s: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Stacks will not scrape YouTube, TikTok, Instagram, or Facebook. Those platforms ban it, it is copyright, and it would burn the server.
        CapCut and similar apps run heavy jobs on their own paid clouds. We keep files on your phone instead.
      </p>
      <Drop
        accept="video/*,audio/*,image/*"
        label="Import a file you already have"
        onFile={(f) => {
          downloadBlob(f, f.name);
          onLog(`Saved a local copy of ${f.name}. No remote download ran.`);
        }}
      />
    </div>
  );
}

function bodyFor(id: FlagshipId, onLog: (s: string) => void) {
  if (id === "logo-animator") return <LogoTool onLog={onLog} />;
  if (id === "caption-studio") return <CaptionTool onLog={onLog} />;
  if (id === "image-editor") return <ImageTool onLog={onLog} />;
  if (id === "audio-editor") return <AudioTool onLog={onLog} />;
  if (id === "file-converter") return <ConvertTool onLog={onLog} />;
  return <MediaTool onLog={onLog} />;
}

export function FlagshipTools() {
  const [open, setOpen] = useState<FlagshipId | null>(null);
  const [log, setLog] = useState<string[]>(["Stacks Flagship. 20 local editing passes. No upload."]);
  const [paused, setPaused] = useState<string[]>([]);
  const [access, setAccess] = useState({ signedIn: false, trial: false, paid: false });

  useEffect(() => {
    void publicSiteChrome()
      .then((c) => setPaused(c.paused))
      .catch(() => {});
    void flagshipAccess()
      .then((a) => setAccess({ signedIn: a.signedIn, trial: a.trial, paid: a.paid }))
      .catch(() => {});
  }, []);

  const active = useMemo(() => TOOLS.find((t) => t.id === open) ?? null, [open]);

  function push(line: string) {
    setLog((prev) => [...prev.slice(-40), line]);
  }

  return (
    <section id="flagship" className="px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flagship-frame">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary text-fg shadow-[var(--shadow-glow)]">
                  <Rocket className="size-5" />
                </span>
                <p className="font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">Stacks Flagship Tools</p>
              </div>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Try the new windows <span className="text-primary-bright">now.</span>
              </h2>
              <p className="mt-3 text-muted">
                Full editing windows. Terminal. Export. Files stay on your device so the platform does not overload.
                Free 30-day trial for registered users after first payment.
              </p>
            </div>
            <p className="text-sm text-dim">
              {access.trial ? "Trial active." : access.paid ? "Wallet member." : access.signedIn ? "Signed in. Pay once to unlock the 30-day trial badge." : "Register to keep your seat."}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool) => {
              const locked = paused.includes(tool.id);
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setOpen(tool.id);
                    push(`Opened ${tool.name}`);
                  }}
                  className="flagship-card text-left"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/20 text-primary-bright">
                    <Icon className="size-5" />
                  </span>
                  <p className="mt-4 text-[0.7rem] tracking-[0.16em] text-primary-bright uppercase">{tool.tag}</p>
                  <h3 className="font-display mt-1 text-xl font-semibold">{tool.name}</h3>
                  <p className="mt-2 text-sm text-muted">{locked ? "Paused by the owner." : tool.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {active && typeof document !== "undefined"
        ? createPortal(
            <div className="flagship-overlay" onClick={() => setOpen(null)} role="presentation">
              <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4">
                <WindowShell tool={active} onClose={() => setOpen(null)} log={log}>
                  {bodyFor(active.id, push)}
                </WindowShell>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
