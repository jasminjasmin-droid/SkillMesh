/**
 * Comprehensive IANA Timezone utilities for SkillMesh
 * Supporting worldwide zones with explicit African continent coverage
 */

export interface TimezoneOption {
  value: string;
  label: string;
  city: string;
  region: string;
  offset: string;
}

// Curated list covering all continents, explicitly highlighting African zones as mandated
export const PREFERRED_TIMEZONES: { value: string; label: string; region: string }[] = [
  // --- Africa (Comprehensive coverage) ---
  { value: 'Africa/Lagos', label: 'West Africa Time (WAT) - Lagos, Nigeria', region: 'Africa' },
  { value: 'Africa/Accra', label: 'Greenwich Mean Time (GMT) - Accra, Ghana', region: 'Africa' },
  { value: 'Africa/Cairo', label: 'Eastern European Time (EET) - Cairo, Egypt', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST) - Johannesburg', region: 'Africa' },
  { value: 'Africa/Nairobi', label: 'East Africa Time (EAT) - Nairobi, Kenya', region: 'Africa' },
  { value: 'Africa/Casablanca', label: 'Western European Time (WET) - Casablanca, Morocco', region: 'Africa' },
  { value: 'Africa/Addis_Ababa', label: 'East Africa Time (EAT) - Addis Ababa, Ethiopia', region: 'Africa' },
  { value: 'Africa/Algiers', label: 'Central European Time (CET) - Algiers, Algeria', region: 'Africa' },
  { value: 'Africa/Dar_es_Salaam', label: 'East Africa Time (EAT) - Dar es Salaam, Tanzania', region: 'Africa' },
  { value: 'Africa/Harare', label: 'Central Africa Time (CAT) - Harare, Zimbabwe', region: 'Africa' },
  { value: 'Africa/Kampala', label: 'East Africa Time (EAT) - Kampala, Uganda', region: 'Africa' },
  { value: 'Africa/Kigali', label: 'Central Africa Time (CAT) - Kigali, Rwanda', region: 'Africa' },
  { value: 'Africa/Luanda', label: 'West Africa Time (WAT) - Luanda, Angola', region: 'Africa' },
  { value: 'Africa/Lusaka', label: 'Central Africa Time (CAT) - Lusaka, Zambia', region: 'Africa' },
  { value: 'Africa/Maputo', label: 'Central Africa Time (CAT) - Maputo, Mozambique', region: 'Africa' },
  { value: 'Africa/Tunis', label: 'Central European Time (CET) - Tunis, Tunisia', region: 'Africa' },
  { value: 'Africa/Windhoek', label: 'Central Africa Time (CAT) - Windhoek, Namibia', region: 'Africa' },

  // --- Europe ---
  { value: 'Europe/London', label: 'GMT/BST - London, UK', region: 'Europe' },
  { value: 'Europe/Paris', label: 'CET/CEST - Paris, France', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'CET/CEST - Berlin, Germany', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'CET/CEST - Madrid, Spain', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'CET/CEST - Amsterdam, Netherlands', region: 'Europe' },
  { value: 'Europe/Rome', label: 'CET/CEST - Rome, Italy', region: 'Europe' },
  { value: 'Europe/Athens', label: 'EET/EEST - Athens, Greece', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'CET/CEST - Warsaw, Poland', region: 'Europe' },

  // --- Americas ---
  { value: 'America/New_York', label: 'Eastern Time (ET) - New York, US', region: 'Americas' },
  { value: 'America/Chicago', label: 'Central Time (CT) - Chicago, US', region: 'Americas' },
  { value: 'America/Denver', label: 'Mountain Time (MT) - Denver, US', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles, US', region: 'Americas' },
  { value: 'America/Toronto', label: 'Eastern Time (ET) - Toronto, Canada', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Pacific Time (PT) - Vancouver, Canada', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time (BRT) - São Paulo, Brazil', region: 'Americas' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time (ART) - Buenos Aires', region: 'Americas' },
  { value: 'America/Mexico_City', label: 'Central Time (CT) - Mexico City', region: 'Americas' },
  { value: 'America/Bogota', label: 'Colombia Time (COT) - Bogotá', region: 'Americas' },

  // --- Asia & Middle East ---
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) - Dubai, UAE', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) - New Delhi/Mumbai', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT) - Singapore', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) - Tokyo, Japan', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST) - Shanghai/Beijing', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT) - Hong Kong', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST) - Seoul, South Korea', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Indochina Time (ICT) - Bangkok, Thailand', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Western Indonesia Time (WIB) - Jakarta', region: 'Asia' },
  { value: 'Asia/Riyadh', label: 'Arabian Standard Time (AST) - Riyadh, Saudi Arabia', region: 'Asia' },

  // --- Oceania & Pacific ---
  { value: 'Australia/Sydney', label: 'AEST/AEDT - Sydney, Australia', region: 'Oceania' },
  { value: 'Australia/Melbourne', label: 'AEST/AEDT - Melbourne, Australia', region: 'Oceania' },
  { value: 'Australia/Perth', label: 'AWST - Perth, Australia', region: 'Oceania' },
  { value: 'Pacific/Auckland', label: 'NZST/NZDT - Auckland, New Zealand', region: 'Oceania' },

  // --- Standard UTC ---
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Global' }
];

export const POPULAR_TIMEZONES = PREFERRED_TIMEZONES;
export const getUserLocalTimezone = detectUserTimezone;
export const formatUserCurrentTime = formatCurrentTimeInTimezone;
export const getTimezoneShortOffset = getTimezoneOffsetString;

/**
 * Get all available timezones, dynamically merging browser IANA list with preferred list
 */
export function getAllTimezones(): TimezoneOption[] {
  const result: Map<string, TimezoneOption> = new Map();

  // First seed from preferred list
  for (const item of PREFERRED_TIMEZONES) {
    result.set(item.value, {
      value: item.value,
      label: item.label,
      city: item.value.split('/')[1]?.replace(/_/g, ' ') || item.value,
      region: item.region,
      offset: getTimezoneOffsetString(item.value)
    });
  }

  // Next attempt to augment with all IANA timezones supported by browser
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      const ianaList = (Intl as any).supportedValuesOf('timeZone');
      for (const tz of ianaList) {
        if (!result.has(tz)) {
          const parts = tz.split('/');
          const region = parts[0] || 'Global';
          const city = parts[1]?.replace(/_/g, ' ') || tz;
          result.set(tz, {
            value: tz,
            label: `${city} (${tz})`,
            city,
            region,
            offset: getTimezoneOffsetString(tz)
          });
        }
      }
    }
  } catch (e) {
    // Graceful fallback to preferred list
  }

  return Array.from(result.values());
}

/**
 * Get formatted current GMT offset for a given timezone (e.g. "GMT+1", "GMT-5")
 */
export function getTimezoneOffsetString(timeZone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset'
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Format the current time in the target user's timezone
 */
export function formatCurrentTimeInTimezone(timeZone?: string): string {
  if (!timeZone) return '';
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const timeStr = formatter.format(now);
    const offsetStr = getTimezoneOffsetString(timeZone);
    return `${timeStr} (${offsetStr})`;
  } catch {
    return '';
  }
}

/**
 * Auto-detect the user's browser timezone
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
