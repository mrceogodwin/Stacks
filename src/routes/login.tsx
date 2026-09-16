import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { StacksLogo } from "@/components/stacks/logo";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] ?? "Studio",
          callbackURL: "/command",
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/command",
        });
        if (err) throw new Error(err.message);
      }
      window.location.href = "/command";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-deep text-fg">
      <div className="stacks-atmosphere pointer-events-none absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-16">
        <Link to="/" className="mb-8 self-start">
          <StacksLogo />
        </Link>
        <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
          Studio · stacks.ng
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Admin access</h1>
        <p className="mt-2 mb-8 text-sm text-muted">
          Sign in to upload apps, thumbnails, tool prompts and API keys. The public site stays open.
        </p>

        {authEnabled ? (
          <>
            <form onSubmit={onEmail} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-12 w-full rounded-2xl border border-line bg-navy px-4 text-sm outline-none focus:border-primary-bright/50"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-12 w-full rounded-2xl border border-line bg-navy px-4 text-sm outline-none focus:border-primary-bright/50"
              />
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-fg"
              >
                {busy ? "Working…" : mode === "up" ? "Create studio account" : "Sign in with email"}
              </button>
            </form>
            <button
              type="button"
              className="mt-3 text-sm text-primary-bright"
              onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
            >
              {mode === "in" ? "Need an account? Create one" : "Have an account? Sign in"}
            </button>
            <div className="my-6 flex items-center gap-3 text-xs tracking-widest text-dim uppercase">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: "/command" })}
                  className="h-12 w-full rounded-full border border-white/15 text-sm font-semibold hover:border-primary-bright/40"
                >
                  Continue with {p.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
