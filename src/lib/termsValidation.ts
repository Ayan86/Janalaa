// Production-grade Reserved Terms and Prohibited Terms Validation Engine for JANALA OTT

// 1. Reserved Slugs and System Keywords
// These keywords cannot be used as URL slugs because they collide with application routing,
// public pages, internal APIs, CDNs, or system namespaces.
export const RESERVED_SLUGS_CATEGORIES = {
  routing: [
    'admin',
    'api',
    'auth',
    'login',
    'logout',
    'signin',
    'signout',
    'register',
    'signup',
    'portal',
    'dashboard',
    'settings',
    'profile',
    'account',
    'user',
    'users',
    'team',
    'session',
    'oauth',
    'callback',
    'verify',
    'reset-password',
    'forgot-password',
  ],
  content: [
    'movie',
    'movies',
    'series',
    'show',
    'shows',
    'tv',
    'web-series',
    'episode',
    'episodes',
    'season',
    'seasons',
    'genre',
    'genres',
    'category',
    'categories',
    'collection',
    'collections',
    'catalog',
    'library',
    'browse',
    'search',
    'explore',
    'discover',
    'feed',
    'trending',
    'featured',
    'latest',
    'popular',
    'top-rated',
    'watch',
    'player',
    'live',
    'stream',
    'streams',
    'channel',
    'channels',
    'trailer',
    'trailers',
  ],
  media_infrastructure: [
    'media',
    'video',
    'videos',
    'audio',
    'subtitles',
    'assets',
    'static',
    'public',
    'uploads',
    'upload',
    'download',
    'downloads',
    'cdn',
    'storage',
    'r2',
    's3',
    'bucket',
    'hls',
    'dash',
    'manifest',
    'playlist',
    'drm',
    'fairplay',
    'widevine',
    'keys',
    'transcode',
  ],
  business_billing: [
    'billing',
    'subscription',
    'subscriptions',
    'plans',
    'pricing',
    'pay',
    'payment',
    'payments',
    'checkout',
    'cart',
    'invoice',
    'invoices',
    'receipt',
    'receipts',
    'refund',
    'order',
    'orders',
    'wallet',
  ],
  legal_platform: [
    'terms',
    'terms-of-service',
    'privacy',
    'privacy-policy',
    'dmca',
    'copyright',
    'legal',
    'about',
    'about-us',
    'contact',
    'contact-us',
    'help',
    'support',
    'faq',
    'status',
    'health',
    'healthz',
    'metrics',
    'telemetry',
    'analytics',
  ],
  system_technical: [
    'root',
    'app',
    'home',
    'index',
    'default',
    'null',
    'undefined',
    'true',
    'false',
    'system',
    'janala',
    'webhook',
    'webhooks',
    'cron',
    'bot',
    'robots',
    'robots.txt',
    'sitemap',
    'sitemap.xml',
    'favicon',
    'favicon.ico',
    'config',
    'setup',
    'install',
    'test',
    'testing',
    'dev',
    'stage',
    'prod',
    'new',
    'create',
    'edit',
    'update',
    'delete',
    'remove',
    'destroy',
    'archive',
    'restore',
    'view',
    'list',
  ],
};

// Flattened set of reserved slugs
export const ALL_RESERVED_SLUGS = new Set<string>(
  Object.values(RESERVED_SLUGS_CATEGORIES).flat().map((s) => s.toLowerCase().trim())
);

// 2. Prohibited Content Terms
// Words and phrases prohibited in content metadata (titles, slugs, descriptions)
// according to OTT compliance standards, censorship guidelines, and broadcasting rules.
export const PROHIBITED_TERMS_CATEGORIES = {
  profanity_obscenity: [
    'fuck',
    'fucking',
    'fucker',
    'motherfucker',
    'shit',
    'bullshit',
    'bitch',
    'bastard',
    'cunt',
    'dick',
    'cock',
    'pussy',
    'asshole',
    'ass',
    'whore',
    'slut',
    'wanker',
    'twat',
  ],
  adult_explicit: [
    'porn',
    'porno',
    'pornography',
    'xxx',
    'nude',
    'nudity',
    'hentai',
    'erotic',
    'fetish',
    'gangbang',
    'blowjob',
    'hardcore-sex',
    'pedophile',
    'pedophilia',
    'incest',
  ],
  hate_extremism_violence: [
    'terrorist',
    'terrorism',
    'isis',
    'alqaeda',
    'taliban',
    'jihadist',
    'nazi',
    'neo-nazi',
    'hitler',
    'white-supremacy',
    'genocide',
    'ethnic-cleansing',
    'kill-all',
    'suicide-bomb',
    'lynching',
    'rapist',
  ],
  piracy_unauthorized: [
    'pirated',
    'piracy',
    'torrent',
    'torrentz',
    'camrip',
    'hdcam',
    'warez',
    'crack',
    'cracked',
    'keygen',
    'rip-dvd',
    'leaked-movie',
    'illegal-stream',
    'stolen-copy',
  ],
  fraud_malicious: [
    'scam',
    'phishing',
    'malware',
    'credit-card-fraud',
    'money-laundering',
    'counterfeit',
  ],
};

export const ALL_PROHIBITED_TERMS = new Set<string>(
  Object.values(PROHIBITED_TERMS_CATEGORIES).flat().map((t) => t.toLowerCase().trim())
);

// Dynamic tenant custom terms store
const customReservedSlugs = new Set<string>();
const customProhibitedTerms = new Set<string>();

export function getCustomTerms() {
  return {
    reserved: Array.from(customReservedSlugs),
    prohibited: Array.from(customProhibitedTerms),
  };
}

export function addCustomTerm(term: string, type: 'reserved' | 'prohibited') {
  const normalized = term.toLowerCase().trim();
  if (!normalized) return false;
  if (type === 'reserved') {
    customReservedSlugs.add(normalized);
  } else {
    customProhibitedTerms.add(normalized);
  }
  return true;
}

export function removeCustomTerm(term: string, type: 'reserved' | 'prohibited') {
  const normalized = term.toLowerCase().trim();
  if (type === 'reserved') {
    return customReservedSlugs.delete(normalized);
  } else {
    return customProhibitedTerms.delete(normalized);
  }
}

// 3. Validation Functions

export interface SlugValidationResult {
  valid: boolean;
  value: string;
  isReserved: boolean;
  reservedTerm?: string;
  hasProhibited: boolean;
  prohibitedTerms: string[];
  errors: string[];
  suggestions: string[];
}

export function validateSlug(rawSlug: string): SlugValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  const prohibitedFound: string[] = [];

  const slug = (rawSlug || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    return {
      valid: false,
      value: '',
      isReserved: false,
      hasProhibited: false,
      prohibitedTerms: [],
      errors: ['Slug cannot be empty'],
      suggestions: ['custom-movie-title'],
    };
  }

  // Length check
  if (slug.length < 2) {
    errors.push('Slug must be at least 2 characters long');
  }
  if (slug.length > 100) {
    errors.push('Slug must not exceed 100 characters');
  }

  // Format check: valid kebab-case
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    errors.push('Slug can only contain lowercase alphanumeric characters and single hyphens (no consecutive hyphens)');
  }

  // Check Reserved Terms
  let isReserved = false;
  let reservedTermMatched: string | undefined = undefined;

  if (ALL_RESERVED_SLUGS.has(slug) || customReservedSlugs.has(slug)) {
    isReserved = true;
    reservedTermMatched = slug;
    errors.push(`'${slug}' is a reserved system keyword and cannot be used as a public content slug.`);
    suggestions.push(`${slug}-movie`);
    suggestions.push(`${slug}-stream`);
    suggestions.push(`janala-${slug}`);
  }

  // Check for prohibited words (exact, as token, or surrounded by hyphens)
  const tokens = slug.split('-');
  for (const token of tokens) {
    if (ALL_PROHIBITED_TERMS.has(token) || customProhibitedTerms.has(token)) {
      if (!prohibitedFound.includes(token)) {
        prohibitedFound.push(token);
      }
    }
  }

  // Check multi-word prohibited terms
  const allProhibited = [...Array.from(ALL_PROHIBITED_TERMS), ...Array.from(customProhibitedTerms)];
  for (const term of allProhibited) {
    const termHyphenated = term.replace(/\s+/g, '-');
    if (slug === termHyphenated || slug.includes(`-${termHyphenated}-`) || slug.startsWith(`${termHyphenated}-`) || slug.endsWith(`-${termHyphenated}`)) {
      if (!prohibitedFound.includes(term)) {
        prohibitedFound.push(term);
      }
    }
  }

  if (prohibitedFound.length > 0) {
    errors.push(
      `Slug contains prohibited term(s): [${prohibitedFound.join(', ')}] which violate OTT broadcast and compliance guidelines.`
    );
  }

  return {
    valid: errors.length === 0,
    value: slug,
    isReserved,
    reservedTerm: reservedTermMatched,
    hasProhibited: prohibitedFound.length > 0,
    prohibitedTerms: prohibitedFound,
    errors,
    suggestions,
  };
}

export interface TextComplianceResult {
  valid: boolean;
  fieldName: string;
  hasProhibited: boolean;
  prohibitedTerms: string[];
  error?: string;
}

export function validateTextCompliance(text: string, fieldName: string = 'text'): TextComplianceResult {
  if (!text || typeof text !== 'string') {
    return {
      valid: true,
      fieldName,
      hasProhibited: false,
      prohibitedTerms: [],
    };
  }

  const normalized = text.toLowerCase();
  const found: string[] = [];

  const allProhibited = [...Array.from(ALL_PROHIBITED_TERMS), ...Array.from(customProhibitedTerms)];

  for (const term of allProhibited) {
    // Word-boundary match to avoid false positives (e.g., 'classic' matching 'ass')
    const regex = new RegExp(`\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(normalized)) {
      if (!found.includes(term)) {
        found.push(term);
      }
    }
  }

  const valid = found.length === 0;
  return {
    valid,
    fieldName,
    hasProhibited: !valid,
    prohibitedTerms: found,
    error: valid
      ? undefined
      : `${fieldName} contains prohibited compliance term(s): [${found.join(', ')}]. Please remove prohibited terms before publishing.`,
  };
}

export interface ContentPayloadCheckResult {
  valid: boolean;
  slugResult?: SlugValidationResult;
  titleResult?: TextComplianceResult;
  shortDescResult?: TextComplianceResult;
  fullDescResult?: TextComplianceResult;
  errors: string[];
}

export function validateContentPayload(payload: {
  title?: string;
  slug?: string;
  shortDescription?: string;
  fullDescription?: string;
}): ContentPayloadCheckResult {
  const errors: string[] = [];

  let titleResult: TextComplianceResult | undefined;
  if (payload.title) {
    titleResult = validateTextCompliance(payload.title, 'Title');
    if (!titleResult.valid && titleResult.error) {
      errors.push(titleResult.error);
    }
  }

  let slugResult: SlugValidationResult | undefined;
  if (payload.slug) {
    slugResult = validateSlug(payload.slug);
    if (!slugResult.valid) {
      errors.push(...slugResult.errors);
    }
  }

  let shortDescResult: TextComplianceResult | undefined;
  if (payload.shortDescription) {
    shortDescResult = validateTextCompliance(payload.shortDescription, 'Short Description');
    if (!shortDescResult.valid && shortDescResult.error) {
      errors.push(shortDescResult.error);
    }
  }

  let fullDescResult: TextComplianceResult | undefined;
  if (payload.fullDescription) {
    fullDescResult = validateTextCompliance(payload.fullDescription, 'Full Synopsis');
    if (!fullDescResult.valid && fullDescResult.error) {
      errors.push(fullDescResult.error);
    }
  }

  return {
    valid: errors.length === 0,
    slugResult,
    titleResult,
    shortDescResult,
    fullDescResult,
    errors,
  };
}

// Safe Slug Generator: converts a title into a sanitized, non-reserved slug
export function generateSafeSlug(title: string, suffix?: string | number): string {
  let base = (title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base) {
    base = 'content';
  }

  // If base happens to be a reserved term, append a contextual suffix
  if (ALL_RESERVED_SLUGS.has(base) || customReservedSlugs.has(base)) {
    base = `${base}-film`;
  }

  if (suffix !== undefined && suffix !== null && String(suffix).length > 0) {
    base = `${base}-${suffix}`;
  }

  return base;
}
