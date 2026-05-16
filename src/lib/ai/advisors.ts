import type { AdvisorRecommendation } from './schemas';
import { AdvisorRecommendationSchema } from './schemas';
import type { Advisor, KingdomMetrics } from '@/types/game';
import { recordAiRequest } from '@/lib/observability/metrics';

/**
 * Advisor AI layer.
 *
 * In production this calls an LLM via the Vercel AI SDK.
 * For the prototype the responses are generated deterministically.
 * Replace the function bodies with real LLM calls when wiring up the AI layer.
 */

const ADVISOR_CONCERNS: Record<string, (metrics: KingdomMetrics) => AdvisorRecommendation> = {
  steward: (m) => ({
    advisor: 'Steward Aldric',
    concern: m.food < 40
      ? 'Grain stores are critically insufficient for the coming season.'
      : 'Food reserves require careful management to avoid shortage.',
    recommendation: m.food < 40
      ? 'Restrict grain exports immediately and consider emergency purchases.'
      : 'Review distribution policy and monitor Riverhold granary stocks.',
    risk: 'Delayed action risks famine and a collapse in popular morale.',
  }),

  marshal: (m) => ({
    advisor: 'Marshal Garrett',
    concern: m.threat > 60
      ? 'Raider activity along the frontier has reached dangerous levels.'
      : 'Border tensions remain elevated and require watchful management.',
    recommendation: m.threat > 60
      ? 'Reinforce Stonewatch garrison and authorise aggressive patrols.'
      : 'Maintain current patrol schedule and review fortification readiness.',
    risk: 'Insufficient response may invite emboldened incursions next season.',
  }),

  merchant: (m) => ({
    advisor: 'Merchant Lyra',
    concern: m.gold < 40
      ? 'Heavy taxation has driven several trading houses to seek alternatives.'
      : 'Trade volumes are suppressed by current commercial levies.',
    recommendation: m.gold < 40
      ? 'Negotiate trade agreements and consider targeted tax relief.'
      : 'A measured reduction in commercial levies should stimulate volume.',
    risk: 'Persistent taxation without reform will accelerate merchant flight from Blackwater.',
  }),

  governor: (m) => ({
    advisor: 'Governor Elric',
    concern: m.adminStrain > 60
      ? 'Administrative capacity is at or near its operational limit.'
      : 'Cumulative procedural burden is constraining regional governance.',
    recommendation: m.adminStrain > 60
      ? 'Expand administrative staff or reduce procedure assignments urgently.'
      : 'Streamline procedures and prioritise unresolved regional petitions.',
    risk: 'Governance quality will degrade if capacity pressure is not relieved.',
  }),
};

export async function getAdvisorRecommendation(
  advisor: Advisor,
  metrics: KingdomMetrics
): Promise<AdvisorRecommendation> {
  // If an OpenAI key is configured, attempt an LLM call. Otherwise, return
  // the deterministic prototype recommendation.
  if (process.env.OPENAI_API_KEY) {
    const start = Date.now();
    try {
      const system = `You are an in-universe royal advisor generator. Given the advisor metadata
and the kingdom metrics, emit a single JSON object matching this schema:\n{\n  \"advisor\": string,\n  \"concern\": string,\n  \"recommendation\": string,\n  \"risk\": string\n}`;

      const user = `Advisor: ${advisor.title} ${advisor.name} (id: ${advisor.id})\nMetrics: ${JSON.stringify(metrics)}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.0,
          max_tokens: 400,
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        const text = payload.choices?.[0]?.message?.content ?? '';
        try {
          const parsed = JSON.parse(text);
          const parsedResult = AdvisorRecommendationSchema.parse(parsed);
          recordAiRequest(Date.now() - start, false);
          return parsedResult;
        } catch {
          // fall through to deterministic
        }
      }
      // if anything goes wrong, fall back to deterministic generator below
    } catch {
      // fall back
    } finally {
      // if we get here without returning, we used fallback for this attempt
      recordAiRequest(Date.now() - (typeof start === 'number' ? start : Date.now()), true);
    }
  }

  const generator = ADVISOR_CONCERNS[advisor.id];
  const raw = generator ? generator(metrics) : {
    advisor: advisor.name,
    concern: 'General matters require attention.',
    recommendation: 'Review current policies and adjust as necessary.',
    risk: 'Inaction carries compounding risk over time.',
  };
  return AdvisorRecommendationSchema.parse(raw);
}
