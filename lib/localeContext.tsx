"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Locale = "en" | "he";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isRTL: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  isRTL: false,
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale);
    // Persist to cookie (1 year)
    document.cookie = `vomni_locale=${newLocale}; path=/; max-age=31536000; samesite=lax`;
    // Update html attributes immediately
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === "he" ? "rtl" : "ltr";
  }

  // Sync html attributes whenever locale changes (including initial)
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isRTL: locale === "he" }}>
      {children}
    </LocaleContext.Provider>
  );
}
