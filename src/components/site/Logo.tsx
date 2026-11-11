import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id="rv-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-glow)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#rv-g)" />
      <path d="M24.5 12 15 20l9.5 8" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 12 8 20l9.5 8" fill="none" stroke="var(--primary-foreground)" strokeOpacity=".45" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="20" r="2.4" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-base font-bold tracking-tight">
        REVERSE <span className="text-gradient">IA</span>
      </span>
      <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase leading-none tracking-widest text-primary-glow">
        Beta
      </span>
    </span>
  );
}
