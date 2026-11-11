import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

import hero from "@/assets/hero-motion.jpg";
import { CreatorCard, FaqList, HowItWorks, SectionTitle, ToolsGrid } from "@/components/site/Sections";
import { EditsShowcase, QualityCompare } from "@/components/site/Showcase";
import { PageShell } from "@/components/site/SiteChrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "REVERSE IA BETA — Sua edição. Sem complicação." },
      { name: "description", content: "Ferramentas inteligentes para transformar seus vídeos: Reverse, RSMB, FPS MOD, qualidade, CC Dark, tracking, zoom e time remap direto no navegador." },
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
        <img
          src={hero}
          alt=""
          width={1280}
          height={1600}
          className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-70"
        />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-12 pt-32 sm:min-h-[80vh]">
          <p className="eyebrow animate-fade-up">Edição automática de vídeos</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] animate-fade-up sm:text-6xl">
            REVERSE <span className="text-gradient">IA</span>
          </h1>
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

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <SectionTitle eyebrow="Edits em destaque" title="Feito para edits" sub="Toque para assistir em tela grande." />
        <EditsShowcase />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionTitle eyebrow="Antes e depois" title="VEJA A DIFERENÇA DO REVERSE IA" />
        <QualityCompare />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionTitle eyebrow="08 ferramentas" title="Nossas ferramentas" sub="Cada uma com upload, configurações e processamento próprios." />
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
