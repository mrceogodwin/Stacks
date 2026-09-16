import { useEffect, useState } from "react";
import { publicSiteChrome } from "@/lib/ops";
import { cn } from "@/lib/utils";

const FALLBACK_TICKER = [
  "How Stacks works: Register · pay crypto · owner approves · generations land",
  "Apps, web apps, and prototypes. Get ZIP files free.",
  "Flagship windows run in your browser. Files never land on our servers.",
  "Everyday tools are free and work offline in this page.",
  "Premium engines use your wallet. Studio stays with the owner.",
];

const FALLBACK_ADS = [
  { label: "Logo Animator", href: "#flagship", icon: "✦" },
  { label: "Caption Studio", href: "#flagship", icon: "▶" },
  { label: "Image Editor", href: "#flagship", icon: "▣" },
  { label: "Audio Engine", href: "#flagship", icon: "♪" },
  { label: "File Converter", href: "#flagship", icon: "⇄" },
  { label: "Media Import", href: "#flagship", icon: "↓" },
];

function mark(icon: string) {
  if (icon.length <= 2) return icon;
  const map: Record<string, string> = {
    spark: "✦",
    video: "▶",
    image: "▣",
    music: "♪",
    folder: "⇄",
    link: "↓",
    pen: "✎",
  };
  return map[icon] || icon.slice(0, 1).toUpperCase();
}

export function SiteTicker() {
  const [ticker, setTicker] = useState(FALLBACK_TICKER);

  useEffect(() => {
    void publicSiteChrome()
      .then((c) => {
        if (c.ticker.length) setTicker(c.ticker);
      })
      .catch(() => {});
  }, []);

  const tickerLoop = [...ticker, ...ticker];

  return (
    <div className="site-ticker" aria-hidden="true">
      <div className="site-ticker-track">
        {tickerLoop.map((line, i) => (
          <span key={`${line}-${i}`} className="site-ticker-item">
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ToolMarquee() {
  const [ads, setAds] = useState(FALLBACK_ADS);

  useEffect(() => {
    void publicSiteChrome()
      .then((c) => {
        if (c.ads.length) {
          setAds(c.ads.map((a) => ({ label: a.label, href: a.href, icon: mark(a.icon) })));
        }
      })
      .catch(() => {});
  }, []);

  const adLoop = [...ads, ...ads, ...ads];

  return (
    <div className="icon-marquee border-b border-line" aria-label="Stacks tools">
      <div className="icon-marquee-track">
        {adLoop.map((ad, i) => (
          <a key={`${ad.label}-${i}`} href={ad.href} className="icon-marquee-chip">
            <span className="icon-marquee-mark">{ad.icon}</span>
            <span>{ad.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

const HERO_LINES = [
  "One place for everything we build.",
  "One place for every solution.",
  "You don't need one more AI app. Stack One.",
  "Go cop the apps we built. Free, paid, and Premium.",
  "Your digital life just got easier.",
  "Welcome to Stacks. Apps for every problem.",
  "We provide a solution.",
  "Built in Nigeria. Shipped to the world.",
  "Free tools. Paid engines. One home.",
  "Stop hopping apps. Start stacking.",
  "Prototypes, products, and the tools behind them.",
  "500+ tools. One Stacks.",
  "Flagship windows. Everyday tools. Your wallet.",
  "From idea to download. On stacks.ng.",
  "One platform. Every problem. A solution.",
  "Proudly developed by Stacks engineers.",
];

export function HeroType({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState(HERO_LINES[0]);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const full = HERO_LINES[i];
    if (phase === "in") {
      if (text === full) {
        const t = window.setTimeout(() => setPhase("hold"), 80);
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(() => setText(full.slice(0, text.length + 1)), 28);
      return () => window.clearTimeout(t);
    }
    if (phase === "hold") {
      const t = window.setTimeout(() => setPhase("out"), 2200);
      return () => window.clearTimeout(t);
    }
    if (text.length === 0) {
      const t = window.setTimeout(() => {
        setI((n) => (n + 1) % HERO_LINES.length);
        setPhase("in");
      }, 180);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setText(text.slice(0, -1)), 16);
    return () => window.clearTimeout(t);
  }, [i, phase, text]);

  return (
    <span className={cn("hero-type", className)}>
      {text}
      <span className="hero-caret" aria-hidden="true">
        |
      </span>
    </span>
  );
}
