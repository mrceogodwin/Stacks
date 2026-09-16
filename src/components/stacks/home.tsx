import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Menu,
  Play,
  Search,
  X,
} from "lucide-react";
import { APPS, PREMIUM_TOOLS, TOOLS, TOOL_FILTERS, isPremiumTool, type StacksApp, type StacksTool } from "@/lib/catalog";
import {
  bumpCounter,
  listCounters,
  listPublishedApps,
  listPublishedTools,
  subscribeUpdates,
  type PublicApp,
  type PublicTool,
} from "@/lib/studio";
import { cn, countLabel } from "@/lib/utils";
import { IconBlock, TONE_CLASS } from "@/components/stacks/icon-block";
import { StacksLogo } from "@/components/stacks/logo";
import { ThemeToggle } from "@/components/stacks/theme-toggle";
import { AppWorkspace } from "@/components/stacks/app-workspace";
import { ToolWorkspace } from "@/components/stacks/tool-workspace";
import { SiteFooter } from "@/components/stacks/site-footer";
import { SoundsSection } from "@/components/stacks/sounds-section";
import { InstallSection } from "@/components/stacks/install-section";
import { publicToolPrices, peekPremiumSession } from "@/lib/premium";

type Detail = { kind: "app" | "tool"; item: StacksApp | StacksTool };

const SECTIONS = [
  { id: "top", label: "Home" },
  { id: "apps", label: "Apps I Built" },
  { id: "tools", label: "500+ Tools" },
  { id: "premium", label: "Premium" },
  { id: "sounds", label: "Sounds" },
  { id: "updates", label: "Updates" },
  { id: "about", label: "About" },
] as const;

export function StacksHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("top");
  const [appsShown, setAppsShown] = useState(6);
  const [toolsShown, setToolsShown] = useState(12);
  const [premiumShown, setPremiumShown] = useState(6);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [wallet, setWallet] = useState<{ signedIn: boolean; generations: number }>({ signedIn: false, generations: 0 });
  const [filter, setFilter] = useState<(typeof TOOL_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [playing, setPlaying] = useState(false);
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const logoTaps = useRef({ n: 0, t: 0 });
  const [glow, setGlow] = useState({ x: -400, y: -400, on: false });
  const [liveApps, setLiveApps] = useState<PublicApp[] | null>(null);
  const [liveTools, setLiveTools] = useState<PublicTool[] | null>(null);
  const [counts, setCounts] = useState<{ apps: Record<string, number>; tools: Record<string, number> }>({
    apps: {},
    tools: {},
  });

  useEffect(() => {
    const ids = SECTIONS.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { threshold: 0.28, rootMargin: "-12% 0px -40% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      setGlow({ x: e.clientX, y: e.clientY, on: true });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    void listPublishedApps().then(setLiveApps).catch(() => setLiveApps([]));
    void listPublishedTools().then(setLiveTools).catch(() => setLiveTools([]));
    void listCounters().then(setCounts).catch(() => {});
    void publicToolPrices().then(setPrices).catch(() => {});
    void peekPremiumSession()
      .then(setWallet)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get("app");
    if (!appId) return;
    const found = catalogApps.find((a) => a.id === appId);
    if (found) setDetail({ kind: "app", item: found });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once catalog is in
  }, [liveApps]);

  const catalogApps: Array<
    StacksApp & { thumbnail?: string | null; url?: string; downloadUrl?: string; videoUrl?: string }
  > =
    liveApps && liveApps.length > 0
      ? liveApps.map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          desc: a.desc,
          long: a.long,
          tone: a.tone,
          icon: a.icon,
          thumbnail: a.thumbnail,
          url: a.url,
          downloadUrl: a.downloadUrl,
          videoUrl: a.videoUrl,
        }))
      : APPS;

  const catalogTools: Array<StacksTool & { runnable?: boolean; videoUrl?: string }> = useMemo(() => {
    const live = (liveTools ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      desc: t.desc,
      long: t.long,
      tone: t.tone,
      icon: t.icon,
      runnable: t.runnable,
      videoUrl: t.videoUrl,
      kind: t.kind,
    }));
    const liveById = new Map(live.map((t) => [t.id, t]));
    const merged: Array<StacksTool & { runnable?: boolean; videoUrl?: string }> = TOOLS.map((t) => {
      const overlay = liveById.get(t.id);
      if (!overlay) return t;
      return {
        ...t,
        name: overlay.name || t.name,
        category: overlay.category || t.category,
        desc: overlay.desc || t.desc,
        long: overlay.long || t.long,
        tone: overlay.tone || t.tone,
        icon: overlay.icon || t.icon,
        kind: overlay.kind || t.kind,
        runnable: overlay.runnable,
        videoUrl: overlay.videoUrl,
      };
    });
    for (const extra of live) {
      if (!TOOLS.some((t) => t.id === extra.id)) merged.push(extra);
    }
    return merged;
  }, [liveTools]);

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogTools.filter((t) => {
      if (isPremiumTool(t)) return false;
      const catOk = filter === "All" || t.category === filter;
      const qOk =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [catalogTools, filter, query]);

  const visibleApps = catalogApps.slice(0, appsShown);
  const visibleTools = filteredTools.slice(0, toolsShown);

  async function openItem(kind: "app" | "tool", item: StacksApp | StacksTool) {
    setDetail({ kind, item });
    setCounts((prev) => {
      const bucket = kind === "app" ? "apps" : "tools";
      return {
        ...prev,
        [bucket]: { ...prev[bucket], [item.id]: (prev[bucket][item.id] ?? 0) + 1 },
      };
    });
    try {
      const res = await bumpCounter({ data: { kind, id: item.id } });
      setCounts((prev) => {
        const bucket = kind === "app" ? "apps" : "tools";
        return { ...prev, [bucket]: { ...prev[bucket], [item.id]: res.count } };
      });
    } catch {
      /* keep optimistic count */
    }
  }

  return (
    <div className="relative min-h-screen bg-bg-deep text-fg">
      <div className="stacks-atmosphere pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
      {glow.on ? (
        <div
          className="cursor-glow hidden md:block"
          style={{ transform: `translate(${glow.x}px, ${glow.y}px)` }}
          aria-hidden="true"
        />
      ) : null}

      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg-deep/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.75rem] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="#top"
            className="shrink-0"
            onClick={() => {
              setMenuOpen(false);
              const now = Date.now();
              if (now - logoTaps.current.t > 2800) logoTaps.current.n = 0;
              logoTaps.current.t = now;
              logoTaps.current.n += 1;
              if (logoTaps.current.n >= 7) {
                logoTaps.current.n = 0;
                window.location.assign("/command");
              }
            }}
          >
            <StacksLogo />
          </a>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "relative py-2 transition-colors hover:text-fg",
                  active === s.id && "text-fg",
                )}
              >
                {s.label}
                {active === s.id ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary-bright" />
                ) : null}
              </a>
            ))}
          </nav>
          <a
            href="#apps"
            className="hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-fg transition hover:border-primary-bright/40 md:inline-flex"
          >
            Explore Apps
            <ArrowRight className="size-4" />
          </a>
          <ThemeToggle className="hidden size-9 place-items-center rounded-full border border-line text-muted hover:text-fg md:grid" />
          <a
            href="/account"
            className="shrink-0 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-fg md:hidden"
          >
            Register
          </a>
          <a
            href="/account"
            className="hidden shrink-0 rounded-full border border-line px-3 py-2 text-sm font-semibold text-muted hover:text-fg md:inline-flex"
          >
            Register / Sign in
          </a>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-xl border border-line md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menuOpen ? (
          <nav className="flex flex-col gap-1 border-t border-white/5 bg-bg-deep/95 px-4 py-4 md:hidden">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg px-3 py-3 text-sm text-muted hover:bg-white/5 hover:text-fg"
                onClick={() => setMenuOpen(false)}
              >
                {s.label}
              </a>
            ))}
            <a
              href="/account"
              className="rounded-lg px-3 py-3 text-sm font-semibold text-primary-bright hover:bg-white/5"
              onClick={() => setMenuOpen(false)}
            >
              Register / Sign in
            </a>
            <div className="mt-2 flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted">Skin</span>
              <ThemeToggle />
            </div>
          </nav>
        ) : null}
      </header>

      <main className="relative z-10 pt-[4.75rem]">
        <section id="top" className="relative overflow-hidden px-4 pb-10 pt-16 sm:px-6 sm:pt-20">
          <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="mb-4 font-display text-[0.7rem] font-medium tracking-[0.22em] text-primary-bright uppercase">
                Built in Nigeria. Shipped on stacks.ng
              </p>
              <h1 className="font-display text-4xl leading-[0.98] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Meet <span className="text-primary-bright">Stacks.</span>
                <br />
                One place for
                <br />
                everything I build.
              </h1>
              <p className="mt-6 max-w-md text-muted">
                My apps, a library of 500+ tools, and the generation engine that runs them. All in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#apps"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-fg shadow-[var(--shadow-glow)] transition hover:-translate-y-px"
                >
                  Explore Apps
                  <ArrowRight className="size-4" />
                </a>
                <a
                  href="#tools"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-fg transition hover:border-primary-bright/40"
                >
                  Explore tools
                </a>
              </div>
            </div>

            <div className="film-card">
              {playing ? (
                <video
                  className="film-well"
                  src="/video/stacks-in-action.mp4?v=13"
                  poster="/video/poster.jpg?v=13"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  controlsList="nodownload"
                >
                  Your browser can’t play this video.
                </video>
              ) : (
                <button
                  type="button"
                  className="film-well"
                  onClick={() => setPlaying(true)}
                  aria-label="Play Stacks video"
                >
                  <img src="/video/poster.jpg?v=13" alt="Hello. Welcome to Stacks." className="film-poster" />
                  <span className="film-play">
                    <Play className="ml-0.5 size-7 fill-current" />
                  </span>
                </button>
              )}
              <div className="film-meta text-sm">
                <div>
                  <p className="font-semibold">See Stacks in action</p>
                  <p className="text-xs">How to use the platform</p>
                </div>
                <span className="film-time">2:21</span>
              </div>
            </div>
          </div>
        </section>

        <section id="apps" className="px-4 py-20 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
                  The collection
                </p>
                <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  Apps I <span className="text-primary-bright">Built</span>
                </h2>
                <p className="mt-3 max-w-md text-muted">
                  Explore the products, experiments and digital experiences I've created with Stacks.
                </p>
              </div>
              <a href="#apps" className="inline-flex items-center gap-1.5 text-sm text-primary-bright">
                View All Apps
                <ArrowRight className="size-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className={cn(
                    "app-card glass-card rounded-2xl p-5 text-left transition duration-300 hover:-translate-y-1.5",
                    TONE_CLASS[app.tone],
                  )}
                  onClick={() => void openItem("app", app)}
                >
                  <div className="flex gap-4">
                    {"thumbnail" in app && app.thumbnail ? (
                      <img src={app.thumbnail} alt="" className="size-16 rounded-2xl object-cover" />
                    ) : (
                      <IconBlock icon={app.icon} tone={app.tone} />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold">{app.name}</h3>
                      <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.7rem] text-muted">
                        {app.category}
                      </span>
                      <p className="mt-2 text-sm text-muted">{app.desc}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-bright">
                          View App
                          <ArrowRight className="size-3.5" />
                        </span>
                        <span className="inline-flex items-center gap-1 text-[0.7rem] text-dim">
                          <Download className="size-3" />
                          {countLabel(counts.apps[app.id] ?? 0, "download", "downloads")}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {appsShown < catalogApps.length ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
                  onClick={() => setAppsShown((n) => Math.min(catalogApps.length, n + 6))}
                >
                  Load More Apps
                  <ChevronDown className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section id="tools" className="px-4 py-16 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-8 text-center">
              <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
                The tool library
              </p>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                500+ <span className="text-primary-bright">Tools</span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted">
                Writing, images, video, marketing, SEO and more. Search, filter, run.
              </p>
            </div>

            <div className="relative mx-auto mb-5 max-w-2xl">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-dim" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setToolsShown(12);
                }}
                autoComplete="off"
                suppressHydrationWarning
                className="h-14 w-full rounded-full border border-white/10 bg-navy/80 pr-14 pl-11 text-sm text-fg outline-none placeholder:text-dim focus:border-primary-bright/40"
              />
              <span className="absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-full bg-primary text-fg">
                <ArrowRight className="size-4" />
              </span>
            </div>

            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {TOOL_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={cn(
                    "min-h-10 rounded-full border px-3.5 py-2 text-sm",
                    filter === f
                      ? "border-transparent bg-primary text-fg"
                      : "border-white/10 bg-white/5 text-muted hover:text-fg",
                  )}
                  onClick={() => {
                    setFilter(f);
                    setToolsShown(12);
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleTools.length === 0 ? (
                <p className="col-span-full py-10 text-center text-muted">No tools match that search.</p>
              ) : (
                visibleTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={cn(
                      "tool-card glass-card flex items-start gap-3.5 rounded-2xl p-4 text-left transition duration-300 hover:-translate-y-1",
                      TONE_CLASS[tool.tone],
                    )}
                    onClick={() => void openItem("tool", tool)}
                  >
                    <IconBlock icon={tool.icon} tone={tool.tone} size="sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold">{tool.name}</h3>
                      <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.7rem] text-muted">
                        {tool.category}
                      </span>
                      <p className="mt-1.5 text-sm text-muted">{tool.desc}</p>
                      <p className="mt-2 text-[0.7rem] text-dim">{countLabel(counts.tools[tool.id] ?? 0, "time used", "times used")}</p>
                    </div>
                    <ArrowRight className="mt-3 size-4 shrink-0 text-dim" />
                  </button>
                ))
              )}
            </div>

            {toolsShown < filteredTools.length ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
                  onClick={() => setToolsShown((n) => Math.min(filteredTools.length, n + 12))}
                >
                  Load More Tools
                  <ChevronDown className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section id="premium" className="px-4 py-16 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-8 text-center">
              <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
                Paid lane
              </p>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Premium <span className="text-primary-bright">Tools</span>
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-muted">
                Visitor accounts only — never the owner console. Create an email login, pay in crypto, submit the amount.
                When it is approved, generations land in your wallet.
              </p>
              <div className="premium-wallet mx-auto mt-6 max-w-xl rounded-[1.6rem] px-5 py-5 text-left">
                <p className="font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">Visitor wallet</p>
                {wallet.signedIn ? (
                  <>
                    <p className="font-display mt-1 text-3xl font-semibold">{wallet.generations} gen</p>
                    <p className="mt-1 text-sm text-muted">Signed in as a visitor. This is not Super Admin.</p>
                    <a href="/account" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-fg">
                      Open wallet
                    </a>
                  </>
                ) : (
                  <>
                    <h3 className="font-display mt-1 text-2xl font-semibold">Register here. Not Super Admin.</h3>
                    <p className="mt-2 text-sm text-muted">
                      Email login → pay crypto → owner approves → generations. Studio stays locked.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href="/account"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-fg"
                      >
                        Create visitor account
                        <ArrowRight className="size-4" />
                      </a>
                      <a
                        href="/account"
                        className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold"
                      >
                        Sign in to wallet
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PREMIUM_TOOLS.slice(0, premiumShown).map((tool) => {
                const cost = prices[tool.id] || tool.cost || 1;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={cn(
                      "tool-card glass-card flex items-start gap-3.5 rounded-2xl p-4 text-left transition duration-300 hover:-translate-y-1",
                      TONE_CLASS[tool.tone],
                    )}
                    onClick={() => void openItem("tool", { ...tool, cost })}
                  >
                    <IconBlock icon={tool.icon} tone={tool.tone} size="sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold">{tool.name}</h3>
                      <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.7rem] text-muted">
                        Premium · {cost} gen · {tool.inputs?.length ?? 0} controls
                      </span>
                      <p className="mt-1.5 text-sm text-muted">{tool.desc}</p>
                    </div>
                    <ArrowRight className="mt-3 size-4 shrink-0 text-dim" />
                  </button>
                );
              })}
            </div>
            {premiumShown < PREMIUM_TOOLS.length ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
                  onClick={() => setPremiumShown((n) => Math.min(PREMIUM_TOOLS.length, n + 6))}
                >
                  Load more Premium
                  <ChevronDown className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <SoundsSection />

        <section id="updates" className="px-4 pt-8 pb-6 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="subscribe-card glass-card rounded-[2rem] px-5 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-14">
              <div className="max-w-xl">
                <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
                  Subscribe
                </p>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  New apps, first.
                </h2>
                <p className="mt-3 text-muted">
                  When I upload a new product to Apps I Built, you get the note. No spam. No dashboard.
                  Just the work, as it goes live.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-muted">
                  {[
                    "First look when a new app ships",
                    "Direct from Stacks.ng — not a list mill",
                    "Leave any time. Your email stays private",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary">
                        <Check className="size-3 stroke-[3] text-[#f4f7f5]" />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <form
                className="mt-8 w-full min-w-0 max-w-md lg:mt-0"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubStatus("saving");
                  try {
                    await subscribeUpdates({ data: { email } });
                    setSubStatus("ok");
                    setEmail("");
                  } catch {
                    setSubStatus("err");
                  }
                }}
              >
                <label className="mb-2 block text-sm font-medium text-fg" htmlFor="updates-email">
                  Email for new-app updates
                </label>
                <input
                  id="updates-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="field"
                  autoComplete="email"
                  enterKeyHint="send"
                />
                <button
                  type="submit"
                  disabled={subStatus === "saving"}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-fg shadow-[var(--shadow-glow)] disabled:opacity-60"
                >
                  {subStatus === "saving" ? "Saving…" : "Get updates"}
                </button>
                <p className="mt-2 text-xs text-dim">Free. Built in Nigeria. Shipped when the work is ready.</p>
              </form>
            </div>
            {subStatus === "ok" ? (
              <p className="mt-3 text-sm text-primary-bright">You’re on the list. I’ll write when a new app ships.</p>
            ) : null}
            {subStatus === "err" ? (
              <p className="mt-3 text-sm text-rose-500">Could not save that email. Try again.</p>
            ) : null}
          </div>
        </section>

        <section id="about" className="px-4 pt-10 pb-16 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-col gap-8 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
                  Explore & create
                </p>
                <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  500+ tools.
                  <br />
                  Built to be <span className="text-primary-bright">explored.</span>
                </h2>
                <p className="mt-3 max-w-md text-muted">
                  The growing collection of tools and products inside Stacks.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#tools"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-fg shadow-[var(--shadow-glow)]"
                >
                  Explore tools
                  <ArrowRight className="size-4" />
                </a>
                <a
                  href="#apps"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
                >
                  Explore My Apps
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </div>
            <div className="max-w-2xl pt-10">
              <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
                About
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                A public showroom, with a paid engine.
              </h2>
              <p className="mt-3 text-muted">
                Stacks.ng is a showroom for everything I build. Nigerian-first products,
                experiments, and a library of tools. Light first. A touch of green. Objects you can pick up
                and open.
              </p>
              <p className="mt-3 text-muted">
                The 500+ library is open. Premium tools use a wallet you fund in crypto so the engines can
                keep running.
              </p>
              <p className="mt-4 text-sm text-dim">
                No app is perfect. By visiting, downloading, or using Stacks, including stacks.ng, you agree
                to the terms. Do not paste passwords, keys, or other people’s personal data into tools. You are
                responsible for how you use the output. Stacks is not legal, medical, or financial advice.
                Results are provided as is, without warranty. If you do not agree, do not use Stacks.
              </p>
            </div>
          </div>
        </section>
      </main>

      <InstallSection />
      <SiteFooter />

      {detail ? (
        <div
          className="fixed inset-0 z-50 overflow-auto bg-bg-deep/72 p-5 backdrop-blur-xl"
          onClick={() => setDetail(null)}
          role="presentation"
        >
          <div
            className={cn("glass-card mx-auto my-10 max-w-2xl rounded-3xl p-8", TONE_CLASS[detail.item.tone])}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <div className="mb-5 flex items-center gap-4">
              <IconBlock icon={detail.item.icon} tone={detail.item.tone} />
              <div>
                <p className="font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
                  {detail.kind === "app" ? "App" : "Tool"}
                </p>
                <h3 id="detail-title" className="font-display text-3xl font-semibold">
                  {detail.item.name}
                </h3>
                <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.7rem] text-muted">
                  {detail.item.category}
                </span>
                <p className="mt-2 text-sm text-dim">
                  {detail.kind === "app"
                    ? countLabel(counts.apps[detail.item.id] ?? 0, "download", "downloads")
                    : countLabel(counts.tools[detail.item.id] ?? 0, "time used", "times used")}
                </p>
              </div>
            </div>
            <p className="text-muted">{detail.item.long}</p>
            {detail.kind === "tool" ? (
              <ToolWorkspace tool={detail.item as StacksTool} />
            ) : (
              <AppWorkspace
                app={{
                  id: detail.item.id,
                  name: detail.item.name,
                  url: "url" in detail.item ? String(detail.item.url || "") : "",
                  downloadUrl: "downloadUrl" in detail.item ? String(detail.item.downloadUrl || "") : "",
                  videoUrl: "videoUrl" in detail.item ? String(detail.item.videoUrl || "") : "",
                }}
              />
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
