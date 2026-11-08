import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Download, ListChecks, Upload, Wand2 } from "lucide-react";

import { ToolIcon } from "@/components/ToolIcon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CREATOR, TOOLS } from "@/lib/tools";

export function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h2>
      {sub && <p className="mt-2 max-w-lg text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ToolsGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.map((t, i) => (
        <Link
          key={t.id}
          to="/ferramentas/$ferramenta"
          params={{ ferramenta: t.id }}
          className="surface-card group relative flex items-start gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 animate-fade-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-accent transition-colors group-hover:bg-gradient-primary">
            <ToolIcon id={t.id} className="size-5 text-primary-glow group-hover:text-primary-foreground" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-semibold tracking-wide">{t.name}</span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary-glow" />
            </span>
            <span className="mt-0.5 block text-xs font-medium text-primary-glow">{t.tagline}</span>
            <span className="mt-1.5 block text-sm leading-snug text-muted-foreground">{t.description}</span>
            <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              até {t.maxSeconds >= 60 ? "1 min" : `${t.maxSeconds} s`}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

const STEPS = [
  { icon: ListChecks, title: "Escolha a ferramenta", text: "Cada ferramenta é independente e tem suas próprias configurações." },
  { icon: Upload, title: "Envie seu vídeo", text: "MP4 ou MOV. Verificamos duração, resolução e formato na hora." },
  { icon: Wand2, title: "Processe", text: "O FFmpeg roda no seu aparelho e mostra o progresso real." },
  { icon: Download, title: "Baixe o MP4", text: "Assista ao resultado e salve no celular ou computador." },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <li key={s.title} className="surface-card p-5">
          <div className="flex items-center justify-between">
            <s.icon className="size-5 text-primary-glow" strokeWidth={1.75} />
            <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
          </div>
          <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export const FAQ = [
  {
    q: "Qual é a duração recomendada para um Reverse?",
    a: "Geralmente, recomendamos clipes entre 0,4 e 0,7 segundos para criar um Reverse Edit interessante. Teste as duas durações e veja qual combina melhor com seu vídeo.",
  },
  {
    q: "Qual é a duração máxima dos vídeos?",
    a: "O Reverse aceita vídeos de até 2 segundos. As outras ferramentas aceitam vídeos de até 1 minuto.",
  },
  {
    q: "O REVERSE IA funciona no celular?",
    a: "Sim. Você pode utilizar o REVERSE IA pelo navegador do celular, tablet ou computador.",
  },
  { q: "Preciso instalar algum aplicativo?", a: "Não. O REVERSE IA funciona diretamente pelo navegador." },
  {
    q: "Como faço para baixar meu vídeo?",
    a: "Após o processamento, clique em BAIXAR VÍDEO para salvar o arquivo no seu dispositivo.",
  },
  {
    q: "A qualidade original será preservada?",
    a: "O sistema procura preservar a qualidade original, mas o resultado depende do vídeo enviado e do processamento aplicado.",
  },
  {
    q: "Quanto tempo demora o processamento?",
    a: "O tempo depende da duração, resolução do vídeo, ferramenta escolhida e capacidade do servidor.",
  },
  {
    q: "Meus vídeos são armazenados?",
    a: "Os vídeos são enviados para processamento. Consulte nossa Política de Privacidade para conhecer os prazos de armazenamento e exclusão.",
  },
];

export function FaqList() {
  return (
    <Accordion type="single" collapsible className="surface-card divide-y divide-border px-4">
      {FAQ.map((f, i) => (
        <AccordionItem key={f.q} value={`q${i}`} className="border-0">
          <AccordionTrigger className="py-4 text-left text-sm font-semibold hover:no-underline">{f.q}</AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
            {f.a}
            {i === FAQ.length - 1 && (
              <>
                {" "}
                <Link to="/privacidade" className="text-primary-glow underline-offset-4 hover:underline">
                  Ver Política de Privacidade
                </Link>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function CreatorCard() {
  return (
    <div className="surface-card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/25 blur-3xl animate-glow-pulse" />
      <p className="eyebrow">Criador do REVERSE IA</p>
      <p className="mt-3 font-display text-2xl font-bold">{CREATOR.handle}</p>
      <p className="mt-1 text-sm text-muted-foreground">TikTok · edits de futebol, animes e personagens</p>
      <Button asChild variant="hero" size="xl" className="mt-6 w-full sm:w-auto">
        <a href={CREATOR.url} target="_blank" rel="noopener noreferrer">
          VISITAR PERFIL <ArrowUpRight />
        </a>
      </Button>
    </div>
  );
}
