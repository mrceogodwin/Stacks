import { useEffect, useState } from "react";
import { ArrowRight, Lock, Music2 } from "lucide-react";
import { listPublishedPacks, unlockPack, type PublicPack } from "@/lib/packs";
import { cn } from "@/lib/utils";

export function SoundsSection() {
  const [packs, setPacks] = useState<PublicPack[]>([]);
  const [lane, setLane] = useState<"all" | "free" | "premium">("all");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    void listPublishedPacks()
      .then(setPacks)
      .catch(() => setPacks([]));
  }, []);

  const shown = packs.filter((p) => lane === "all" || p.lane === lane);

  async function take(pack: PublicPack) {
    setBusy(pack.id);
    setStatus(null);
    try {
      const res = await unlockPack({ data: { id: pack.id } });
      if (!res.ok) {
        setStatus("login" in res && res.login ? "Register as a visitor to unlock premium packs." : res.error);
        return;
      }
      window.location.assign(res.url);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not open pack.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="sounds" className="px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
              Stacks Sounds & Packs
            </p>
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              The library the owner <span className="text-primary-bright">places.</span>
            </h2>
            <p className="mt-3 text-muted">
              These are files made in FL Studio and the studio. Not AI filler. Free packs download now.
              Premium packs unlock after a visitor account and wallet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "free", "premium"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setLane(id)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-semibold capitalize",
                  lane === id ? "border-transparent bg-primary text-fg" : "border-line text-muted",
                )}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <article className="pack-card glass-card overflow-hidden rounded-[1.6rem]">
              <div className="pack-cover grid h-36 place-items-center">
                <Music2 className="size-10 text-primary-bright" />
              </div>
              <div className="p-5">
                <p className="text-[0.7rem] tracking-[0.16em] text-primary-bright uppercase">Free</p>
                <h3 className="font-display mt-1 text-xl font-semibold">Free packs</h3>
                <p className="mt-2 text-sm text-muted">
                  Download links the owner places. FL Studio sessions, stems, SFX. Not AI filler.
                </p>
              </div>
            </article>
            <article className="pack-card glass-card overflow-hidden rounded-[1.6rem]">
              <div className="pack-cover pack-cover-premium grid h-36 place-items-center">
                <Lock className="size-10 text-primary-bright" />
              </div>
              <div className="p-5">
                <p className="text-[0.7rem] tracking-[0.16em] text-primary-bright uppercase">Premium</p>
                <h3 className="font-display mt-1 text-xl font-semibold">Paid unlock</h3>
                <p className="mt-2 text-sm text-muted">
                  Visitor wallet pays generations. Then the download link opens. Owner sets the file URL from Studio.
                </p>
                <a href="/account" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-fg">
                  Create visitor account
                  <ArrowRight className="size-3.5" />
                </a>
              </div>
            </article>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((pack) => (
              <article key={pack.id} className="pack-card glass-card overflow-hidden rounded-[1.6rem]">
                {pack.cover ? (
                  <img src={pack.cover} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <div className="pack-cover grid h-40 place-items-center">
                    <Music2 className="size-10 text-primary-bright" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-[0.7rem] tracking-[0.16em] text-primary-bright uppercase">
                    {pack.lane === "premium" ? `Premium · ${pack.cost} gen` : "Free"}
                  </p>
                  <h3 className="font-display mt-1 text-xl font-semibold">{pack.name}</h3>
                  <p className="mt-2 text-sm text-muted">{pack.description}</p>
                  <button
                    type="button"
                    disabled={busy === pack.id}
                    onClick={() => void take(pack)}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-fg"
                  >
                    {pack.lane === "premium" && !pack.unlocked ? (
                      <>
                        <Lock className="size-3.5" />
                        Unlock pack
                      </>
                    ) : (
                      <>
                        Download
                        <ArrowRight className="size-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {status ? (
          <p className="mt-4 text-sm text-muted">
            {status}{" "}
            {status.toLowerCase().includes("register") || status.toLowerCase().includes("account") ? (
              <a href="/account" className="font-semibold text-primary-bright">
                Create visitor account
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}
