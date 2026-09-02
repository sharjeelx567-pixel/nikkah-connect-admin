// Single source of truth for the product's brand name/tagline across the
// admin frontend. Every genuine branding reference (sidebar, login page,
// page titles, generated message text, etc.) must import these constants
// rather than hardcoding the brand string directly, so a future rebrand
// only requires changing the env var (or these fallback defaults).
//
// APP_NAME is the primary application name — use it everywhere the product
// is referred to by name. APP_BRAND_PHRASE is the secondary product phrase
// ("Wud Marry") — use it only where a longer brand phrase naturally fits
// (e.g. a product description), never as a stand-in for the app name
// itself. The official consumer-facing tagline ("Find your forever,
// halal.") belongs to the Flutter app's branding, not this internal staff
// console, so it has no equivalent constant here.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Wud';
export const APP_BRAND_PHRASE = process.env.NEXT_PUBLIC_APP_BRAND_PHRASE || 'Wud Marry';
