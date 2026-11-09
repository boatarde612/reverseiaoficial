# REVERSE IA — Modo Chat IA (baseado no vídeo de referência)

O vídeo mostra um chat escuro: sugestões ("Pedir Motion Blur", "Pedir Tracking"...), anexar vídeo pelo clipe, pedido em texto ("coloque reverse no clipe, também Tracking e Zoom"), resposta da IA com checklist ("Pronto! Tracking ✅ Zoom ✅ Time Remap ✅") e o vídeo final tocável no chat.

## O que será feito
1. **Nova página Chat** (vira o botão principal "COMEÇAR AGORA"). As 7 ferramentas atuais continuam como estão.
   - Uma conversa só, salva neste aparelho, com botão "Nova conversa".
   - Sugestões em chips quando vazio; anexar MP4/MOV (mesmas regras de formato/tamanho).
2. **Análise real do vídeo**: o app tira alguns quadros no aparelho e lê duração, resolução e FPS; envia só os quadros (imagens pequenas) para um modelo de IA com visão, que descreve pessoas, objetos, movimento e sugere melhorias. O vídeo em si não sai do aparelho.
3. **Pedido por texto → plano**: a IA transforma o pedido numa lista de ferramentas com configurações (ex.: Qualidade, RSMB 30, Zoom suave). Aparece um cartão com os efeitos e o botão **CONFIRMAR PROCESSAMENTO**.
4. **Combo**: após confirmar, as ferramentas rodam em sequência no aparelho, cada uma usando o resultado da anterior, gerando um único MP4 com progresso por etapa, player e BAIXAR.
5. **Continuidade**: "diminua o Motion Blur" → a IA usa o plano anterior e o histórico, propõe a nova versão e reprocessa a partir do vídeo original.
6. **Tracking no combo**: quando o plano inclui Tracking/Zoom com tracking, o chat pede para marcar o objeto no primeiro quadro (a IA pode sugerir a caixa a partir da análise; você confirma).

## Ajustes pedidos nas ferramentas
- Zoom: adicionar intensidades 10/20/30/50 em todos os modos (já existe; conferir).
- Melhorar Qualidade: opção de ampliar até 1080p, 1440p ou 4K.
- RSMB e FPS MOD já usam estimativa de movimento real; mantidos.

## Limites honestos
- 4K e 120 FPS no celular podem ser muito lentos ou faltar memória; avisarei antes de processar.
- A IA não "edita" o vídeo: ela escolhe e configura as 7 ferramentas reais.
- Ativa o Lovable Cloud (necessário para chamar a IA com segurança).

## Detalhes técnicos
- Lovable Cloud + `@lovable.dev/ai-gateway`; server function `chatTurn` com saída estruturada (tool calls) validada por zod contra os tipos de settings de cada ferramenta.
- Rota `src/routes/chat.tsx`; histórico em localStorage (mensagens + planos; vídeos em memória/IndexedDB-free, apenas object URLs da sessão).
- Novo `runCombo(steps)` em `src/lib/video/pipelines/combo.ts` encadeando `Pipeline<S>` existentes via `PipelineContext.input`.
- Testes: validação do plano (ferramenta/intensidade inválida rejeitada) e encadeamento do combo.
