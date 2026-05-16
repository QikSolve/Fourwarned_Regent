import { KingdomMetrics, Advisor, Report, ReportChoice, Season, Urgency } from './gameTypes';

let reportCounter = 0;

function makeId(): string {
  reportCounter++;
  return `report-${Date.now()}-${reportCounter}`;
}

function makeChoice(id: string, label: string, description: string, consequences: Partial<KingdomMetrics>): ReportChoice {
  return { id, label, description, consequences };
}

function stewardFoodReport(metrics: KingdomMetrics, season: Season, year: number): Report {
  const urgency: Urgency = metrics.food < 30 ? 'critical' : metrics.food < 40 ? 'high' : 'medium';
  
  const body = metrics.food < 30
    ? `Your Majesty, I write with gravest urgency. Our grain stores across Riverhold have fallen to perilous levels — barely sufficient for the coming weeks. Without immediate intervention, we face the spectre of famine before the next harvest. The common folk grow restless, and I fear the consequences should we fail to act decisively.`
    : metrics.food < 40
    ? `Your Majesty, it is my duty to report that our food reserves have declined to concerning levels. The granaries of Riverhold report stocks at ${metrics.food}% capacity. While famine is not yet imminent, we must act with prudence to forestall it. I urge Your Majesty's immediate attention to this matter.`
    : `Your Majesty, I submit my seasonal assessment of the kingdom's food stores. Current reserves stand at ${metrics.food}%, which while not dire, warrants careful management as we proceed. I recommend reviewing our distribution policies to ensure stability through the coming months.`;

  return {
    id: makeId(),
    advisorId: 'steward',
    season,
    year,
    title: urgency === 'critical' ? 'CRITICAL: Grain Stores Depleted' : urgency === 'high' ? 'Food Reserves in Decline' : 'Seasonal Food Assessment',
    body,
    urgency,
    scribesNote: urgency === 'critical'
      ? 'Steward Aldric rarely uses such alarming language. This situation demands immediate resolution.'
      : 'The Steward urges caution in grain management. Your response will shape food security this season.',
    choices: [
      makeChoice('reduce-exports', 'Restrict Grain Exports', 'Halt all grain exports to conserve domestic supplies.', { food: 8, gold: -5, morale: 3 }),
      makeChoice('purchase-reserves', 'Purchase Emergency Reserves', 'Spend treasury gold to acquire grain from neighbouring regions.', { food: 15, gold: -15 }),
      makeChoice('begin-rationing', 'Implement Rationing', 'Introduce rationing measures across all regions.', { food: 5, morale: -10 }),
      makeChoice('maintain-trade', 'Maintain Current Levels', 'Allow current trade and distribution to continue unchanged.', { food: -3, gold: 5 }),
    ],
    selectedChoiceId: null,
    freeTextInstruction: '',
    status: 'pending',
  };
}

function marshalThreatReport(metrics: KingdomMetrics, season: Season, year: number): Report {
  const urgency: Urgency = metrics.threat > 70 ? 'critical' : metrics.threat > 50 ? 'high' : 'medium';
  
  const body = metrics.threat > 70
    ? `Your Majesty, the frontier situation has become untenable. Raider bands have grown bold, striking within three leagues of Stonewatch. Our garrison is stretched thin and the men grow weary. I must speak plainly: without substantial reinforcement, we cannot guarantee the frontier's integrity through the coming season. The cost of inaction now will be measured in blood later.`
    : metrics.threat > 50
    ? `Your Majesty, I report with considerable concern from Stonewatch. Border incursions have increased markedly this past season, with our patrols encountering hostile forces with greater frequency. The current threat assessment stands at ${metrics.threat} — elevated and trending upward. Additional resources and clearer authority to act would strengthen our defensive posture considerably.`
    : `Your Majesty, the frontier remains under watchful management. We have noted increased activity from known raider factions, suggesting preparation for future incursions. Preemptive action now would save considerable cost later. I request Your Majesty's guidance on our patrol doctrine for the coming season.`;

  return {
    id: makeId(),
    advisorId: 'marshal',
    season,
    year,
    title: urgency === 'critical' ? 'CRITICAL: Frontier Under Threat' : urgency === 'high' ? 'Frontier Security Deteriorating' : 'Frontier Security Assessment',
    body,
    urgency,
    scribesNote: urgency === 'critical'
      ? 'Marshal Garrett is not given to exaggeration. The frontier situation is genuinely precarious.'
      : 'The Marshal requests resources and authority. Consider carefully — military expenditure strains the treasury.',
    choices: [
      makeChoice('reinforce-garrison', 'Reinforce the Garrison', 'Deploy additional troops to Stonewatch from the capital reserve.', { threat: -15, gold: -12, morale: 5 }),
      makeChoice('authorize-patrols', 'Authorize Aggressive Patrols', 'Grant the Marshal authority for expanded patrol operations.', { threat: -10, gold: -8 }),
      makeChoice('build-fortifications', 'Commission Fortifications', 'Fund construction of additional defensive works.', { threat: -8, gold: -18, adminStrain: 5 }),
      makeChoice('hold-position', 'Maintain Current Posture', 'Direct the garrison to hold present positions without expansion.', { threat: 5, gold: 3 }),
    ],
    selectedChoiceId: null,
    freeTextInstruction: '',
    status: 'pending',
  };
}

function merchantTradeReport(metrics: KingdomMetrics, season: Season, year: number): Report {
  const urgency: Urgency = metrics.gold < 30 ? 'high' : metrics.gold < 40 ? 'medium' : 'low';
  
  const body = metrics.gold < 30
    ? `Your Majesty, the merchant guilds of Blackwater report severe disruption to trade flows. Heavy taxation and restrictive policies have driven several major trading houses to seek agreements with rival ports. Our gold reserves stand at a fraction of their former strength. I implore Your Majesty to consider the long-term damage being done to the kingdom's commercial foundation.`
    : `Your Majesty, the trading houses of Blackwater present their seasonal assessment. While commerce continues, the current tax burden has begun to suppress trade volumes. Several merchants have enquired about seeking arrangements elsewhere should conditions not improve. A measured reduction in commercial levies would, I am confident, yield greater returns through increased volume.`;

  return {
    id: makeId(),
    advisorId: 'merchant',
    season,
    year,
    title: urgency === 'high' ? 'Trade Crisis in Blackwater' : 'Merchant Guild Report',
    body,
    urgency,
    scribesNote: 'Merchant Lyra advocates consistently for lower taxes. Consider whether increased trade volume might offset reduced rates.',
    choices: [
      makeChoice('reduce-taxes', 'Reduce Merchant Taxes', 'Lower commercial taxation to stimulate trade activity.', { gold: -5, morale: 8, threat: -2 }),
      makeChoice('trade-agreement', 'Negotiate Trade Agreements', 'Seek formal agreements with neighbouring merchant houses.', { gold: 10, morale: 5 }),
      makeChoice('merchant-protection', 'Offer Merchant Protections', 'Provide royal protection for trading routes and caravans.', { gold: 3, threat: -3, adminStrain: 5 }),
      makeChoice('maintain-taxation', 'Maintain Current Taxation', 'Keep tax rates unchanged to protect treasury revenues.', { gold: 8, morale: -5 }),
    ],
    selectedChoiceId: null,
    freeTextInstruction: '',
    status: 'pending',
  };
}

function governorAdminReport(metrics: KingdomMetrics, season: Season, year: number): Report {
  const urgency: Urgency = metrics.adminStrain > 70 ? 'high' : metrics.adminStrain > 55 ? 'medium' : 'low';
  
  const body = metrics.adminStrain > 70
    ? `Your Majesty, I must report that the administrative apparatus of the kingdom is approaching its operational limits. The burden of procedures, regional disputes, and crown directives has exceeded the capacity of my office to manage effectively. Without structural relief — either through additional staffing or a reduction in administrative demands — I cannot guarantee the quality of governance your subjects deserve.`
    : `Your Majesty, my quarterly report on regional administration. The provinces continue to function, though the cumulative weight of procedures and correspondence has increased markedly. I would welcome Your Majesty's guidance on prioritisation — several regional petitions await resolution, and my capacity to address them thoroughly is constrained by competing obligations.`;

  return {
    id: makeId(),
    advisorId: 'governor',
    season,
    year,
    title: urgency === 'high' ? 'Administrative Capacity Strained' : 'Regional Administration Report',
    body,
    urgency,
    scribesNote: 'Governor Elric manages considerable administrative burden. Easing his load may improve governance quality across all regions.',
    choices: [
      makeChoice('expand-staff', 'Expand Administrative Staff', 'Hire additional clerks and administrators to increase capacity.', { adminStrain: -15, gold: -10 }),
      makeChoice('delegate-authority', 'Delegate Regional Authority', 'Grant regional lords greater autonomous decision-making power.', { adminStrain: -10, morale: 5, threat: 3 }),
      makeChoice('streamline-procedures', 'Streamline Procedures', 'Audit and reduce redundant administrative processes.', { adminStrain: -8, morale: 2 }),
      makeChoice('accept-strain', 'Accept Current Burden', 'Direct the Governor to manage as best he can.', { adminStrain: 5, morale: -3 }),
    ],
    selectedChoiceId: null,
    freeTextInstruction: '',
    status: 'pending',
  };
}

function seasonalReport(metrics: KingdomMetrics, season: Season, year: number): Report | null {
  if (season === 'Winter') {
    return {
      id: makeId(),
      advisorId: 'steward',
      season,
      year,
      title: 'Winter Provisions Assessment',
      body: `Your Majesty, as winter descends upon the kingdom, I submit a thorough accounting of our provisions. The cold months ahead will test our preparation. Current food reserves stand at ${metrics.food}%, with gold reserves at ${metrics.gold}%. I have directed the regional granaries to implement conservation measures. With careful management, we shall endure the season, though I urge vigilance.`,
      urgency: metrics.food < 40 ? 'high' : 'medium',
      scribesNote: 'Winter brings additional strain on food reserves. The Steward urges careful resource management through the cold months.',
      choices: [
        makeChoice('strict-rationing', 'Implement Strict Winter Rationing', 'Enforce careful rationing to preserve reserves through winter.', { food: 8, morale: -8 }),
        makeChoice('trade-for-food', 'Trade Gold for Food Stocks', 'Purchase additional winter provisions from southern merchants.', { food: 12, gold: -10 }),
        makeChoice('open-granaries', 'Open Royal Granaries', 'Release royal grain reserves to ease winter hardship.', { food: -8, morale: 12 }),
        makeChoice('trust-steward', "Trust the Steward's Management", 'Allow Aldric to manage winter provisions at his discretion.', { food: 2, morale: 2 }),
      ],
      selectedChoiceId: null,
      freeTextInstruction: '',
      status: 'pending',
    };
  }
  
  if (season === 'Spring') {
    return {
      id: makeId(),
      advisorId: 'governor',
      season,
      year,
      title: 'Spring Planting & Regional Assessments',
      body: `Your Majesty, the spring season offers opportunity for renewal. Regional governors report readiness for planting, and the mood among the common folk has improved with the warmer weather. However, several administrative matters require Your Majesty's attention to ensure a productive season. Morale currently stands at ${metrics.morale}%, and the people look to the crown for clear direction.`,
      urgency: 'low',
      scribesNote: 'Spring is a season of possibility. Your directives now will shape the harvest to come.',
      choices: [
        makeChoice('invest-agriculture', 'Invest in Agricultural Development', 'Direct funds toward improving farming equipment and methods.', { food: 6, gold: -8, morale: 5 }),
        makeChoice('tax-relief', 'Grant Spring Tax Relief', 'Reduce taxation burden during the planting season.', { gold: -6, morale: 10 }),
        makeChoice('census-survey', 'Commission Regional Survey', 'Order a thorough survey of regional conditions and resources.', { adminStrain: 5, morale: 3, gold: -3 }),
        makeChoice('standard-season', 'Proceed With Standard Season', 'Allow the season to proceed under existing policies.', { food: 2 }),
      ],
      selectedChoiceId: null,
      freeTextInstruction: '',
      status: 'pending',
    };
  }

  return null;
}

export function generateReports(
  metrics: KingdomMetrics,
  advisors: Advisor[],
  season: Season,
  year: number
): Report[] {
  const reports: Report[] = [];

  if (metrics.food < 50) {
    reports.push(stewardFoodReport(metrics, season, year));
  }

  if (metrics.threat > 40) {
    reports.push(marshalThreatReport(metrics, season, year));
  }

  if (metrics.gold < 50) {
    reports.push(merchantTradeReport(metrics, season, year));
  }

  if (metrics.adminStrain > 50) {
    reports.push(governorAdminReport(metrics, season, year));
  }

  if (reports.length < 2) {
    const seasonal = seasonalReport(metrics, season, year);
    if (seasonal) reports.push(seasonal);
  }

  if (reports.length < 2) {
    const represented = new Set(reports.map(r => r.advisorId));
    
    if (!represented.has('steward')) {
      reports.push(stewardFoodReport({ ...metrics, food: 46 }, season, year));
    } else if (!represented.has('marshal')) {
      reports.push(marshalThreatReport({ ...metrics, threat: 42 }, season, year));
    } else if (!represented.has('merchant')) {
      reports.push(merchantTradeReport({ ...metrics, gold: 48 }, season, year));
    } else if (!represented.has('governor')) {
      reports.push(governorAdminReport({ ...metrics, adminStrain: 52 }, season, year));
    }
  }

  // suppress unused advisors warning
  void advisors;

  return reports;
}
