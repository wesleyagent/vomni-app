"use client";

import type { Business, Customer, FeedbackItem, ParsedEmail } from "@/types";

const KEYS = {
  BUSINESS: "vomni_business",
  CUSTOMERS: "vomni_customers",
  FEEDBACK: "vomni_feedback",
  PARSED_EMAILS: "vomni_parsed_emails",
  ADMIN_SIGNUPS: "vomni_admin_signups",
};

function get<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Business
export function getBusiness(): Business | null {
  return get<Business>(KEYS.BUSINESS);
}

export function saveBusiness(business: Business): void {
  set(KEYS.BUSINESS, business);
}

export function updateBusiness(updates: Partial<Business>): void {
  const current = getBusiness();
  if (current) {
    set(KEYS.BUSINESS, { ...current, ...updates });
  }
}

// Customers
export function getCustomers(): Customer[] {
  return get<Customer[]>(KEYS.CUSTOMERS) ?? [];
}

export function saveCustomer(customer: Customer): void {
  const customers = getCustomers();
  const existing = customers.findIndex((c) => c.id === customer.id);
  if (existing >= 0) {
    customers[existing] = customer;
  } else {
    customers.push(customer);
  }
  set(KEYS.CUSTOMERS, customers);
}

export function updateCustomer(id: string, updates: Partial<Customer>): void {
  const customers = getCustomers();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx >= 0) {
    customers[idx] = { ...customers[idx], ...updates };
    set(KEYS.CUSTOMERS, customers);
  }
}

// Feedback
export function getFeedback(): FeedbackItem[] {
  return get<FeedbackItem[]>(KEYS.FEEDBACK) ?? [];
}

export function saveFeedback(item: FeedbackItem): void {
  const items = getFeedback();
  const existing = items.findIndex((f) => f.id === item.id);
  if (existing >= 0) {
    items[existing] = item;
  } else {
    items.push(item);
  }
  set(KEYS.FEEDBACK, items);
}

export function updateFeedback(id: string, updates: Partial<FeedbackItem>): void {
  const items = getFeedback();
  const idx = items.findIndex((f) => f.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...updates };
    set(KEYS.FEEDBACK, items);
  }
}

// Parsed emails (parse failures queue)
export function getParsedEmails(): ParsedEmail[] {
  return get<ParsedEmail[]>(KEYS.PARSED_EMAILS) ?? [];
}

export function saveParsedEmail(parsed: ParsedEmail): void {
  const items = getParsedEmails();
  items.push(parsed);
  set(KEYS.PARSED_EMAILS, items);
}

// Admin signups
export function getAdminSignups(): unknown[] {
  return get<unknown[]>(KEYS.ADMIN_SIGNUPS) ?? [];
}

export function saveAdminSignup(signup: unknown): void {
  const signups = getAdminSignups();
  signups.push(signup);
  set(KEYS.ADMIN_SIGNUPS, signups);
}

// Generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// Generate forwarding email address
export function generateForwardingEmail(businessName: string): string {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${slug}-${rand}@bookings.vomni.app`;
}

// Stats helpers
export function getThisMonthStats(customers: Customer[]) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonth = customers.filter(
    (c) => new Date(c.createdAt) >= startOfMonth
  );

  const sent = thisMonth.filter((c) =>
    ["sent", "opened", "clicked", "submitted", "redirected", "private_feedback"].includes(
      c.reviewRequestStatus
    )
  ).length;

  const completed = thisMonth.filter((c) =>
    ["submitted", "redirected", "private_feedback"].includes(c.reviewRequestStatus)
  ).length;

  const redirected = thisMonth.filter((c) => c.redirectedToGoogle).length;

  const negativeCaught = thisMonth.filter(
    (c) => c.reviewRequestStatus === "private_feedback"
  ).length;

  const rated = thisMonth.filter((c) => c.rating !== undefined);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, c) => sum + (c.rating ?? 0), 0) / rated.length
      : 0;

  const completionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0;

  return { sent, completed, redirected, negativeCaught, avgRating, completionRate };
}
