import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

import cover from "@/assets/reverse-ia-cover.webp";
import { CreatorCard, FaqList, HowItWorks, SectionTitle, ToolsGrid } from "@/components/site/Sections";
import { EditsShowcase, QualityCompare } from "@/components/site/Showcase";
import { PageShell } from "@/components/site/SiteChrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "REVERSE IA BETA — Sua edição. Sem complicação." },
      { name: "description", content: "Ferramentas inteligentes para transformar seus vídeos: Reverse, Smooth Reverse, Motion Blur, FPS MOD, qualidade, CC, Gelatina, rastreio de câmera, zoom e time remap direto no navegador." },
      { property: "og:title", content: "REVERSE IA BETA — Sua edição. Sem complicação." },
      { property: "og:description", content: "Ferramentas inteligentes para transformar seus vídeos de futebol, animes e AMVs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <img src={cover} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl" />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto flex max-w-6xl flex-col px-4 pb-12 pt-6 sm:pt-10">
          <h1 className="sr-only">REVERSE IA BETA</h1>
          <img
            src={cover}
            alt="REVERSE IA BETA"
            width={1536}
            height={1024}
            className="mx-auto w-full max-w-3xl rounded-3xl border border-primary/30 glow-ring animate-fade-up"
          />
          <p className="eyebrow mt-6 animate-fade-up">Edição automática de vídeos</p>
          <p className="mt-3 font-display text-lg font-medium text-foreground/90 animate-fade-up sm:text-2xl">
            Sua edição. Sem complicação.
          </p>
          <p className="mt-3 max-w-md text-sm text-muted-foreground animate-fade-up sm:text-base">
            Ferramentas inteligentes para transformar seus vídeos.
          </p>
          <div className="mt-8 flex flex-col gap-3 animate-fade-up sm:flex-row">
            <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
              <Link to="/chat">
                COMEÇAR AGORA <ArrowRight />
              </Link>
            </Button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary-glow" /> Processado no seu aparelho — seu vídeo não sai dele.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionTitle eyebrow="Antes e depois" title="VEJA A DIFERENÇA DO REVERSE IA" />
        <QualityCompare />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionTitle eyebrow="Vitrine" title="EDITS EM DESTAQUE" sub="Toque para assistir." />
        <EditsShowcase />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionTitle eyebrow="10 ferramentas" title="Nossas ferramentas" sub="Cada uma com upload, configurações e processamento próprios." />
        <ToolsGrid />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionTitle eyebrow="Passo a passo" title="Como funciona" />
        <HowItWorks />
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" />
        <FaqList />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        <CreatorCard />
      </section>
    </PageShell>
  );
}
