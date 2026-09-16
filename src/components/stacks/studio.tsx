import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  ICONS,
  PREMIUM_TOOLS,
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
  listPremiumMembers,
  saveToolPrices,
  listTickets,
  replyTicket,
} from "@/lib/premium";
import { deleteStudioPack, listStudioPacks, saveStudioPack } from "@/lib/packs";
import {
  broadcastNote,
  listActivity,
  ownerSecurity,
  rotateOwnerPassword,
  saveOwnerUsername,
  setWalletGens,
} from "@/lib/studio-owner";
import { IconBlock } from "@/components/stacks/icon-block";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

type Tab =
  | "home"
  | "apps"
  | "tools"
  | "keys"
  | "list"
  | "pay"
  | "people"
  | "packs"
  | "inbox"
  | "broadcast"
  | "security";

const RAIL: { id: Tab; label: string }[] = [
  { id: "home", label: "Overview" },
  { id: "apps", label: "Apps" },
  { id: "tools", label: "AI tools" },
  { id: "keys", label: "API keys" },
  { id: "pay", label: "Payments" },
  { id: "people", label: "Members" },
  { id: "packs", label: "Sounds" },
  { id: "inbox", label: "Inbox" },
  { id: "list", label: "Emails" },
  { id: "broadcast", label: "Broadcast" },
  { id: "security", label: "Security" },
];

export function StudioAdmin() {
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<Tab>("home");
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
    document.documentElement.setAttribute("data-studio", "1");
    document.documentElement.setAttribute("data-theme", "dark");
    return () => document.documentElement.removeAttribute("data-studio");
  }, []);

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
    <div className="studio-shell">
      <div className="flex min-h-screen">
        <aside className="studio-rail hidden w-56 shrink-0 flex-col py-6 lg:flex">
          <div className="px-4">
            <p className="font-mono text-[0.65rem] tracking-[0.22em] text-primary-bright uppercase">Owner</p>
            <p className="mt-1 text-sm font-semibold">Stacks console</p>
          </div>
          <nav className="mt-6 flex flex-1 flex-col gap-0.5 px-2">
            {RAIL.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-lg px-3 py-2 text-left text-sm",
                  tab === item.id ? "bg-primary/20 text-primary-bright" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="px-4 text-xs text-dim">
            <Link to="/" className="hover:text-fg">
              Public site
            </Link>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-line px-4 py-4">
            <div>
              <p className="font-mono text-[0.65rem] tracking-[0.2em] text-primary-bright uppercase">Super admin</p>
              <h1 className="font-display text-xl font-semibold">Control room</h1>
            </div>
            <UserButton />
          </header>
          <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 lg:hidden">
            {RAIL.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                  tab === item.id ? "bg-primary text-fg" : "border border-line text-muted",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="px-4 py-6 lg:px-8">
            {status ? <p className="mb-4 text-sm text-primary-bright">{status}</p> : null}
            {tab === "home" ? (
              <OverviewPanel
                apps={apps.length}
                tools={tools.length}
                ready={readyCount}
                downloads={totals.downloads}
                uses={totals.uses}
                keys={`${keys.length}/${KEY_CAP}`}
                subs={subs.length}
                onImport={async () => {
                  try {
                    const res = await seedStudioCatalog();
                    setStatus(res.seeded ? "Starter catalog imported." : "Catalog already in your studio.");
                    await refresh();
                  } catch (err: unknown) {
                    setStatus(err instanceof Error ? err.message : "Import failed.");
                  }
                }}
              />
            ) : null}
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
            {tab === "people" ? <MembersPanel /> : null}
            {tab === "packs" ? <PacksPanel onStatus={setStatus} /> : null}
            {tab === "inbox" ? <InboxPanel onStatus={setStatus} /> : null}
            {tab === "broadcast" ? <BroadcastPanel onStatus={setStatus} /> : null}
            {tab === "security" ? <SecurityPanel onStatus={setStatus} /> : null}
            {tab === "list" ? (
              <div className="glass-card rounded-3xl p-5">
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

function OverviewPanel({
  apps,
  tools,
  ready,
  downloads,
  uses,
  keys,
  subs,
  onImport,
}: {
  apps: number;
  tools: number;
  ready: number;
  downloads: number;
  uses: number;
  keys: string;
  subs: number;
  onImport: () => void;
}) {
  const [log, setLog] = useState<{ id: number; action: string; detail: string; created_at: string }[]>([]);
  useEffect(() => {
    void listActivity()
      .then(setLog)
      .catch(() => setLog([]));
  }, []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Apps" value={String(apps)} hint="Live in the gallery" />
        <Stat label="AI tools" value={String(tools)} hint={`${ready} ready`} />
        <Stat label="Downloads" value={String(downloads)} hint="Apps opened" />
        <Stat label="Tool opens" value={String(uses)} hint="Times a card opened" />
        <Stat label="API keys" value={keys} hint="Rotate under limits" />
        <Stat label="Update list" value={String(subs)} hint="New-app emails" />
        <Stat label="Daily tools" value="20" hint="No API. Always on." />
        <Stat label="Premium set" value={String(PREMIUM_TOOLS.length)} hint="Priced in Payments" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-line px-4 py-2 text-sm" onClick={onImport}>
          Import starter catalog
        </button>
      </div>
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-lg font-semibold">Activity</h2>
        {log.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing logged yet.</p> : null}
        <ul className="mt-3 space-y-2 text-sm">
          {log.map((row) => (
            <li key={row.id} className="flex justify-between gap-3 border-b border-line py-2">
              <span>
                {row.action} {row.detail}
              </span>
              <span className="text-dim">{row.created_at.slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BroadcastPanel({ onStatus }: { onStatus: (s: string) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <form
      className="glass-card max-w-xl space-y-3 rounded-2xl p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await broadcastNote({ data: { title, body } });
        onStatus(`Sent to ${res.sent} wallets.`);
        setTitle("");
        setBody("");
      }}
    >
      <h2 className="font-display text-xl font-semibold">Broadcast</h2>
      <p className="text-sm text-muted">Lands as a notification on every visitor wallet.</p>
      <input className="field" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <textarea className="field min-h-28" required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" />
      <button type="submit" className="h-11 rounded-lg border border-primary-bright/40 px-5 text-sm font-semibold text-primary-bright">
        Send
      </button>
    </form>
  );
}

function SecurityPanel({ onStatus }: { onStatus: (s: string) => void }) {
  const [username, setUsername] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  useEffect(() => {
    void ownerSecurity().then((s) => setUsername(s.username));
  }, []);
  return (
    <div className="grid max-w-3xl gap-6 lg:grid-cols-2">
      <form
        className="glass-card space-y-3 rounded-2xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await saveOwnerUsername({ data: { username } });
          onStatus("Username saved. Use it on the owner login.");
        }}
      >
        <h2 className="font-display text-xl font-semibold">Username</h2>
        <p className="text-sm text-muted">This is what you type on /login. Not a visitor email.</p>
        <input className="field" required value={username} onChange={(e) => setUsername(e.target.value)} />
        <button type="submit" className="h-11 rounded-lg border border-line px-5 text-sm font-semibold">
          Save username
        </button>
      </form>
      <form
        className="glass-card space-y-3 rounded-2xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await rotateOwnerPassword({ data: { current, next } });
          if (!res.ok) {
            onStatus(res.error);
            return;
          }
          setCurrent("");
          setNext("");
          onStatus("Password changed.");
        }}
      >
        <h2 className="font-display text-xl font-semibold">Password</h2>
        <input className="field" type="password" required minLength={8} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current" />
        <input className="field" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" />
        <button type="submit" className="h-11 rounded-lg border border-line px-5 text-sm font-semibold">
          Change password
        </button>
      </form>
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
              <option value="image">Image. downloads PNG</option>
              <option value="video">Video. downloads MP4</option>
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
            Up to {KEY_CAP} keys. I cannot invent or scrape free keys. every real provider requires an account you own. Paste yours here and replace anytime.
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
              Cerebras / SambaNova. free Llama chat tiers, same idea: create, paste.
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
      <ToolPricesForm onStatus={onStatus} />
    </div>
  );
}

function ToolPricesForm({ onStatus }: { onStatus: (s: string) => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(PREMIUM_TOOLS.map((t) => [t.id, String(t.cost ?? 1)])),
  );
  return (
    <form
      className="glass-card space-y-3 rounded-3xl p-5 lg:col-span-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await saveToolPrices({
          data: {
            prices: PREMIUM_TOOLS.map((t) => ({
              toolId: t.id,
              generations: Math.max(1, parseInt(vals[t.id] || "1", 10) || 1),
            })),
          },
        });
        onStatus("Per-tool prices saved. Visitors see the new generation cost.");
      }}
    >
      <h2 className="font-display text-xl font-semibold">Price per Premium tool</h2>
      <p className="text-sm text-muted">Generations deducted on each successful run.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PREMIUM_TOOLS.map((t) => (
          <label key={t.id} className="block text-sm">
            <span className="text-muted">{t.name}</span>
            <input
              className="field mt-1"
              inputMode="numeric"
              value={vals[t.id] ?? ""}
              onChange={(e) => setVals((prev) => ({ ...prev, [t.id]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-semibold">
        Save prices
      </button>
    </form>
  );
}

function MembersPanel() {
  const [wallets, setWallets] = useState<{ user_id: string; email: string; generations: number; updated_at: string }[]>([]);
  const [paid, setPaid] = useState<{ email: string; amount: string; currency: string; status: string; generations_credit: number; created_at: string }[]>([]);
  const [editId, setEditId] = useState("");
  const [editGens, setEditGens] = useState("");
  async function load() {
    const res = await listPremiumMembers();
    setWallets(res.wallets);
    setPaid(res.paid);
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="mt-2 grid gap-6 lg:grid-cols-2">
      <div className="glass-card rounded-3xl p-5">
        <h2 className="font-display text-xl font-semibold">Premium members</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Visitor wallets only. They cannot open this console.</p>
        {wallets.length === 0 ? <p className="text-sm text-dim">None yet.</p> : null}
        <ul className="space-y-2 text-sm">
          {wallets.map((w) => (
            <li key={w.user_id} className="flex justify-between gap-3 border-b border-line py-2">
              <button type="button" className="min-w-0 truncate text-left" onClick={() => { setEditId(w.user_id); setEditGens(String(w.generations)); }}>
                {w.email || w.user_id}
              </button>
              <span className="text-dim">{w.generations} gen</span>
            </li>
          ))}
        </ul>
        {editId ? (
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await setWalletGens({ data: { userId: editId, generations: Math.max(0, parseInt(editGens, 10) || 0) } });
              setEditId("");
              await load();
            }}
          >
            <input className="field" value={editGens} onChange={(e) => setEditGens(e.target.value)} />
            <button type="submit" className="h-11 shrink-0 rounded-lg border border-line px-4 text-sm font-semibold">
              Set gens
            </button>
          </form>
        ) : null}
      </div>
      <div className="glass-card rounded-3xl p-5">
        <h2 className="font-display text-xl font-semibold">Paid / claims</h2>
        {paid.length === 0 ? <p className="text-sm text-dim">None yet.</p> : null}
        <ul className="space-y-2 text-sm">
          {paid.map((p, i) => (
            <li key={`${p.email}-${p.created_at}-${i}`} className="flex justify-between gap-3 border-b border-line py-2">
              <span className="min-w-0 truncate">
                {p.email} · {p.amount} {p.currency}
              </span>
              <span className="text-dim">{p.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PacksPanel({ onStatus }: { onStatus: (s: string) => void }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listStudioPacks>>>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lane, setLane] = useState<"free" | "premium">("free");
  const [fileUrl, setFileUrl] = useState("");
  const [cost, setCost] = useState("0");
  const [cover, setCover] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  async function refresh() {
    setRows(await listStudioPacks());
  }
  useEffect(() => {
    void refresh().catch((err: unknown) => onStatus(err instanceof Error ? err.message : "Could not load packs"));
  }, [onStatus]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <form
        className="glass-card space-y-3 rounded-3xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await saveStudioPack({
            data: {
              id: editing ?? undefined,
              name,
              description,
              lane,
              fileUrl,
              cover,
              cost: Math.max(0, parseInt(cost, 10) || 0),
              published: true,
            },
          });
          setName("");
          setDescription("");
          setFileUrl("");
          setCover(null);
          setEditing(null);
          onStatus("Pack saved. It shows on Sounds & Packs.");
          await refresh();
        }}
      >
        <h2 className="font-display text-xl font-semibold">{editing ? "Edit pack" : "Place a pack"}</h2>
        <p className="text-sm text-muted">
          Your FL Studio files. Paste a download URL (Drive, Dropbox, your CDN). Free downloads now. Premium unlocks from the visitor wallet.
        </p>
        <input className="field" required placeholder="Pack name" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="field min-h-20" placeholder="What’s inside" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="field" value={lane} onChange={(e) => setLane(e.target.value as "free" | "premium")}>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <input className="field" required placeholder="Download URL" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
        {lane === "premium" ? (
          <input className="field" placeholder="Generations to unlock" value={cost} onChange={(e) => setCost(e.target.value)} />
        ) : null}
        <label className="block text-sm text-muted">
          Cover
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 280000) {
                onStatus("Keep covers under 280KB.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setCover(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-semibold">
          {editing ? "Save pack" : "Publish pack"}
        </button>
      </form>
      <div className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted">No packs yet.</p> : null}
        {rows.map((p) => (
          <article key={p.id} className="glass-card flex items-center justify-between gap-3 rounded-2xl p-4 text-sm">
            <div className="min-w-0">
              <p className="font-semibold">{p.name}</p>
              <p className="text-dim">
                {p.lane} {p.cost ? `· ${p.cost} gen` : ""}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-primary-bright"
                onClick={() => {
                  setEditing(p.id);
                  setName(p.name);
                  setDescription(p.description);
                  setLane(p.lane === "premium" ? "premium" : "free");
                  setFileUrl(p.file_url);
                  setCost(String(p.cost));
                  setCover(p.cover);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-muted"
                onClick={async () => {
                  await deleteStudioPack({ data: { id: p.id } });
                  await refresh();
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function InboxPanel({ onStatus }: { onStatus: (s: string) => void }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listTickets>>>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  async function refresh() {
    setRows(await listTickets());
  }
  useEffect(() => {
    void refresh().catch((err: unknown) => onStatus(err instanceof Error ? err.message : "Could not load inbox"));
  }, [onStatus]);
  return (
    <div className="mt-8 space-y-3">
      <h2 className="font-display text-xl font-semibold">Visitor mail</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">No messages yet.</p> : null}
      {rows.map((t) => (
        <article key={t.id} className="glass-card space-y-2 rounded-2xl p-4 text-sm">
          <p className="font-semibold">
            {t.subject} · {t.email}
          </p>
          <p className="text-muted">{t.body}</p>
          {t.reply ? <p className="text-primary-bright">Reply: {t.reply}</p> : null}
          <textarea
            className="field min-h-20"
            placeholder="Reply. They see this as a notification"
            value={draft[t.id] ?? ""}
            onChange={(e) => setDraft((prev) => ({ ...prev, [t.id]: e.target.value }))}
          />
          <button
            type="button"
            className="h-10 rounded-full bg-primary px-4 text-xs font-semibold"
            onClick={async () => {
              const reply = (draft[t.id] || "").trim();
              if (!reply) return;
              await replyTicket({ data: { id: t.id, reply } });
              onStatus("Reply sent. They see it on Account.");
              await refresh();
            }}
          >
            Send reply
          </button>
        </article>
      ))}
    </div>
  );
}

