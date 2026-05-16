import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdvisorSchema, KingdomMetricsSchema } from '@/lib/contracts/gameplay';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';
import type { Advisor, KingdomMetrics } from '@/types/game';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'advisor']),
  text: z.string(),
});

const RequestSchema = z.object({
  advisor: AdvisorSchema,
  metrics: KingdomMetricsSchema,
  messages: z.array(ChatMessageSchema).max(50),
  userMessage: z.string().min(1).max(1000),
}).strict();

const FOLLOW_UP_PATTERNS: Record<string, string> = {
  why: 'Explain your reasoning in detail.',
  alternative: 'Suggest an alternative course of action.',
  'pros/cons': 'List the pros and cons of your recommendation.',
  'explain more': 'Provide a more detailed explanation.',
};

function buildSystemPrompt(advisor: Advisor, metrics: KingdomMetrics): string {
  return `You are ${advisor.title} ${advisor.name}, a royal advisor to the monarch of a medieval kingdom.
Your bias is "${advisor.bias}". Your region is "${advisor.region}".
Kingdom metrics — Food: ${metrics.food}, Morale: ${metrics.morale}, Gold: ${metrics.gold}, Threat: ${metrics.threat}, Admin Strain: ${metrics.adminStrain}.
Speak in first person as the advisor. Keep responses concise (2–4 sentences). Stay in character.
Always address the monarch respectfully. Base your counsel on your bias and the current kingdom metrics.`;
}

function buildFallbackReply(advisor: Advisor, userMessage: string): string {
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
 * POST /api/advisor/chat
 * Multi-turn advisor conversation endpoint.
 * Accepts a message history and a new user message, returns the advisor's reply.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { advisor, metrics, messages, userMessage } = parsed.data;

    if (process.env.OPENAI_API_KEY) {
      try {
        const systemPrompt = buildSystemPrompt(advisor as Advisor, metrics as KingdomMetrics);
        const history = messages.map(m => ({
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
              ...history,
              { role: 'user', content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 200,
          }),
        });

        if (res.ok) {
          const payload = await res.json();
          const reply = payload.choices?.[0]?.message?.content ?? '';
          if (reply.length > 0) {
            return NextResponse.json({ reply, source: 'ai' });
          }
        }
      } catch {
        // fall through to deterministic fallback
      }
    }

    // Resolve follow-up chip expansions deterministically
    const normalised = userMessage.toLowerCase().trim();
    const expandedMessage = FOLLOW_UP_PATTERNS[normalised] ?? userMessage;
    const reply = buildFallbackReply(advisor as Advisor, expandedMessage);
    return NextResponse.json({ reply, source: 'fallback' });
  } catch (error) {
    incrementCounter('apiFailure');
    logApiError('advisor.chat.failed', error, {});
    return NextResponse.json({ error: 'Failed to process conversation' }, { status: 500 });
  }
}
