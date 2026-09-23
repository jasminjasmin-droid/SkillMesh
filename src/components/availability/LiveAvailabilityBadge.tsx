import React from 'react';
import { UserLiveAvailability, LiveAvailabilityStatus, LiveAvailabilityMode } from '../../types';
import { getTimezoneShortOffset, formatUserCurrentTime } from '../../utils/timezoneUtils';
import { Clock, Radio, Sparkles, HeartHandshake, ArrowRightLeft } from 'lucide-react';

interface LiveAvailabilityBadgeProps {
  availability?: UserLiveAvailability | {
    status?: LiveAvailabilityStatus;
    mode?: LiveAvailabilityMode;
    timezone?: string;
    customStatus?: string;
  };
  showTimezone?: boolean;
  showMode?: boolean;
  showCustomStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const LiveAvailabilityBadge: React.FC<LiveAvailabilityBadgeProps> = ({
  availability,
  showTimezone = false,
  showMode = false,
  showCustomStatus = false,
  size = 'md',
  interactive = false,
  onClick,
  className = '',
}) => {
  const isAvailable = availability?.status === 'AVAILABLE';
  const mode = availability?.mode || 'BOTH';
  const timezone = availability?.timezone || 'UTC';
  const customStatus = availability?.customStatus;

  const isExchangeMode = mode === 'SKILL_EXCHANGE' || (mode as string) === 'EXCHANGE';
  const modeLabel = 
    mode === 'MENTORSHIP' ? 'Mentorship' :
    isExchangeMode ? 'Exchange' : 'Any';

  const modeIcon = 
    mode === 'MENTORSHIP' ? HeartHandshake :
    isExchangeMode ? ArrowRightLeft : Sparkles;

  const ModeIconComp = modeIcon;

  if (size === 'sm') {
    return (
      <div 
        onClick={interactive ? onClick : undefined}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
          interactive ? 'cursor-pointer hover:opacity-90' : ''
        } ${
          isAvailable 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' 
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        } ${className}`}
        title={isAvailable ? `Available now (${modeLabel})` : 'Offline / Unavailable'}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          {isAvailable && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
        </span>
        <span>{isAvailable ? 'Available' : 'Offline'}</span>
        {isAvailable && showMode && (
          <span className="text-[10px] text-emerald-700/80 font-medium">({modeLabel})</span>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={interactive ? onClick : undefined}
      className={`inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all ${
        interactive ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400/40 hover:shadow-xs' : ''
      } ${
        isAvailable 
          ? 'bg-emerald-50/90 text-emerald-900 border border-emerald-200 shadow-2xs' 
          : 'bg-slate-100 text-slate-600 border border-slate-200/80'
      } ${className}`}
    >
      <div className="flex items-center gap-1.5 font-bold">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {isAvailable && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
        </span>
        <span>{isAvailable ? 'Available now' : 'Not available'}</span>
      </div>

      {isAvailable && showMode && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800">
          <ModeIconComp className="w-3 h-3 text-emerald-600" />
          <span>{mode === 'BOTH' ? 'Exchange & Mentorship' : mode === 'MENTORSHIP' ? 'Mentorship only' : 'Exchange only'}</span>
        </span>
      )}

      {showCustomStatus && customStatus && (
        <span className="text-[11px] text-slate-600 italic border-l border-emerald-200 pl-1.5">
          "{customStatus}"
        </span>
      )}

      {showTimezone && timezone && (
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono border-l border-slate-200 pl-1.5" title={`Timezone: ${timezone}`}>
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{getTimezoneShortOffset(timezone)} &bull; {formatUserCurrentTime(timezone)}</span>
        </div>
      )}
    </div>
  );
};
