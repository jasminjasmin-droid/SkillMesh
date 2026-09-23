import { 
  DayOfWeek, 
  DayAvailability, 
  MentorshipSchedule, 
  TimeSlot, 
  BlockedPeriod, 
  SessionFormat, 
  SessionDuration,
  ScheduledSession 
} from '../types';

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

export const FORMAT_OPTIONS: { value: SessionFormat; label: string; description: string; iconName: string }[] = [
  { 
    value: 'VIDEO_CALL', 
    label: 'Video Call', 
    description: '1-on-1 Google Meet, Zoom, or web video',
    iconName: 'Video' 
  },
  { 
    value: 'SCREEN_SHARE', 
    label: 'Pair Coding / Screen Share', 
    description: 'Live collaborative code walkthrough or review',
    iconName: 'Laptop' 
  },
  { 
    value: 'AUDIO_CALL', 
    label: 'Audio Voice Chat', 
    description: 'Voice conversation focused on advice & strategy',
    iconName: 'Headphones' 
  },
  { 
    value: 'CHAT', 
    label: 'Live Chat Q&A', 
    description: 'Real-time text consultation & link sharing',
    iconName: 'MessageSquare' 
  }
];

export const DURATION_OPTIONS: { value: SessionDuration; label: string }[] = [
  { value: 15, label: '15 min (Quick Intro)' },
  { value: 30, label: '30 min (Standard)' },
  { value: 45, label: '45 min (In-Depth)' },
  { value: 60, label: '60 min (Deep Dive)' },
];

export interface TimezoneOption {
  value: string;
  label: string;
  group: string;
  offset: string;
}

export const COMPREHENSIVE_TIMEZONES: TimezoneOption[] = [
  // UTC & Standard
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)', group: 'UTC / Universal', offset: '+00:00' },
  { value: 'Etc/GMT', label: 'GMT (Greenwich Mean Time)', group: 'UTC / Universal', offset: '+00:00' },

  // Africa
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT, UTC+1) — Lagos, Abuja, Luanda', group: 'Africa', offset: '+01:00' },
  { value: 'Africa/Accra', label: 'Africa/Accra (GMT, UTC+0) — Accra, Dakar, Abidjan', group: 'Africa', offset: '+00:00' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (EET, UTC+2) — Cairo, Alexandria', group: 'Africa', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST, UTC+2) — Johannesburg, Cape Town', group: 'Africa', offset: '+02:00' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT, UTC+3) — Nairobi, Addis Ababa, Kampala', group: 'Africa', offset: '+03:00' },
  { value: 'Africa/Casablanca', label: 'Africa/Casablanca (WET, UTC+1) — Casablanca, Rabat', group: 'Africa', offset: '+01:00' },
  { value: 'Africa/Algiers', label: 'Africa/Algiers (CET, UTC+1) — Algiers, Tunis', group: 'Africa', offset: '+01:00' },

  // Americas - North America
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-5/-4) — Eastern Time (NYC, Miami, Boston)', group: 'Americas', offset: '-05:00' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, UTC-6/-5) — Central Time (Chicago, Dallas, Austin)', group: 'Americas', offset: '-06:00' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT, UTC-7/-6) — Mountain Time (Denver, Salt Lake)', group: 'Americas', offset: '-07:00' },
  { value: 'America/Phoenix', label: 'America/Phoenix (MST, UTC-7) — Arizona (no DST)', group: 'Americas', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, UTC-8/-7) — Pacific Time (LA, SF, Seattle)', group: 'Americas', offset: '-08:00' },
  { value: 'America/Anchorage', label: 'America/Anchorage (AKST/AKDT, UTC-9) — Alaska', group: 'Americas', offset: '-09:00' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (HST, UTC-10) — Hawaii', group: 'Americas', offset: '-10:00' },
  { value: 'America/Toronto', label: 'America/Toronto (EST/EDT, UTC-5/-4) — Toronto, Montreal, Ottawa', group: 'Americas', offset: '-05:00' },
  { value: 'America/Vancouver', label: 'America/Vancouver (PST/PDT, UTC-8/-7) — Vancouver', group: 'Americas', offset: '-08:00' },
  { value: 'America/Halifax', label: 'America/Halifax (AST/ADT, UTC-4/-3) — Atlantic Time', group: 'Americas', offset: '-04:00' },
  { value: 'America/Mexico_City', label: 'America/Mexico_City (CST, UTC-6) — Mexico City, Guadalajara', group: 'Americas', offset: '-06:00' },

  // Americas - Central & South America
  { value: 'America/Bogota', label: 'America/Bogota (COT, UTC-5) — Bogota, Lima, Quito', group: 'Americas', offset: '-05:00' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT, UTC-3) — São Paulo, Rio de Janeiro', group: 'Americas', offset: '-03:00' },
  { value: 'America/Buenos_Aires', label: 'America/Buenos_Aires (ART, UTC-3) — Buenos Aires', group: 'Americas', offset: '-03:00' },
  { value: 'America/Santiago', label: 'America/Santiago (CLT, UTC-4/-3) — Santiago, Chile', group: 'Americas', offset: '-04:00' },
  { value: 'America/Caracas', label: 'America/Caracas (VET, UTC-4) — Caracas', group: 'Americas', offset: '-04:00' },

  // Europe
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+0/+1) — London, Manchester', group: 'Europe', offset: '+00:00' },
  { value: 'Europe/Dublin', label: 'Europe/Dublin (IST/GMT, UTC+0/+1) — Dublin', group: 'Europe', offset: '+00:00' },
  { value: 'Europe/Lisbon', label: 'Europe/Lisbon (WET/WEST, UTC+0/+1) — Lisbon, Porto', group: 'Europe', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST, UTC+1/+2) — Paris, Brussels', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST, UTC+1/+2) — Berlin, Frankfurt, Munich', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET/CEST, UTC+1/+2) — Amsterdam, Rotterdam', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Rome', label: 'Europe/Rome (CET/CEST, UTC+1/+2) — Rome, Milan', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (CET/CEST, UTC+1/+2) — Madrid, Barcelona', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Zurich', label: 'Europe/Zurich (CET/CEST, UTC+1/+2) — Zurich, Geneva', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Vienna', label: 'Europe/Vienna (CET/CEST, UTC+1/+2) — Vienna', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Stockholm', label: 'Europe/Stockholm (CET/CEST, UTC+1/+2) — Stockholm, Oslo, Copenhagen', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Warsaw', label: 'Europe/Warsaw (CET/CEST, UTC+1/+2) — Warsaw, Krakow', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Prague', label: 'Europe/Prague (CET/CEST, UTC+1/+2) — Prague', group: 'Europe', offset: '+01:00' },
  { value: 'Europe/Athens', label: 'Europe/Athens (EET/EEST, UTC+2/+3) — Athens', group: 'Europe', offset: '+02:00' },
  { value: 'Europe/Bucharest', label: 'Europe/Bucharest (EET/EEST, UTC+2/+3) — Bucharest', group: 'Europe', offset: '+02:00' },
  { value: 'Europe/Helsinki', label: 'Europe/Helsinki (EET/EEST, UTC+2/+3) — Helsinki', group: 'Europe', offset: '+02:00' },
  { value: 'Europe/Kyiv', label: 'Europe/Kyiv (EET/EEST, UTC+2/+3) — Kyiv', group: 'Europe', offset: '+02:00' },
  { value: 'Europe/Istanbul', label: 'Europe/Istanbul (TRT, UTC+3) — Istanbul, Ankara', group: 'Europe', offset: '+03:00' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (MSK, UTC+3) — Moscow, St. Petersburg', group: 'Europe', offset: '+03:00' },

  // Asia & Middle East
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4) — Dubai, Abu Dhabi, Muscat', group: 'Asia & Middle East', offset: '+04:00' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST, UTC+3) — Riyadh, Jeddah, Doha, Kuwait', group: 'Asia & Middle East', offset: '+03:00' },
  { value: 'Asia/Jerusalem', label: 'Asia/Jerusalem (IST, UTC+2/+3) — Jerusalem, Tel Aviv', group: 'Asia & Middle East', offset: '+02:00' },
  { value: 'Asia/Beirut', label: 'Asia/Beirut (EET, UTC+2) — Beirut, Amman', group: 'Asia & Middle East', offset: '+02:00' },
  { value: 'Asia/Tehran', label: 'Asia/Tehran (IRST, UTC+3:30) — Tehran', group: 'Asia & Middle East', offset: '+03:30' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT, UTC+5) — Karachi, Lahore, Islamabad', group: 'Asia & Middle East', offset: '+05:00' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30) — India (Mumbai, Delhi, Bangalore)', group: 'Asia & Middle East', offset: '+05:30' },
  { value: 'Asia/Colombo', label: 'Asia/Colombo (IST, UTC+5:30) — Colombo', group: 'Asia & Middle East', offset: '+05:30' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (BST, UTC+6) — Dhaka, Chittagong', group: 'Asia & Middle East', offset: '+06:00' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT, UTC+7) — Bangkok, Hanoi, Ho Chi Minh', group: 'Asia & Middle East', offset: '+07:00' },
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB, UTC+7) — Jakarta, Surabaya', group: 'Asia & Middle East', offset: '+07:00' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8) — Singapore', group: 'Asia & Middle East', offset: '+08:00' },
  { value: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur (MYT, UTC+8) — Kuala Lumpur', group: 'Asia & Middle East', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (HKT, UTC+8) — Hong Kong', group: 'Asia & Middle East', offset: '+08:00' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST, UTC+8) — Shanghai, Beijing, Shenzhen', group: 'Asia & Middle East', offset: '+08:00' },
  { value: 'Asia/Taipei', label: 'Asia/Taipei (CST, UTC+8) — Taipei', group: 'Asia & Middle East', offset: '+08:00' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (KST, UTC+9) — Seoul, Busan', group: 'Asia & Middle East', offset: '+09:00' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9) — Tokyo, Osaka', group: 'Asia & Middle East', offset: '+09:00' },
  { value: 'Asia/Manila', label: 'Asia/Manila (PHT, UTC+8) — Manila', group: 'Asia & Middle East', offset: '+08:00' },

  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT, UTC+10/+11) — Sydney, Canberra', group: 'Australia & Pacific', offset: '+10:00' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST/AEDT, UTC+10/+11) — Melbourne', group: 'Australia & Pacific', offset: '+10:00' },
  { value: 'Australia/Brisbane', label: 'Australia/Brisbane (AEST, UTC+10) — Brisbane, Gold Coast', group: 'Australia & Pacific', offset: '+10:00' },
  { value: 'Australia/Adelaide', label: 'Australia/Adelaide (ACST/ACDT, UTC+9:30/+10:30) — Adelaide', group: 'Australia & Pacific', offset: '+09:30' },
  { value: 'Australia/Perth', label: 'Australia/Perth (AWST, UTC+8) — Perth', group: 'Australia & Pacific', offset: '+08:00' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT, UTC+12/+13) — Auckland, Wellington', group: 'Australia & Pacific', offset: '+12:00' },
  { value: 'Pacific/Fiji', label: 'Pacific/Fiji (FJT, UTC+12) — Fiji', group: 'Australia & Pacific', offset: '+12:00' }
];

export function getUserLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getAllTimezoneOptions(): TimezoneOption[] {
  const local = getUserLocalTimezone();
  const exists = COMPREHENSIVE_TIMEZONES.some(t => t.value === local);
  if (!exists && local) {
    return [
      { value: local, label: `Local Device Timezone (${local})`, group: 'Local', offset: '' },
      ...COMPREHENSIVE_TIMEZONES
    ];
  }
  return COMPREHENSIVE_TIMEZONES;
}

export function createDefaultMentorshipSchedule(customTimezone?: string): MentorshipSchedule {
  const tz = customTimezone || getUserLocalTimezone();

  const defaultWeekly: DayAvailability[] = [
    {
      day: 'monday',
      isEnabled: true,
      slots: [{ id: 'mon-1', startTime: '18:00', endTime: '20:00' }]
    },
    {
      day: 'tuesday',
      isEnabled: true,
      slots: [{ id: 'tue-1', startTime: '18:00', endTime: '20:00' }]
    },
    {
      day: 'wednesday',
      isEnabled: true,
      slots: [{ id: 'wed-1', startTime: '18:00', endTime: '20:00' }]
    },
    {
      day: 'thursday',
      isEnabled: true,
      slots: [{ id: 'thu-1', startTime: '18:00', endTime: '20:00' }]
    },
    {
      day: 'friday',
      isEnabled: false,
      slots: [{ id: 'fri-1', startTime: '16:00', endTime: '18:00' }]
    },
    {
      day: 'saturday',
      isEnabled: true,
      slots: [{ id: 'sat-1', startTime: '10:00', endTime: '13:00' }]
    },
    {
      day: 'sunday',
      isEnabled: false,
      slots: [{ id: 'sun-1', startTime: '14:00', endTime: '17:00' }]
    }
  ];

  return {
    isEnabled: true,
    timezone: tz,
    weeklyAvailability: defaultWeekly,
    blockedPeriods: [],
    preferredDurations: [30, 60],
    preferredFormats: ['VIDEO_CALL', 'SCREEN_SHARE'],
    noticeHours: 12,
    maxSessionsPerWeek: 4,
    customBookingNote: 'Excited to mentor and trade practical experience! Please share what project or concept you want to work on.',
    meetingPlatform: 'Google Meet',
    meetingUrl: ''
  };
}

export function formatTime12h(time24: string): string {
  if (!time24) return '';
  const [hourStr, minStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minStr || '00'} ${ampm}`;
}

export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + 'T00:00:00');
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

export function generateNextDays(count: number = 14): { dateStr: string; dayName: string; formattedDate: string; isToday: boolean }[] {
  const result = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    result.push({
      dateStr,
      dayName,
      formattedDate,
      isToday: i === 0
    });
  }

  return result;
}

export interface BookableSlot {
  startTime: string;
  endTime: string;
  displayLabel: string;
}

/**
 * Calculates discrete bookable session slots for a specific date given a user's schedule,
 * excluding blocked out periods and existing confirmed/requested sessions.
 */
export function calculateAvailableSlotsForDate(
  schedule: MentorshipSchedule | undefined,
  dateStr: string,
  durationMinutes: number = 30,
  existingSessions: ScheduledSession[] = []
): BookableSlot[] {
  if (!schedule || !schedule.isEnabled) {
    return [];
  }

  // 1. Check if the date is fully blocked
  const isDateBlockedAllDay = schedule.blockedPeriods.some(
    b => b.date === dateStr && b.allDay
  );
  if (isDateBlockedAllDay) {
    return [];
  }

  const dateBlockouts = schedule.blockedPeriods.filter(b => b.date === dateStr && !b.allDay);

  // 2. Find day availability
  const dayOfWeek = getDayOfWeekFromDate(dateStr);
  const dayConfig = schedule.weeklyAvailability.find(d => d.day === dayOfWeek);

  if (!dayConfig || !dayConfig.isEnabled || !dayConfig.slots || dayConfig.slots.length === 0) {
    return [];
  }

  // 3. Generate candidate slots inside each time window
  const slots: BookableSlot[] = [];
  const now = new Date();
  const minNoticeMs = (schedule.noticeHours || 0) * 60 * 60 * 1000;

  for (const window of dayConfig.slots) {
    const [startH, startM] = window.startTime.split(':').map(Number);
    const [endH, endM] = window.endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60);
      const slotStartM = currentMinutes % 60;
      const slotEndTotal = currentMinutes + durationMinutes;
      const slotEndH = Math.floor(slotEndTotal / 60);
      const slotEndM = slotEndTotal % 60;

      const slotStartStr = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;
      const slotEndStr = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;

      // Check if slot has already passed or violates minimum notice hours
      const slotDateTime = new Date(`${dateStr}T${slotStartStr}:00`);
      if (slotDateTime.getTime() - now.getTime() < minNoticeMs) {
        currentMinutes += durationMinutes;
        continue;
      }

      // Check against partial date blockouts
      const isBlockedByRange = dateBlockouts.some(b => {
        if (!b.startTime || !b.endTime) return true;
        return slotStartStr < b.endTime && slotEndStr > b.startTime;
      });

      if (isBlockedByRange) {
        currentMinutes += durationMinutes;
        continue;
      }

      // Check against existing scheduled sessions on that day
      const isOccupied = existingSessions.some(s => {
        if (s.date !== dateStr) return false;
        if (s.status === 'CANCELLED') return false;
        return slotStartStr < s.endTime && slotEndStr > s.startTime;
      });

      if (!isOccupied) {
        slots.push({
          startTime: slotStartStr,
          endTime: slotEndStr,
          displayLabel: `${formatTime12h(slotStartStr)} – ${formatTime12h(slotEndStr)}`
        });
      }

      // Increment slot step
      currentMinutes += durationMinutes;
    }
  }

  return slots;
}
