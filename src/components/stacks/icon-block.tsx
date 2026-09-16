import type { IconName, Tone } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bot,
  Briefcase,
  Code2,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Mic,
  Palette,
  PenLine,
  Play,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<IconName, LucideIcon> = {
  play: Play,
  mail: Mail,
  image: ImageIcon,
  briefcase: Briefcase,
  bot: Bot,
  mic: Mic,
  spark: Sparkles,
  palette: Palette,
  pen: PenLine,
  chart: BarChart3,
  chat: MessageSquare,
  code: Code2,
  search: Search,
};

export const TONE_CLASS: Record<Tone, string> = {
  blue: "tone-blue",
  navy: "tone-navy",
  indigo: "tone-indigo",
  teal: "tone-teal",
  violet: "tone-violet",
  amber: "tone-amber",
  cyan: "tone-cyan",
  rose: "tone-rose",
  lime: "tone-lime",
  orange: "tone-orange",
  pink: "tone-pink",
  sky: "tone-sky",
};

const TONE = TONE_CLASS;

export function IconBlock({
  icon,
  tone,
  size = "md",
}: {
  icon: IconName;
  tone: Tone;
  size?: "sm" | "md";
}) {
  const Glyph = ICONS[icon];
  return (
    <div className={cn("icon-block", TONE[tone], size === "sm" && "is-sm")}>
      <span className="edge-y" aria-hidden="true" />
      <span className="edge-x" aria-hidden="true" />
      <span className="front">
        <span className="shine" aria-hidden="true" />
        <Glyph
          className={size === "sm" ? "size-5" : "size-7"}
          strokeWidth={1.75}
          fill={icon === "play" ? "currentColor" : "none"}
        />
      </span>
    </div>
  );
}
