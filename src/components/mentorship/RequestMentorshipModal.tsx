import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile } from '../../types';
import { 
  HeartHandshake, 
  X, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Calendar, 
  Send, 
  Clock, 
  Award, 
  Compass, 
  AlertCircle 
} from 'lucide-react';
import { LiveAvailabilityBadge } from '../availability/LiveAvailabilityBadge';

interface RequestMentorshipModalProps {
  mentor: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RequestMentorshipModal: React.FC<RequestMentorshipModalProps> = ({
  mentor,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { sendMentorshipRequest, currentUser } = useApp();

  const [topic, setTopic] = useState(
    mentor.offeredSkills?.[0]?.name || ''
  );
  const [experienceLevel, setExperienceLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [sessionStyle, setSessionStyle] = useState('1-on-1 Guidance & Roadmap');
  const [preferredAvailability, setPreferredAvailability] = useState('Evenings / Weekends');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMsg('Please specify what you want to learn or achieve.');
      return;
    }
    if (!message.trim() || message.trim().length < 15) {
      setErrorMsg('Please share a short explanation (at least 15 characters) about your goals.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await sendMentorshipRequest({
        mentorId: mentor.id,
        topic: topic.trim(),
        message: message.trim(),
        experienceLevel,
        sessionStyle,
        preferredAvailability,
      });

      if (res.success) {
        setIsDone(true);
        setTimeout(() => {
          setIsDone(false);
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Failed to send mentorship request. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Request Mentorship</h2>
              <p className="text-xs text-slate-500">Structured one-way peer guidance & learning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[78vh] overflow-y-auto space-y-5">
          {/* Mentor Profile Snapshot */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <img
              src={mentor.avatarUrl}
              alt={mentor.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">{mentor.name}</h3>
                <LiveAvailabilityBadge 
                  availability={{
                    status: mentor.availabilityStatus,
                    mode: mentor.availabilityMode,
                    timezone: mentor.timezone
                  }}
                  size="sm"
                />
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{mentor.titleOrRole}</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isDone ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Mentorship Request Sent!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {mentor.name} will be notified immediately. Once accepted, your private 1-on-1 mentorship workspace with voice calling will be active.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Topic / Learning Goal */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Mentorship Goal / Topic *
                </label>
                {mentor.offeredSkills && mentor.offeredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {mentor.offeredSkills.map(skill => (
                      <button
                        type="button"
                        key={skill.id}
                        onClick={() => setTopic(skill.name)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          topic.toLowerCase() === skill.name.toLowerCase()
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  id="input-mentorship-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Modern React Architecture, Career Advice, Docker Deployment"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs text-slate-800"
                  required
                />
              </div>

              {/* Current Level & Session Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Your Experience Level
                  </label>
                  <select
                    id="select-mentorship-level"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="BEGINNER">Beginner (Starting from scratch)</option>
                    <option value="INTERMEDIATE">Intermediate (Need refinement)</option>
                    <option value="ADVANCED">Advanced (Deep dive / Architecture)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Desired Session Style
                  </label>
                  <select
                    id="select-mentorship-style"
                    value={sessionStyle}
                    onChange={(e) => setSessionStyle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="1-on-1 Guidance & Roadmap">1-on-1 Guidance & Roadmap</option>
                    <option value="Code Review & Best Practices">Code Review & Feedback</option>
                    <option value="Q&A & Career Strategy">Q&A & Career Strategy</option>
                    <option value="Hands-on Pair Programming">Hands-on Pair Programming</option>
                  </select>
                </div>
              </div>

              {/* Preferred Timeslot / Availability */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Preferred Availability / Timeslot
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['Weekday Evenings', 'Weekends', 'Flexible Anytime'].map(time => (
                    <button
                      type="button"
                      key={time}
                      onClick={() => setPreferredAvailability(time)}
                      className={`p-2 rounded-xl text-xs font-medium border text-center transition-colors cursor-pointer ${
                        preferredAvailability === time
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Message / Note */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Introduce Yourself & Your Goal *
                </label>
                <textarea
                  id="input-mentorship-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder={`Hi ${mentor.name}, I am looking for guidance on ${topic || 'your specialization'}. Specifically, I would love help with...`}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs text-slate-800 resize-none leading-relaxed"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Be clear about what you're working on and what kind of feedback will help you most.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-mentorship-request"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending...' : 'Send Mentorship Request'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
