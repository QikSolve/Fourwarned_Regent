import { z } from 'zod';
import type { JobExecutor } from '@/lib/jobs/worker';

const AdvisorSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  region: z.string(),
  bias: z.string(),
});

const MetricsSchema = z.object({
  food: z.number(),
  morale: z.number(),
  gold: z.number(),
  threat: z.number(),
  adminStrain: z.number(),
});

const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'advisor']),
  text: z.string(),
});

const AdvisorJobPayloadSchema = z.object({
  advisor: AdvisorSchema,
  metrics: MetricsSchema,
  prompt: z.string().min(1).max(1000),
  history: z.array(HistoryMessageSchema).default([]),
  tone: z.enum(['Concise', 'Analytical', 'Collaborative']).default('Concise'),
  isQuickFollowUp: z.boolean().default(false),
});

export type AdvisorJobResult = {
  reply: string;
  source: 'ai' | 'fallback';
  advisorId: string;
  transcriptSnapshot: Array<{ role: 'user' | 'advisor'; text: string }>;
};

const MODERATION_PATTERNS = [
  /\bkill\b/i,
  /\bmurder\b/i,
  /\bself[- ]?harm\b/i,
  /\bsuicide\b/i,
  /\bgenocide\b/i,
];

function shouldModerate(message: string): boolean {
  return MODERATION_PATTERNS.some(p => p.test(message));
}

function buildSystemPrompt(
  advisor: z.infer<typeof AdvisorSchema>,
  metrics: z.infer<typeof MetricsSchema>,
  tone: 'Concise' | 'Analytical' | 'Collaborative'
): string {
  const toneInstruction =
    tone === 'Analytical'
      ? 'Adopt an analytical tone and explain trade-offs and second-order effects.'
      : tone === 'Collaborative'
      ? 'Adopt a collaborative tone and present options with clear next steps.'
      : 'Keep your response concise and direct.';
  return `You are ${advisor.title} ${advisor.name}, a royal advisor to the monarch of a medieval kingdom.
Your bias is "${advisor.bias}". Your region is "${advisor.region}".
Kingdom metrics — Food: ${metrics.food}, Morale: ${metrics.morale}, Gold: ${metrics.gold}, Threat: ${metrics.threat}, Admin Strain: ${metrics.adminStrain}.
Speak in first person as the advisor. ${toneInstruction} Stay in character.
Always address the monarch respectfully. Base your counsel on your bias and the current kingdom metrics.`;
}

function buildFallbackReply(advisor: z.infer<typeof AdvisorSchema>, userMessage: string): string {
  const msg = userMessage.toLowerCase();
  if (msg.includes('why')) {
    return `My reasoning stems from my background in ${advisor.bias}, Your Majesty. The current kingdom state demands careful consideration of these priorities.`;
  }
  if (msg.includes('alternative')) {
    return `An alternative approach would be a more measured path — weigh the immediate costs against long-term stability before committing to any course.`;
  }
  if (msg.includes('pros') || msg.includes('cons')) {
    return `The merits are clear: acting preserves stability. The risks: hasty action may disturb more than it settles. I counsel deliberation, Majesty.`;
  }
  if (msg.includes('explain')) {
    return `Let me be plain, Your Majesty: the situation requires attention because left unaddressed, compounding pressures will limit your future options considerably.`;
  }
  return `As your ${advisor.title}, I advise caution and deliberation. The details warrant careful study before any decree is issued, Your Majesty.`;
}

/**
 * Server-side JobExecutor for advisor-conversation jobs.
 *
 * Validates the job payload, calls the OpenAI chat completions API with streaming
 * (emitting each token as a partial_output event), and returns the full reply as
 * the job result.  Falls back to a deterministic reply when no OpenAI key is set
 * or when the model call fails.
 *
 * The result shape (AdvisorJobResult) includes the full reply, source tag,
 * advisorId, and a snapshot of the conversation thread so follow-up jobs can
 * resume the context.
 */
export const advisorJobExecutor: JobExecutor = async (job, emitPartial, signal) => {
  const parsed = AdvisorJobPayloadSchema.safeParse(job.payload);
  if (!parsed.success) {
    throw new Error(`Invalid advisor job payload: ${JSON.stringify(parsed.error.flatten())}`);
  }

  const { advisor, metrics, prompt, history, tone } = parsed.data;

  if (shouldModerate(prompt)) {
    const reply =
      'I cannot assist with harmful requests. Please rephrase your question toward governance strategy, risk management, or public safety.';
    const result: AdvisorJobResult = {
      reply,
      source: 'fallback',
      advisorId: advisor.id,
      transcriptSnapshot: [
        ...history,
        { role: 'user', text: prompt },
        { role: 'advisor', text: reply },
      ],
    };
    return result;
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const systemPrompt = buildSystemPrompt(advisor, metrics, tone);
      const openAiHistory = history.map(m => ({
        role: m.role === 'advisor' ? 'assistant' : 'user',
        content: m.text,
      }));

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...openAiHistory,
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 200,
          stream: true,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (!signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') break;
            try {
              const chunk = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = chunk.choices?.[0]?.delta?.content ?? '';
              if (token) {
                fullText += token;
                await emitPartial(token, { phase: 'streaming' });
              }
            } catch {
              // Skip malformed SSE lines.
            }
          }
        }

        if (signal.aborted) {
          throw new Error('Job cancelled during streaming');
        }

        if (fullText.length > 0) {
          const result: AdvisorJobResult = {
            reply: fullText,
            source: 'ai',
            advisorId: advisor.id,
            transcriptSnapshot: [
              ...history,
              { role: 'user', text: prompt },
              { role: 'advisor', text: fullText },
            ],
          };
          return result;
        }
      }
    } catch (err) {
      if (signal.aborted) throw err;
      // Fall through to deterministic fallback.
    }
  }

  const reply = buildFallbackReply(advisor, prompt);
  await emitPartial(reply, { phase: 'complete' });

  const result: AdvisorJobResult = {
    reply,
    source: 'fallback',
    advisorId: advisor.id,
    transcriptSnapshot: [
      ...history,
      { role: 'user', text: prompt },
      { role: 'advisor', text: reply },
    ],
  };
  return result;
};
