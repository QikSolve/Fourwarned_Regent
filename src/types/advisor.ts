export type AdvisorId = 'steward' | 'marshal' | 'merchant' | 'governor';

export type AdvisorStatus = 'Active' | 'Concerned' | 'Critical';

export type Advisor = {
  id: AdvisorId;
  name: string;
  title: string;
  region: string;
  competence: number;
  loyalty: number;
  stress: number;
  bias: string;
  ambition: number;
  authority: number;
  status: AdvisorStatus;
  assignedProcedures: string[];
  maxProcedures: number;
};

export type AdvisorRecommendation = {
  advisor: string;
  concern: string;
  recommendation: string;
  risk: string;
};
