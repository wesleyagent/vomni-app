export function localeFromCountry(countryCode: string): { locale: string; currency: string } {
  const map: Record<string, { locale: string; currency: string }> = {
    IL: { locale: 'he', currency: 'ILS' },
    GB: { locale: 'en', currency: 'GBP' },
    US: { locale: 'en', currency: 'USD' },
    AU: { locale: 'en', currency: 'AUD' },
    CA: { locale: 'en', currency: 'CAD' },
    NZ: { locale: 'en', currency: 'NZD' },
    IE: { locale: 'en', currency: 'EUR' },
    DE: { locale: 'en', currency: 'EUR' },
    FR: { locale: 'en', currency: 'EUR' },
    ES: { locale: 'en', currency: 'EUR' },
    IT: { locale: 'en', currency: 'EUR' },
    NL: { locale: 'en', currency: 'EUR' },
    BE: { locale: 'en', currency: 'EUR' },
    AT: { locale: 'en', currency: 'EUR' },
    CH: { locale: 'en', currency: 'CHF' },
    SE: { locale: 'en', currency: 'SEK' },
    NO: { locale: 'en', currency: 'NOK' },
    DK: { locale: 'en', currency: 'DKK' },
    AE: { locale: 'en', currency: 'AED' },
    SA: { locale: 'en', currency: 'SAR' },
    SG: { locale: 'en', currency: 'SGD' },
    IN: { locale: 'en', currency: 'INR' },
    ZA: { locale: 'en', currency: 'ZAR' },
    NG: { locale: 'en', currency: 'NGN' },
  };
  return map[countryCode] ?? { locale: 'en', currency: 'USD' };
}
