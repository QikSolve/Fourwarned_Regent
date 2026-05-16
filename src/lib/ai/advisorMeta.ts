export type AdvisorMeta = {
  avatar: string;
  bio: string;
};

export const ADVISOR_META: Record<string, AdvisorMeta> = {
  steward: {
    avatar: '⚖️',
    bio: 'A careful administrator with deep knowledge of the kingdom\'s granaries and supply chains. Aldric prizes stability above all and distrusts hasty decisions.',
  },
  marshal: {
    avatar: '⚔️',
    bio: 'A veteran soldier who has defended the frontier for two decades. Garrett is direct, tactical, and believes security is the foundation of prosperity.',
  },
  merchant: {
    avatar: '🪙',
    bio: 'A shrewd trade envoy who built her reputation in Blackwater\'s markets. Lyra sees every problem as an opportunity and every restriction as a loss.',
  },
  governor: {
    avatar: '📜',
    bio: 'A seasoned administrator who has governed three regions. Elric understands regional politics deeply and champions local governance over central mandates.',
  },
};
