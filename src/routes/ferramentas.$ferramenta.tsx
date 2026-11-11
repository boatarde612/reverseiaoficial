import { createFileRoute, notFound } from "@tanstack/react-router";

import { ToolWorkspace } from "@/components/tool/ToolWorkspace";
import { getTool } from "@/lib/tools";

export const Route = createFileRoute("/ferramentas/$ferramenta")({
  loader: ({ params }) => {
    const tool = getTool(params.ferramenta);
    if (!tool) throw notFound();
    return { tool };
  },
  head: ({ loaderData }) => {
    const tool = loaderData?.tool;
    if (!tool) return { meta: [{ title: "Ferramenta não encontrada — REVERSE IA BETA" }, { name: "robots", content: "noindex" }] };
    const title = `${tool.name} — REVERSE IA BETA`;
    return {
      meta: [
        { title },
        { name: "description", content: `${tool.tagline}. ${tool.description}` },
        { property: "og:title", content: title },
        { property: "og:description", content: tool.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ToolPage,
});

function ToolPage() {
  const { tool } = Route.useLoaderData();
  return (
    <main className="min-h-screen">
      <ToolWorkspace key={tool.id} tool={tool} />
    </main>
  );
}
