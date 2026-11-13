# REVERSE IA BETA — Atualização visual e novas ferramentas

Continua o site atual. Nada que já funciona é apagado.

## 1. Edits em destaque (seção própria)
- Seção "EDITS EM DESTAQUE" separada do Antes e Depois, com miniatura, prévia ao tocar e tela cheia; rolagem lateral no celular, grade no PC.
- Usa os 3 edits que você enviou antes (Dexter, Holy, Kaiser), que já estão guardados. Se mandar outros, eu troco.

## 2. Antes e Depois honesto
- Mesmo trecho do Holy nos dois lados, sincronizado, com controle deslizante.
- ANTES — 360p: reduzido de verdade para 360p.
- DEPOIS — REVERSE IA: o trecho original passado pela ferramenta Melhorar Qualidade real, na resolução original.
- Título e legenda dizem exatamente o que foi feito.

## 3. Rastreio de Câmera (no lugar de Tracking)
- Analisa o movimento da câmera no vídeo (pontos que se movem entre quadros).
- Você marca uma pessoa/objeto; o rastreio segue o alvo descontando o movimento da câmera.
- Opções: enquadramento (9:16, 4:5, 1:1, zoom), suavidade, estabilizar câmera.
- Prévia: mostra o caminho rastreado sobre o quadro antes de processar.

## 4. Smooth Reverse (nova)
- Vídeo normal seguido do reverso, com desaceleração suave no ponto de virada e fusão curta de quadros, sem repetir o quadro do meio.
- No Chat IA e no Combo.

## 5. Gelatina (nova)
- Deformação elástica ondulada com balanço; controles de intensidade e velocidade; vídeo todo ou trecho.
- Prévia animada no quadro antes de processar. Entra no Combo junto com Zoom e Motion Blur.

## 6. CC — Correção de Cor
- CC DARK vira ferramenta "CC" com presets (CC Dark, Natural, Quente, Frio, Vibrante) + controles: exposição, contraste, saturação, sombras, realces, temperatura e matiz/tinta.

## 7. Motion Blur
- Mantido independente: intensidades 10, 20, 30, 50, com desfoque baseado em movimento estimado (já é assim).

## 8. Chat IA mais barato
- Continua com Google Gemini gratuito (chave no servidor).
- Adiciona um segundo provedor gratuito opcional (OpenRouter modelos grátis ou Groq) que entra quando o Google atingir o limite; o chat avisa ao trocar. Você precisa criar a chave grátis; sem ela, o chat só avisa do limite.
- Nenhum serviço pago sem sua autorização. Vou explicar limites reais de cada provedor.

## 9. Identidade
- Mantém nome e logo atuais. Quando você enviar a nova logo roxa e preta, eu troco.

## 10. Testes
- Rodar cada ferramenta com vídeo real (enviar, processar, baixar), incluindo Combo e Chat IA, em tela de celular. Só digo que está pronto depois disso.

## Detalhes técnicos
- Novos ToolIds: smooth-reverse, gelatina, rastreio-camera (substitui tracking; rota antiga redireciona), cc (cc-dark vira preset).
- Smooth Reverse: setpts ramp + reverse + xfade curto, concat sem duplicar o quadro de junção.
- Gelatina: filtro geq com deslocamento senoidal dependente de T e Y; prévia via canvas.
- Rastreio: estimativa de movimento global por correlação de blocos em quadros reduzidos (tracker.ts), alvo relativo ao fundo, suavização e crop/zoom no FFmpeg.
- Atualizar tools.ts, registry, plan.ts schemas, prompt do chat, COMBO_ORDER, testes.
- Fallback de provedor em chat.functions.ts por erro 429/503.
