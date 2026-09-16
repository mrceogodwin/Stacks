import { createFileRoute, Link } from "@tanstack/react-router";
import { StacksLogo } from "@/components/stacks/logo";
import { ThemeToggle } from "@/components/stacks/theme-toggle";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
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
        <h1 className="font-display text-4xl font-semibold tracking-tight">Terms of use</h1>
        <p className="mt-2 text-sm text-dim">Last updated 15 September 2026. Built in Nigeria.</p>
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted">
          <p>
            By visiting, downloading, or using Stacks, including stacks.ng and any app or tool listed here,
            you agree to these terms. If you do not agree, do not use Stacks.
          </p>
          <p>
            No app is perfect. Results are provided as is, without warranty of any kind. Stacks is not
            legal, medical, financial, or professional advice. You are responsible for how you use any
            output, download, or share link.
          </p>
          <p>
            Do not paste passwords, API keys, bank details, or other people’s personal data into tools.
            Do not use Stacks to harm people, break the law, or impersonate anyone.
          </p>
          <p>
            Apps I Built may include download links and how-it-works films that I place myself. Third-party
            sites you open from Stacks have their own terms. Use with care.
          </p>
          <p>
            The 500+ tools generate text, images, or video according to the tool. Downloads match the
            result: documents for text, pictures for images, MP4 for video. Generation needs a working
            provider. If a tool cannot run, that is not a grant of extra rights.
          </p>
          <p>
            Subscribe is optional. If you leave an email, it is used only to tell you when new apps I
            built are published. You can stop by writing to the address on the site.
          </p>
          <p>
            I may change, pause, or remove apps, tools, or this site at any time. Nigerian law governs
            these terms, without regard to conflict of law.
          </p>
        </div>
        <Link to="/" className="mt-10 inline-block text-sm text-primary-bright">
          Back to Stacks
        </Link>
      </article>
    </main>
  );
}
