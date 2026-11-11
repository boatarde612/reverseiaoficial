import { createFileRoute } from "@tanstack/react-router";

import { CreatorCard, SectionTitle } from "@/components/site/Sections";
import { PageShell } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/criador")({
  head: () => ({
    meta: [
      { title: "Criador do REVERSE IA BETA — @tankaiofc" },
      { name: "description", content: "Conheça o criador do REVERSE IA no TikTok: @tankaiofc." },
      { property: "og:title", content: "Criador do REVERSE IA BETA — @tankaiofc" },
      { property: "og:description", content: "Siga @tankaiofc no TikTok." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatorPage,
});

function CreatorPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <SectionTitle eyebrow="Contato" title="Contato do criador" />
        <CreatorCard />
      </section>
    </PageShell>
  );
}
