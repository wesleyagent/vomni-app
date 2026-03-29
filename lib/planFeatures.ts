export const PLAN_FEATURES = {
  starter: {
    name: 'Starter',
    price_monthly: 35,
    price_annual: 299,
    ai_insights: false,
    ai_replies: false,
    analytics: false,
    custom_number: false,
    weekly_reports: false,
    priority_support: false,
  },
  growth: {
    name: 'Growth',
    price_monthly: 79,
    price_annual: 699,
    ai_insights: true,
    ai_replies: true,
    analytics: true,
    custom_number: false,
    weekly_reports: true,
    priority_support: false,
  },
  pro: {
    name: 'Pro',
    price_monthly: 149,
    price_annual: 1499,
    ai_insights: true,
    ai_replies: true,
    analytics: true,
    custom_number: true,
    weekly_reports: true,
    priority_support: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_FEATURES;
export type PlanFeatureKey = keyof typeof PLAN_FEATURES.growth;

export function hasFeature(plan: string | null | undefined, feature: PlanFeatureKey): boolean {
  if (plan === 'trial_expired') return false; // Expired trial — no pro features
  const p = (plan ?? 'growth') as PlanName;
  return !!(PLAN_FEATURES[p]?.[feature] ?? false);
}


export function getPlanName(plan: string | null | undefined): string {
  const p = (plan ?? 'growth') as PlanName;
  return PLAN_FEATURES[p]?.name ?? 'Growth';
}

export function getUpgradePlan(feature: PlanFeatureKey): PlanName {
  if (PLAN_FEATURES.starter[feature]) return 'starter';
  if (PLAN_FEATURES.growth[feature]) return 'growth';
  return 'pro';
}
