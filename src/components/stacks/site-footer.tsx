import { Globe, Headphones, Send } from "lucide-react";
import { StacksLogo } from "@/components/stacks/logo";

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.7 10.3 20.4 3h-1.6l-5.8 6.4L8.4 3H3.5l7.1 10.1L3.5 21h1.6l6.2-6.8L15.6 21h4.9L13.7 10.3ZM11.2 13.3l-.7-1-5.7-8h2.5l4.6 6.5.7 1 6 8.4h-2.5l-4.9-6.9Z"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 px-4 pb-14 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="glass-card rounded-[1.75rem] px-5 py-8 sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-sm">
              <StacksLogo />
              <p className="mt-3 text-sm text-muted">
                A Nigerian showroom and generation engine. Visitor accounts fund Premium. Studio stays with the owner.
              </p>
            </div>
            <div>
              <p className="mb-3 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">Connect</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://x.com/builtbystacks"
                  className="social-chip"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Stacks on X, @builtbystacks"
                >
                  <span className="social-glyph">
                    <XMark className="size-4" />
                  </span>
                  <span>@builtbystacks</span>
                </a>
                <a
                  href="https://t.me/builtbystacks"
                  className="social-chip"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Stacks on Telegram"
                >
                  <span className="social-glyph">
                    <Send className="size-4" />
                  </span>
                  <span>Telegram</span>
                </a>
                <a href="https://stacks.ng" className="social-chip" aria-label="stacks.ng">
                  <span className="social-glyph">
                    <Globe className="size-4" />
                  </span>
                  <span>stacks.ng</span>
                </a>
                <a href="mailto:support@stacks.ng" className="social-chip" aria-label="Email support@stacks.ng">
                  <span className="social-glyph">
                    <Headphones className="size-4" />
                  </span>
                  <span>support@stacks.ng</span>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 text-sm text-dim sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Stacks.ng. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <a href="#apps" className="hover:text-fg">
                Apps
              </a>
              <a href="#tools" className="hover:text-fg">
                Tools
              </a>
              <a href="#premium" className="hover:text-fg">
                Premium
              </a>
              <a href="#sounds" className="hover:text-fg">
                Sounds
              </a>
              <a href="/account" className="hover:text-fg">
                Account
              </a>
              <a href="/terms" className="hover:text-fg">
                Terms
              </a>
              <a href="/privacy" className="hover:text-fg">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
