import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="REVERSE IA — início">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/ferramentas"
            className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Ferramentas
          </Link>
          <Link
            to="/faq"
            className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            FAQ
          </Link>
          <Button asChild variant="hero" size="sm" className="rounded-full px-4">
            <Link to="/ferramentas">Começar</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  { to: "/", label: "Início" },
  { to: "/ferramentas", label: "Ferramentas" },
  { to: "/faq", label: "FAQ" },
  { to: "/privacidade", label: "Política de Privacidade" },
  { to: "/criador", label: "Contato do Criador" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Logo />
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">Sua edição. Sem complicação.</p>
        <nav className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:flex sm:flex-wrap">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 text-xs text-muted-foreground/70">© REVERSE IA. Seus vídeos são processados no seu próprio aparelho.</p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
