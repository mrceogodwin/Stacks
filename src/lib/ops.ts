import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuthMiddleware } from "@/lib/optional-auth";
import { requireStudioOwner } from "@/lib/premium";

const DANGEROUS_EXT = /\.(exe|bat|cmd|scr|com|pif|msi|dll|js|vbs|ps1|jar|apk|dmg|sh|php|wasm)$/i;

export const FLAGSHIP_IDS = [
  "logo-animator",
  "caption-studio",
  "image-editor",
  "audio-editor",
  "file-converter",
  "media-import",
] as const;

export type FlagshipId = (typeof FLAGSHIP_IDS)[number];

const DEFAULT_TICKER = [
  "How Stacks works: Register · pay crypto · owner approves · generations land",
  "Apps, web apps, and prototypes. Get ZIP files free.",
  "Flagship windows run in your browser. Files never land on our servers.",
  "Everyday tools are free and work offline in this page.",
  "Premium engines use your wallet. Studio stays with the owner.",
  "Built in Nigeria. Shipped on stacks.ng.",
];

const DEFAULT_ADS = [
  { label: "Logo Animator", href: "#flagship", icon: "spark" },
  { label: "Caption Studio", href: "#flagship", icon: "video" },
  { label: "Image Editor", href: "#flagship", icon: "image" },
  { label: "Audio Engine", href: "#flagship", icon: "music" },
  { label: "File Converter", href: "#flagship", icon: "folder" },
  { label: "Media Import", href: "#flagship", icon: "link" },
];

export async function ensurePlatformTables(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
) {
  await sql`create table if not exists studio_tool_pause (
    tool_id text primary key,
    paused boolean not null default false,
    reason text not null default '',
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists studio_reviews (
    id serial primary key,
    author text not null default '',
    handle text not null default '',
    body text not null,
    source text not null default 'site',
    published boolean not null default false,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists studio_partners (
    id serial primary key,
    name text not null,
    blurb text not null default '',
    url text not null default '',
    mark text not null default '',
    published boolean not null default true,
    sort_order int not null default 0,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists studio_ads (
    id serial primary key,
    label text not null,
    href text not null default '#flagship',
    icon text not null default 'spark',
    published boolean not null default true,
    sort_order int not null default 0,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists studio_ticker (
    id serial primary key,
    line text not null,
    published boolean not null default true,
    sort_order int not null default 0
  )`;
  await sql`create table if not exists studio_ops_events (
    id serial primary key,
    kind text not null,
    detail text not null default '',
    ip text not null default '',
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists studio_rate_hits (
    bucket text not null,
    window_start timestamptz not null,
    hits int not null default 1,
    primary key (bucket, window_start)
  )`;
  await sql`alter table studio_apps add column if not exists zip_name text not null default ''`;
}

export async function logOps(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  kind: string,
  detail: string,
  ip = "",
) {
  await sql`
    insert into studio_ops_events (kind, detail, ip)
    values (${kind}, ${detail.slice(0, 400)}, ${ip.slice(0, 80)})
  `;
}

export function scanUpload(name: string, bytes: Uint8Array | null, maxBytes: number) {
  const clean = name.split(/[/\\]/).pop() || name;
  if (DANGEROUS_EXT.test(clean)) {
    return { ok: false as const, error: "That file type is blocked. No executables or scripts." };
  }
  if (bytes && bytes.byteLength > maxBytes) {
    return { ok: false as const, error: `File is over the ${Math.round(maxBytes / 1024 / 1024)} MB limit the owner set.` };
  }
  if (bytes && bytes.byteLength >= 4) {
    const b0 = bytes[0];
    const b1 = bytes[1];
    const mz = b0 === 0x4d && b1 === 0x5a;
    if (mz) return { ok: false as const, error: "Windows executable blocked." };
  }
  return { ok: true as const, name: clean };
}

export async function isToolPaused(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  toolId: string,
) {
  await ensurePlatformTables(sql);
  const rows = await sql<{ paused: boolean }>`
    select paused from studio_tool_pause where tool_id = ${toolId} limit 1
  `;
  return Boolean(rows[0]?.paused);
}

export async function enforceRate(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  bucket: string,
  limit: number,
) {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000);
  await sql`
    insert into studio_rate_hits (bucket, window_start, hits)
    values (${bucket}, ${windowStart.toISOString()}, 1)
    on conflict (bucket, window_start) do update set hits = studio_rate_hits.hits + 1
  `;
  const rows = await sql<{ hits: number }>`
    select hits from studio_rate_hits
    where bucket = ${bucket} and window_start = ${windowStart.toISOString()}
  `;
  const hits = rows[0]?.hits ?? 1;
  if (hits > limit) {
    await logOps(sql, "rate", `${bucket} hit ${hits}/${limit}`);
    return { ok: false as const, error: "Slow down. Try again in a minute." };
  }
  return { ok: true as const, hits };
}

export const publicSiteChrome = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensurePlatformTables(sql);
  const [ticker, ads, partners, reviews, paused, maxZip] = await Promise.all([
    sql<{ line: string }>`select line from studio_ticker where published = true order by sort_order, id`,
    sql<{ label: string; href: string; icon: string }>`
      select label, href, icon from studio_ads where published = true order by sort_order, id
    `,
    sql<{ id: number; name: string; blurb: string; url: string; mark: string }>`
      select id, name, blurb, url, mark from studio_partners where published = true order by sort_order, id
    `,
    sql<{ id: number; author: string; handle: string; body: string; source: string }>`
      select id, author, handle, body, source from studio_reviews
      where published = true order by created_at desc limit 24
    `,
    sql<{ tool_id: string }>`select tool_id from studio_tool_pause where paused = true`,
    sql<{ value: string }>`select value from studio_settings where key = ${"max_zip_mb"}`,
  ]);
  return {
    ticker: ticker.length ? ticker.map((t) => t.line) : DEFAULT_TICKER,
    ads: ads.length ? ads : DEFAULT_ADS,
    partners,
    reviews,
    paused: paused.map((p) => p.tool_id),
    maxZipMb: Math.max(1, Math.min(8, parseInt(maxZip[0]?.value || "2", 10) || 2)),
  };
});

export const flagshipAccess = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.userId) {
      return { signedIn: false as const, trial: false, paid: false, generations: 0, until: null as string | null };
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const wallet = await sql<{ generations: number }>`
      select generations from studio_wallets where user_id = ${context.userId} limit 1
    `;
    const paid = await sql<{ created_at: string }>`
      select created_at from studio_payments
      where user_id = ${context.userId} and status = ${"approved"}
      order by created_at asc limit 1
    `;
    const first = paid[0]?.created_at ?? null;
    const trial =
      Boolean(first) && Date.now() - new Date(first).getTime() < 30 * 24 * 60 * 60 * 1000;
    return {
      signedIn: true as const,
      trial,
      paid: Boolean(first),
      generations: wallet[0]?.generations ?? 0,
      until: first ? new Date(new Date(first).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    };
  });

export const listPausedTools = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePlatformTables(sql);
    return sql<{ tool_id: string; paused: boolean; reason: string }>`
      select tool_id, paused, reason from studio_tool_pause order by tool_id
    `;
  });

export const setToolPaused = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        toolId: z.string().min(1).max(80),
        paused: z.boolean(),
        reason: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePlatformTables(sql);
    await sql`
      insert into studio_tool_pause (tool_id, paused, reason, updated_at)
      values (${data.toolId}, ${data.paused}, ${data.reason?.trim() || ""}, now())
      on conflict (tool_id) do update set
        paused = excluded.paused, reason = excluded.reason, updated_at = now()
    `;
    await logOps(sql, data.paused ? "pause" : "resume", data.toolId);
    return { ok: true as const };
  });

export const saveTickerLines = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ lines: z.array(z.string().min(1).max(180)).max(20) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePlatformTables(sql);
    await sql`delete from studio_ticker`;
    for (const [i, line] of data.lines.entries()) {
      await sql`insert into studio_ticker (line, sort_order) values (${line.trim()}, ${i})`;
    }
    return { ok: true as const };
  });

export const saveAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.number().int().positive().optional(),
        label: z.string().min(1).max(40),
        href: z.string().max(200),
        icon: z.string().max(20),
        published: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePlatformTables(sql);
    if (data.id) {
      await sql`
        update studio_ads set label = ${data.label}, href = ${data.href}, icon = ${data.icon}, published = ${data.published}
        where id = ${data.id}
      `;
    } else {
      await sql`
        insert into studio_ads (label, href, icon, published)
        values (${data.label}, ${data.href}, ${data.icon}, ${data.published})
      `;
    }
    return { ok: true as const };
  });

export const deleteAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int().positive() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await sql`delete from studio_ads where id = ${data.id}`;
    return { ok: true as const };
  });

export const listStudioChrome = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePlatformTables(sql);
    const [ticker, ads, partners, reviews, events, paused, maxZip] = await Promise.all([
      sql<{ id: number; line: string; published: boolean }>`select id, line, published from studio_ticker order by sort_order, id`,
      sql<{ id: number; label: string; href: string; icon: string; published: boolean }>`
        select id, label, href, icon, published from studio_ads order by sort_order, id
      `,
      sql<{ id: number; name: string; blurb: string; url: string; mark: string; published: boolean }>`
        select id, name, blurb, url, mark, published from studio_partners order by sort_order, id
      `,
      sql<{ id: number; author: string; handle: string; body: string; source: string; published: boolean; created_at: string }>`
        select id, author, handle, body, source, published, created_at from studio_reviews order by created_at desc limit 80
      `,
      sql<{ id: number; kind: string; detail: string; created_at: string }>`
        select id, kind, detail, created_at from studio_ops_events order by created_at desc limit 60
      `,
      sql<{ tool_id: string; paused: boolean; reason: string }>`
        select tool_id, paused, reason from studio_tool_pause order by tool_id
      `,
      sql<{ value: string }>`select value from studio_settings where key = ${"max_zip_mb"}`,
    ]);
    return {
      ticker,
      ads,
      partners,
      reviews,
      events,
      paused,
      maxZipMb: Math.max(1, Math.min(8, parseInt(maxZip[0]?.value || "2", 10) || 2)),
    };
  });

export const savePartner = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(60),
        blurb: z.string().max(160),
        url: z.string().max(200),
        mark: z.string().max(4),
        published: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePlatformTables(sql);
    if (data.id) {
      await sql`
        update studio_partners
        set name = ${data.name}, blurb = ${data.blurb}, url = ${data.url}, mark = ${data.mark}, published = ${data.published}
        where id = ${data.id}
      `;
    } else {
      await sql`
        insert into studio_partners (name, blurb, url, mark, published)
        values (${data.name}, ${data.blurb}, ${data.url}, ${data.mark}, ${data.published})
      `;
    }
    return { ok: true as const };
  });

export const deletePartner = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int().positive() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await sql`delete from studio_partners where id = ${data.id}`;
    return { ok: true as const };
  });

export const saveReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.number().int().positive().optional(),
        author: z.string().min(1).max(60),
        handle: z.string().max(40),
        body: z.string().min(1).max(600),
        source: z.enum(["site", "x", "premium"]),
        published: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePlatformTables(sql);
    if (data.id) {
      await sql`
        update studio_reviews
        set author = ${data.author}, handle = ${data.handle}, body = ${data.body}, source = ${data.source}, published = ${data.published}
        where id = ${data.id}
      `;
    } else {
      await sql`
        insert into studio_reviews (author, handle, body, source, published)
        values (${data.author}, ${data.handle}, ${data.body}, ${data.source}, ${data.published})
      `;
    }
    return { ok: true as const };
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int().positive() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await sql`delete from studio_reviews where id = ${data.id}`;
    return { ok: true as const };
  });

export const saveMaxZip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ mb: z.number().int().min(1).max(8) }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await sql`
      insert into studio_settings (key, value) values (${"max_zip_mb"}, ${String(data.mb)})
      on conflict (key) do update set value = excluded.value
    `;
    return { ok: true as const };
  });

export const powerSnapshot = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePlatformTables(sql);
    const [events, paused, wallets, claims, keys] = await Promise.all([
      sql<{ kind: string; n: number }>`
        select kind, count(*)::int as n from studio_ops_events
        where created_at > now() - interval '24 hours'
        group by kind
      `,
      sql<{ n: number }>`select count(*)::int as n from studio_tool_pause where paused = true`,
      sql<{ n: number; gens: number }>`select count(*)::int as n, coalesce(sum(generations),0)::int as gens from studio_wallets`,
      sql<{ n: number }>`select count(*)::int as n from studio_payments where status = ${"pending"}`,
      sql<{ n: number }>`select count(*)::int as n from studio_api_keys where active = true`.catch(() => [{ n: 0 }]),
    ]);
    return {
      events24h: Object.fromEntries(events.map((e) => [e.kind, e.n])),
      paused: paused[0]?.n ?? 0,
      members: wallets[0]?.n ?? 0,
      generationsOut: wallets[0]?.gens ?? 0,
      pendingClaims: claims[0]?.n ?? 0,
      activeKeys: keys[0]?.n ?? 0,
    };
  });
