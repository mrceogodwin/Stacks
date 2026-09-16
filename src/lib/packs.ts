import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuthMiddleware } from "@/lib/optional-auth";
import { debitPremium, requireStudioOwner } from "@/lib/premium";

async function ensurePackTables(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
) {
  await sql`create table if not exists studio_packs (
    id serial primary key,
    user_id text not null,
    name text not null,
    description text not null default '',
    lane text not null default 'free',
    file_url text not null default '',
    cover text,
    cost int not null default 0,
    published boolean not null default true,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists studio_pack_unlocks (
    user_id text not null,
    pack_id int not null,
    created_at timestamptz not null default now(),
    primary key (user_id, pack_id)
  )`;
}

export type PublicPack = {
  id: number;
  name: string;
  description: string;
  lane: "free" | "premium";
  cover: string | null;
  cost: number;
  unlocked: boolean;
};

export const listPublishedPacks = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePackTables(sql);
    const rows = await sql<{
      id: number;
      name: string;
      description: string;
      lane: string;
      cover: string | null;
      cost: number;
    }>`
      select id, name, description, lane, cover, cost
      from studio_packs
      where published = true
      order by lane asc, created_at desc
      limit 80
    `;
    let unlocked = new Set<number>();
    if (context.userId) {
      const owns = await sql<{ pack_id: number }>`
        select pack_id from studio_pack_unlocks where user_id = ${context.userId}
      `;
      unlocked = new Set(owns.map((r) => r.pack_id));
    }
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      lane: (row.lane === "premium" ? "premium" : "free") as "free" | "premium",
      cover: row.cover,
      cost: row.cost,
      unlocked: row.lane !== "premium" || unlocked.has(row.id),
    })) satisfies PublicPack[];
  });

export const unlockPack = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int().positive() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePackTables(sql);
    const rows = await sql<{
      id: number;
      lane: string;
      file_url: string;
      cost: number;
      published: boolean;
    }>`select id, lane, file_url, cost, published from studio_packs where id = ${data.id} limit 1`;
    const pack = rows[0];
    if (!pack || !pack.published) return { ok: false as const, error: "Pack is not live." };
    if (!pack.file_url) return { ok: false as const, error: "The owner has not placed a file for this pack yet." };
    if (pack.lane !== "premium") return { ok: true as const, url: pack.file_url };
    if (!context.userId) {
      return {
        ok: false as const,
        login: true,
        error: "Premium packs need a visitor account. Register, pay, then unlock.",
      };
    }
    const already = await sql<{ pack_id: number }>`
      select pack_id from studio_pack_unlocks
      where user_id = ${context.userId} and pack_id = ${pack.id}
    `;
    if (!already.length && pack.cost > 0) {
      const gate = await debitPremium(sql, context.userId, pack.cost);
      if (!gate.ok) return gate;
    }
    await sql`
      insert into studio_pack_unlocks (user_id, pack_id)
      values (${context.userId}, ${pack.id})
      on conflict do nothing
    `;
    return { ok: true as const, url: pack.file_url };
  });

export const listStudioPacks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePackTables(sql);
    return sql<{
      id: number;
      name: string;
      description: string;
      lane: string;
      file_url: string;
      cover: string | null;
      cost: number;
      published: boolean;
    }>`
      select id, name, description, lane, file_url, cover, cost, published
      from studio_packs order by created_at desc limit 80
    `;
  });

export const saveStudioPack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(80),
        description: z.string().max(400),
        lane: z.enum(["free", "premium"]),
        fileUrl: z.string().max(600),
        cover: z.string().max(400000).nullable().optional(),
        cost: z.number().int().min(0).max(100),
        published: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await ensurePackTables(sql);
    const cover = data.cover ?? null;
    const cost = data.lane === "free" ? 0 : data.cost;
    if (data.id) {
      await sql`
        update studio_packs set
          name = ${data.name},
          description = ${data.description},
          lane = ${data.lane},
          file_url = ${data.fileUrl},
          cover = coalesce(${cover}, cover),
          cost = ${cost},
          published = ${data.published}
        where id = ${data.id}
      `;
      return { ok: true as const };
    }
    await sql`
      insert into studio_packs (user_id, name, description, lane, file_url, cover, cost, published)
      values (${context.userId}, ${data.name}, ${data.description}, ${data.lane}, ${data.fileUrl}, ${cover}, ${cost}, ${data.published})
    `;
    return { ok: true as const };
  });

export const deleteStudioPack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int().positive() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await sql`delete from studio_packs where id = ${data.id}`;
    return { ok: true as const };
  });
