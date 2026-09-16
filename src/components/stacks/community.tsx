import { useEffect, useState } from "react";
import { publicSiteChrome } from "@/lib/ops";

type Review = { id: number; author: string; handle: string; body: string; source: string };
type Partner = { id: number; name: string; blurb: string; url: string; mark: string };

export function CommunitySection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    void publicSiteChrome()
      .then((c) => {
        setReviews(c.reviews);
        setPartners(c.partners);
      })
      .catch(() => {});
  }, []);

  const partnerLoop = partners.length ? [...partners, ...partners] : [];

  return (
    <>
      <section id="community" className="px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">Social community</p>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            What people <span className="text-primary-bright">say.</span>
          </h2>
          <p className="mt-3 max-w-lg text-muted">
            Notes from X and from Premium members. The owner approves every line. Anything can be paused from the console.
          </p>
          {reviews.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-line px-5 py-10 text-sm text-muted">
              Reviews the owner approves land here. Nothing is auto-posted.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <article key={r.id} className="glass-card rounded-2xl p-5">
                  <p className="text-[0.7rem] tracking-[0.16em] text-primary-bright uppercase">{r.source === "x" ? "X" : r.source}</p>
                  <p className="mt-2 text-sm text-fg">{r.body}</p>
                  <p className="mt-3 text-sm text-muted">
                    {r.author} {r.handle ? `· ${r.handle}` : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="partners" className="px-4 pb-10 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">Super partnership</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Wiring <span className="text-primary-bright">with us.</span>
          </h2>
          <p className="mt-3 max-w-lg text-muted">Companies and tools the owner places. Sliding, live from the console.</p>
          {partnerLoop.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-line px-5 py-8 text-sm text-muted">
              Partners appear here when the owner adds them.
            </p>
          ) : (
            <div className="icon-marquee mt-6">
              <div className="icon-marquee-track">
                {partnerLoop.map((p, i) => (
                  <a key={`${p.id}-${i}`} href={p.url || "#partners"} className="icon-marquee-chip" rel="noreferrer">
                    <span className="icon-marquee-mark">{(p.mark || p.name).slice(0, 2).toUpperCase()}</span>
                    <span>{p.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="footer-premium" className="px-4 pb-6 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="premium-wallet rounded-[1.6rem] px-5 py-8 sm:px-8">
            <p className="font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">Premium</p>
            <h2 className="font-display mt-1 text-3xl font-semibold">Try Premium Tools</h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Register or sign in. Pay in crypto. The owner approves. Generations land in your wallet. Studio stays locked.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/account" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold">
                Register
              </a>
              <a href="/account" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">
                Sign in
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
