export type Plan = "monthly" | "annual" | "starter" | "growth" | "pro";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  googleReviewLink: string;
  logo?: string;
  brandColor: string;
  plan: Plan;
  forwardingEmail: string;
  smsTemplate: string;
  reviewRequestDelay: number; // hours
  quietHoursStart: number; // 22 = 10pm
  quietHoursEnd: number;   // 8 = 8am
  notifyOnNegative: boolean;
  notifyEmail: string;
  onboardingComplete: boolean;
  onboardingSteps: boolean[];
  createdAt: string;
  timezone: string;
}

export type ReviewRequestStatus =
  | "scheduled"
  | "sent"
  | "sms_sent"
  | "opened"
  | "form_opened"
  | "form_submitted"
  | "clicked"
  | "submitted"
  | "redirected"
  | "redirected_to_google"
  | "reviewed_positive"
  | "reviewed_negative"
  | "private_feedback"
  | "private_feedback_from_positive"
  | "pending"
  | "failed"
  | "opted_out";

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  bookingDate: string;
  bookingTime: string;
  service: string;
  staffMember: string;
  location?: string;
  rawEmail?: string;
  parsingConfidence: number; // 0-100
  parseStatus: "success" | "partial" | "failed";
  reviewRequestStatus: ReviewRequestStatus;
  reviewRequestSentAt?: string;
  reviewRequestOpenedAt?: string;
  reviewRequestClickedAt?: string;
  rating?: number;
  redirectedToGoogle?: boolean;
  redirectedAt?: string;
  feedbackId?: string;
  createdAt: string;
  optedOut?: boolean;
}

export type FeedbackStatus = "new" | "in_progress" | "resolved";

export interface FeedbackItem {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  rating: number;
  feedback: string;
  status: FeedbackStatus;
  aiSuggestedReply?: string;
  aiReplies?: { apologetic: string; professional: string; personal: string };
  internalNotes?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  sentAt?: string;
}

export interface AnalyticsData {
  month: string;
  sent: number;
  completed: number;
  redirected: number;
  negativeCaught: number;
  avgRating: number;
}

export interface ParsedEmail {
  id: string;
  businessId: string;
  rawEmail: string;
  parsedData?: Partial<Customer>;
  confidence: number;
  status: "success" | "partial" | "failed";
  failureReason?: string;
  createdAt: string;
}

export interface AdminSignup {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  plan: Plan;
  signupTimestamp: string;
  onboardingComplete: boolean;
}

export interface DemoAccount {
  type: "kings-cuts" | "bella-vista";
  business: Business;
  customers: Customer[];
  feedback: FeedbackItem[];
  analytics: AnalyticsData[];
}
