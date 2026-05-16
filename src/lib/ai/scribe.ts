import type { ScribeClarification, ScribeConsequence } from './schemas';
import { ScribeClarificationSchema, ScribeConsequenceSchema } from './schemas';
import type { KingdomMetrics, Report, Season } from '@/types/game';

/**
 * Scribe AI layer.
 *
 * In production this calls an LLM via the Vercel AI SDK.
 * For the prototype the responses are generated deterministically so the game
 * is fully playable without API keys.  Replace the body of each function with
 * a real `generateObject` / `streamText` call when you wire up the AI layer.
 */

export async function getScribeClarification(
  report: Report,
  metrics: KingdomMetrics
): Promise<ScribeClarification> {
  // If an OpenAI key is configured, try to generate structured clarification via LLM.
  if (process.env.OPENAI_API_KEY) {
    try {
      const system = `You are a royal scribe assistant. Given the report and metrics, return a JSON object matching the schema:\n{\n  \"summary\": string,\n  \"question\": string,\n  \"options\": [{ id: string, label: string, tradeoff: string }],\n  \"conflicts\": [string]?\n}`;

      const user = `Report: ${report.title}\nScribe note: ${report.scribesNote}\nChoices: ${JSON.stringify(report.choices)}\nMetrics: ${JSON.stringify(metrics)}`;

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
          max_tokens: 600,
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        const text = payload.choices?.[0]?.message?.content ?? '';
        try {
          const parsed = JSON.parse(text);
          const validated = ScribeClarificationSchema.safeParse(parsed);
          if (validated.success) return validated.data;
        } catch {
          // fall through to deterministic
        }
      }
    } catch {
      // fall back to deterministic behavior
    }
  }

  // Prototype deterministic fallback
  const result: ScribeClarification = {
    summary: report.scribesNote,
    question: 'How should the kingdom respond to this matter?',
    options: report.choices.map(c => ({
      id: c.id,
      label: c.label,
      tradeoff: c.description,
    })),
    conflicts: [],
  };

  // Surface a conflict hint if treasury is strained alongside a costly action
  if (metrics.gold < 40 && report.choices.some(c => (c.consequences.gold ?? 0) < -10)) {
    result.conflicts = [
      'Warning: Several responses carry significant treasury costs. Gold reserves are already low.',
    ];
  }

  return ScribeClarificationSchema.parse(result);
}

export async function getScribeConsequenceSummary(
  oldMetrics: KingdomMetrics,
  newMetrics: KingdomMetrics,
  season: Season,
  year: number
): Promise<ScribeConsequence> {
  const aspects: Array<{ aspect: string; key: keyof KingdomMetrics; label: string }> = [
    { aspect: 'Food Reserves', key: 'food', label: 'food' },
    { aspect: 'Popular Morale', key: 'morale', label: 'morale' },
    { aspect: 'Treasury', key: 'gold', label: 'gold' },
    { aspect: 'Frontier Threat', key: 'threat', label: 'threat' },
    { aspect: 'Administrative Strain', key: 'adminStrain', label: 'adminStrain' },
  ];

  const consequences = aspects.map(({ aspect, key }) => {
    const delta = newMetrics[key] - oldMetrics[key];
    return {
      aspect,
      direction: delta > 0
        ? (key === 'threat' || key === 'adminStrain' ? 'worsened' : 'improved')
        : delta < 0
          ? (key === 'threat' || key === 'adminStrain' ? 'improved' : 'worsened')
          : 'unchanged',
      explanation: delta === 0
        ? `${aspect} remains at ${newMetrics[key]}.`
        : `${aspect} ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)} to ${newMetrics[key]}.`,
    } as { aspect: string; direction: 'improved' | 'worsened' | 'unchanged'; explanation: string };
  });

  const warnings: string[] = [];
  if (newMetrics.food < 25) warnings.push('Food reserves are critically low. Famine threatens.');
  if (newMetrics.threat > 75) warnings.push('Frontier threat is severe. Military action may be unavoidable.');
  if (newMetrics.gold < 20) warnings.push('The treasury is nearly depleted. Fiscal crisis looms.');
  if (newMetrics.morale < 25) warnings.push('Popular morale is dangerously low. Unrest may follow.');

  const result: ScribeConsequence = {
    summary: `The season has turned. Here is what has transpired under your governance — ${season}, Year ${year} begins.`,
    consequences,
    warnings,
  };
  // If an OpenAI key is present, offer a chance to produce a richer narrative
  if (process.env.OPENAI_API_KEY) {
    try {
      const system = `You are a royal scribe. Produce a JSON object matching the schema:\n{\n  \"summary\": string,\n  \"consequences\": [{ aspect: string, direction: \"improved\"|\"worsened\"|\"unchanged\", explanation: string }],\n  \"warnings\": [string]?\n}`;

      const user = `Old metrics: ${JSON.stringify(oldMetrics)}\nNew metrics: ${JSON.stringify(newMetrics)}\nSeason: ${season}, Year: ${year}`;

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
          max_tokens: 800,
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        const text = payload.choices?.[0]?.message?.content ?? '';
        try {
          const parsed = JSON.parse(text);
          const validated = ScribeConsequenceSchema.safeParse(parsed);
          if (validated.success) return validated.data;
        } catch {
          // fall through to deterministic
        }
      }
    } catch {
      // fall back
    }
  }

  return ScribeConsequenceSchema.parse(result);
}
