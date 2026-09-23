import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Music, Volume2 } from 'lucide-react';
import { ChatAttachment } from '../../types';

interface VoiceNotePlayerProps {
  attachment: ChatAttachment;
  isSender?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  attachment,
  isSender = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment.duration || 0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Audio playback error:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = Number(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`mt-2 p-3 rounded-2xl border transition-all ${
        isSender 
          ? 'bg-emerald-700/40 border-emerald-500/40 text-white' 
          : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Play / Pause Circular Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer ${
            isSender
              ? 'bg-white text-emerald-800 hover:bg-emerald-50'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
          title={isPlaying ? 'Pause' : 'Play voice note'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Audio Visualizer / Scrubber */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className={isSender ? 'text-emerald-100' : 'text-slate-600'}>
              {formatTime(currentTime)}
            </span>
            <span className={isSender ? 'text-emerald-200/80' : 'text-slate-400'}>
              {formatTime(duration)}
            </span>
          </div>

          <div className="relative flex items-center">
            {/* Custom scrubber range input */}
            <input
              type="range"
              min={0}
              max={duration || 1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200/60 accent-emerald-500"
            />
          </div>
        </div>

        {/* Download Voice Note */}
        {attachment.dataUrl && (
          <a
            href={attachment.dataUrl}
            download={attachment.name || 'Voice_Note.webm'}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              isSender 
                ? 'hover:bg-white/20 text-emerald-100' 
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
            title="Download Voice Note"
          >
            <Download className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Hidden HTML5 Audio Element */}
      <audio ref={audioRef} src={attachment.dataUrl} preload="metadata" />
    </div>
  );
};
