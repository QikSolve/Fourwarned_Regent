import { Season, KingdomMetrics, Report, Advisor, ScribeMessage } from './gameTypes';

let msgCounter = 0;
function makeId() {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}`;
}

export function generateWelcomeMessage(season: Season, year: number): string {
  return `Welcome, Your Majesty, to the throne of Valdris.

I am your Royal Scribe — tasked with presenting the counsel of your advisors and clarifying the choices before you. I speak plainly so that you may govern wisely.

The kingdom faces pressures on several fronts: our grain stores are strained, the frontier grows restless, and the merchants of Blackwater chafe under current taxation. Your advisors have submitted their seasonal reports, each urging a different course of action.

My role is not to decide, but to illuminate. I shall present the choices, surface the tradeoffs, and explain the consequences of your decrees. The decisions — and their weight — rest with you.

The season of ${season}, Year ${year}, begins. Your advisors await your counsel.

Read each report carefully. Select your response. When you are satisfied with your decisions, advance the season to see the consequences unfold.`;
}

export function detectConflicts(
  metrics: KingdomMetrics,
  reports: Report[],
  advisors: Advisor[]
): string[] {
  // suppress unused advisors warning
  void advisors;

  const conflicts: string[] = [];

  const hasMarshallReport = reports.some(r => r.advisorId === 'marshal');
  const hasStewardReport = reports.some(r => r.advisorId === 'steward');
  const hasMerchantReport = reports.some(r => r.advisorId === 'merchant');
  const hasGovernorReport = reports.some(r => r.advisorId === 'governor');

  if (hasMarshallReport && metrics.gold < 50) {
    conflicts.push(`Conflict Detected: Marshal Garrett requests additional military resources, yet the treasury holds only ${metrics.gold} gold reserves. Funding military expansion will strain our finances considerably.`);
  }

  if (hasGovernorReport && metrics.adminStrain > 60) {
    conflicts.push(`Conflict Detected: Governor Elric reports administrative strain whilst additional procedures are requested. Assigning further protocols may overwhelm current operational capacity.`);
  }

  if (hasMerchantReport && metrics.gold < 50) {
    conflicts.push(`Conflict Noted: Merchant Lyra advocates for reduced taxation, yet gold reserves are already diminished. Lower taxes may stimulate trade but will further reduce immediate income.`);
  }

  if (hasStewardReport && hasMarshallReport) {
    conflicts.push(`Note of Tension: Both Steward Aldric and Marshal Garrett have submitted urgent reports this season. Their priorities — fiscal prudence and military security — may require difficult compromise.`);
  }

  return conflicts;
}

export function generateConsequenceMessages(
  oldMetrics: KingdomMetrics,
  newMetrics: KingdomMetrics,
  reports: Report[],
  season: Season,
  year: number
): ScribeMessage[] {
  // suppress unused reports warning
  void reports;

  const messages: ScribeMessage[] = [];

  const foodDelta = newMetrics.food - oldMetrics.food;
  const moraleDelta = newMetrics.morale - oldMetrics.morale;
  const goldDelta = newMetrics.gold - oldMetrics.gold;
  const threatDelta = newMetrics.threat - oldMetrics.threat;
  const adminDelta = newMetrics.adminStrain - oldMetrics.adminStrain;

  let summary = `The season has turned. Here is what has transpired under your governance:\n\n`;

  const changes: string[] = [];
  
  if (Math.abs(foodDelta) > 0) {
    changes.push(`Food reserves have ${foodDelta > 0 ? `increased by ${foodDelta}` : `decreased by ${Math.abs(foodDelta)}`} points (now ${newMetrics.food})`);
  }
  if (Math.abs(moraleDelta) > 0) {
    changes.push(`Popular morale has ${moraleDelta > 0 ? `risen by ${moraleDelta}` : `fallen by ${Math.abs(moraleDelta)}`} points (now ${newMetrics.morale})`);
  }
  if (Math.abs(goldDelta) > 0) {
    changes.push(`The treasury has ${goldDelta > 0 ? `gained ${goldDelta}` : `lost ${Math.abs(goldDelta)}`} gold (now ${newMetrics.gold})`);
  }
  if (Math.abs(threatDelta) > 0) {
    changes.push(`Frontier threat has ${threatDelta > 0 ? `increased by ${threatDelta}` : `decreased by ${Math.abs(threatDelta)}`} points (now ${newMetrics.threat})`);
  }
  if (Math.abs(adminDelta) > 0) {
    changes.push(`Administrative strain has ${adminDelta > 0 ? `increased by ${adminDelta}` : `decreased by ${Math.abs(adminDelta)}`} points (now ${newMetrics.adminStrain})`);
  }

  if (changes.length > 0) {
    summary += changes.join('. ') + '.';
  } else {
    summary += "The kingdom remains in its present state — neither improved nor worsened by this season's decisions.";
  }

  summary += `\n\n`;

  if (newMetrics.food < 25) {
    summary += `⚠️ WARNING: Food reserves are critically low. Famine threatens the kingdom.\n`;
  }
  if (newMetrics.threat > 75) {
    summary += `⚠️ WARNING: Frontier threat is severe. Military action may be unavoidable.\n`;
  }
  if (newMetrics.gold < 20) {
    summary += `⚠️ WARNING: The treasury is nearly depleted. Fiscal crisis looms.\n`;
  }
  if (newMetrics.morale < 25) {
    summary += `⚠️ WARNING: Popular morale is dangerously low. Unrest may follow.\n`;
  }

  summary += `\n${season}, Year ${year} begins. Your advisors have submitted their new reports.`;

  messages.push({
    id: makeId(),
    text: summary,
    type: 'consequence',
    season,
    year,
  });

  return messages;
}
