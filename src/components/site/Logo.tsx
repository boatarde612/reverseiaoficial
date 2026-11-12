import logoMark from "@/assets/logo-mark.webp";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoMark}
      alt=""
      width={36}
      height={36}
      className={cn("size-9 rounded-xl object-cover ring-1 ring-primary/50 glow-ring", className)}
    />
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
