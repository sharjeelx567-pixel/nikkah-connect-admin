// Single source of truth for the product's brand name/tagline across the
// admin backend (push notification text, generated messages, seeded legal
// content, etc.). Import these constants rather than hardcoding the brand
// string directly, so a future rebrand only requires changing the env var
// (or these fallback defaults) — not searching every controller.
export const APP_NAME = process.env.APP_NAME || 'Wud';
export const APP_BRAND_PHRASE = process.env.APP_BRAND_PHRASE || 'Wud marry you';
