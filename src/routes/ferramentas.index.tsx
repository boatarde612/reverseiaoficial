import { createFileRoute } from "@tanstack/react-router";

import { SectionTitle, ToolsGrid } from "@/components/site/Sections";
import { PageShell } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/ferramentas/")({
  head: () => ({
    meta: [
      { title: "Ferramentas — REVERSE IA BETA" },
      { name: "description", content: "Reverse, RSMB, FPS MOD, Melhorar Qualidade, Tracking, Zoom e Time Remap: escolha uma ferramenta e edite seu vídeo." },
      { property: "og:title", content: "Ferramentas — REVERSE IA BETA" },
      { property: "og:description", content: "Dez ferramentas independentes de edição automática de vídeos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionTitle eyebrow="Escolha uma" title="Nossas ferramentas" sub="Toque em uma ferramenta para enviar seu vídeo." />
        <ToolsGrid />
      </section>
    </PageShell>
  );
}
