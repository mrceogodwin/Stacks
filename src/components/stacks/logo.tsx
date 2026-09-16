import { useId } from "react";
import { cn } from "@/lib/utils";

export function StacksLogo({ className }: { className?: string }) {
  const gid = useId();
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-display tracking-[0.08em]", className)}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M6 18.5 14 23l8-4.5"
          stroke="#2ee59d"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 14 14 18.5 22 14"
          stroke="#008751"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6 9.5 14 14l8-4.5L14 5 6 9.5z" fill={`url(#${gid})`} stroke="#9affc7" strokeWidth="1.2" />
        <defs>
          <linearGradient id={gid} x1="6" y1="5" x2="22" y2="14">
            <stop stopColor="#9affc7" />
            <stop offset="1" stopColor="#008751" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-sm font-semibold text-fg">STACKS</span>
    </span>
  );
}
