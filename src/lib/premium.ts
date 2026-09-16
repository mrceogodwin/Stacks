import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuthMiddleware } from "@/lib/optional-auth";

const CURRENCIES = ["USDT", "USDC", "BTC", "ETH", "SOL", "NGN"] as const;

async function ensurePremiumTables(
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
  await sql`create table if not exists studio_wallets (
    user_id text primary key,
    email text not null default '',
    generations int not null default 0,
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists studio_payments (
    id serial primary key,
    user_id text not null,
    email text not null,
    amount text not null,
    currency text not null default 'USDT',
    tx_hash text not null default '',
    note text not null default '',
    status text not null default 'pending',
    generations_credit int not null default 0,
    created_at timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewed_by text
  )`;
}

async function setting(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  key: string,
  fallback = "",
) {
  const rows = await sql<{ value: string }>`select value from studio_settings where key = ${key}`;
  return rows[0]?.value ?? fallback;
}

export async function requireStudioOwner(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  userId: string,
) {
  await ensurePremiumTables(sql);
  const owners = await sql<{ user_id: string }>`select user_id from studio_owners`;
  if (!owners.length) {
    await sql`insert into studio_owners (user_id) values (${userId}) on conflict do nothing`;
    return;
  }
  if (!owners.some((row) => row.user_id === userId)) {
    throw new Error("Studio is locked to the owner account.");
  }
}

export const amIStudioOwner = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePremiumTables(sql);
    const owners = await sql<{ user_id: string }>`select user_id from studio_owners`;
    if (!owners.length) {
      await sql`insert into studio_owners (user_id) values (${context.userId}) on conflict do nothing`;
      return { owner: true as const };
    }
    return { owner: owners.some((row) => row.user_id === context.userId) };
  });

export const publicCryptoInfo = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensurePremiumTables(sql);
  const [usdt, btc, eth, sol, rate] = await Promise.all([
    setting(sql, "addr_usdt"),
    setting(sql, "addr_btc"),
    setting(sql, "addr_eth"),
    setting(sql, "addr_sol"),
    setting(sql, "gens_per_usd", "20"),
  ]);
  return {
    addresses: [
      { id: "USDT", label: "USDT (TRC20 / TON)", value: usdt },
      { id: "BTC", label: "Bitcoin", value: btc },
      { id: "ETH", label: "Ethereum / USDC", value: eth },
      { id: "SOL", label: "Solana", value: sol },
    ],
    gensPerUsd: Math.max(1, parseInt(rate, 10) || 20),
  };
});

export const myWallet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePremiumTables(sql);
    const rows = await sql<{ generations: number; email: string }>`
      select generations, email from studio_wallets where user_id = ${context.userId}
    `;
    const payments = await sql<{
      id: number;
      amount: string;
      currency: string;
      tx_hash: string;
      status: string;
      generations_credit: number;
      created_at: string;
    }>`
      select id, amount, currency, tx_hash, status, generations_credit, created_at
      from studio_payments where user_id = ${context.userId}
      order by created_at desc limit 40
    `;
    return {
      generations: rows[0]?.generations ?? 0,
      email: rows[0]?.email ?? "",
      payments,
    };
  });

export const submitPaymentClaim = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        email: z.string().email().max(180),
        amount: z.string().min(1).max(40),
        currency: z.enum(CURRENCIES),
        txHash: z.string().max(120).optional(),
        note: z.string().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePremiumTables(sql);
    const email = data.email.trim().toLowerCase();
    await sql`
      insert into studio_wallets (user_id, email, generations)
      values (${context.userId}, ${email}, 0)
      on conflict (user_id) do update set email = excluded.email, updated_at = now()
    `;
    await sql`
      insert into studio_payments (user_id, email, amount, currency, tx_hash, note, status)
      values (
        ${context.userId},
        ${email},
        ${data.amount.trim()},
        ${data.currency},
        ${data.txHash?.trim() || ""},
        ${data.note?.trim() || ""},
        ${"pending"}
      )
    `;
    return { ok: true as const };
  });

export const listPaymentClaims = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    const rows = await sql<{
      id: number;
      user_id: string;
      email: string;
      amount: string;
      currency: string;
      tx_hash: string;
      note: string;
      status: string;
      generations_credit: number;
      created_at: string;
    }>`
      select id, user_id, email, amount, currency, tx_hash, note, status, generations_credit, created_at
      from studio_payments order by created_at desc limit 200
    `;
    const [usdt, btc, eth, sol, rate] = await Promise.all([
      setting(sql, "addr_usdt"),
      setting(sql, "addr_btc"),
      setting(sql, "addr_eth"),
      setting(sql, "addr_sol"),
      setting(sql, "gens_per_usd", "20"),
    ]);
    return {
      claims: rows,
      settings: { usdt, btc, eth, sol, gensPerUsd: rate },
    };
  });

export const saveCryptoSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        usdt: z.string().max(120),
        btc: z.string().max(120),
        eth: z.string().max(120),
        sol: z.string().max(120),
        gensPerUsd: z.string().max(8),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    const pairs: [string, string][] = [
      ["addr_usdt", data.usdt.trim()],
      ["addr_btc", data.btc.trim()],
      ["addr_eth", data.eth.trim()],
      ["addr_sol", data.sol.trim()],
      ["gens_per_usd", String(Math.max(1, parseInt(data.gensPerUsd, 10) || 20))],
    ];
    for (const [key, value] of pairs) {
      await sql`
        insert into studio_settings (key, value) values (${key}, ${value})
        on conflict (key) do update set value = excluded.value
      `;
    }
    return { ok: true as const };
  });

function estimateGens(amount: string, gensPerUsd: number) {
  const n = parseFloat(amount.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return gensPerUsd;
  return Math.max(1, Math.round(n * gensPerUsd));
}

export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.number().int().positive(),
        action: z.enum(["approve", "reject"]),
        generations: z.number().int().min(0).max(100000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await requireStudioOwner(sql, context.userId);
    const rows = await sql<{
      id: number;
      user_id: string;
      email: string;
      amount: string;
      status: string;
    }>`select id, user_id, email, amount, status from studio_payments where id = ${data.id} limit 1`;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Claim not found." };
    if (row.status !== "pending") return { ok: false as const, error: "Already reviewed." };
    if (data.action === "reject") {
      await sql`
        update studio_payments
        set status = ${"rejected"}, reviewed_at = now(), reviewed_by = ${context.userId}
        where id = ${row.id}
      `;
      return { ok: true as const };
    }
    const rate = Math.max(1, parseInt(await setting(sql, "gens_per_usd", "20"), 10) || 20);
    const credit = data.generations && data.generations > 0 ? data.generations : estimateGens(row.amount, rate);
    await sql`
      update studio_payments
      set status = ${"approved"}, generations_credit = ${credit}, reviewed_at = now(), reviewed_by = ${context.userId}
      where id = ${row.id}
    `;
    await sql`
      insert into studio_wallets (user_id, email, generations)
      values (${row.user_id}, ${row.email}, ${credit})
      on conflict (user_id) do update set
        generations = studio_wallets.generations + ${credit},
        email = excluded.email,
        updated_at = now()
    `;
    return { ok: true as const, credited: credit };
  });

export async function debitPremium(
  sql: Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>,
  userId: string | null,
  cost: number,
): Promise<{ ok: true } | { ok: false; error: string; login?: boolean }> {
  if (!userId) {
    return {
      ok: false,
      error: "Premium tools need an account. Register, pay in crypto, then wait for approval.",
      login: true,
    };
  }
  await ensurePremiumTables(sql);
  const rows = await sql<{ generations: number }>`
    select generations from studio_wallets where user_id = ${userId}
  `;
  const have = rows[0]?.generations ?? 0;
  if (have < cost) {
    return {
      ok: false,
      error: `This run costs ${cost} generation${cost === 1 ? "" : "s"}. Your wallet has ${have}. Submit a crypto payment and wait for approval.`,
    };
  }
  await sql`
    update studio_wallets
    set generations = generations - ${cost}, updated_at = now()
    where user_id = ${userId} and generations >= ${cost}
  `;
  return { ok: true };
}

export const peekPremiumSession = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.userId) return { signedIn: false as const, generations: 0 };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await ensurePremiumTables(sql);
    const rows = await sql<{ generations: number }>`
      select generations from studio_wallets where user_id = ${context.userId}
    `;
    return { signedIn: true as const, generations: rows[0]?.generations ?? 0 };
  });
