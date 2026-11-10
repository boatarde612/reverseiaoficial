# REVERSE IA — preparação para lançamento público

Continua o projeto atual. Nada é reconstruído nem removido. **Sem sistema de créditos** (decisão sua).

## 1. Intensidade só em ZOOM e RSMB
- ZOOM e RSMB mantêm 10/20/30/50.
- FPS MOD: só FPS de saída (60/90/120) + qualidade da interpolação (Rápida/Precisa).
- Melhorar Qualidade: resolução de saída, redução de ruído (Desligada/Leve/Forte) e nitidez (Desligada/Leve/Forte).
- Tracking, Time Remap e Reverse continuam com os controles próprios que já têm.
- O Chat IA passa a usar esses mesmos controles novos.

## 2. Nova ferramenta CC DARK
- Preset "CC Dark" (sombras frias, realces controlados, saturação contida, sem esmagar os pretos).
- Controles: exposição, contraste, saturação, sombras, realces, temperatura.
- Prévia ao vivo no próprio player (filtro aplicado na tela, aproximado) antes de processar; o vídeo final é processado de verdade no aparelho.
- Entra no Chat IA e no combo (depois de Qualidade, antes dos efeitos de movimento).

## 3. "VEJA A DIFERENÇA DO REVERSE IA" (página inicial)
- Um trecho curto de um dos seus vídeos, reduzido para qualidade básica (tipo TikTok comprimido) → ORIGINAL / QUALIDADE BÁSICA.
- O mesmo trecho passado pelo Melhorar Qualidade real do app → REVERSE IA / QUALIDADE MELHORADA.
- Controle deslizante antes/depois com os dois vídeos sincronizados.
- Aviso: "O resultado varia de acordo com o vídeo original."

## 4. Vitrine com os 3 edits enviados
- Dexter reverse zoom, Holy phonk filler e Michael Kaiser edit — os arquivos originais.
- Cartões com miniatura, prévia ao passar/tocar, e abrir em tela grande.
- Rolagem lateral no celular, grade no computador.

## 5. Auditoria real das ferramentas
- Rodar cada ferramenta (as 7 + CC Dark + combo) com vídeos reais no motor de vídeo, conferir que gera um arquivo válido e que dá para ver e baixar.
- Testar o Chat IA montando um plano com várias ferramentas e gerando um único vídeo final.
- Corrigir o que falhar. Relatório final do que passou e do que não passou.

## 6. Revisão de lançamento
- Telas Android (360px), mensagens de erro, limites de tamanho/duração, botões sem função, textos ainda falando de intensidade em ferramentas que não têm mais.
- Atualizar FAQ e lista de ferramentas (agora 8).

## Detalhes técnicos
- Vídeos da vitrine e da demonstração viram arquivos hospedados (CDN) com pointers `.asset.json`; miniaturas extraídas com ffmpeg.
- A amostra "melhorada" é gerada com o mesmo filtro do pipeline `qualidade` (hqdn3d/cas/lanczos) aplicado via ffmpeg no sandbox — mesma cadeia de filtros do app.
- CC Dark: `eq` + `colorbalance` + `curves` + `colortemperature`; prévia via CSS `filter` no `<video>`.
- Atualizar `SETTINGS_SCHEMAS`/`PLAN_DEFAULTS`/`COMBO_ORDER`, prompt do chat, registry e testes em `src/test/video-rules.test.ts`.
- Auditoria com ffmpeg nativo usando os mesmos argumentos dos pipelines + Playwright no fluxo do navegador.
