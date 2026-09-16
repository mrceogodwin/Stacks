import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { authClient, authEnabled, signIn, GROK_PROVIDERS } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  myWallet,
  publicCryptoInfo,
  submitPaymentClaim,
  submitTicket,
  myInbox,
  markNotesRead,
} from "@/lib/premium";
import { StacksLogo } from "@/components/stacks/logo";
import { ThemeToggle } from "@/components/stacks/theme-toggle";

export function AccountDesk() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gens, setGens] = useState(0);
  const [payments, setPayments] = useState<
    { id: number; amount: string; currency: string; status: string; generations_credit: number; created_at: string }[]
  >([]);
  const [addresses, setAddresses] = useState<{ id: string; label: string; value: string }[]>([]);
  const [rate, setRate] = useState(20);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USDT" | "USDC" | "BTC" | "ETH" | "SOL" | "NGN">("USDT");
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("");
  const [payEmail, setPayEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ id: number; title: string; body: string; read: boolean; created_at: string }[]>([]);
  const [tickets, setTickets] = useState<{ id: number; subject: string; status: string; reply: string; created_at: string }[]>([]);
  const [subject, setSubject] = useState("");
  const [ticketBody, setTicketBody] = useState("");

  async function load() {
    const [w, info, box] = await Promise.all([myWallet(), publicCryptoInfo(), myInbox()]);
    setGens(w.generations);
    setPayments(w.payments);
    if (w.email) setPayEmail(w.email);
    setAddresses(info.addresses);
    setRate(info.gensPerUsd);
    setNotes(box.notes);
    setTickets(box.tickets);
    if (box.notes.some((n) => !n.read)) void markNotesRead();
  }

  useEffect(() => {
    if (!user) {
      void publicCryptoInfo()
        .then((info) => {
          setAddresses(info.addresses);
          setRate(info.gensPerUsd);
        })
        .catch(() => {});
      return;
    }
    void load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load wallet"));
  }, [user]);

  async function onAuth(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] ?? "Member",
          callbackURL: "/account",
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/account",
        });
        if (err) throw new Error(err.message);
      }
      window.location.href = "/account";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function onClaim(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await submitPaymentClaim({
        data: { email: payEmail || user?.primaryEmail || email, amount, currency, txHash, note },
      });
      setAmount("");
      setTxHash("");
      setNote("");
      setStatus("Submitted. The owner reviews payments and credits generations after approval.");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-bg-deep text-fg">
      <div className="stacks-atmosphere pointer-events-none fixed inset-0" />
      <header className="relative z-10 border-b border-line bg-bg-deep/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link to="/">
            <StacksLogo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? <UserButton /> : null}
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-12">
        <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">Visitor account</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Register & wallet</h1>
        <p className="mt-3 max-w-xl text-muted">
          This is a visitor login for Premium tools. Not Super Admin. Create an email account, send crypto, submit the amount.
          The owner approves. Generations land here. The owner console stays locked.
        </p>

        {isPending ? <p className="mt-8 text-muted">Loading…</p> : null}

        {!isPending && !user ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="max-w-md space-y-3">
            {authEnabled ? (
              <>
                <form onSubmit={(e) => void onAuth(e)} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="field"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="field"
                  />
                  {error ? <p className="text-sm text-rose-400">{error}</p> : null}
                  <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-fg">
                    {busy ? "Working…" : mode === "up" ? "Create visitor account" : "Sign in"}
                  </button>
                </form>
                <p className="text-xs text-dim">Visitor only. This login cannot open Studio.</p>
                <button type="button" className="text-sm text-primary-bright" onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}>
                  {mode === "in" ? "Need an account? Create one" : "Have an account? Sign in"}
                </button>
                <div className="space-y-2 pt-4">
                  {GROK_PROVIDERS.map((p) => (
                    <button
                      key={p.providerId}
                      type="button"
                      onClick={() => signIn(p.providerId, { callbackURL: "/account" })}
                      className="h-11 w-full rounded-full border border-line text-sm font-semibold"
                    >
                      Continue with {p.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted">Sign-in is off in this preview.</p>
            )}
            </div>
            <div className="glass-card rounded-3xl p-6">
              <p className="font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">Your wallet</p>
              <p className="font-display mt-2 text-5xl font-semibold">0</p>
              <p className="mt-1 text-sm text-muted">generations after the owner approves payment</p>
              <p className="mt-4 text-sm text-dim">
                Register as a visitor. This is not Super Admin. Studio stays locked.
              </p>
            </div>
          </div>
        ) : null}

        {user ? (
          <div className="mt-8 space-y-8">
            <div className="glass-card rounded-3xl p-6">
              <p className="text-sm text-muted">Generations left</p>
              <p className="font-display mt-1 text-5xl font-semibold">{gens}</p>
              <p className="mt-2 text-sm text-dim">{user.primaryEmail || payEmail}</p>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h2 className="font-display text-xl font-semibold">Pay in crypto</h2>
              <p className="mt-2 text-sm text-muted">
                Send to an address the owner has published. Then submit the amount. Default rate: {rate} generations per 1 USD equivalent. Approval is manual. That is how Stacks stays online.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {addresses.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-line bg-navy/50 px-4 py-3">
                    <p className="text-[0.7rem] tracking-[0.16em] text-dim uppercase">{a.label}</p>
                    <p className="mt-1 break-all text-fg">{a.value || "Address not published yet. Check back after the owner saves it."}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={(e) => void onClaim(e)} className="mt-5 space-y-3">
                <input type="email" required value={payEmail} onChange={(e) => setPayEmail(e.target.value)} placeholder="Email on the payment" className="field" />
                <div className="grid grid-cols-2 gap-3">
                  <input required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount paid" className="field" />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className="field">
                    {["USDT", "USDC", "BTC", "ETH", "SOL", "NGN"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Transaction hash (optional)" className="field" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the owner" className="field min-h-20" />
                {status ? <p className="text-sm text-primary-bright">{status}</p> : null}
                <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-fg">
                  {busy ? "Sending…" : "Submit payment"}
                </button>
              </form>
            </div>

            <div>
              <h2 className="font-display text-xl font-semibold">Claims</h2>
              {payments.length === 0 ? <p className="mt-2 text-sm text-muted">None yet.</p> : null}
              <ul className="mt-3 space-y-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm">
                    <span>
                      {p.amount} {p.currency} · {p.status}
                    </span>
                    <span className="text-dim">{p.status === "approved" ? `+${p.generations_credit}` : p.created_at.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h2 className="font-display text-xl font-semibold">Notifications</h2>
              {notes.length === 0 ? <p className="mt-2 text-sm text-muted">None yet. Approvals and replies land here.</p> : null}
              <ul className="mt-3 space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-2xl border border-line px-4 py-3">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="mt-1 text-sm text-muted">{n.body}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h2 className="font-display text-xl font-semibold">Write support</h2>
              <p className="mt-2 text-sm text-muted">Goes to the owner. Replies show as notifications.</p>
              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await submitTicket({
                      data: {
                        email: payEmail || user.primaryEmail || email,
                        subject,
                        body: ticketBody,
                      },
                    });
                    setSubject("");
                    setTicketBody("");
                    setStatus("Sent. You’ll see the reply here.");
                    await load();
                  } catch (err) {
                    setStatus(err instanceof Error ? err.message : "Could not send.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <input className="field" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
                <textarea className="field min-h-24" required value={ticketBody} onChange={(e) => setTicketBody(e.target.value)} placeholder="What happened" />
                <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-fg">
                  Send to owner
                </button>
              </form>
              {tickets.length ? (
                <ul className="mt-4 space-y-2 text-sm">
                  {tickets.map((t) => (
                    <li key={t.id} className="rounded-2xl border border-line px-4 py-3">
                      <p className="font-semibold">
                        {t.subject} · {t.status}
                      </p>
                      {t.reply ? <p className="mt-1 text-muted">{t.reply}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
