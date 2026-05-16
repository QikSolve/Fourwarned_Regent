import type { Advisor, AdvisorTone, ConversationMessage, KingdomMetrics, Report, Season } from '@/lib/gameTypes';
import {
  AdvisorRecommendationSchema,
  ScribeClarificationSchema,
  ScribeConsequenceSchema,
} from './schemas';

export type NormalizedAdvisorCounsel = {
  advisor: string;
  concern: string;
  recommendation: string;
  risk: string;
  source: 'ai' | 'fallback';
};

const metricBounds = { min: 0, max: 100 };

function normalizeMetrics(metrics: KingdomMetrics): KingdomMetrics {
  const clamp = (value: number) => Math.max(metricBounds.min, Math.min(metricBounds.max, value));
  return {
    food: clamp(metrics.food),
    morale: clamp(metrics.morale),
    gold: clamp(metrics.gold),
    threat: clamp(metrics.threat),
    adminStrain: clamp(metrics.adminStrain),
  };
}

function buildAdvisorFallback(advisor: Advisor, metrics: KingdomMetrics): NormalizedAdvisorCounsel {
  const concern = metrics[advisor.id === 'steward' ? 'food' : advisor.id === 'marshal' ? 'threat' : advisor.id === 'merchant' ? 'gold' : 'adminStrain'];
  const concernLine = advisor.id === 'steward'
    ? `Food pressure is at ${metrics.food}.`
    : advisor.id === 'marshal'
      ? `Frontier threat is at ${metrics.threat}.`
      : advisor.id === 'merchant'
        ? `Treasury pressure is at ${metrics.gold}.`
        : `Administrative strain is at ${metrics.adminStrain}.`;

  return {
    advisor: `${advisor.title} ${advisor.name}`,
    concern: concernLine,
    recommendation: concern >= 60
      ? 'Prioritize immediate corrective policy this season.'
      : 'Maintain measured policy and monitor trend changes.',
    risk: 'Inaction can compound pressure over the next turn.',
    source: 'fallback',
  };
}

function normalizeClarificationText(report: Report, summary: string, question: string, options: Array<{ label: string; tradeoff: string }>, conflicts: string[]): string {
  const optionLines = options
    .map((option, index) => `${index + 1}. ${option.label} — ${option.tradeoff}`)
    .join('\n');
  const conflictLines = conflicts.length > 0 ? `\n\nConflicts:\n${conflicts.map(conflict => `- ${conflict}`).join('\n')}` : '';
  return `Regarding "${report.title}":\n${summary}\n\n${question}\n${optionLines}${conflictLines}`;
}

function buildClarificationFallback(report: Report): string {
  return normalizeClarificationText(
    report,
    report.scribesNote,
    'How should the kingdom respond to this matter?',
    report.choices.map(choice => ({ label: choice.label, tradeoff: choice.description })),
    []
  );
}

function normalizeConsequenceText(summary: string, consequences: Array<{ aspect: string; direction: 'improved' | 'worsened' | 'unchanged'; explanation: string }>, warnings: string[]): string {
  const details = consequences.map(consequence => `- ${consequence.aspect} (${consequence.direction}): ${consequence.explanation}`).join('\n');
  const warningText = warnings.length > 0 ? `\n\nWarnings:\n${warnings.map(warning => `⚠ ${warning}`).join('\n')}` : '';
  return `${summary}\n\n${details}${warningText}`;
}

export type ChatReply = { text: string; source: 'ai' | 'fallback' | 'moderated' };

function buildChatFallback(advisor: Advisor, userMessage: string): ChatReply {
  const msg = userMessage.toLowerCase();
  const text = msg.includes('why')
    ? `My reasoning stems from my background in ${advisor.bias}. The current kingdom state demands careful consideration of these priorities, Your Majesty.`
    : msg.includes('alternative')
    ? `An alternative approach would be to consider a more measured path — weigh the immediate costs against long-term stability before committing to any course.`
    : msg.includes('pros') || msg.includes('cons')
    ? `The merits are clear: acting preserves stability. The risks: hasty action may disturb more than it settles. I counsel deliberation, Majesty.`
    : msg.includes('explain')
    ? `Let me be plain, Your Majesty: the situation requires attention because left unaddressed, compounding pressures will limit your future options considerably.`
    : `As your ${advisor.title}, I advise caution and deliberation. The details warrant careful study before any decree is issued.`;
  return { text, source: 'fallback' };
}

export async function getAdvisorChatReply(
  advisor: Advisor,
  metrics: KingdomMetrics,
  history: Pick<ConversationMessage, 'role' | 'text'>[],
  userMessage: string,
  tone: AdvisorTone = 'Concise',
  isQuickFollowUp = false
): Promise<ChatReply> {
  try {
    const response = await fetch('/api/advisor/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advisor,
        metrics: normalizeMetrics(metrics),
        messages: history,
        userMessage,
        tone,
        isQuickFollowUp,
      }),
    });

    if (!response.ok) {
      return buildChatFallback(advisor, userMessage);
    }

    const data = await response.json();
    if (typeof data.reply !== 'string' || data.reply.length === 0) {
      return buildChatFallback(advisor, userMessage);
    }

    const source = data.source === 'moderated' ? 'moderated' : data.source === 'fallback' ? 'fallback' : 'ai';
    return { text: data.reply, source };
  } catch {
    return buildChatFallback(advisor, userMessage);
  }
}

export async function getAdvisorCounsel(
  advisor: Advisor,
  metrics: KingdomMetrics
): Promise<NormalizedAdvisorCounsel> {
  try {
    const response = await fetch('/api/advisor/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advisor, metrics: normalizeMetrics(metrics) }),
    });

    if (!response.ok) {
      return buildAdvisorFallback(advisor, metrics);
    }

    const data = await response.json();
    const parsed = AdvisorRecommendationSchema.safeParse(data);
    if (!parsed.success) {
      return buildAdvisorFallback(advisor, metrics);
    }

    return {
      ...parsed.data,
      source: 'ai',
    };
  } catch {
    return buildAdvisorFallback(advisor, metrics);
  }
}

export async function getScribeClarificationText(
  report: Report,
  metrics: KingdomMetrics
): Promise<{ text: string; source: 'ai' | 'fallback' }> {
  try {
    const response = await fetch('/api/scribe/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clarify', report, metrics: normalizeMetrics(metrics) }),
    });

    if (!response.ok) {
      return { text: buildClarificationFallback(report), source: 'fallback' };
    }

    const data = await response.json();
    const parsed = ScribeClarificationSchema.safeParse(data);
    if (!parsed.success) {
      return { text: buildClarificationFallback(report), source: 'fallback' };
    }

    return {
      text: normalizeClarificationText(
        report,
        parsed.data.summary,
        parsed.data.question,
        parsed.data.options,
        parsed.data.conflicts ?? []
      ),
      source: 'ai',
    };
  } catch {
    return { text: buildClarificationFallback(report), source: 'fallback' };
  }
}

export async function getScribeConsequenceText(
  oldMetrics: KingdomMetrics,
  newMetrics: KingdomMetrics,
  season: Season,
  year: number
): Promise<{ text: string; source: 'ai' | 'fallback' } | null> {
  try {
    const response = await fetch('/api/scribe/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'consequence',
        oldMetrics: normalizeMetrics(oldMetrics),
        newMetrics: normalizeMetrics(newMetrics),
        season,
        year,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const parsed = ScribeConsequenceSchema.safeParse(data);
    if (!parsed.success) {
      return null;
    }

    return {
      text: normalizeConsequenceText(parsed.data.summary, parsed.data.consequences, parsed.data.warnings ?? []),
      source: 'ai',
    };
  } catch {
    return null;
  }
}
