import { createFileRoute, Link } from "@tanstack/react-router";
import { StacksLogo } from "@/components/stacks/logo";
import { ThemeToggle } from "@/components/stacks/theme-toggle";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-deep text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/">
            <StacksLogo />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-12">
        <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
          Stacks.ng
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Privacy policy</h1>
        <p className="mt-2 text-sm text-dim">Last updated 15 September 2026. Built in Nigeria.</p>
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted">
          <p>
            Stacks is a public showroom. You can browse apps and tools without creating an account.
          </p>
          <p>
            If you subscribe for new-app updates, we store the email you type so we can send those
            updates. We do not sell it. We do not share it for advertising.
          </p>
          <p>
            Tool runs and app downloads are counted so the public cards can show “times used” and
            “downloads”. Those counters are not tied to your name.
          </p>
          <p>
            Do not paste personal data, secrets, or other people’s information into tools. Prompts you
            type are sent to the provider that powers that tool so it can return a result.
          </p>
          <p>
            The site may use basic device storage to remember your light or dark skin. You can clear
            that in your browser.
          </p>
          <p>
            Questions: use the contact path listed on stacks.ng. Nigerian law applies.
          </p>
        </div>
        <Link to="/" className="mt-10 inline-block text-sm text-primary-bright">
          Back to Stacks
        </Link>
      </article>
    </main>
  );
}
