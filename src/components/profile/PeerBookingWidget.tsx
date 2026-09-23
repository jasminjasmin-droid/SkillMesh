import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile, SessionFormat, SessionDuration, ScheduledSession } from '../../types';
import { 
  generateNextDays, 
  calculateAvailableSlotsForDate, 
  formatTime12h, 
  FORMAT_OPTIONS,
  createDefaultMentorshipSchedule,
  getUserLocalTimezone
} from '../../utils/schedulingUtils';
import { 
  Calendar, 
  Clock, 
  Video, 
  Laptop, 
  Headphones, 
  MessageSquare, 
  Check, 
  Sparkles, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Send,
  CalendarCheck
} from 'lucide-react';

interface PeerBookingWidgetProps {
  peer: UserProfile;
  onBookingSuccess?: (session?: ScheduledSession) => void;
}

export const PeerBookingWidget: React.FC<PeerBookingWidgetProps> = ({ peer, onBookingSuccess }) => {
  const { currentUser, bookMentorshipSession, scheduledSessions } = useApp();

  const schedule = useMemo(() => {
    if (peer.mentorshipSchedule) return peer.mentorshipSchedule;
    // Provide a gentle default if peer hasn't customized yet
    return createDefaultMentorshipSchedule(peer.location ? undefined : getUserLocalTimezone());
  }, [peer]);

  const daysList = useMemo(() => generateNextDays(14), []);
  const [selectedDate, setSelectedDate] = useState<string>(daysList[0]?.dateStr || '');
  const [selectedDuration, setSelectedDuration] = useState<SessionDuration>(
    schedule.preferredDurations?.[0] || 30
  );
  const [selectedFormat, setSelectedFormat] = useState<SessionFormat>(
    schedule.preferredFormats?.[0] || 'VIDEO_CALL'
  );
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [topic, setTopic] = useState<string>(
    peer.offeredSkills?.[0]?.name ? `Mentorship in ${peer.offeredSkills[0].name}` : 'Skill Sharing & Mentorship'
  );
  const [customTopic, setCustomTopic] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Custom proposal state if peer slots are empty or flexible
  const [customProposedDate, setCustomProposedDate] = useState<string>(daysList[1]?.dateStr || '');
  const [customProposedTime, setCustomProposedTime] = useState<string>('18:00');

  // Calculate available bookable slots for the selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    return calculateAvailableSlotsForDate(schedule, selectedDate, selectedDuration, scheduledSessions);
  }, [schedule, selectedDate, selectedDuration, scheduledSessions]);

  const handleSelectSlot = (slot: { startTime: string; endTime: string }) => {
    setSelectedSlot(slot);
    setBookingError(null);
  };

  const handleBook = () => {
    setBookingError(null);
    if (!currentUser) {
      setBookingError('Please sign in to book a mentorship session with this peer.');
      return;
    }

    if (currentUser.id === peer.id) {
      setBookingError('You cannot book a session with yourself.');
      return;
    }

    const finalTopic = (customTopic.trim() || topic).trim();
    if (!finalTopic) {
      setBookingError('Please specify what topic or skill you would like mentorship on.');
      return;
    }

    let finalDate = selectedDate;
    let finalStartTime = selectedSlot?.startTime;
    let finalEndTime = selectedSlot?.endTime;

    if (!finalStartTime || !finalEndTime) {
      // Use fallback custom proposed slot if slots were empty
      if (!customProposedDate || !customProposedTime) {
        setBookingError('Please select an available time slot.');
        return;
      }
      finalDate = customProposedDate;
      finalStartTime = customProposedTime;
      const [h, m] = customProposedTime.split(':').map(Number);
      const endTotal = h * 60 + m + selectedDuration;
      finalEndTime = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
    }

    setIsSubmitting(true);
    try {
      const res = bookMentorshipSession({
        mentorId: peer.id,
        mentorName: peer.name,
        mentorAvatar: peer.avatarUrl,
        date: finalDate,
        startTime: finalStartTime,
        endTime: finalEndTime,
        durationMinutes: selectedDuration,
        format: selectedFormat,
        topic: finalTopic,
        notes: notes.trim()
      });

      if (res.success) {
        setBookingSuccess(true);
        if (onBookingSuccess) onBookingSuccess(res.session);
      } else {
        setBookingError(res.error || 'Failed to book session. Please try another slot.');
      }
    } catch (err: any) {
      setBookingError(err?.message || 'An error occurred while scheduling.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-center space-y-4 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
          <CalendarCheck className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto">
          <h4 className="text-lg font-black text-slate-900">Mentorship Session Confirmed!</h4>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Your live session with <span className="font-bold text-slate-900">{peer.name}</span> has been added to your calendar and connected into your messages.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 text-left max-w-sm mx-auto space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span>{selectedSlot?.startTime ? formatTime12h(selectedSlot.startTime) : customProposedTime}</span>
            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">{selectedDuration} min</span>
          </div>
          <p className="text-slate-600 text-[11px] font-medium">Topic: <span className="font-semibold text-slate-800">{customTopic || topic}</span></p>
          <p className="text-slate-500 text-[11px]">Format: {selectedFormat.replace('_', ' ')} • {schedule.meetingPlatform || 'Google Meet'}</p>
        </div>

        <button
          onClick={() => {
            setBookingSuccess(false);
            setSelectedSlot(null);
          }}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Book Another Session
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
      {/* Header with status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Open for Live Mentorship</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Book 1-on-1 Mentorship with {peer.name}</span>
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>{schedule.timezone}</span>
        </div>
      </div>

      {schedule.customBookingNote && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 italic">
          "{schedule.customBookingNote}"
        </div>
      )}

      {/* Format & Duration Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Select Session Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FORMAT_OPTIONS.map(fmt => {
              const isPreferred = schedule.preferredFormats.includes(fmt.value);
              const isSelected = selectedFormat === fmt.value;
              return (
                <button
                  type="button"
                  key={fmt.value}
                  onClick={() => setSelectedFormat(fmt.value)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-500/20 shadow-2xs'
                      : isPreferred
                      ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {fmt.value === 'VIDEO_CALL' && <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {fmt.value === 'SCREEN_SHARE' && <Laptop className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {fmt.value === 'AUDIO_CALL' && <Headphones className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {fmt.value === 'CHAT' && <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  <span className="truncate">{fmt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Duration
          </label>
          <div className="flex flex-wrap gap-2">
            {(schedule.preferredDurations.length > 0 ? schedule.preferredDurations : [30, 60]).map(dur => (
              <button
                type="button"
                key={dur}
                onClick={() => setSelectedDuration(dur as SessionDuration)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedDuration === dur
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dur} Minutes
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Carousel (next 14 days) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          Pick a Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {daysList.map(d => {
            const isSelected = selectedDate === d.dateStr;
            return (
              <button
                type="button"
                key={d.dateStr}
                onClick={() => {
                  setSelectedDate(d.dateStr);
                  setSelectedSlot(null);
                }}
                className={`flex-shrink-0 w-20 py-2.5 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {d.dayName}
                </p>
                <p className="text-xs font-black mt-0.5">
                  {d.formattedDate.split(' ')[1] || d.formattedDate}
                </p>
                {d.isToday && (
                  <span className={`text-[9px] font-bold block mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Slots Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">
            Available Time Slots ({availableSlots.length})
          </label>
          <span className="text-[11px] text-slate-500">
            Slots tailored for {selectedDuration}m session
          </span>
        </div>

        {availableSlots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {availableSlots.map(slot => {
              const isSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <button
                  type="button"
                  key={slot.startTime}
                  onClick={() => handleSelectSlot(slot)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{formatTime12h(slot.startTime)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <p className="text-xs text-slate-500">
              No preset time slots on this day. Propose a custom time that fits your schedule:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <input
                type="date"
                value={customProposedDate}
                onChange={e => setCustomProposedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <input
                type="time"
                value={customProposedTime}
                onChange={e => setCustomProposedTime(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                Custom Proposal
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mentorship Topic & Prep Notes */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Mentorship Topic / Skill Focus
          </label>
          {peer.offeredSkills && peer.offeredSkills.length > 0 ? (
            <select
              value={topic}
              onChange={e => {
                setTopic(e.target.value);
                if (e.target.value !== 'CUSTOM') setCustomTopic('');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {peer.offeredSkills.map(sk => (
                <option key={sk.id} value={`Mentorship in ${sk.name} (${sk.proficiency})`}>
                  {sk.name} • {sk.proficiency} ({sk.category})
                </option>
              ))}
              <option value="CUSTOM">Other / Custom Discussion Topic...</option>
            </select>
          ) : (
            <input
              type="text"
              placeholder="e.g. Code Review, System Design advice"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          )}

          {topic === 'CUSTOM' && (
            <input
              type="text"
              placeholder="Specify your topic..."
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              className="mt-2 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Questions or Links for the Mentor (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Share what you are stuck on, repo links, or specific questions..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {bookingError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{bookingError}</span>
        </div>
      )}

      {/* Book Button */}
      <button
        type="button"
        onClick={handleBook}
        disabled={isSubmitting}
        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        <span>
          {isSubmitting ? 'Confirming Session...' : `Book Live Mentorship Session (${selectedDuration}m)`}
        </span>
      </button>
    </div>
  );
};
