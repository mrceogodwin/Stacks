import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  APPS,
  ICONS,
  TONES,
  TOOLS,
  fillToolTemplate,
  iconForCategory,
  isPremiumTool,
  kindForCategory,
  toolCost,
  toneForCategory,
  type IconName,
  type Tone,
  type ToolKind,
} from "@/lib/catalog";
import { KEY_CAP, providerMeta, resolveEndpoint } from "@/lib/providers";
import { optionalAuthMiddleware } from "@/lib/optional-auth";
import { debitPremium } from "@/lib/premium";

export { KEY_CAP };

function asTone(v: string): Tone {
  return (TONES as readonly string[]).includes(v) ? (v as Tone) : "navy";
}
function asIcon(v: string): IconName {
  return (ICONS as readonly string[]).includes(v) ? (v as IconName) : "spark";
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "item"
  );
}

export type PublicApp = {
  id: string;
  name: string;
  category: string;
  desc: string;
  long: string;
  url: string;
  downloadUrl: string;
  videoUrl: string;
  tone: Tone;
  icon: IconName;
  thumbnail: string | null;
};

export type PublicTool = {
  id: string;
  name: string;
  category: string;
  desc: string;
  long: string;
  tone: Tone;
  icon: IconName;
  runnable: boolean;
  kind: ToolKind;
  videoUrl: string;
};

export type StudioApp = PublicApp & { published: boolean; slug: string };
export type StudioTool = PublicTool & {
  published: boolean;
  slug: string;
  prompt: string;
  provider: string;
  model: string;
};
export type StudioKey = {
  id: number;
  label: string;
  provider: string;
  last4: string;
  active: boolean;
  model: string;
  baseUrl: string;
};

type AppRow = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  long_copy: string;
  url: string;
  download_url: string;
  video_url: string;
  tone: string;
  icon: string;
  thumbnail: string | null;
  published: boolean;
};

type ToolRow = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  long_copy: string;
  tone: string;
  icon: string;
  prompt: string;
  provider: string;
  published: boolean;
  kind: string;
  model: string;
  video_url: string;
};

function mapApp(row: AppRow): StudioApp {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    category: row.category,
    desc: row.description,
    long: row.long_copy,
    url: row.url,
    downloadUrl: row.download_url || "",
    videoUrl: row.video_url || "",
    tone: asTone(row.tone),
    icon: asIcon(row.icon),
    thumbnail: row.thumbnail,
    published: Boolean(row.published),
  };
}

function mapTool(row: ToolRow): StudioTool {
  const kind: ToolKind =
    row.kind === "image" || row.kind === "video" || row.kind === "audio" ? row.kind : kindForCategory(row.category);
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    category: row.category,
    desc: row.description,
    long: row.long_copy,
    tone: asTone(row.tone),
    icon: asIcon(row.icon),
    prompt: row.prompt,
    provider: row.provider,
    published: Boolean(row.published),
    runnable: Boolean(row.prompt),
    kind,
    model: row.model || "",
    videoUrl: row.video_url || "",
  };
}

export const listPublishedApps = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<AppRow>`
    select id, name, slug, category, description, long_copy, url, download_url, video_url, tone, icon, thumbnail, published
    from studio_apps where published = true
    order by sort_order, id
  `;
  return rows.map(mapApp);
});

export const listPublishedTools = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<ToolRow>`
    select id, name, slug, category, description, long_copy, tone, icon, published, kind, video_url
    from studio_tools where published = true
    order by sort_order, id
  `;
  return rows.map((r) => {
    const kind: ToolKind =
      r.kind === "image" || r.kind === "video" || r.kind === "audio" ? r.kind : kindForCategory(r.category);
    return {
      id: r.slug || String(r.id),
      name: r.name,
      category: r.category,
      desc: r.description,
      long: r.long_copy,
      tone: asTone(r.tone),
      icon: asIcon(r.icon),
      runnable: true,
      kind,
      videoUrl: r.video_url || "",
    };
  });
});

export const listCounters = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  try {
    const rows = await sql<{ kind: string; item_id: string; count: number }>`
      select kind, item_id, count from studio_counters
    `;
    const apps: Record<string, number> = {};
    const tools: Record<string, number> = {};
    for (const row of rows) {
      if (row.kind === "app") apps[row.item_id] = Number(row.count);
      else tools[row.item_id] = Number(row.count);
    }
    return { apps, tools };
  } catch {
    return { apps: {}, tools: {} };
  }
});

export const bumpCounter = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ kind: z.enum(["app", "tool"]), id: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into studio_counters (kind, item_id, count)
      values (${data.kind}, ${data.id}, 1)
      on conflict (kind, item_id) do update set count = studio_counters.count + 1
    `;
    const rows = await sql<{ count: number }>`
      select count from studio_counters where kind = ${data.kind} and item_id = ${data.id}
    `;
    return { count: Number(rows[0]?.count ?? 1) };
  });

export const listStudioApps = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<AppRow>`
      select id, name, slug, category, description, long_copy, url, download_url, video_url, tone, icon, thumbnail, published
      from studio_apps where user_id = ${context.userId}
      order by sort_order, id
    `;
    return rows.map(mapApp);
  });

export const listStudioTools = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<ToolRow>`
      select id, name, slug, category, description, long_copy, tone, icon, prompt, provider, published, kind, model, video_url
      from studio_tools where user_id = ${context.userId}
      order by sort_order, id
    `;
    return rows.map(mapTool);
  });

export const listStudioKeys = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      label: string;
      provider: string;
      last4: string;
      active: boolean;
      model: string;
      base_url: string;
    }>`
      select id, label, provider, last4, active, model, base_url
      from studio_api_keys
      where user_id = ${context.userId} order by id
    `;
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      provider: r.provider,
      last4: r.last4,
      active: Boolean(r.active),
      model: r.model || "",
      baseUrl: r.base_url || "",
    })) satisfies StudioKey[];
  });

export const studioHealth = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => ({
    platformGrok: Boolean(process.env.XAI_API_KEY),
    keyCap: KEY_CAP,
  }));

export const subscribeUpdates = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ email: z.string().email().max(180) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const email = data.email.trim().toLowerCase();
    try {
      await sql`
        insert into studio_subscribers (email) values (${email})
        on conflict (email) do nothing
      `;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("studio_subscribers")) throw err;
      await sql`
        create table if not exists studio_subscribers (
          id serial primary key,
          email text not null unique,
          created_at timestamptz not null default now()
        )
      `;
      await sql`
        insert into studio_subscribers (email) values (${email})
        on conflict (email) do nothing
      `;
    }
    return { ok: true as const };
  });

export const listSubscribers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { requireStudioOwner } = await import("@/lib/premium");
    await requireStudioOwner(sql, context.userId);
    const rows = await sql<{ email: string; created_at: string }>`
      select email, created_at from studio_subscribers order by created_at desc limit 500
    `;
    return rows;
  });


const appInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  category: z.string().min(1).max(40),
  desc: z.string().max(240),
  long: z.string().max(2000),
  url: z.string().max(400),
  downloadUrl: z.string().max(1600000).optional(),
  videoUrl: z.string().max(400).optional(),
  tone: z.string().max(20),
  icon: z.string().max(20),
  thumbnail: z.string().max(400000).nullable().optional(),
  published: z.boolean(),
});

export const saveStudioApp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => appInput.parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const slug = slugify(data.name);
    const thumb = data.thumbnail ?? null;
    const downloadUrl = data.downloadUrl ?? "";
    const videoUrl = data.videoUrl ?? "";
    if (data.id) {
      await sql`
        update studio_apps set
          name = ${data.name}, slug = ${slug}, category = ${data.category},
          description = ${data.desc}, long_copy = ${data.long}, url = ${data.url},
          download_url = ${downloadUrl}, video_url = ${videoUrl},
          tone = ${data.tone}, icon = ${data.icon},
          thumbnail = coalesce(${thumb}, thumbnail),
          published = ${data.published}
        where id = ${Number(data.id)} and user_id = ${context.userId}
      `;
      return { ok: true as const };
    }
    await sql`
      insert into studio_apps (user_id, name, slug, category, description, long_copy, url, download_url, video_url, tone, icon, thumbnail, published)
      values (${context.userId}, ${data.name}, ${slug}, ${data.category}, ${data.desc}, ${data.long}, ${data.url}, ${downloadUrl}, ${videoUrl}, ${data.tone}, ${data.icon}, ${thumb}, ${data.published})
    `;
    return { ok: true as const };
  });

export const deleteStudioApp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from studio_apps where id = ${Number(data.id)} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

const toolInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  category: z.string().min(1).max(40),
  desc: z.string().max(240),
  long: z.string().max(2000),
  tone: z.string().max(20),
  icon: z.string().max(20),
  prompt: z.string().max(8000),
  provider: z.string().max(40),
  published: z.boolean(),
  kind: z.enum(["chat", "image", "video"]).default("chat"),
  model: z.string().max(120).optional(),
  videoUrl: z.string().max(400).optional(),
});

export const saveStudioTool = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => toolInput.parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const slug = slugify(data.name);
    const model = data.model ?? "";
    const kind = data.kind ?? "chat";
    const videoUrl = data.videoUrl ?? "";
    if (data.id) {
      await sql`
        update studio_tools set
          name = ${data.name}, slug = ${slug}, category = ${data.category},
          description = ${data.desc}, long_copy = ${data.long},
          tone = ${data.tone}, icon = ${data.icon}, prompt = ${data.prompt},
          provider = ${data.provider}, published = ${data.published},
          kind = ${kind}, model = ${model}, video_url = ${videoUrl}
        where id = ${Number(data.id)} and user_id = ${context.userId}
      `;
      return { ok: true as const };
    }
    await sql`
      insert into studio_tools (user_id, name, slug, category, description, long_copy, tone, icon, prompt, provider, published, kind, model, video_url)
      values (${context.userId}, ${data.name}, ${slug}, ${data.category}, ${data.desc}, ${data.long}, ${data.tone}, ${data.icon}, ${data.prompt}, ${data.provider}, ${data.published}, ${kind}, ${model}, ${videoUrl})
    `;
    return { ok: true as const };
  });

export const deleteStudioTool = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from studio_tools where id = ${Number(data.id)} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

const keyInput = z.object({
  label: z.string().min(1).max(60),
  provider: z.string().min(1).max(40),
  secret: z.string().min(8).max(400),
  model: z.string().max(120).optional(),
  baseUrl: z.string().max(400).optional(),
});

export const saveStudioKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => keyInput.parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const count = await sql<{ n: number }>`select count(*)::int as n from studio_api_keys where user_id = ${context.userId}`;
    if ((count[0]?.n ?? 0) >= KEY_CAP) {
      return { ok: false as const, error: `You already have ${KEY_CAP} API keys.` };
    }
    const last4 = data.secret.slice(-4);
    const model = data.model ?? "";
    const baseUrl = data.baseUrl ?? "";
    await sql`
      insert into studio_api_keys (user_id, label, provider, secret, last4, active, model, base_url)
      values (${context.userId}, ${data.label}, ${data.provider}, ${data.secret}, ${last4}, true, ${model}, ${baseUrl})
    `;
    return { ok: true as const };
  });

export const saveStudioKeysBulk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ keys: z.array(keyInput).min(1).max(KEY_CAP) }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const count = await sql<{ n: number }>`select count(*)::int as n from studio_api_keys where user_id = ${context.userId}`;
    const used = count[0]?.n ?? 0;
    const room = KEY_CAP - used;
    if (room <= 0) return { ok: false as const, error: `Vault is full (${KEY_CAP} keys).`, added: 0 };
    const batch = data.keys.slice(0, room);
    for (const key of batch) {
      const last4 = key.secret.slice(-4);
      const model = key.model ?? "";
      const baseUrl = key.baseUrl ?? "";
      await sql`
        insert into studio_api_keys (user_id, label, provider, secret, last4, active, model, base_url)
        values (${context.userId}, ${key.label}, ${key.provider}, ${key.secret}, ${last4}, true, ${model}, ${baseUrl})
      `;
    }
    return { ok: true as const, added: batch.length };
  });

export const deleteStudioKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.number() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from studio_api_keys where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const toggleStudioKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.number() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      update studio_api_keys set active = not active
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

const importToolRow = z.object({
  name: z.string().min(1).max(80),
  category: z.string().min(1).max(40),
  desc: z.string().max(240),
  prompt: z.string().max(8000),
  provider: z.string().max(40).optional(),
  kind: z.enum(["chat", "image", "video"]).optional(),
});

export const importStudioTools = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ tools: z.array(importToolRow).min(1).max(200) }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    let added = 0;
    for (const [i, tool] of data.tools.entries()) {
      const slug = slugify(tool.name) + (i ? `-${i}` : "");
      const tone = toneForCategory(tool.category);
      const icon = iconForCategory(tool.category);
      const provider = tool.provider || "xai";
      const kind = tool.kind ?? kindForCategory(tool.category);
      await sql`
        insert into studio_tools (user_id, name, slug, category, description, long_copy, tone, icon, prompt, provider, published, kind, model, sort_order)
        values (${context.userId}, ${tool.name}, ${slug}, ${tool.category}, ${tool.desc}, ${tool.desc}, ${tone}, ${icon}, ${tool.prompt}, ${provider}, true, ${kind}, ${""}, ${i})
      `;
      added += 1;
    }
    return { ok: true as const, added };
  });

export const seedStudioCatalog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const existing = await sql<{ n: number }>`select count(*)::int as n from studio_apps where user_id = ${context.userId}`;
    if ((existing[0]?.n ?? 0) > 0) return { ok: true as const, seeded: false };
    for (const [i, app] of APPS.entries()) {
      await sql`
        insert into studio_apps (user_id, name, slug, category, description, long_copy, url, tone, icon, published, sort_order)
        values (${context.userId}, ${app.name}, ${app.id}, ${app.category}, ${app.desc}, ${app.long}, ${""}, ${app.tone}, ${app.icon}, true, ${i})
      `;
    }
    for (const [i, tool] of TOOLS.entries()) {
      const prompt =
        tool.systemPrompt ||
        `You are ${tool.name}, a ${tool.category} tool on Stacks.ng. ${tool.long} Help the user with a clear, useful answer.`;
      const kind = tool.kind ?? kindForCategory(tool.category);
      await sql`
        insert into studio_tools (user_id, name, slug, category, description, long_copy, tone, icon, prompt, provider, published, sort_order, kind, model)
        values (${context.userId}, ${tool.name}, ${tool.id}, ${tool.category}, ${tool.desc}, ${tool.long}, ${tool.tone}, ${tool.icon}, ${prompt}, ${"xai"}, true, ${i}, ${kind}, ${""})
      `;
    }
    return { ok: true as const, seeded: true };
  });

type KeyPick = {
  id: number;
  secret: string;
  provider: string;
  model: string;
  base_url: string;
};

async function pickKey(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  userId: string,
  provider: string,
): Promise<KeyPick | null> {
  const keys = await sql<KeyPick & { last_used_at: string | null }>`
    select id, secret, provider, model, base_url, last_used_at
    from studio_api_keys
    where user_id = ${userId} and active = true
    order by last_used_at nulls first, id
  `;
  const match = keys.find((k) => k.provider === provider) ?? keys[0] ?? null;
  if (match) {
    await sql`update studio_api_keys set last_used_at = now() where id = ${match.id} and user_id = ${userId}`;
  }
  return match;
}

async function pickAnyStudioKey(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  provider: string,
): Promise<KeyPick | null> {
  const keys = await sql<KeyPick & { last_used_at: string | null }>`
    select id, secret, provider, model, base_url, last_used_at
    from studio_api_keys
    where active = true
    order by last_used_at nulls first, id
  `;
  const match = keys.find((k) => k.provider === provider) ?? keys[0] ?? null;
  if (match) {
    await sql`update studio_api_keys set last_used_at = now() where id = ${match.id}`;
  }
  return match;
}

async function listPoolKeys(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  userId: string | undefined,
) {
  if (userId) {
    return sql<KeyPick>`
      select id, secret, provider, model, base_url
      from studio_api_keys
      where user_id = ${userId} and active = true
      order by last_used_at nulls first, id
    `;
  }
  return sql<KeyPick>`
    select id, secret, provider, model, base_url
    from studio_api_keys
    where active = true
    order by last_used_at nulls first, id
  `;
}

function isRetryable(error: string) {
  return /credit|spending|subscription|403|401|429|402|rate|quota|forbidden|insufficient|provider error|KEY_FAIL/i.test(error);
}

type ToolRunOk = {
  ok: true;
  text: string;
  imageUrl: string;
  videoUrl: string;
  audioUrl?: string;
  requestId?: string;
};
type ToolRunFail = { ok: false; error: string; login?: boolean };

async function providerMessage(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { error?: string; message?: string; code?: string };
    const raw = [body.error, body.message, body.code].filter((v) => typeof v === "string").join(" ");
    if (/credit|spending|subscription|403|forbidden/i.test(raw) || res.status === 403) {
      return "This key is out of credit. Stacks will try the next key in the pool. If every key is spent, Premium payments refill the engine.";
    }
    if (raw) return raw.slice(0, 220);
  } catch {
    /* ignore */
  }
  return fallback;
}

async function runChat(opts: {
  secret: string;
  chatUrl: string;
  model: string;
  system: string;
  input: string;
  maxTokens?: number;
}): Promise<ToolRunOk | ToolRunFail> {
  const res = await fetch(opts.chatUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.secret}` },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: Math.min(Math.max(opts.maxTokens ?? 1200, 200), 4000),
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.input },
      ],
    }),
  });
  if (!res.ok) return { ok: false, error: await providerMessage(res, `Provider error ${res.status}. The engine will try the next key.`) };
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { ok: true, text: body.choices?.[0]?.message?.content ?? "", imageUrl: "", videoUrl: "" };
}

async function runImage(opts: { secret: string; imagesUrl: string; model: string; prompt: string }): Promise<ToolRunOk | ToolRunFail> {
  const res = await fetch(opts.imagesUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.secret}` },
    body: JSON.stringify({
      model: opts.model || "grok-imagine-image",
      prompt: opts.prompt.slice(0, 1800),
      n: 1,
      response_format: "url",
    }),
  });
  if (!res.ok) return { ok: false, error: await providerMessage(res, `Image provider error ${res.status}`) };
  const body = (await res.json()) as { data?: { url?: string }[] };
  const imageUrl = body.data?.[0]?.url ?? "";
  return { ok: true, text: imageUrl ? "Image ready." : "", imageUrl, videoUrl: "" };
}

async function startVideo(secret: string, prompt: string): Promise<ToolRunOk | ToolRunFail> {
  const res = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      model: "grok-imagine-video-1.5",
      prompt: prompt.slice(0, 1800),
      duration: 6,
      aspect_ratio: "16:9",
      resolution: "720p",
    }),
  });
  if (!res.ok) return { ok: false, error: await providerMessage(res, `Video provider error ${res.status}`) };
  const body = (await res.json()) as { request_id?: string };
  if (!body.request_id) return { ok: false, error: "Video did not start." };
  return { ok: true, text: "Rendering video…", imageUrl: "", videoUrl: "", requestId: body.request_id };
}

export const runPublishedTool = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        toolId: z.string().min(1).max(120),
        input: z.string().max(8000).optional(),
        fields: z.record(z.string().max(80), z.string().max(8000)).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { isToolPaused, enforceRate } = await import("@/lib/ops");
    if (await isToolPaused(sql, data.toolId)) {
      return { ok: false as const, error: "This tool is paused by the owner." };
    }
    const rate = await enforceRate(sql, `tool:${context.userId || "anon"}`, context.userId ? 40 : 12);
    if (!rate.ok) return rate;
    const tools = await sql<ToolRow & { user_id: string }>`
      select id, user_id, name, slug, category, description, long_copy, tone, icon, prompt, provider, published, kind, model
      from studio_tools
      where published = true and (
        slug = ${data.toolId}
        or id::text = ${data.toolId}
      )
      limit 1
    `;
    const tool = tools[0];
    const catalog = TOOLS.find((item) => item.id === data.toolId) ?? null;
    if (!tool && !catalog) return { ok: false as const, error: "Tool is not published yet." };

    const rawKind = (tool?.kind || catalog?.kind || "").toLowerCase();
    const kind: ToolKind =
      rawKind === "image" || rawKind === "video" || rawKind === "audio"
        ? rawKind
        : kindForCategory(tool?.category || catalog?.category || "Writing");
    const premium = isPremiumTool(catalog ?? { id: data.toolId, premium: false });
    let cost = toolCost(catalog ?? { id: data.toolId, kind, premium });
    const priced = await sql<{ generations: number }>`
      select generations from studio_tool_prices where tool_id = ${data.toolId} limit 1
    `.catch(() => [] as { generations: number }[]);
    if (priced[0]?.generations) cost = priced[0].generations;
    if (premium && !context.userId) {
      return {
        ok: false as const,
        error: "Premium tools need an account. Register, pay in crypto, then wait for approval.",
        login: true,
      };
    }

    const fields = data.fields ?? {};
    if (kind === "audio") {
      const { renderMusic, renderSfx, wavDataUrl } = await import("@/lib/audio-engine");
      const describe = [fields.prompt, fields.describe, fields.space, fields.intensity, data.input]
        .filter((v) => typeof v === "string" && v.trim())
        .join(" ");
      const isSfx = /sfx|sound|effect/i.test(catalog?.id || data.toolId) || catalog?.id === "sfx-studio";
      const buf = isSfx
        ? renderSfx({ type: fields.type, prompt: describe, seconds: fields.seconds })
        : renderMusic({
            genre: fields.genre,
            mood: fields.mood,
            bpm: fields.bpm,
            seconds: fields.seconds,
            prompt: describe,
          });
      if (premium) {
        const gate = await debitPremium(sql, context.userId, cost);
        if (!gate.ok) return gate;
      }
      return {
        ok: true as const,
        text: "Audio ready. Download WAV below.",
        imageUrl: "",
        videoUrl: "",
        audioUrl: wavDataUrl(buf),
      };
    }

    const ownerId = tool?.user_id;
    const providerWanted = tool?.provider || "xai";
    const pool = await listPoolKeys(sql, ownerId);
    const platformKey = process.env.XAI_API_KEY;
    const attempts: KeyPick[] = [...pool];
    if (platformKey && (kind === "video" || providerWanted === "xai" || !attempts.length)) {
      attempts.push({ id: 0, secret: platformKey, provider: "xai", model: "", base_url: "" });
    }
    if (!attempts.length) {
      return {
        ok: false as const,
        error: "The generation engine has no live keys right now. Premium payments keep it funded. Try again shortly.",
      };
    }

    const name = tool?.name ?? catalog!.name;
    const templated =
      catalog?.userPromptTemplate && Object.keys(fields).length
        ? fillToolTemplate(catalog.userPromptTemplate, fields)
        : "";
    const userInput = (templated || data.input || fields.prompt || Object.values(fields).join("\n")).trim();
    if (!userInput) return { ok: false as const, error: "Tell the tool what you need first." };

    const system =
      (tool?.prompt && tool.prompt.trim()) ||
      catalog?.systemPrompt ||
      `You are ${name}, a ${(tool?.category ?? catalog!.category)} tool on Stacks. ${tool?.long_copy ?? catalog!.long}`;
    const prompt = `${system}\n\n${userInput}`;

    let lastError = "All keys failed.";
    const maxTries = Math.min(attempts.length, 12);
    for (let i = 0; i < maxTries; i++) {
      const key = attempts[i]!;
      if (key.id) await sql`update studio_api_keys set last_used_at = now() where id = ${key.id}`;
      const provider = kind === "video" ? "xai" : key.provider || providerWanted;
      const resolved = resolveEndpoint(provider, key.base_url);
      let result: ToolRunOk | ToolRunFail;
      if (kind === "video") result = await startVideo(key.secret, prompt);
      else if (kind === "image") {
        result = await runImage({
          secret: key.secret,
          imagesUrl: resolved.images,
          model: tool?.model || key.model || resolved.imageModel || "grok-imagine-image",
          prompt,
        });
      } else {
        result = await runChat({
          secret: key.secret,
          chatUrl: resolved.chat,
          model: tool?.model || key.model || resolved.chatModel || providerMeta(provider).chatModel,
          system: `${system} Output ONLY the final content the user asked for — no markdown code fences, no preamble.`,
          input: userInput,
          maxTokens: catalog?.maxTokens ?? 1500,
        });
      }
      if (result.ok) {
        if (premium) {
          const gate = await debitPremium(sql, context.userId, cost);
          if (!gate.ok) return gate;
        }
        return result;
      }
      lastError = result.error;
      if (!isRetryable(result.error)) break;
    }
    return {
      ok: false as const,
      error: lastError.replace(/^KEY_FAIL \d+:\s*/, "") || "Every key in the pool is spent. Premium payments refill the engine.",
    };
  });

export const pollPublishedVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ requestId: z.string().min(8).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const secret = process.env.XAI_API_KEY;
    if (!secret) return { ok: false as const, error: "Video engine has no live key right now. Try again shortly." };
    const res = await fetch(`https://api.x.ai/v1/videos/${data.requestId}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) return { ok: false as const, error: `Video status error ${res.status}` };
    const body = (await res.json()) as {
      status?: string;
      video?: { url?: string };
    };
    if (body.status === "done" && body.video?.url) {
      return { ok: true as const, status: "done" as const, videoUrl: body.video.url };
    }
    if (body.status === "expired" || body.status === "failed") {
      return { ok: false as const, error: "Video render failed. Try a shorter prompt." };
    }
    return { ok: true as const, status: "pending" as const, videoUrl: "" };
  });
