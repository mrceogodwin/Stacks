import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  ICONS,
  TONES,
  TOOL_FILTERS,
  iconForCategory,
  kindForCategory,
  toneForCategory,
  type IconName,
  type Tone,
  type ToolKind,
} from "@/lib/catalog";
import { KEY_CAP, PROVIDERS } from "@/lib/providers";
import {
  deleteStudioApp,
  deleteStudioKey,
  deleteStudioTool,
  importStudioTools,
  listSubscribers,
  listStudioApps,
  listStudioKeys,
  listStudioTools,
  saveStudioApp,
  saveStudioKey,
  saveStudioKeysBulk,
  saveStudioTool,
  seedStudioCatalog,
  studioHealth,
  toggleStudioKey,
  listCounters,
  type StudioApp,
  type StudioKey,
  type StudioTool,
} from "@/lib/studio";
import {
  amIStudioOwner,
  listPaymentClaims,
  reviewPayment,
  saveCryptoSettings,
} from "@/lib/premium";
import { IconBlock } from "@/components/stacks/icon-block";
import { StacksLogo } from "@/components/stacks/logo";
import { ThemeToggle } from "@/components/stacks/theme-toggle";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

type Tab = "apps" | "tools" | "keys" | "list" | "pay";

export function StudioAdmin() {
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<Tab>("apps");
  const [apps, setApps] = useState<StudioApp[]>([]);
  const [tools, setTools] = useState<StudioTool[]>([]);
  const [keys, setKeys] = useState<StudioKey[]>([]);
  const [subs, setSubs] = useState<{ email: string; created_at: string }[]>([]);
  const [platformGrok, setPlatformGrok] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [totals, setTotals] = useState({ downloads: 0, uses: 0 });
  const [owner, setOwner] = useState<boolean | null>(null);

  async function refresh() {
    const [a, t, k, health, counters, people] = await Promise.all([
      listStudioApps(),
      listStudioTools(),
      listStudioKeys(),
      studioHealth(),
      listCounters(),
      listSubscribers(),
    ]);
    setApps(a);
    setTools(t);
    setKeys(k);
    setSubs(people);
    setPlatformGrok(health.platformGrok);
    setTotals({
      downloads: Object.values(counters.apps).reduce((n, v) => n + v, 0),
      uses: Object.values(counters.tools).reduce((n, v) => n + v, 0),
    });
  }

  useEffect(() => {
    if (user) {
      void amIStudioOwner()
        .then((res) => setOwner(res.owner))
        .catch(() => setOwner(false));
      void refresh().catch((err: unknown) => {
        setStatus(err instanceof Error ? err.message : "Could not load studio");
      });
    }
  }, [user]);

  const readyCount = useMemo(() => {
    return tools.filter((tool) => isToolReady(tool, keys, platformGrok)).length;
  }, [tools, keys, platformGrok]);

  if (isPending) {
    return <div className="min-h-screen bg-bg-deep p-8 text-muted">Loading studio…</div>;
  }
  if (!user) return <RedirectToSignIn />;
  if (owner === false) {
    return (
      <div className="min-h-screen bg-bg-deep p-8 text-muted">
        This console is for the owner. Premium members use Account.
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-deep text-fg">
      <div className="stacks-atmosphere pointer-events-none fixed inset-0" aria-hidden="true" />
      <header className="relative z-10 border-b border-white/5 bg-bg-deep/55 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <StacksLogo />
            </Link>
            <span className="text-xs tracking-[0.2em] text-primary-bright uppercase">Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://stacks.ng" className="hidden text-sm text-muted sm:block">
              stacks.ng
            </a>
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
          Super admin · stacks.ng
        </p>
        <h1 className="font-display text-3xl font-semibold">The control room</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Upload apps, thumbnails, how-it-works films, download links, prompts, and up to {KEY_CAP} API keys.
          Visitors never see this screen.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Stat label="Apps" value={String(apps.length)} hint="Live in the gallery" />
          <Stat label="Tools" value={String(tools.length)} hint={`${readyCount} ready to run`} />
          <Stat label="Downloads" value={String(totals.downloads)} hint="Apps opened on the public site" />
          <Stat label="Tool runs" value={String(totals.uses)} hint="Times a tool was opened" />
          <Stat label="API keys" value={`${keys.length}/${KEY_CAP}`} hint="Rotate under rate limits" />
          <Stat label="Updates list" value={String(subs.length)} hint="Emails for new apps" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["apps", "tools", "keys", "list", "pay"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold capitalize",
                tab === id ? "bg-primary text-fg" : "border border-line text-muted",
              )}
            >
              {id === "keys"
                ? `Keys (${keys.length}/${KEY_CAP})`
                : id === "list"
                  ? `List (${subs.length})`
                  : id === "pay"
                    ? "Premium"
                    : id}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full border border-line px-4 py-2 text-sm"
            onClick={async () => {
              try {
                const res = await seedStudioCatalog();
                setStatus(res.seeded ? "Starter catalog imported." : "Catalog already in your studio.");
                await refresh();
              } catch (err: unknown) {
                setStatus(err instanceof Error ? err.message : "Import failed.");
              }
            }}
          >
            Import starter catalog
          </button>
        </div>
        {status ? <p className="mt-3 text-sm text-primary-bright">{status}</p> : null}

        {tab === "apps" ? <AppsPanel apps={apps} onChange={refresh} /> : null}
        {tab === "tools" ? (
          <ToolsPanel
            tools={tools}
            keys={keys}
            platformGrok={platformGrok}
            onChange={refresh}
            onStatus={setStatus}
          />
        ) : null}
        {tab === "keys" ? <KeysPanel keys={keys} onChange={refresh} onStatus={setStatus} /> : null}
        {tab === "pay" ? <PremiumPanel onStatus={setStatus} /> : null}
        {tab === "list" ? (
          <div className="mt-8 glass-card rounded-3xl p-5">
            <h2 className="font-display text-xl font-semibold">New-app updates</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              People who asked to hear when you publish a new app. {subs.length} on the list.
            </p>
            {subs.length === 0 ? (
              <p className="text-sm text-dim">Nobody yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {subs.map((s) => (
                  <li key={s.email} className="flex justify-between gap-4 border-b border-line py-2">
                    <span>{s.email}</span>
                    <span className="text-dim">{s.created_at.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-[0.7rem] tracking-[0.18em] text-dim uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function isToolReady(tool: StudioTool, keys: StudioKey[], platformGrok: boolean) {
  if (!tool.prompt) return false;
  if (keys.some((k) => k.active && k.provider === tool.provider)) return true;
  if ((tool.provider === "xai" || tool.provider === "grok") && platformGrok) return true;
  return keys.some((k) => k.active);
}

function TonePicker({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TONES.map((t) => (
        <button
          key={t}
          type="button"
          aria-label={t}
          className={cn("tone-swatch", `tone-${t}`, value === t && "ring-2 ring-fg")}
          onClick={() => onChange(t)}
        />
      ))}
    </div>
  );
}

function AppsPanel({ apps, onChange }: { apps: StudioApp[]; onChange: () => Promise<void> }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("App");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [long, setLong] = useState("");
  const [tone, setTone] = useState<Tone>("navy");
  const [icon, setIcon] = useState<IconName>("spark");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setEditing(null);
    setName("");
    setCategory("App");
    setDesc("");
    setUrl("");
    setDownloadUrl("");
    setVideoUrl("");
    setLong("");
    setTone("navy");
    setIcon("spark");
    setThumbnail(null);
  }

  function load(app: StudioApp) {
    setEditing(app.id);
    setName(app.name);
    setCategory(app.category);
    setDesc(app.desc);
    setUrl(app.url);
    setDownloadUrl(app.downloadUrl);
    setVideoUrl(app.videoUrl);
    setLong(app.long);
    setTone(app.tone);
    setIcon(app.icon);
    setThumbnail(app.thumbnail);
  }

  async function onThumb(file: File | undefined) {
    if (!file) return;
    if (file.size > 280000) {
      alert("Keep thumbnails under 280KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setThumbnail(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form
        className="glass-card space-y-3 rounded-3xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await saveStudioApp({
              data: {
                id: editing ?? undefined,
                name,
                category,
                desc,
                long: long || desc,
                url,
                downloadUrl,
                videoUrl,
                tone,
                icon,
                thumbnail,
                published: true,
              },
            });
            reset();
            await onChange();
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="font-display text-xl font-semibold">
          {editing ? "Edit app" : "+ Add app"}
        </h2>
        <p className="text-sm text-muted">
          Everything here shows on the public gallery: look, links, film, and download.
        </p>
        <input className="field" placeholder="App name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          className="field"
          placeholder="Category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setTone(toneForCategory(e.target.value));
            setIcon(iconForCategory(e.target.value));
          }}
        />
        <textarea className="field min-h-24" placeholder="Short description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <textarea className="field min-h-24" placeholder="How it works copy" value={long} onChange={(e) => setLong(e.target.value)} />
        <p className="pt-1 text-xs tracking-[0.16em] text-dim uppercase">Links visitors use</p>
        <input className="field" placeholder="Open app URL  https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className="field" placeholder="Download URL  (apk, store, file)" value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} />
        <input className="field" placeholder="How it works video URL  (mp4 or YouTube)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        <p className="pt-1 text-xs tracking-[0.16em] text-dim uppercase">Look on the gallery</p>
        <div>
          <p className="mb-2 text-sm text-muted">3D icon color</p>
          <TonePicker value={tone} onChange={setTone} />
        </div>
        <select className="field" value={icon} onChange={(e) => setIcon(e.target.value as IconName)}>
          {ICONS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <label className="block text-sm text-muted">
          Thumbnail (shows in the grid)
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-sm"
            onChange={(e) => void onThumb(e.target.files?.[0])}
          />
        </label>
        {thumbnail ? <img src={thumbnail} alt="" className="h-24 w-24 rounded-2xl object-cover" /> : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold">
            {busy ? "Saving…" : editing ? "Save app" : (
              <>
                <Plus className="size-4" />
                Add app
              </>
            )}
          </button>
          {editing ? (
            <button type="button" className="h-11 rounded-full border border-line px-5 text-sm" onClick={reset}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <div className="space-y-3">
        {apps.length === 0 ? <p className="text-sm text-muted">No apps yet. Import the starter catalog or add one.</p> : null}
        {apps.map((app) => (
          <article key={app.id} className="glass-card flex gap-3 overflow-hidden rounded-2xl p-4">
            {app.thumbnail ? (
              <img src={app.thumbnail} alt="" className="size-16 rounded-xl object-cover" />
            ) : (
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden">
                <IconBlock icon={app.icon} tone={app.tone} size="sm" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{app.name}</h3>
              <p className="text-sm text-muted">{app.desc}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" className="text-sm text-primary-bright" onClick={() => load(app)}>
                Edit
              </button>
              <button
                type="button"
                className="text-sm text-muted hover:text-fg"
                onClick={async () => {
                  await deleteStudioApp({ data: { id: app.id } });
                  if (editing === app.id) reset();
                  await onChange();
                }}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ToolsPanel({
  tools,
  keys,
  platformGrok,
  onChange,
  onStatus,
}: {
  tools: StudioTool[];
  keys: StudioKey[];
  platformGrok: boolean;
  onChange: () => Promise<void>;
  onStatus: (s: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Writing");
  const [desc, setDesc] = useState("");
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("xai");
  const [kind, setKind] = useState<ToolKind>("chat");
  const [model, setModel] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tone, setTone] = useState<Tone>("sky");
  const [icon, setIcon] = useState<IconName>("pen");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [bulk, setBulk] = useState("");

  function reset() {
    setEditing(null);
    setName("");
    setCategory("Writing");
    setDesc("");
    setPrompt("");
    setProvider("xai");
    setKind("chat");
    setModel("");
    setVideoUrl("");
    setTone("sky");
    setIcon("pen");
  }

  function load(tool: StudioTool) {
    setEditing(tool.id);
    setName(tool.name);
    setCategory(tool.category);
    setDesc(tool.desc);
    setPrompt(tool.prompt);
    setProvider(tool.provider);
    setKind(tool.kind);
    setModel(tool.model);
    setVideoUrl(tool.videoUrl);
    setTone(tool.tone);
    setIcon(tool.icon);
  }

  const visible = tools.filter((t) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.provider.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <form
          className="glass-card space-y-3 rounded-3xl p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await saveStudioTool({
                data: {
                  id: editing ?? undefined,
                  name,
                  category,
                  desc,
                  long: desc,
                  tone,
                  icon,
                  prompt,
                  provider,
                  published: true,
                  kind,
                  model,
                  videoUrl,
                },
              });
              reset();
              await onChange();
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="font-display text-xl font-semibold">{editing ? "Edit tool" : "New tool"}</h2>
          <input className="field" placeholder="Tool name" value={name} onChange={(e) => setName(e.target.value)} required />
          <select
            className="field"
            value={category}
            onChange={(e) => {
              const next = e.target.value;
              setCategory(next);
              setTone(toneForCategory(next));
              setIcon(iconForCategory(next));
              setKind(kindForCategory(next));
            }}
          >
            {TOOL_FILTERS.filter((f) => f !== "All").map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <textarea className="field min-h-20" placeholder="One-line description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <textarea
            className="field min-h-32"
            placeholder="System prompt this tool will send to the model"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field" value={provider} onChange={(e) => setProvider(e.target.value)}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as ToolKind)}>
              <option value="chat">Text (emails, copy, SEO)</option>
              <option value="image">Image — downloads PNG</option>
              <option value="video">Video — downloads MP4</option>
            </select>
          </div>
          <input
            className="field"
            placeholder="Model override (optional)"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <input
            className="field"
            placeholder="How it works video URL  (mp4 or YouTube)"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <div>
            <p className="mb-2 text-sm text-muted">3D icon color. Keep these mixed, not all green.</p>
            <TonePicker value={tone} onChange={setTone} />
          </div>
          <select className="field" value={icon} onChange={(e) => setIcon(e.target.value as IconName)}>
            {ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3 overflow-hidden py-1">
            <div className="grid size-16 place-items-center overflow-hidden">
              <IconBlock icon={icon} tone={tone} />
            </div>
            <p className="text-sm text-muted">Preview of the 3D mark on the public grid.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="h-11 rounded-full bg-primary px-5 text-sm font-semibold">
              {busy ? "Saving…" : editing ? "Save tool" : "Publish tool"}
            </button>
            {editing ? (
              <button type="button" className="h-11 rounded-full border border-line px-5 text-sm" onClick={reset}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <form
          className="glass-card space-y-3 rounded-3xl p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = parseToolPaste(bulk);
            if (parsed.length === 0) {
              onStatus("Nothing to import. Use TSV: name, category, description, prompt, provider.");
              return;
            }
            const res = await importStudioTools({ data: { tools: parsed } });
            onStatus(`Imported ${res.added} tools.`);
            setBulk("");
            await onChange();
          }}
        >
          <h2 className="font-display text-lg font-semibold">Bulk import (up to 200 at a time)</h2>
          <p className="text-sm text-muted">
            Paste TSV lines: name, category, description, prompt, provider. Repeat to reach 500.
          </p>
          <textarea
            className="field min-h-28 font-mono text-xs"
            placeholder={"Email Writer\tMarketing\tWrite emails\tYou are an email copywriter…\txai"}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          />
          <button type="submit" className="h-11 rounded-full border border-line px-5 text-sm font-semibold">
            Import tools
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <input
          className="field"
          placeholder={`Search ${tools.length} tools…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {visible.length === 0 ? <p className="text-sm text-muted">No tools yet.</p> : null}
        {visible.map((tool) => {
          const ready = isToolReady(tool, keys, platformGrok);
          return (
            <article key={tool.id} className="glass-card overflow-hidden rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden">
                  <IconBlock icon={tool.icon} tone={tool.tone} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{tool.name}</h3>
                      <p className="text-sm text-muted">
                        {tool.category} · {tool.provider} · {tool.kind}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.7rem]",
                        ready ? "bg-primary/20 text-primary-bright" : "bg-white/5 text-dim",
                      )}
                    >
                      {ready ? "Ready" : "Needs key"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-dim">{tool.prompt}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button type="button" className="text-sm text-primary-bright" onClick={() => load(tool)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-muted hover:text-fg"
                    onClick={async () => {
                      await deleteStudioTool({ data: { id: tool.id } });
                      if (editing === tool.id) reset();
                      await onChange();
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function KeysPanel({
  keys,
  onChange,
  onStatus,
}: {
  keys: StudioKey[];
  onChange: () => Promise<void>;
  onStatus: (s: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState("groq");
  const [secret, setSecret] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bulk, setBulk] = useState("");
  const meta = PROVIDERS.find((p) => p.id === provider);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <form
          className="glass-card space-y-3 rounded-3xl p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const res = await saveStudioKey({
              data: { label, provider, secret, model, baseUrl: provider === "custom" ? baseUrl : "" },
            });
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setLabel("");
            setSecret("");
            setModel("");
            setBaseUrl("");
            await onChange();
          }}
        >
          <h2 className="font-display text-xl font-semibold">Add an API key</h2>
          <p className="text-sm text-muted">
            Up to {KEY_CAP} keys. I cannot invent or scrape free keys — every real provider requires an account you own. Paste yours here and replace anytime.
          </p>
          <ul className="space-y-1 text-xs text-dim">
            <li>
              Groq (free chat) —{" "}
              <a className="text-primary-bright" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                console.groq.com/keys
              </a>
            </li>
            <li>
              Google Gemini (free chat) —{" "}
              <a className="text-primary-bright" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>
            </li>
            <li>
              OpenRouter (free models) —{" "}
              <a className="text-primary-bright" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
                openrouter.ai/keys
              </a>
            </li>
            <li>
              Hugging Face —{" "}
              <a className="text-primary-bright" href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer">
                huggingface.co/settings/tokens
              </a>
            </li>
            <li>
              Cerebras / SambaNova — free Llama chat tiers, same idea: create, paste.
            </li>
            <li>Video and high-end image need a paid xAI, OpenAI or Together key. There is no honest free video API.</li>
          </ul>
          <input
            className="field"
            placeholder="Label (e.g. Groq free 1)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          <select
            className="field"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              const next = PROVIDERS.find((p) => p.id === e.target.value);
              if (next) setModel(next.chatModel);
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {meta ? <p className="text-xs text-dim">{meta.hint}</p> : null}
          <input
            className="field"
            placeholder="Model (optional, uses provider default)"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          {provider === "custom" ? (
            <input
              className="field"
              placeholder="https://host/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
            />
          ) : null}
          <input
            className="field"
            type="password"
            placeholder="sk-…"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            minLength={8}
          />
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-semibold">
            Save key
          </button>
        </form>

        <form
          className="glass-card space-y-3 rounded-3xl p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = parseKeyPaste(bulk);
            if (parsed.length === 0) {
              onStatus("Nothing to import. Use: provider | label | secret | model");
              return;
            }
            const res = await saveStudioKeysBulk({ data: { keys: parsed } });
            if (!res.ok) {
              onStatus(res.error);
              return;
            }
            onStatus(`Added ${res.added} keys.`);
            setBulk("");
            await onChange();
          }}
        >
          <h2 className="font-display text-lg font-semibold">Bulk add keys</h2>
          <p className="text-sm text-muted">One per line: provider | label | secret | model</p>
          <textarea
            className="field min-h-28 font-mono text-xs"
            placeholder={"groq | Groq free 1 | gsk_… | llama-3.3-70b-versatile"}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          />
          <button type="submit" className="h-11 rounded-full border border-line px-5 text-sm font-semibold">
            Import keys
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {keys.length === 0 ? (
          <p className="text-sm text-muted">
            No keys yet. xAI tools can still run on the platform Grok key. Add Groq / OpenRouter keys to
            spread 500 tools across free APIs.
          </p>
        ) : null}
        {keys.map((key) => (
          <article key={key.id} className="glass-card flex items-center justify-between gap-3 rounded-2xl p-4">
            <div>
              <h3 className="font-semibold">{key.label}</h3>
              <p className="text-sm text-muted">
                {key.provider} · ••••{key.last4}
                {key.model ? ` · ${key.model}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={cn("text-sm", key.active ? "text-primary-bright" : "text-dim")}
                onClick={async () => {
                  await toggleStudioKey({ data: { id: key.id } });
                  await onChange();
                }}
              >
                {key.active ? "Active" : "Off"}
              </button>
              <button
                type="button"
                className="text-sm text-muted hover:text-fg"
                onClick={async () => {
                  await deleteStudioKey({ data: { id: key.id } });
                  await onChange();
                }}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function parseToolPaste(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t").length > 1 ? line.split("\t") : line.split("|");
      const [name, category, desc, prompt, provider] = parts.map((p) => p.trim());
      if (!name || !prompt) return null;
      return {
        name,
        category: category || "Writing",
        desc: desc || name,
        prompt,
        provider: provider || "xai",
      };
    })
    .filter((row): row is { name: string; category: string; desc: string; prompt: string; provider: string } =>
      Boolean(row),
    );
}

function parseKeyPaste(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const [provider, label, secret, model] = parts;
      if (!provider || !label || !secret) return null;
      return { provider, label, secret, model: model || "" };
    })
    .filter((row): row is { provider: string; label: string; secret: string; model: string } => Boolean(row));
}

function PremiumPanel({ onStatus }: { onStatus: (s: string) => void }) {
  const [usdt, setUsdt] = useState("");
  const [btc, setBtc] = useState("");
  const [eth, setEth] = useState("");
  const [sol, setSol] = useState("");
  const [rate, setRate] = useState("20");
  const [claims, setClaims] = useState<
    {
      id: number;
      email: string;
      amount: string;
      currency: string;
      tx_hash: string;
      note: string;
      status: string;
      generations_credit: number;
      created_at: string;
    }[]
  >([]);

  async function load() {
    const res = await listPaymentClaims();
    setClaims(res.claims);
    setUsdt(res.settings.usdt);
    setBtc(res.settings.btc);
    setEth(res.settings.eth);
    setSol(res.settings.sol);
    setRate(res.settings.gensPerUsd);
  }

  useEffect(() => {
    void load().catch((err: unknown) => onStatus(err instanceof Error ? err.message : "Could not load claims"));
  }, [onStatus]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <form
        className="glass-card space-y-3 rounded-3xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await saveCryptoSettings({ data: { usdt, btc, eth, sol, gensPerUsd: rate } });
          onStatus("Addresses saved. They now show on Account.");
        }}
      >
        <h2 className="font-display text-xl font-semibold">Crypto addresses</h2>
        <p className="text-sm text-muted">Published on the public Account page. Generations per 1 USD equivalent.</p>
        <input className="field" placeholder="USDT address" value={usdt} onChange={(e) => setUsdt(e.target.value)} />
        <input className="field" placeholder="BTC address" value={btc} onChange={(e) => setBtc(e.target.value)} />
        <input className="field" placeholder="ETH / USDC address" value={eth} onChange={(e) => setEth(e.target.value)} />
        <input className="field" placeholder="SOL address" value={sol} onChange={(e) => setSol(e.target.value)} />
        <input className="field" placeholder="Generations per USD" value={rate} onChange={(e) => setRate(e.target.value)} />
        <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-semibold">
          Save addresses
        </button>
      </form>
      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Payment claims</h2>
        {claims.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
        {claims.map((c) => (
          <article key={c.id} className="glass-card space-y-2 rounded-2xl p-4 text-sm">
            <p className="font-semibold">
              {c.amount} {c.currency} · {c.email}
            </p>
            <p className="text-muted">
              {c.status}
              {c.tx_hash ? ` · ${c.tx_hash}` : ""}
              {c.note ? ` · ${c.note}` : ""}
            </p>
            {c.status === "pending" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold"
                  onClick={async () => {
                    const res = await reviewPayment({ data: { id: c.id, action: "approve" } });
                    onStatus(res.ok ? `Approved. +${res.credited} generations.` : res.error);
                    await load();
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-full border border-line px-4 py-2 text-xs font-semibold"
                  onClick={async () => {
                    await reviewPayment({ data: { id: c.id, action: "reject" } });
                    onStatus("Rejected.");
                    await load();
                  }}
                >
                  Reject
                </button>
              </div>
            ) : (
              <p className="text-dim">{c.status === "approved" ? `+${c.generations_credit} gens` : "rejected"}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
