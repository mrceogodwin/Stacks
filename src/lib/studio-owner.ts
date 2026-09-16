import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireStudioOwner } from "@/lib/premium";

const OWNER_EMAIL = "admin@stacks.ng";
const OWNER_USERNAME_DEFAULT = "stacksadmin";
const OWNER_PASSWORD_DEFAULT = "StacksOwner#2026";

async function hashPassword(password: string) {
  const ctx = await auth.$context;
  return ctx.password.hash(password);
}

async function verifyPassword(hash: string, password: string) {
  const ctx = await auth.$context;
  return ctx.password.verify({ hash, password });
}

async function ensureOwnerUser(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
) {
  await sql`create table if not exists studio_owners (
    user_id text primary key,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists studio_settings (
    key text primary key,
    value text not null default ''
  )`;
  await sql`create table if not exists studio_activity (
    id serial primary key,
    actor text not null default '',
    action text not null,
    detail text not null default '',
    created_at timestamptz not null default now()
  )`;

  const named = await sql<{ value: string }>`
    select value from studio_settings where key = ${"admin_username"}
  `;
  if (!named[0]) {
    await sql`
      insert into studio_settings (key, value)
      values (${"admin_username"}, ${OWNER_USERNAME_DEFAULT})
      on conflict (key) do nothing
    `;
  }

  const users = await sql<{ id: string }>`
    select id from "user" where email = ${OWNER_EMAIL} limit 1
  `;
  let userId = users[0]?.id;
  if (!userId) {
    userId = crypto.randomUUID();
    const hashed = await hashPassword(OWNER_PASSWORD_DEFAULT);
    await sql`
      insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      values (${userId}, ${"Stacks Owner"}, ${OWNER_EMAIL}, ${true}, now(), now())
    `;
    await sql`
      insert into "account" (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      )
      values (
        ${crypto.randomUUID()}, ${userId}, ${"credential"}, ${userId}, ${hashed}, now(), now()
      )
    `;
  }
  await sql`
    insert into studio_owners (user_id) values (${userId})
    on conflict (user_id) do nothing
  `;
  return userId;
}

export const ensureStudioAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensureOwnerUser(sql);
  return { ok: true as const };
});

export const resolveStudioUsername = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ username: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensureOwnerUser(sql);
    const rows = await sql<{ value: string }>`
      select value from studio_settings where key = ${"admin_username"}
    `;
    const username = (rows[0]?.value || OWNER_USERNAME_DEFAULT).trim().toLowerCase();
    const given = data.username.trim().toLowerCase();
    if (given !== username && given !== OWNER_EMAIL) {
      return { ok: false as const, error: "Unknown owner login." };
    }
    return { ok: true as const, email: OWNER_EMAIL };
  });

export const ownerSecurity = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    const rows = await sql<{ value: string }>`
      select value from studio_settings where key = ${"admin_username"}
    `;
    return {
      username: rows[0]?.value || OWNER_USERNAME_DEFAULT,
      email: OWNER_EMAIL,
    };
  });

export const saveOwnerUsername = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await sql`
      insert into studio_settings (key, value)
      values (${"admin_username"}, ${data.username.trim()})
      on conflict (key) do update set value = excluded.value
    `;
    return { ok: true as const };
  });

export const rotateOwnerPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        current: z.string().min(8).max(120),
        next: z.string().min(8).max(120),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    const accounts = await sql<{ password: string }>`
      select password from "account"
      where "userId" = ${context.userId} and "providerId" = ${"credential"}
      limit 1
    `;
    const hash = accounts[0]?.password;
    if (!hash) return { ok: false as const, error: "This owner login has no password yet." };
    const good = await verifyPassword(hash, data.current);
    if (!good) return { ok: false as const, error: "Current password is wrong." };
    const nextHash = await hashPassword(data.next);
    await sql`
      update "account"
      set password = ${nextHash}, "updatedAt" = now()
      where "userId" = ${context.userId} and "providerId" = ${"credential"}
    `;
    return { ok: true as const };
  });

export const setWalletGens = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().min(1).max(80),
        generations: z.number().int().min(0).max(1000000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    await sql`
      update studio_wallets
      set generations = ${data.generations}, updated_at = now()
      where user_id = ${data.userId}
    `;
    await sql`
      insert into studio_activity (actor, action, detail)
      values (${context.userId}, ${"wallet.set"}, ${`${data.userId} = ${data.generations}`})
    `;
    return { ok: true as const };
  });

export const broadcastNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ title: z.string().min(1).max(120), body: z.string().min(1).max(4000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    const people = await sql<{ user_id: string }>`select user_id from studio_wallets`;
    for (const row of people) {
      await sql`
        insert into studio_notifications (user_id, title, body)
        values (${row.user_id}, ${data.title}, ${data.body})
      `;
    }
    await sql`
      insert into studio_activity (actor, action, detail)
      values (${context.userId}, ${"broadcast"}, ${data.title})
    `;
    return { ok: true as const, sent: people.length };
  });

export const listActivity = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    return sql<{ id: number; action: string; detail: string; created_at: string }>`
      select id, action, detail, created_at
      from studio_activity
      order by created_at desc
      limit 80
    `;
  });
