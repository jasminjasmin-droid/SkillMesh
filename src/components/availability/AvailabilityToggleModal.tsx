import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LiveAvailabilityStatus, LiveAvailabilityMode } from '../../types';
import { 
  POPULAR_TIMEZONES, 
  getUserLocalTimezone, 
  formatUserCurrentTime, 
  getTimezoneShortOffset 
} from '../../utils/timezoneUtils';
import { 
  Radio, 
  X, 
  Check, 
  Clock, 
  Sparkles, 
  Globe, 
  HeartHandshake, 
  ArrowRightLeft, 
  ShieldCheck, 
  Info 
} from 'lucide-react';

interface AvailabilityToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AvailabilityToggleModal: React.FC<AvailabilityToggleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUserAvailability, toggleAvailability, updateUserTimezone, currentUser } = useApp();

  const [status, setStatus] = useState<LiveAvailabilityStatus>(
    currentUserAvailability?.status || 'AVAILABLE'
  );
  const [mode, setMode] = useState<LiveAvailabilityMode>(
    currentUserAvailability?.mode || 'BOTH'
  );
  const [customStatus, setCustomStatus] = useState(
    currentUserAvailability?.customStatus || ''
  );
  const [timezone, setTimezone] = useState(
    currentUserAvailability?.timezone || currentUser?.timezone || getUserLocalTimezone()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await toggleAvailability(status, mode, customStatus.trim() || undefined);
      if (timezone !== currentUserAvailability?.timezone) {
        await updateUserTimezone(timezone);
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.warn('Failed to update availability:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoDetectTimezone = () => {
    const detected = getUserLocalTimezone();
    setTimezone(detected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}>
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Live Availability & Mentorship Status</h2>
              <p className="text-xs text-slate-500">Control your real-time peer visibility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Status Toggle */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Current Live Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-status-available"
                onClick={() => setStatus('AVAILABLE')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col gap-2 ${
                  status === 'AVAILABLE'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-bold text-slate-900">Available now</span>
                  </div>
                  {status === 'AVAILABLE' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Visible to peers for instant chats, calls, and session requests.
                </p>
              </button>

              <button
                type="button"
                id="btn-status-unavailable"
                onClick={() => setStatus('UNAVAILABLE')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col gap-2 ${
                  status === 'UNAVAILABLE'
                    ? 'border-slate-700 bg-slate-100 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-bold text-slate-700">Not available</span>
                  </div>
                  {status === 'UNAVAILABLE' && <Check className="w-4 h-4 text-slate-700" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Appear offline. Peers can still leave messages or async requests.
                </p>
              </button>
            </div>
          </div>

          {/* Mode Selection (Only if Available) */}
          {status === 'AVAILABLE' && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                What are you available for?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  id="mode-exchange"
                  onClick={() => setMode('SKILL_EXCHANGE')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    mode === 'SKILL_EXCHANGE'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs">Skill Exchange</span>
                </button>

                <button
                  type="button"
                  id="mode-mentorship"
                  onClick={() => setMode('MENTORSHIP')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    mode === 'MENTORSHIP'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs">Mentorship</span>
                </button>

                <button
                  type="button"
                  id="mode-both"
                  onClick={() => setMode('BOTH')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    mode === 'BOTH'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs">Both</span>
                </button>
              </div>
            </div>
          )}

          {/* Custom Status Message */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Custom Status Note <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              id="input-custom-status"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g. Free for the next 2 hours &bull; Reviewing React code"
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs text-slate-800 placeholder:text-slate-400"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
              <span>Short headline peers see on your match card</span>
              <span>{customStatus.length}/80</span>
            </div>
          </div>

          {/* Timezone Configuration */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Primary Timezone</span>
              </label>
              <button
                type="button"
                onClick={handleAutoDetectTimezone}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer flex items-center gap-1"
              >
                <span>Auto-detect</span>
              </button>
            </div>

            <div className="relative">
              <select
                id="select-availability-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              >
                {POPULAR_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.value} - {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Local clock for this timezone:</span>
              </span>
              <span className="font-mono font-bold text-emerald-700">
                {formatUserCurrentTime(timezone)} ({getTimezoneShortOffset(timezone)})
              </span>
            </div>
          </div>

          {/* Safe Notice */}
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex items-start gap-2.5 text-[11px] text-amber-900 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Your status automatically reverts to offline when you close your browser tab or become inactive for over 10 minutes, protecting your privacy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-save-availability"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Updated!</span>
              </>
            ) : isSaving ? (
              <span>Saving...</span>
            ) : (
              <span>Save Live Status</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
