import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  MentorshipSchedule, 
  DayOfWeek, 
  DayAvailability, 
  TimeSlot, 
  BlockedPeriod, 
  SessionFormat, 
  SessionDuration,
  ScheduledSession
} from '../../types';
import { 
  DAYS_OF_WEEK, 
  FORMAT_OPTIONS, 
  DURATION_OPTIONS, 
  createDefaultMentorshipSchedule,
  formatTime12h,
  getUserLocalTimezone,
  getAllTimezoneOptions
} from '../../utils/schedulingUtils';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  Video, 
  Laptop, 
  Headphones, 
  MessageSquare, 
  AlertCircle, 
  CalendarOff, 
  Sparkles, 
  Globe, 
  Sliders, 
  Eye, 
  Video as VideoIcon,
  ExternalLink,
  CheckCircle2,
  XCircle,
  CalendarCheck2
} from 'lucide-react';

export const ProfileSchedulingManager: React.FC = () => {
  const { currentUser, updateMentorshipSchedule, scheduledSessions, updateSessionStatus } = useApp();

  const initialSchedule: MentorshipSchedule = currentUser?.mentorshipSchedule || createDefaultMentorshipSchedule();
  const [schedule, setSchedule] = useState<MentorshipSchedule>(initialSchedule);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // New blackout / blockout date form state
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockAllDay, setNewBlockAllDay] = useState(true);
  const [newBlockStart, setNewBlockStart] = useState('13:00');
  const [newBlockEnd, setNewBlockEnd] = useState('17:00');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [blockError, setBlockError] = useState<string | null>(null);

  // Filter my sessions
  const myMentorSessions = scheduledSessions.filter(
    s => s.mentorId === currentUser?.id || s.menteeId === currentUser?.id
  );

  const handleToggleDay = (dayKey: DayOfWeek) => {
    setSchedule(prev => {
      const updated = prev.weeklyAvailability.map(d => {
        if (d.day === dayKey) {
          const nextEnabled = !d.isEnabled;
          return {
            ...d,
            isEnabled: nextEnabled,
            slots: nextEnabled && d.slots.length === 0 
              ? [{ id: `slot_${Date.now()}`, startTime: '18:00', endTime: '20:00' }]
              : d.slots
          };
        }
        return d;
      });
      return { ...prev, weeklyAvailability: updated };
    });
  };

  const handleAddTimeSlot = (dayKey: DayOfWeek) => {
    setSchedule(prev => {
      const updated = prev.weeklyAvailability.map(d => {
        if (d.day === dayKey) {
          const newSlot: TimeSlot = {
            id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            startTime: '14:00',
            endTime: '16:00'
          };
          return {
            ...d,
            isEnabled: true,
            slots: [...d.slots, newSlot]
          };
        }
        return d;
      });
      return { ...prev, weeklyAvailability: updated };
    });
  };

  const handleRemoveTimeSlot = (dayKey: DayOfWeek, slotId: string) => {
    setSchedule(prev => {
      const updated = prev.weeklyAvailability.map(d => {
        if (d.day === dayKey) {
          const newSlots = d.slots.filter(s => s.id !== slotId);
          return {
            ...d,
            slots: newSlots,
            isEnabled: newSlots.length > 0
          };
        }
        return d;
      });
      return { ...prev, weeklyAvailability: updated };
    });
  };

  const handleUpdateSlotTime = (dayKey: DayOfWeek, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => {
      const updated = prev.weeklyAvailability.map(d => {
        if (d.day === dayKey) {
          const newSlots = d.slots.map(s => {
            if (s.id === slotId) {
              return { ...s, [field]: value };
            }
            return s;
          });
          return { ...d, slots: newSlots };
        }
        return d;
      });
      return { ...prev, weeklyAvailability: updated };
    });
  };

  const handleAddBlockout = (e: React.FormEvent) => {
    e.preventDefault();
    setBlockError(null);

    if (!newBlockDate) {
      setBlockError('Please select a date to block out.');
      return;
    }

    if (!newBlockAllDay && newBlockStart >= newBlockEnd) {
      setBlockError('End time must be later than start time.');
      return;
    }

    const newPeriod: BlockedPeriod = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      date: newBlockDate,
      allDay: newBlockAllDay,
      startTime: newBlockAllDay ? undefined : newBlockStart,
      endTime: newBlockAllDay ? undefined : newBlockEnd,
      reason: newBlockReason.trim() || 'Unavailable'
    };

    setSchedule(prev => ({
      ...prev,
      blockedPeriods: [...prev.blockedPeriods, newPeriod]
    }));

    setNewBlockDate('');
    setNewBlockReason('');
  };

  const handleRemoveBlockout = (blockId: string) => {
    setSchedule(prev => ({
      ...prev,
      blockedPeriods: prev.blockedPeriods.filter(b => b.id !== blockId)
    }));
  };

  const handleToggleDuration = (duration: SessionDuration) => {
    setSchedule(prev => {
      const exists = prev.preferredDurations.includes(duration);
      if (exists && prev.preferredDurations.length === 1) {
        return prev; // keep at least 1
      }
      const updated = exists 
        ? prev.preferredDurations.filter(d => d !== duration)
        : [...prev.preferredDurations, duration].sort((a, b) => a - b);
      return { ...prev, preferredDurations: updated };
    });
  };

  const handleToggleFormat = (fmt: SessionFormat) => {
    setSchedule(prev => {
      const exists = prev.preferredFormats.includes(fmt);
      if (exists && prev.preferredFormats.length === 1) {
        return prev; // keep at least 1
      }
      const updated = exists 
        ? prev.preferredFormats.filter(f => f !== fmt)
        : [...prev.preferredFormats, fmt];
      return { ...prev, preferredFormats: updated };
    });
  };

  const applyPreset = (preset: 'WEEKDAY_EVENING' | 'WEEKEND_ONLY' | 'BUSINESS_HOURS') => {
    setSchedule(prev => {
      const updated = prev.weeklyAvailability.map(d => {
        if (preset === 'WEEKDAY_EVENING') {
          const isWeekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d.day);
          return {
            day: d.day,
            isEnabled: isWeekday,
            slots: isWeekday ? [{ id: `preset_${d.day}`, startTime: '18:00', endTime: '21:00' }] : []
          };
        } else if (preset === 'WEEKEND_ONLY') {
          const isWeekend = ['saturday', 'sunday'].includes(d.day);
          return {
            day: d.day,
            isEnabled: isWeekend,
            slots: isWeekend ? [{ id: `preset_${d.day}`, startTime: '10:00', endTime: '14:00' }] : []
          };
        } else {
          const isWorkDay = ['monday', 'tuesday', 'wednesday', 'thursday'].includes(d.day);
          return {
            day: d.day,
            isEnabled: isWorkDay,
            slots: isWorkDay ? [{ id: `preset_${d.day}`, startTime: '09:00', endTime: '17:00' }] : []
          };
        }
      });
      return { ...prev, weeklyAvailability: updated };
    });
  };

  const handleSave = () => {
    updateMentorshipSchedule(schedule);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner with Illustration */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Live Mentorship & 1-on-1 Availability</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Set Your Dedicated Mentorship Hours
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Control when peers can book live guidance, code pairing, or skill exchange sessions. 
            Block out exams, vacations, or busy hours anytime.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSchedule(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                schedule.isEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${schedule.isEnabled ? 'bg-emerald-950 animate-pulse' : 'bg-slate-400'}`} />
              <span>{schedule.isEnabled ? 'Mentorship Booking Active' : 'Mentorship Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{previewMode ? 'Edit Schedule' : 'Peer Booking Preview'}</span>
            </button>
          </div>
        </div>

        {/* Decorative Illustration Thumbnail */}
        <div className="hidden md:block absolute -right-6 -bottom-6 w-64 h-64 rounded-2xl overflow-hidden opacity-85 shadow-2xl border-2 border-emerald-400/20 rotate-1 pointer-events-none">
          <img
            src="/src/assets/images/scheduling_mentorship_illa_1788511769035.jpg"
            alt="Mentorship Scheduling Illustration"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Your live mentorship schedule and blackout dates have been saved!</span>
        </div>
      )}

      {/* Preview Mode */}
      {previewMode ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h4 className="text-base font-bold text-slate-900">Peer Booking Card Preview</h4>
              <p className="text-xs text-slate-500">This is how peers will see your availability when visiting your profile.</p>
            </div>
            <button
              onClick={() => setPreviewMode(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Settings
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 max-w-xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${schedule.isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800">
                  {schedule.isEnabled ? 'Open for 1-on-1 Sessions' : 'Currently Unavailable'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                {schedule.timezone}
              </span>
            </div>

            <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">
              "{schedule.customBookingNote || 'Ready to trade skills and review projects together!'}"
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Durations</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {schedule.preferredDurations.map(d => `${d}m`).join(' • ')}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Platform</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {schedule.meetingPlatform || 'Google Meet'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <p className="text-[11px] font-bold text-slate-700">Weekly Active Days</p>
              <div className="flex flex-wrap gap-1.5">
                {schedule.weeklyAvailability.map(d => (
                  <span
                    key={d.day}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      d.isEnabled
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-400 line-through'
                    }`}
                  >
                    {d.day.substring(0, 3)}
                  </span>
                ))}
              </div>
            </div>

            {schedule.blockedPeriods.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-700 mb-1.5">Upcoming Blackout Dates</p>
                <div className="space-y-1">
                  {schedule.blockedPeriods.slice(0, 3).map(b => (
                    <div key={b.id} className="text-[11px] text-slate-500 flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <span>{b.date} ({b.reason})</span>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Blocked</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit Schedule View */
        <div className="space-y-8">
          
          {/* Quick Schedule Presets */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>Quick Availability Presets</span>
                </h4>
                <p className="text-xs text-slate-500">Fast-forward your schedule with common peer-mentoring templates.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('WEEKDAY_EVENING')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  Weekday Evenings (6-9 PM)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('WEEKEND_ONLY')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  Weekend Sprints (10 AM-2 PM)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('BUSINESS_HOURS')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  Daytime (Mon-Thu 9-5)
                </button>
              </div>
            </div>

            {/* Timezone and Notice Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Primary Timezone
                </label>
                <div className="relative">
                  <select
                    value={schedule.timezone}
                    onChange={e => setSchedule(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {/* Render current value if not in standard list */}
                    {schedule.timezone && !getAllTimezoneOptions().some(t => t.value === schedule.timezone) && (
                      <option value={schedule.timezone}>{schedule.timezone}</option>
                    )}
                    {Array.from(new Set(getAllTimezoneOptions().map(t => t.group))).map(groupName => (
                      <optgroup key={groupName} label={groupName}>
                        {getAllTimezoneOptions()
                          .filter(t => t.group === groupName)
                          .map(tz => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Minimum Advance Notice
                </label>
                <select
                  value={schedule.noticeHours}
                  onChange={e => setSchedule(prev => ({ ...prev, noticeHours: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value={4}>4 hours notice</option>
                  <option value={12}>12 hours notice</option>
                  <option value={24}>24 hours (Recommended)</option>
                  <option value={48}>48 hours notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preferred Video Platform
                </label>
                <select
                  value={schedule.meetingPlatform || 'Google Meet'}
                  onChange={e => setSchedule(prev => ({ ...prev, meetingPlatform: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="Google Meet">Google Meet</option>
                  <option value="Zoom">Zoom</option>
                  <option value="In-App Video">In-App Live Video</option>
                  <option value="Discord">Discord Voice/Video</option>
                  <option value="Flexible">Flexible / Discuss in Chat</option>
                </select>
              </div>
            </div>
          </div>

          {/* Weekly Schedule Builder */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Weekly Available Time Windows</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Toggle on the days you want to mentor and configure your active hours.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const dayConfig = schedule.weeklyAvailability.find(d => d.day === key) || {
                  day: key,
                  isEnabled: false,
                  slots: []
                };

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl border transition-all ${
                      dayConfig.isEnabled 
                        ? 'bg-slate-50/80 border-slate-200' 
                        : 'bg-white border-slate-200/60 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`toggle-${key}`}
                          checked={dayConfig.isEnabled}
                          onChange={() => handleToggleDay(key)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor={`toggle-${key}`} className="text-xs font-bold text-slate-800 cursor-pointer min-w-[100px]">
                          {label}
                        </label>
                        {!dayConfig.isEnabled && (
                          <span className="text-[11px] text-slate-400 italic">Unavailable</span>
                        )}
                      </div>

                      {dayConfig.isEnabled && (
                        <div className="flex flex-wrap items-center gap-2.5">
                          {dayConfig.slots.map(slot => (
                            <div key={slot.id} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={e => handleUpdateSlotTime(key, slot.id, 'startTime', e.target.value)}
                                className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
                              />
                              <span className="text-xs text-slate-400 font-bold">–</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={e => handleUpdateSlotTime(key, slot.id, 'endTime', e.target.value)}
                                className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveTimeSlot(key, slot.id)}
                                className="ml-1 text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                                title="Remove time slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddTimeSlot(key)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-dashed border-slate-300"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Window</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Blackout Dates & Blocked Out Times */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="pb-3 border-b border-slate-200">
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-amber-600" />
                <span>Block Out Specific Dates & Times</span>
              </h4>
              <p className="text-xs text-slate-500">
                Prevent bookings during vacations, exams, work sprints, or personal commitments.
              </p>
            </div>

            {blockError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{blockError}</span>
              </div>
            )}

            {/* Add Blockout Form */}
            <form onSubmit={handleAddBlockout} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-800">Add Date Blackout</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={newBlockDate}
                    onChange={e => setNewBlockDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="all-day-check"
                    checked={newBlockAllDay}
                    onChange={e => setNewBlockAllDay(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="all-day-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Block entire day
                  </label>
                </div>

                {!newBlockAllDay && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={newBlockStart}
                      onChange={e => setNewBlockStart(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                    <span className="text-xs text-slate-400 font-bold">to</span>
                    <input
                      type="time"
                      value={newBlockEnd}
                      onChange={e => setNewBlockEnd(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vacation, Exams"
                    value={newBlockReason}
                    onChange={e => setNewBlockReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Blackout Period</span>
                </button>
              </div>
            </form>

            {/* List of active blackout dates */}
            {schedule.blockedPeriods.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">Currently Blocked Dates ({schedule.blockedPeriods.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {schedule.blockedPeriods.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs">
                      <div>
                        <p className="font-bold text-amber-950">{b.date}</p>
                        <p className="text-[11px] text-amber-800">
                          {b.allDay ? 'All day' : `${formatTime12h(b.startTime || '')} - ${formatTime12h(b.endTime || '')}`} • {b.reason || 'Blocked'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockout(b.id)}
                        className="text-amber-700 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove blackout"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No blackout dates added. Your weekly slots remain available continuously.</p>
            )}
          </div>

          {/* Session Formats & Durations */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h4 className="text-base font-extrabold text-slate-900">Session Formats & Durations</h4>
              <p className="text-xs text-slate-500">Pick which session formats and lengths you feel comfortable offering.</p>
            </div>

            {/* Formats */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Supported Session Formats</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FORMAT_OPTIONS.map(fmt => {
                  const isSelected = schedule.preferredFormats.includes(fmt.value);
                  return (
                    <button
                      type="button"
                      key={fmt.value}
                      onClick={() => handleToggleFormat(fmt.value)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/20' 
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {fmt.value === 'VIDEO_CALL' && <Video className="w-4 h-4" />}
                        {fmt.value === 'SCREEN_SHARE' && <Laptop className="w-4 h-4" />}
                        {fmt.value === 'AUDIO_CALL' && <Headphones className="w-4 h-4" />}
                        {fmt.value === 'CHAT' && <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{fmt.label}</p>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{fmt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Durations */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700">Available Session Durations</label>
              <div className="flex flex-wrap gap-2.5">
                {DURATION_OPTIONS.map(dur => {
                  const isSelected = schedule.preferredDurations.includes(dur.value);
                  return (
                    <button
                      type="button"
                      key={dur.value}
                      onClick={() => handleToggleDuration(dur.value)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {dur.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Booking Note */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Personal Note / Guidelines for Mentorship Requests
              </label>
              <textarea
                rows={2}
                value={schedule.customBookingNote || ''}
                onChange={e => setSchedule(prev => ({ ...prev, customBookingNote: e.target.value }))}
                placeholder="e.g. Please share your project repo or question ahead of time so I can review it!"
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Upcoming Booked Sessions List */}
          {myMentorSessions.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>Upcoming Live Mentorship Sessions ({myMentorSessions.length})</span>
                  </h4>
                  <p className="text-xs text-slate-500">Live sessions booked between you and your learning peers.</p>
                </div>
              </div>

              <div className="space-y-3">
                {myMentorSessions.map(sess => {
                  const isMentor = sess.mentorId === currentUser?.id;
                  const otherName = isMentor ? sess.menteeName : sess.mentorName;
                  const isCancelled = sess.status === 'CANCELLED';
                  const isCompleted = sess.status === 'COMPLETED';

                  return (
                    <div key={sess.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isCancelled ? 'bg-red-100 text-red-700' :
                            isCompleted ? 'bg-slate-200 text-slate-700' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {sess.status}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {sess.topic}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            with {otherName} ({isMentor ? 'Mentee' : 'Mentor'})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sess.date} at {formatTime12h(sess.startTime)} – {formatTime12h(sess.endTime)} ({sess.durationMinutes} min)</span>
                        </p>
                        {sess.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">"{sess.notes}"</p>
                        )}
                      </div>

                      {!isCancelled && !isCompleted && (
                        <div className="flex items-center gap-2">
                          <a
                            href={sess.meetingUrl || 'https://meet.google.com/new'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                          >
                            <VideoIcon className="w-3.5 h-3.5" />
                            <span>Join Video Call</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => updateSessionStatus(sess.id, 'COMPLETED')}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Mark Completed"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => updateSessionStatus(sess.id, 'CANCELLED', 'Cancelled by user')}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancel Session"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sticky Save Bar */}
          <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white shadow-xl">
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${schedule.isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              <span className="font-semibold text-slate-200">
                {schedule.isEnabled ? 'Live Mentorship Enabled' : 'Mentorship Disabled'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Mentorship Schedule</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
