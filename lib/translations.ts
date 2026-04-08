export type Locale = "en" | "he";

const translations = {
  en: {
    // Sign-up form
    "signup.title": "Start Getting More Google Reviews",
    "signup.payment_confirmed": "✓ Payment confirmed — set up your account below",
    "signup.trial_confirmed": "✓ 14-day free trial — set up your account below",
    "signup.business_name": "Business name",
    "signup.owner_name": "Owner name",
    "signup.email": "Email",
    "signup.phone": "Phone",
    "signup.country": "Country",
    "signup.country_placeholder": "Search for your country…",
    "signup.password": "Password",
    "signup.password_placeholder": "Create a password (min 8 chars)",
    "signup.confirm_password": "Confirm password",
    "signup.confirm_password_placeholder": "Re-enter your password",
    "signup.passwords_mismatch": "Passwords do not match",
    "signup.choose_plan": "Choose your plan",
    "signup.submit": "Create Your Account",
    "signup.submitting": "Creating…",
    "signup.terms_prefix": "By creating an account you agree to our",
    "signup.terms": "Terms of Service",
    "signup.privacy": "Privacy Policy",
    "signup.aup": "Acceptable Use Policy",
    "signup.already_have_account": "Already have an account?",
    "signup.sign_in": "Sign in",
    // Plans
    "plan.starter": "Starter",
    "plan.starter_desc": "WhatsApp review requests after every visit",
    "plan.growth": "Growth",
    "plan.growth_desc": "Follow-ups, lapsed customer re-engagement, full analytics",
    "plan.pro": "Pro ★",
    "plan.pro_desc": "Dedicated WhatsApp number, same-day support",
    "plan.most_popular": "MOST POPULAR",
    "plan.trial_title": "Pro Plan — 14-day free trial",
    "plan.trial_desc": "Full access to all features. No payment required.",
    // General
    "general.view_plans": "View Plans →",
    "general.choose_plan_first": "Choose your plan first",
    "general.choose_plan_desc":
      "Select a plan on our pricing page to unlock account setup. It only takes 2 minutes.",
    // Payment gate
    "gate.title": "Vomni",
  },
  he: {
    // Sign-up form
    "signup.title": "התחל לקבל יותר ביקורות ב-Google",
    "signup.payment_confirmed": "✓ התשלום אושר — הגדר את החשבון שלך למטה",
    "signup.trial_confirmed": "✓ ניסיון חינם לـ 14 יום — הגדר את החשבון שלך למטה",
    "signup.business_name": "שם העסק",
    "signup.owner_name": "שם הבעלים",
    "signup.email": "כתובת מייל",
    "signup.phone": "טלפון",
    "signup.country": "מדינה",
    "signup.country_placeholder": "חפש את המדינה שלך…",
    "signup.password": "סיסמה",
    "signup.password_placeholder": "צור סיסמה (מינימום 8 תווים)",
    "signup.confirm_password": "אימות סיסמה",
    "signup.confirm_password_placeholder": "הזן שוב את הסיסמה",
    "signup.passwords_mismatch": "הסיסמאות אינן תואמות",
    "signup.choose_plan": "בחר תוכנית",
    "signup.submit": "צור חשבון",
    "signup.submitting": "יוצר…",
    "signup.terms_prefix": "ביצירת חשבון אתה מסכים ל",
    "signup.terms": "תנאי השירות",
    "signup.privacy": "מדיניות הפרטיות",
    "signup.aup": "מדיניות השימוש המקובל",
    "signup.already_have_account": "כבר יש לך חשבון?",
    "signup.sign_in": "התחבר",
    // Plans
    "plan.starter": "סטארטר",
    "plan.starter_desc": "בקשות ביקורת בוואטסאפ אחרי כל ביקור",
    "plan.growth": "צמיחה",
    "plan.growth_desc": "מעקב, החזרת לקוחות רדומים, אנליטיקס מלא",
    "plan.pro": "פרו ★",
    "plan.pro_desc": "מספר וואטסאפ ייעודי, תמיכה ביום עסקים",
    "plan.most_popular": "הכי פופולרי",
    "plan.trial_title": "תוכנית פרו — ניסיון חינם לـ 14 יום",
    "plan.trial_desc": "גישה מלאה לכל התכונות. ללא תשלום.",
    // General
    "general.view_plans": "הצג תוכניות ←",
    "general.choose_plan_first": "בחר תחילה תוכנית",
    "general.choose_plan_desc":
      "בחר תוכנית בדף התמחור שלנו כדי לפתוח את הגדרת החשבון. זה לוקח רק 2 דקות.",
    // Payment gate
    "gate.title": "Vomni",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, locale: Locale): string {
  const dict = translations[locale] as Record<string, string>;
  return dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
}
