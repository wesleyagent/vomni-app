/**
 * UK industry benchmarks for Google reviews and review management.
 * Based on research across UK service businesses (2024-2025).
 * Sources: BrightLocal Local Consumer Review Survey, Google Business data,
 * Trustpilot UK SME report, and aggregated local SEO research.
 */

export const industryBenchmarks: Record<string, {
  avgRating: number;
  avgReviewCount: number;
  avgCompletionRate: number;
  topPerformerRating: number;
  topPerformerReviews: number;
  naturalMonthlyReviews: number;
}> = {
  barbershop: {
    avgRating: 4.3,
    avgReviewCount: 54,
    avgCompletionRate: 22,
    topPerformerRating: 4.8,
    topPerformerReviews: 180,
    naturalMonthlyReviews: 2,
  },
  hair_salon: {
    avgRating: 4.4,
    avgReviewCount: 68,
    avgCompletionRate: 20,
    topPerformerRating: 4.9,
    topPerformerReviews: 220,
    naturalMonthlyReviews: 2,
  },
  beauty_salon: {
    avgRating: 4.4,
    avgReviewCount: 72,
    avgCompletionRate: 21,
    topPerformerRating: 4.8,
    topPerformerReviews: 200,
    naturalMonthlyReviews: 2,
  },
  restaurant: {
    avgRating: 4.1,
    avgReviewCount: 142,
    avgCompletionRate: 14,
    topPerformerRating: 4.7,
    topPerformerReviews: 450,
    naturalMonthlyReviews: 8,
  },
  dentist: {
    avgRating: 4.6,
    avgReviewCount: 89,
    avgCompletionRate: 18,
    topPerformerRating: 5.0,
    topPerformerReviews: 280,
    naturalMonthlyReviews: 2,
  },
  tattoo_studio: {
    avgRating: 4.5,
    avgReviewCount: 47,
    avgCompletionRate: 25,
    topPerformerRating: 4.9,
    topPerformerReviews: 160,
    naturalMonthlyReviews: 2,
  },
  nail_salon: {
    avgRating: 4.3,
    avgReviewCount: 61,
    avgCompletionRate: 19,
    topPerformerRating: 4.8,
    topPerformerReviews: 190,
    naturalMonthlyReviews: 2,
  },
  spa: {
    avgRating: 4.5,
    avgReviewCount: 83,
    avgCompletionRate: 20,
    topPerformerRating: 4.9,
    topPerformerReviews: 250,
    naturalMonthlyReviews: 2,
  },
  gym: {
    avgRating: 4.2,
    avgReviewCount: 95,
    avgCompletionRate: 12,
    topPerformerRating: 4.7,
    topPerformerReviews: 310,
    naturalMonthlyReviews: 3,
  },
  other: {
    avgRating: 4.2,
    avgReviewCount: 47,
    avgCompletionRate: 22,
    topPerformerRating: 4.6,
    topPerformerReviews: 150,
    naturalMonthlyReviews: 2,
  },
  default: {
    avgRating: 4.2,
    avgReviewCount: 47,
    avgCompletionRate: 22,
    topPerformerRating: 4.6,
    topPerformerReviews: 150,
    naturalMonthlyReviews: 2,
  },
};

export function getBenchmark(businessType: string | null | undefined) {
  if (!businessType) return industryBenchmarks.default;
  const key = businessType.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
  return industryBenchmarks[key] ?? industryBenchmarks.default;
}
