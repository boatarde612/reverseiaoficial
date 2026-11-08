import { createFileRoute, Link } from "@tanstack/react-router";

import { SectionTitle } from "@/components/site/Sections";
import { PageShell } from "@/components/site/SiteChrome";
import { CREATOR } from "@/lib/tools";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — REVERSE IA" },
      { name: "description", content: "Como o REVERSE IA trata seus vídeos: processamento no próprio aparelho, sem envio a servidores." },
      { property: "og:title", content: "Política de Privacidade — REVERSE IA" },
      { property: "og:description", content: "Seus vídeos são processados no seu aparelho e não são enviados a servidores." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS: { t: string; p: string[] }[] = [
  {
    t: "Dados coletados",
    p: [
      "O REVERSE IA não exige cadastro nem login e não coleta nome, e-mail ou telefone.",
      "Os vídeos que você escolhe são lidos apenas pelo seu navegador. Não guardamos cópias deles.",
      "A hospedagem do site pode registrar dados técnicos de acesso (como endereço IP e tipo de navegador) para segurança e funcionamento.",
    ],
  },
  {
    t: "Finalidade do processamento",
    p: ["O vídeo é usado somente para aplicar a ferramenta que você escolheu (Reverse, RSMB, FPS MOD, qualidade, tracking, zoom ou time remap) e gerar o arquivo final."],
  },
  {
    t: "Armazenamento de vídeos",
    p: [
      "Todo o processamento acontece no seu próprio aparelho, com o FFmpeg rodando no navegador. O vídeo não é enviado para nenhum servidor do REVERSE IA.",
      "Para funcionar, o navegador baixa o motor de vídeo (FFmpeg) de um servidor público de arquivos (unpkg.com). Esse download não inclui nenhum vídeo seu.",
    ],
  },
  {
    t: "Proteção de arquivos",
    p: ["Como os arquivos não saem do seu aparelho, eles ficam protegidos pelas mesmas proteções do seu navegador e do seu dispositivo."],
  },
  {
    t: "Prazo de retenção e exclusão de arquivos",
    p: [
      "Os arquivos temporários criados durante o processamento (cópia de entrada, arquivos intermediários e saída) ficam na memória do navegador e são apagados automaticamente assim que cada processamento termina, com sucesso, erro ou cancelamento.",
      "O vídeo final fica disponível na memória da página para você assistir e baixar. Ele é descartado quando você toca em CRIAR OUTRO, escolhe outro vídeo ou fecha/recarrega a página.",
      "Os arquivos que você baixar ficam salvos no seu aparelho e só você pode apagá-los.",
    ],
  },
  {
    t: "Direitos dos usuários",
    p: [
      "Você pode, a qualquer momento, deixar de usar o serviço, fechar a página para descartar os vídeos da memória e solicitar informações sobre o tratamento de dados, conforme a Lei Geral de Proteção de Dados (LGPD).",
    ],
  },
];

function PrivacyPage() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-12">
        <SectionTitle eyebrow="Transparência" title="Política de Privacidade" sub="Última atualização: novembro de 2026." />
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <section key={s.t} className="surface-card p-5">
              <h2 className="text-base font-semibold">{s.t}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {s.p.map((x) => (
                  <p key={x}>{x}</p>
                ))}
              </div>
            </section>
          ))}
          <section className="surface-card p-5">
            <h2 className="text-base font-semibold">Canal de contato</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Fale com o criador pelo TikTok{" "}
              <a href={CREATOR.url} target="_blank" rel="noopener noreferrer" className="text-primary-glow underline-offset-4 hover:underline">
                {CREATOR.handle}
              </a>{" "}
              ou veja a página <Link to="/criador" className="text-primary-glow underline-offset-4 hover:underline">Contato do Criador</Link>.
            </p>
          </section>
        </div>
      </article>
    </PageShell>
  );
}
