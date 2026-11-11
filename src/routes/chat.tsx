import { ClientOnly, createFileRoute } from "@tanstack/react-router";

import { ChatEditor } from "@/components/chat/ChatEditor";
import { SiteHeader } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat IA — REVERSE IA BETA" },
      { name: "description", content: "Envie seu vídeo e peça os efeitos por mensagem: a IA analisa e combina as ferramentas do REVERSE IA." },
      { property: "og:title", content: "Chat IA — REVERSE IA BETA" },
      { property: "og:description", content: "Edite vídeos conversando com a IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <ClientOnly fallback={null}>
        <ChatEditor />
      </ClientOnly>
    </div>
  );
}
