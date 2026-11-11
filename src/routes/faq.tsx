import { createFileRoute } from "@tanstack/react-router";

import { FaqList, SectionTitle } from "@/components/site/Sections";
import { PageShell } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Perguntas frequentes — REVERSE IA BETA" },
      { name: "description", content: "Duração recomendada para Reverse, limites, download e privacidade no REVERSE IA." },
      { property: "og:title", content: "Perguntas frequentes — REVERSE IA BETA" },
      { property: "og:description", content: "Tire suas dúvidas sobre as ferramentas do REVERSE IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" />
        <FaqList />
      </section>
    </PageShell>
  );
}
