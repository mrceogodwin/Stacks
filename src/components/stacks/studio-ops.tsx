import { useEffect, useState } from "react";
import {
  deleteAd,
  deletePartner,
  deleteReview,
  FLAGSHIP_IDS,
  listStudioChrome,
  powerSnapshot,
  saveAd,
  saveMaxZip,
  savePartner,
  saveReview,
  saveTickerLines,
  setToolPaused,
} from "@/lib/ops";
import { PREMIUM_TOOLS, TOOLS } from "@/lib/catalog";

export function MonitorPanel({ onStatus }: { onStatus: (s: string) => void }) {
  const [snap, setSnap] = useState<{
    events24h: Record<string, number>;
    paused: number;
    members: number;
    generationsOut: number;
    pendingClaims: number;
    activeKeys: number;
  } | null>(null);
  const [chrome, setChrome] = useState<Awaited<ReturnType<typeof listStudioChrome>> | null>(null);
  const [reason, setReason] = useState("");

  async function reload() {
    const [s, c] = await Promise.all([powerSnapshot(), listStudioChrome()]);
    setSnap(s);
    setChrome(c);
  }

  useEffect(() => {
    void reload().catch((err: unknown) => onStatus(err instanceof Error ? err.message : "Monitor failed"));
  }, [onStatus]);

  const pauseIds = [
    ...FLAGSHIP_IDS,
    ...PREMIUM_TOOLS.map((t) => t.id),
    ...TOOLS.slice(0, 12).map((t) => t.id),
  ];
  const pausedMap = new Map((chrome?.paused ?? []).map((p) => [p.tool_id, p]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Paused tools" value={String(snap?.paused ?? 0)} hint="Owner halt" />
        <Stat label="Members" value={String(snap?.members ?? 0)} hint="Wallets" />
        <Stat label="Gens in wallets" value={String(snap?.generationsOut ?? 0)} hint="Live credit" />
        <Stat label="Pending claims" value={String(snap?.pendingClaims ?? 0)} hint="Pay queue" />
        <Stat label="Active keys" value={String(snap?.activeKeys ?? 0)} hint="Rotation pool" />
        <Stat label="Rate events" value={String(snap?.events24h.rate ?? 0)} hint="Last 24h" />
        <Stat label="Blocks" value={String(snap?.events24h.block ?? 0)} hint="Bad files" />
        <Stat label="Pauses" value={String(snap?.events24h.pause ?? 0)} hint="Last 24h" />
      </div>
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-lg font-semibold">Power monitoring</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Pause any tool that is overused. Flagship windows run on the visitor’s device, so they cannot take the server down.
          Rate limits still sit in front of every API route.
        </p>
        <input className="field mb-3" placeholder="Pause reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <ul className="max-h-80 space-y-2 overflow-auto text-sm">
          {pauseIds.map((id) => {
            const row = pausedMap.get(id);
            const on = Boolean(row?.paused);
            return (
              <li key={id} className="flex items-center justify-between gap-3 border-b border-line py-2">
                <span className="truncate">
                  {id} {on && row?.reason ? `· ${row.reason}` : ""}
                </span>
                <button
                  type="button"
                  className="text-primary-bright"
                  onClick={async () => {
                    await setToolPaused({ data: { toolId: id, paused: !on, reason } });
                    onStatus(on ? `Resumed ${id}` : `Paused ${id}`);
                    await reload();
                  }}
                >
                  {on ? "Resume" : "Pause"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-lg font-semibold">ZIP size cap</h2>
        <p className="mt-1 mb-3 text-sm text-muted">Apps you upload as ZIP. 1–8 MB. Larger files still use a URL.</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 4, 8].map((mb) => (
            <button
              key={mb}
              type="button"
              className="min-h-10 rounded-full border border-line px-3 text-sm"
              onClick={async () => {
                await saveMaxZip({ data: { mb } });
                onStatus(`ZIP cap set to ${mb} MB`);
                await reload();
              }}
            >
              {mb} MB
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-dim">Current: {chrome?.maxZipMb ?? 2} MB</p>
      </div>
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-lg font-semibold">Ops log</h2>
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
          {(chrome?.events ?? []).map((e) => (
            <li key={e.id} className="flex justify-between gap-3 border-b border-line py-2">
              <span>
                {e.kind} · {e.detail}
              </span>
              <span className="text-dim">{e.created_at.slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
        </ul>
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

export function SiteChromePanel({ onStatus }: { onStatus: (s: string) => void }) {
  const [chrome, setChrome] = useState<Awaited<ReturnType<typeof listStudioChrome>> | null>(null);
  const [lines, setLines] = useState("");
  const [adLabel, setAdLabel] = useState("");
  const [adHref, setAdHref] = useState("#flagship");
  const [partner, setPartner] = useState({ name: "", blurb: "", url: "", mark: "" });
  const [review, setReview] = useState({ author: "", handle: "", body: "", source: "x" as "x" | "site" | "premium" });

  async function reload() {
    const c = await listStudioChrome();
    setChrome(c);
    setLines(c.ticker.map((t) => t.line).join("\n"));
  }

  useEffect(() => {
    void reload().catch((err: unknown) => onStatus(err instanceof Error ? err.message : "Load failed"));
  }, [onStatus]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="glass-card space-y-3 rounded-2xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await saveTickerLines({
            data: { lines: lines.split("\n").map((s) => s.trim()).filter(Boolean) },
          });
          onStatus("Ticker saved");
          await reload();
        }}
      >
        <h2 className="font-display text-lg font-semibold">Ticker copy</h2>
        <p className="text-sm text-muted">One line per row. Slides under the header.</p>
        <textarea className="field min-h-40" value={lines} onChange={(e) => setLines(e.target.value)} />
        <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold">
          Save ticker
        </button>
      </form>

      <form
        className="glass-card space-y-3 rounded-2xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await saveAd({ data: { label: adLabel, href: adHref, icon: "spark", published: true } });
          setAdLabel("");
          onStatus("Ad icon added");
          await reload();
        }}
      >
        <h2 className="font-display text-lg font-semibold">Header ads / tool icons</h2>
        <input className="field" placeholder="Label" value={adLabel} onChange={(e) => setAdLabel(e.target.value)} required />
        <input className="field" placeholder="Href  #flagship or URL" value={adHref} onChange={(e) => setAdHref(e.target.value)} />
        <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold">
          Add icon
        </button>
        <ul className="space-y-2 text-sm">
          {(chrome?.ads ?? []).map((a) => (
            <li key={a.id} className="flex justify-between gap-3">
              <span>{a.label}</span>
              <button type="button" className="text-muted" onClick={async () => { await deleteAd({ data: { id: a.id } }); await reload(); }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </form>

      <form
        className="glass-card space-y-3 rounded-2xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await savePartner({ data: { ...partner, published: true } });
          setPartner({ name: "", blurb: "", url: "", mark: "" });
          onStatus("Partner saved");
          await reload();
        }}
      >
        <h2 className="font-display text-lg font-semibold">Partners</h2>
        <input className="field" placeholder="Name" value={partner.name} onChange={(e) => setPartner({ ...partner, name: e.target.value })} required />
        <input className="field" placeholder="Mark (2 letters)" value={partner.mark} onChange={(e) => setPartner({ ...partner, mark: e.target.value })} />
        <input className="field" placeholder="Blurb" value={partner.blurb} onChange={(e) => setPartner({ ...partner, blurb: e.target.value })} />
        <input className="field" placeholder="URL" value={partner.url} onChange={(e) => setPartner({ ...partner, url: e.target.value })} />
        <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold">
          Add partner
        </button>
        <ul className="space-y-2 text-sm">
          {(chrome?.partners ?? []).map((p) => (
            <li key={p.id} className="flex justify-between gap-3">
              <span>{p.name}</span>
              <button type="button" className="text-muted" onClick={async () => { await deletePartner({ data: { id: p.id } }); await reload(); }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </form>

      <form
        className="glass-card space-y-3 rounded-2xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await saveReview({ data: { ...review, published: true } });
          setReview({ author: "", handle: "", body: "", source: "x" });
          onStatus("Review published");
          await reload();
        }}
      >
        <h2 className="font-display text-lg font-semibold">Community reviews</h2>
        <p className="text-sm text-muted">Only published rows show on the site. Pause by removing.</p>
        <input className="field" placeholder="Author" value={review.author} onChange={(e) => setReview({ ...review, author: e.target.value })} required />
        <input className="field" placeholder="@handle" value={review.handle} onChange={(e) => setReview({ ...review, handle: e.target.value })} />
        <textarea className="field min-h-24" placeholder="Quote" value={review.body} onChange={(e) => setReview({ ...review, body: e.target.value })} required />
        <select className="field" value={review.source} onChange={(e) => setReview({ ...review, source: e.target.value as typeof review.source })}>
          <option value="x">X</option>
          <option value="premium">Premium member</option>
          <option value="site">Site</option>
        </select>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold">
          Publish review
        </button>
        <ul className="max-h-48 space-y-2 overflow-auto text-sm">
          {(chrome?.reviews ?? []).map((r) => (
            <li key={r.id} className="flex justify-between gap-3">
              <span className="truncate">
                {r.published ? "Live" : "Held"} · {r.author}
              </span>
              <button type="button" className="text-muted" onClick={async () => { await deleteReview({ data: { id: r.id } }); await reload(); }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}
