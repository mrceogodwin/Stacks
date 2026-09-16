import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";
import { ensureStudioAdmin, resolveStudioUsername } from "@/lib/studio-owner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.setAttribute("data-studio", "1");
    void ensureStudioAdmin().catch(() => {});
    return () => document.documentElement.removeAttribute("data-studio");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resolved = await resolveStudioUsername({ data: { username } });
      if (!resolved.ok) throw new Error(resolved.error);
      const { error: err } = await authClient.signIn.email({
        email: resolved.email,
        password,
        callbackURL: "/command",
      });
      if (err) throw new Error(err.message || "Could not sign in");
      window.location.href = "/command";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="studio-login min-h-screen bg-[#07080a] text-[#e8ece9]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-16">
        <p className="mb-1 font-mono text-[0.68rem] tracking-[0.28em] text-[#2ee59d] uppercase">Restricted</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Owner console</h1>
        <p className="mt-2 mb-8 text-sm text-[#8b948f]">
          This is not visitor registration. Public accounts use Account on the site.
        </p>

        {authEnabled ? (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.16em] text-[#6d7471] uppercase">Username</span>
              <input
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 w-full rounded-lg border border-[#1e2422] bg-[#0c1010] px-3 text-sm outline-none focus:border-[#2ee59d]/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.7rem] tracking-[0.16em] text-[#6d7471] uppercase">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-lg border border-[#1e2422] bg-[#0c1010] px-3 text-sm outline-none focus:border-[#2ee59d]/50"
              />
            </label>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[#2ee59d]/40 bg-transparent text-sm font-semibold text-[#2ee59d]"
            >
              {busy ? "Checking…" : "Enter console"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-[#8b948f]">Sign-in is disabled in this preview.</p>
        )}

        <Link to="/" className="mt-10 text-sm text-[#6d7471] hover:text-[#e8ece9]">
          Back to the public site
        </Link>
      </div>
    </main>
  );
}
