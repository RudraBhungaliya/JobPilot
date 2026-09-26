export const GREENHOUSE_COMPANIES_MNC = [
  "stripe",
  "figma",
  "airbnb",
  "pinterest",
  "cloudflare",
  "github",
  "databricks",
  "doordash",
  "instacart",
  "automattic",
  "discord",
  "reddit",
  "gitlab",
  "elastic",
  "mongodb",
  "twilio",
  "okta",
  "hashicorp",
  "microsoft",
  "google",
  "amazon",
  "meta",
  "apple",
  "adobe",
  "cisco",
  "ibm",
  "oracle",
  "sap",
  "dell",
  "vmware",
  "nvidia",
  "intel",
  "atlassian",
  "servicenow",
  "salesforce",
  "schneider-electric",
  "siemens",
  "hubspot",
  "dropbox",
  "shopify",
  "uber",
  "lyft",
  "slack",
  "asana",
  "notion",
  "intercom",
  "amplitude",
  "mixpanel",
  "sentry",
  "datadog",
  "newrelic",
  "grafana",
  "snowflake",
  "palantir",
  "roblox",
  "unity",
  "square",
  "block",
  "marvel",
  "nokia",
  "ericsson",
  "samsung",
  "lg",
  "byd",
  "toyota",
  "honda",
  "netapp",
  "splunk",
  "qualtrics",
  "zendesk",
  "zoominfo",
  "cloudera",
  "hortonworks",
  "confluent",
] as const;

export const GREENHOUSE_COMPANIES_SEMI_MNC_INDIA = [
  "zeta",
  "postman",
  "freshworks",
  "zoho",
  "chargebee",
  "gainsight",
  "razorpay",
  "phonepe",
  "swiggy",
  "zomato",
  "cred",
  "groww",
  "zerodha",
  "dream11",
  "byjus",
  "unacademy",
  "upstox",
  "meesho",
  "myntra",
  "ltimindtree",
  "mphasis",
  "persistent",
  "citiustech",
  "browserstack",
  "clevertap",
  "inmobi",
  "thoughtworks",
  "hasura",
  "slice",
  "sharechat",
  "moj",
  "rategain",
  "fareportal",
  "sofmen",
  "indiagold",
  "jupiter-money",
  "m2p-fintech",
  "fampay",
  "niyo",
  "onemoney",
  "setu",
  "juspay",
  "billdesk",
  "paytm",
  "mobikwik",
  "freecharge",
  "airtel-payments-bank",
  "payu",
  "instamojo",
  "ccavenue",
  "razorpayx",
  "paynearby",
  "ditto",
  "plum",
  "loop-health",
  "onsurity",
  "kenko-health",
  "fractal",
  "tredence",
  "absolutdata",
  "mu-sigma",
  "latentview",
  "accenture-song",
  "ibm-kyndryl",
] as const;

export const LEVER_COMPANIES_MNC = [
  "netflix",
  "spotify",
  "canva",
  "palantir",
  "twitch",
  "atlassian",
  "airtable",
  "stripe",
  "duolingo",
  "figma",
  "tesla",
  "spacex",
  "rivian",
  "linkedin",
  "lyft",
  "zoom",
  "slack",
  "robinhood",
  "coinbase",
  "notion",
  "asana",
  "intercom",
  "hubspot",
  "dropbox",
  "airbnb",
  "pinterest",
  "uber",
  "shopify",
  "snap",
  "twitter",
  "x",
  "wework",
  "tempus",
  "tempuslabs",
  "coursera",
  "udemy",
  "datadog",
] as const;

export const LEVER_COMPANIES_SEMI_MNC_INDIA = [
  "upstox",
  "groww",
  "phonepe",
  "zomato",
  "dream11",
  "sharechat",
  "moj",
  "unacademy",
  "byjus",
  "swiggy",
  "myntra",
  "flipkart",
  "cred",
  "razorpay",
  "meesho",
  "zoho",
  "chargebee",
  "freshworks",
  "postman",
  "zeta",
  "browserstack",
  "gainsight",
  "paytm",
  "mobikwik",
  "freecharge",
  "lenskart",
  "blinkit",
  "grofers-blinkit",
  "bigbasket",
  "zepto",
  "swiggy-instamart",
  "rapido",
  "ola",
  "uber-india",
  "cars24",
  "spinny",
  "magicpin",
  "mamaearth",
  "sugar-cosmetics",
  "boAt",
  "noise",
  "crossbeats",
  "ptron",
  "boult",
  "poco",
  "realme",
  "iqoo",
  "infinix",
  "xiaomi-india",
  "samsung-india",
  "oneplus-india",
] as const;

export const ASHBY_COMPANIES_MNC = [
  "openai",
  "linear",
  "ramp",
  "retool",
  "notion",
  "vercel",
  "cursor",
  "supabase",
  "sentry",
  "resend",
  "posthog",
  "glean",
  "monzo",
  "anthropic",
  "stripe",
  "figma",
  "datadog",
  "airbnb",
  "shopify",
  "atlassian",
  "slack",
  "asana",
  "intercom",
  "dropbox",
  "hubspot",
  "zapier",
  "mercury",
  "brex",
  "clerk",
] as const;

export type WorkdayTier = 'MNC' | 'SEMI_MNC' | 'STARTUP';

export interface WorkdayTenant {
  slug: string;
  company: string;
  hiresInIndia: boolean;
  tier: WorkdayTier;
  board?: string;
  tenant?: string;
}

export const WORKDAY_TENANTS: WorkdayTenant[] = [
  { slug: "accenture", company: "Accenture", hiresInIndia: true, tier: "MNC", tenant: "accenture" },
  { slug: "deloitte", company: "Deloitte", hiresInIndia: true, tier: "MNC", tenant: "deloitte" },
  { slug: "ey", company: "Ernst & Young", hiresInIndia: true, tier: "MNC", tenant: "ey" },
  { slug: "pwc", company: "PricewaterhouseCoopers", hiresInIndia: true, tier: "MNC", tenant: "pwc" },
  { slug: "kpmg", company: "KPMG", hiresInIndia: true, tier: "MNC", tenant: "kpmg" },
  { slug: "cognizant", company: "Cognizant", hiresInIndia: true, tier: "MNC", tenant: "cognizant" },
  { slug: "capgemini", company: "Capgemini", hiresInIndia: true, tier: "MNC", tenant: "capgemini" },
  { slug: "tcs", company: "Tata Consultancy Services", hiresInIndia: true, tier: "MNC", tenant: "tcs" },
  { slug: "infosys", company: "Infosys", hiresInIndia: true, tier: "MNC", tenant: "infosys" },
  { slug: "wipro", company: "Wipro", hiresInIndia: true, tier: "MNC", tenant: "wipro" },
  { slug: "hcltech", company: "HCL Technologies", hiresInIndia: true, tier: "MNC", tenant: "hcltech" },
  { slug: "techmahindra", company: "Tech Mahindra", hiresInIndia: true, tier: "MNC", tenant: "techmahindra" },
  { slug: "ltimindtree", company: "LTIMindtree", hiresInIndia: true, tier: "MNC", tenant: "ltimindtree" },
  { slug: "mphasis", company: "Mphasis", hiresInIndia: true, tier: "MNC", tenant: "mphasis" },
  { slug: "flipkart", company: "Flipkart", hiresInIndia: true, tier: "MNC", tenant: "flipkart" },
  { slug: "amazon", company: "Amazon", hiresInIndia: true, tier: "MNC", tenant: "amazon" },
  { slug: "microsoft", company: "Microsoft", hiresInIndia: true, tier: "MNC", tenant: "microsoft" },
  { slug: "google", company: "Google", hiresInIndia: true, tier: "MNC", tenant: "google" },
  { slug: "jpmorgan", company: "JPMorgan Chase", hiresInIndia: true, tier: "MNC", tenant: "jpmorganchase" },
  { slug: "goldmansachs", company: "Goldman Sachs", hiresInIndia: true, tier: "MNC", tenant: "goldmansachs" },
  { slug: "morganstanley", company: "Morgan Stanley", hiresInIndia: true, tier: "MNC", tenant: "morganstanley" },
  { slug: "barclays", company: "Barclays", hiresInIndia: true, tier: "MNC", tenant: "barclays" },
  { slug: "hsbc", company: "HSBC", hiresInIndia: true, tier: "MNC", tenant: "hsbc" },
  { slug: "standardchartered", company: "Standard Chartered", hiresInIndia: true, tier: "MNC", tenant: "standardchartered" },
  { slug: "deutschebank", company: "Deutsche Bank", hiresInIndia: true, tier: "MNC", tenant: "deutschebank" },
  { slug: "citi", company: "Citi", hiresInIndia: true, tier: "MNC", tenant: "citi" },
  { slug: "bankofamerica", company: "Bank of America", hiresInIndia: true, tier: "MNC", tenant: "bankofamerica" },
  { slug: "wellsfargo", company: "Wells Fargo", hiresInIndia: true, tier: "MNC", tenant: "wellsfargo" },
  { slug: "amex", company: "American Express", hiresInIndia: true, tier: "MNC", tenant: "americanexpress" },
  { slug: "visa", company: "Visa", hiresInIndia: true, tier: "MNC", tenant: "visa" },
  { slug: "mastercard", company: "Mastercard", hiresInIndia: true, tier: "MNC", tenant: "mastercard" },
  { slug: "paypal", company: "PayPal", hiresInIndia: true, tier: "MNC", tenant: "paypal" },
  { slug: "adobe", company: "Adobe", hiresInIndia: true, tier: "MNC", tenant: "adobe" },
  { slug: "salesforce", company: "Salesforce", hiresInIndia: true, tier: "MNC", tenant: "salesforce" },
  { slug: "sap", company: "SAP", hiresInIndia: true, tier: "MNC", tenant: "sap" },
  { slug: "oracle", company: "Oracle", hiresInIndia: true, tier: "MNC", tenant: "oracle" },
  { slug: "ibm", company: "IBM", hiresInIndia: true, tier: "MNC", tenant: "ibm" },
  { slug: "cisco", company: "Cisco", hiresInIndia: true, tier: "MNC", tenant: "cisco" },
  { slug: "dell", company: "Dell", hiresInIndia: true, tier: "MNC", tenant: "dell" },
  { slug: "vmware", company: "VMware", hiresInIndia: true, tier: "MNC", tenant: "vmware" },
  { slug: "intel", company: "Intel", hiresInIndia: true, tier: "MNC", tenant: "intel" },
  { slug: "nvidia", company: "NVIDIA", hiresInIndia: true, tier: "MNC", tenant: "nvidia" },
  { slug: "apple", company: "Apple", hiresInIndia: true, tier: "MNC", tenant: "apple" },
  { slug: "atlassian", company: "Atlassian", hiresInIndia: true, tier: "MNC", tenant: "atlassian" },
  { slug: "unilever", company: "Unilever", hiresInIndia: true, tier: "MNC", tenant: "unilever" },
  { slug: "pepsico", company: "PepsiCo", hiresInIndia: true, tier: "MNC", tenant: "pepsico" },
  { slug: "pg", company: "Procter & Gamble", hiresInIndia: true, tier: "MNC", tenant: "proctergamble" },
  { slug: "nestle", company: "Nestlé", hiresInIndia: true, tier: "MNC", tenant: "nestle" },
  { slug: "persistent", company: "Persistent Systems", hiresInIndia: true, tier: "SEMI_MNC", tenant: "persistent" },
  { slug: "niittech", company: "NIIT Technologies", hiresInIndia: true, tier: "SEMI_MNC", tenant: "niittech" },
  { slug: "paytm", company: "Paytm", hiresInIndia: true, tier: "SEMI_MNC", tenant: "paytm" },
  { slug: "flipkart-group", company: "Flipkart Group", hiresInIndia: true, tier: "SEMI_MNC", tenant: "flipkartgroup" },
  { slug: "myntra", company: "Myntra", hiresInIndia: true, tier: "SEMI_MNC", tenant: "myntra" },
  { slug: "swiggy", company: "Swiggy", hiresInIndia: true, tier: "SEMI_MNC", tenant: "swiggy" },
  { slug: "zomato", company: "Zomato", hiresInIndia: true, tier: "SEMI_MNC", tenant: "zomato" },
  { slug: "oyo", company: "OYO Rooms", hiresInIndia: true, tier: "SEMI_MNC", tenant: "oyo" },
  { slug: "makemytrip", company: "MakeMyTrip", hiresInIndia: true, tier: "SEMI_MNC", tenant: "makemytrip" },
  { slug: "nykaa", company: "Nykaa", hiresInIndia: true, tier: "SEMI_MNC", tenant: "nykaa" },
  { slug: "info-edge", company: "Info Edge (Naukri)", hiresInIndia: true, tier: "SEMI_MNC", tenant: "infoedge" },
  { slug: "policybazaar", company: "PolicyBazaar", hiresInIndia: true, tier: "SEMI_MNC", tenant: "policybazaar" },
] as const;

export const INDIAN_LOCATION_ALIASES: Record<string, string[]> = {
  "bengaluru": ["bangalore", "bengaluru", "blr"],
  "hyderabad": ["hyderabad", "hyd", "secunderabad"],
  "pune": ["pune", "poona"],
  "mumbai": ["mumbai", "bombay"],
  "delhi ncr": ["delhi", "new delhi", "noida", "gurgaon", "gurugram", "greater noida", "faridabad", "ghaziabad", "ncr"],
  "chennai": ["chennai", "madras", "chn"],
  "kolkata": ["kolkata", "calcutta"],
  "ahmedabad": ["ahmedabad", "amdavad"],
  "kochi": ["kochi", "cochin", "cok"],
  "jaipur": ["jaipur"],
  "nagpur": ["nagpur"],
  "chandigarh": ["chandigarh", "mohali", "panchkula", "tricity"],
} as const;

type Tier = 'MNC' | 'SEMI_MNC' | 'ALL';

export function getAllGreenhouseCompanies(tier: Tier = 'ALL'): string[] {
  const result: string[] = [];
  if (tier === 'ALL' || tier === 'MNC') {
    result.push(...GREENHOUSE_COMPANIES_MNC);
  }
  if (tier === 'ALL' || tier === 'SEMI_MNC') {
    result.push(...GREENHOUSE_COMPANIES_SEMI_MNC_INDIA);
  }
  return result;
}

export function getAllLeverCompanies(tier: Tier = 'ALL'): string[] {
  const result: string[] = [];
  if (tier === 'ALL' || tier === 'MNC') {
    result.push(...LEVER_COMPANIES_MNC);
  }
  if (tier === 'ALL' || tier === 'SEMI_MNC') {
    result.push(...LEVER_COMPANIES_SEMI_MNC_INDIA);
  }
  return result;
}

export function getAllAshbyCompanies(tier: Tier = 'ALL'): string[] {
  const result: string[] = [];
  if (tier === 'ALL' || tier === 'MNC') {
    result.push(...ASHBY_COMPANIES_MNC);
  }
  return result;
}

interface WorkdayFilter {
  tier?: WorkdayTier;
  hiresInIndia?: boolean;
}

export function getWorkdayTenants(filter: WorkdayFilter = {}): typeof WORKDAY_TENANTS {
  return WORKDAY_TENANTS.filter((item) => {
    if (filter.tier !== undefined && item.tier !== filter.tier) {
      return false;
    }
    if (filter.hiresInIndia !== undefined && item.hiresInIndia !== filter.hiresInIndia) {
      return false;
    }
    return true;
  });
}

export function canonicalizeLocation(location: string): string | null {
  const normalized = location.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(INDIAN_LOCATION_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return canonical;
    }
  }
  return null;
}

export function normalizeLocation(location: string): string {
  const normalized = location.trim().toLowerCase();

  const remoteKeywords = ["remote", "global", "anywhere", "worldwide", "wfh", "work from home"];
  for (const kw of remoteKeywords) {
    if (normalized.includes(kw)) {
      return "remote";
    }
  }

  for (const [canonical, aliases] of Object.entries(INDIAN_LOCATION_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias.toLowerCase())) {
        return canonical;
      }
    }
  }

  return normalized;
}

export type AtsSource = 'greenhouse' | 'lever' | 'ashby' | 'workday' | '*';
export type CompanyTier = 'MNC' | 'SEMI_MNC' | 'ALL';

export function getCompaniesByTier(source: AtsSource, tier: CompanyTier): string[] {
  if (source === '*') {
    const all = [
      ...getAllGreenhouseCompanies(tier),
      ...getAllLeverCompanies(tier),
      ...getAllAshbyCompanies(tier),
      ...getWorkdayTenants({ tier: tier === 'ALL' ? undefined : (tier as WorkdayTier) }).map((t) => t.slug),
    ];
    return Array.from(new Set(all.map((s) => s.toLowerCase())));
  }
  if (source === 'greenhouse') {
    return getAllGreenhouseCompanies(tier);
  }
  if (source === 'lever') {
    return getAllLeverCompanies(tier);
  }
  if (source === 'ashby') {
    return getAllAshbyCompanies(tier);
  }
  if (source === 'workday') {
    return getWorkdayTenants({ tier: tier === 'ALL' ? undefined : (tier as WorkdayTier) }).map((t) => t.slug);
  }
  return [];
}
