import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { normalizePlan, type PlanStep } from "./plan";

const MediaSchema = z.object({
  duration: z.number(),
  width: z.number(),
  height: z.number(),
  fps: z.number().nullable(),
  hasAudio: z.boolean(),
  videoCodec: z.string(),
});

const InputSchema = z.object({
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) })).max(30),
  video: MediaSchema.nullable(),
  frames: z.array(z.string().startsWith("data:image/jpeg;base64,").max(400_000)).max(6),
  lastPlan: z.array(z.object({ tool: z.string(), settings: z.record(z.string(), z.unknown()) })).nullable(),
});

const SYSTEM = `Você é a IA do REVERSE IA, um editor de vídeo por conversa. Responda sempre em português do Brasil, de forma curta e amigável.
Você NÃO edita o vídeo diretamente: você escolhe e configura as 7 ferramentas reais do app, que rodam no aparelho do usuário.

Ferramentas (id: configurações possíveis — use só estes valores):
- "reverse": audio "silence"|"reverse"|"none". Limite: vídeo de até 2 s.
- "rsmb" (motion blur por estimativa de movimento): intensity 10|20|30|50, fast boolean.
- "fps-mod" (interpolação de quadros): targetFps 60|90|120, intensity 10|20|30|50, fast boolean.
- "qualidade" (redução de ruído + nitidez): intensity 10|20|30|50, upscale 0|1080|1440|2160 (2160 = 4K; só amplia se for maior que o original).
- "tracking": mode "frame"(câmera segue)|"object"(marca objeto), aspect "9:16"|"4:5"|"1:1"|"zoom", smoothness "low"|"mid"|"high". O usuário marca o objeto depois.
- "zoom": mode "in"|"out"|"smooth"|"dynamic"|"approach"|"retreat"|"track", intensity 10|20|30|50, transition 0.1..5 s, period 0.2..2 s (punch do dinâmico).
- "time-remap": mode "slow"|"fast"|"ramp"|"accel"|"decel"|"segment", speed 0.1..4, rampSlow 0.1..0.9, rampFast 1..4, at (s), until (s), transition 0.05..2 s, interpolate boolean.
Intensidades: 10 Leve, 20 Suave, 30 Médio, 50 Forte. "Motion Blur" = rsmb. "120 FPS" = fps-mod. "4K"/"melhorar" = qualidade.

Responda SOMENTE com JSON: {"reply": string, "plan": null | [{"tool": id, "settings": {...apenas o que mudar}}]}.
- Se o usuário pedir efeitos, devolva o plano completo (todas as ferramentas que devem ser aplicadas no vídeo original) e no reply liste os efeitos e pergunte se deseja aplicar.
- Para ajustes ("diminua o motion blur"), parta do plano anterior, mude só o pedido e devolva o plano completo atualizado.
- Ao receber quadros de um vídeo novo, descreva o que vê (pessoas, objetos, movimento, cena), cite duração/resolução/FPS e sugira melhorias, com plan null a menos que o usuário já tenha pedido efeitos.
- Se não houver vídeo e o usuário pedir efeitos, devolva o plano mesmo assim e peça para anexar o vídeo.
- Nunca diga que já processou: o processamento só acontece quando o usuário confirmar.`;

export interface ChatTurnResult {
  reply: string;
  plan: PlanStep[] | null;
  error?: string;
}

export const chatTurn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ChatTurnResult> => {
    const { generateChatCompletion, GatewayError } = await import("@lovable.dev/ai-gateway");
    const context: string[] = [];
    if (data.video) {
      const v = data.video;
      context.push(
        `Vídeo anexado: ${v.duration.toFixed(2)} s, ${v.width}x${v.height}, ${v.fps ? Math.round(v.fps) + " FPS" : "FPS desconhecido"}, ${v.hasAudio ? "com áudio" : "sem áudio"}, codec ${v.videoCodec}.`,
      );
    } else context.push("Nenhum vídeo anexado ainda.");
    if (data.lastPlan) context.push(`Plano anterior: ${JSON.stringify(data.lastPlan)}`);

    const history = data.history.slice(0, -1).map((m) => ({ role: m.role, content: m.text }));
    const last = data.history.at(-1);
    const lastText = `${context.join("\n")}\n\nMensagem: ${last?.text ?? ""}`;
    const userContent = data.frames.length
      ? [
          { type: "text" as const, text: `${lastText}\n(${data.frames.length} quadros do vídeo em ordem)` },
          ...data.frames.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        ]
      : lastText;

    try {
      const res = await generateChatCompletion({
        model: "openai/gpt-6-astra",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM }, ...history, { role: "user", content: userContent }],
      });
      const content = res.choices[0]?.message?.content;
      const text = typeof content === "string" ? content : "";
      const parsed = JSON.parse(text) as { reply?: unknown; plan?: unknown };
      const reply = typeof parsed.reply === "string" ? parsed.reply : "Não entendi. Pode repetir?";
      let plan: PlanStep[] | null = null;
      if (Array.isArray(parsed.plan) && parsed.plan.length) {
        try {
          plan = normalizePlan(parsed.plan);
        } catch (e) {
          console.error("invalid plan", e, parsed.plan);
          return { reply: "Montei um plano com valores inválidos. Pode reformular o pedido?", plan: null };
        }
      }
      return { reply, plan };
    } catch (e) {
      console.error("chatTurn failed", e);
      if (e instanceof GatewayError && e.code === "payment_required")
        return { reply: "", plan: null, error: "A IA está sem créditos no momento." };
      if (e instanceof GatewayError && e.httpStatus === 429)
        return { reply: "", plan: null, error: "Muitas mensagens seguidas. Espere alguns segundos." };
      return { reply: "", plan: null, error: "A IA não respondeu. Tente de novo." };
    }
  });
