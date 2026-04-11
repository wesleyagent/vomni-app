/**
 * Currency utilities for multi-currency support (ILS + GBP).
 */

export function currencySymbol(currency: string): string {
  switch (currency?.toUpperCase()) {
    case "GBP": return "£";
    case "ILS": return "₪";
    case "USD": return "$";
    case "EUR": return "€";
    default:    return "₪"; // fallback for legacy / unset
  }
}

/** Format a monetary amount with the correct currency symbol */
export function formatAmount(amount: number, currency: string, opts?: { decimals?: number }): string {
  const sym = currencySymbol(currency);
  const decimals = opts?.decimals ?? 0;
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
