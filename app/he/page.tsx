/**
 * /he — Hebrew homepage entry point.
 *
 * The middleware sets the `vomni_locale=he` cookie and the `x-locale: he`
 * header whenever this path is hit, so the root layout automatically applies
 * lang="he" and dir="rtl" before hydration.
 *
 * This page simply renders the same homepage component so the content is
 * identical to `/` — only the locale context differs.
 */
export { default } from "../page";
