import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  HeartHandshake, 
  Sparkles, 
  MessageSquare, 
  Phone, 
  Video, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  BookOpen, 
  Plus, 
  User, 
  Search, 
  Radio, 
  ArrowLeft,
  Check
} from 'lucide-react';
import { LiveAvailabilityBadge } from '../availability/LiveAvailabilityBadge';
import { AvailabilityToggleModal } from '../availability/AvailabilityToggleModal';

export const MentorshipHubPage: React.FC = () => {
  const { 
    currentUser, 
    mentorshipRequests, 
    activeMentorships, 
    respondToMentorshipRequest, 
    updateMentorshipStatus, 
    startCall, 
    openChatWithUser, 
    setCurrentView,
    getUserAvailabilityStatus,
    allUsers
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'REQUESTS'>('ACTIVE');
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm space-y-4">
          <HeartHandshake className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Sign in to Access Mentorship</h2>
          <p className="text-xs text-slate-500">Connect with experienced mentors and guide ambitious learners.</p>
          <button
            onClick={() => setCurrentView('login')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const incomingRequests = mentorshipRequests.incoming || [];
  const outgoingRequests = mentorshipRequests.outgoing || [];
  const totalPending = incomingRequests.filter(r => r.status === 'PENDING').length;

  const handleRespond = async (requestId: string, action: 'ACCEPT' | 'DECLINE' | 'CANCEL') => {
    const res = await respondToMentorshipRequest(requestId, action);
    if (res.success) {
      setActionNotice(
        action === 'ACCEPT' ? 'Mentorship accepted! You can now chat and call.' :
        action === 'DECLINE' ? 'Request declined.' : 'Request cancelled.'
      );
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleCompleteMentorship = async (mentorshipId: string) => {
    const res = await updateMentorshipStatus(mentorshipId, 'COMPLETED', 'Mentorship successfully finished.');
    if (res.success) {
      setActionNotice('Mentorship marked as completed! Great learning journey.');
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                <span>Peer Mentorship Hub</span>
              </span>
              <LiveAvailabilityBadge 
                availability={{
                  status: currentUser.availabilityStatus,
                  mode: currentUser.availabilityMode,
                  timezone: currentUser.timezone,
                  customStatus: currentUser.activeProjectDescription
                }}
                interactive
                onClick={() => setShowAvailabilityModal(true)}
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Guided 1-on-1 Learning & Mentorship
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Step beyond symmetric skill swaps. Guide mentees on specialized technical roadmaps or request guidance from vetted peers. Includes live audio/video calling and dedicated progress tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <button
              onClick={() => setShowAvailabilityModal(true)}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span>Set My Availability</span>
            </button>
            <button
              onClick={() => setCurrentView('matches')}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find a Mentor</span>
            </button>
          </div>

          {/* Decorative background circle */}
          <div className="absolute right-0 -bottom-12 w-64 h-64 rounded-full bg-emerald-50/60 pointer-events-none -z-0"></div>
        </div>

        {/* Action feedback notice */}
        {actionNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Active Mentorships ({activeMentorships.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('REQUESTS')}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'REQUESTS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Requests</span>
              {totalPending > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {totalPending}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'REQUESTS' && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['ALL', 'INCOMING', 'OUTGOING'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRequestFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    requestFilter === tab
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'INCOMING' ? `Incoming (${incomingRequests.length})` : `Outgoing (${outgoingRequests.length})`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab 1: Active Mentorships */}
        {activeTab === 'ACTIVE' && (
          <div className="space-y-4">
            {activeMentorships.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <HeartHandshake className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Active Mentorships Yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You are not currently enrolled in any active mentorship relationships. Request mentorship from an experienced peer or accept incoming requests to start.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => setCurrentView('matches')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-colors cursor-pointer"
                  >
                    Browse Available Mentors
                  </button>
                  <button
                    onClick={() => setActiveTab('REQUESTS')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Check Requests ({totalPending})
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeMentorships.map(mentorship => {
                  const isMentor = mentorship.mentorId === currentUser.id;
                  const partnerId = isMentor ? mentorship.menteeId : mentorship.mentorId;
                  const partnerName = isMentor ? mentorship.menteeName : mentorship.mentorName;
                  const partnerAvatar = isMentor ? mentorship.menteeAvatar : mentorship.mentorAvatar;
                  const partnerAvailability = getUserAvailabilityStatus(partnerId);

                  return (
                    <div
                      key={mentorship.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-emerald-200 transition-colors"
                    >
                      {/* Partner Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={partnerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                            alt={partnerName}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{partnerName}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isMentor ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isMentor ? 'Your Mentee' : 'Your Mentor'}
                              </span>
                            </div>
                            <div className="mt-1">
                              <LiveAvailabilityBadge availability={partnerAvailability} size="sm" showTimezone />
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                          {mentorship.status}
                        </span>
                      </div>

                      {/* Topic & Details */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">Focus Topic:</span>
                          <span className="font-extrabold text-emerald-700">{mentorship.topic}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Total Sessions Completed:</span>
                          <span className="font-mono font-bold text-slate-700">{mentorship.completedSessionsCount || 0}</span>
                        </div>
                        {mentorship.nextSessionDate && (
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Next Session:</span>
                            <span className="font-medium text-slate-700">{mentorship.nextSessionDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Bar: Chat, Audio Call, Video Call, Complete */}
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openChatWithUser(partnerId)}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                            title="Open 1-on-1 Chat"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">Chat</span>
                          </button>

                          <button
                            onClick={() => startCall(partnerId, 'VOICE')}
                            className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                            title="Start Voice Call"
                          >
                            <Phone className="w-4 h-4" />
                            <span className="hidden sm:inline">Call</span>
                          </button>

                          <button
                            onClick={() => startCall(partnerId, 'VIDEO')}
                            className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                            title="Start Video Call"
                          >
                            <Video className="w-4 h-4" />
                            <span className="hidden sm:inline">Video</span>
                          </button>
                        </div>

                        {mentorship.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCompleteMentorship(mentorship.id)}
                            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-600 hover:text-emerald-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Requests Management */}
        {activeTab === 'REQUESTS' && (
          <div className="space-y-6">
            {/* Incoming Requests Section */}
            {(requestFilter === 'ALL' || requestFilter === 'INCOMING') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                    Incoming Mentorship Requests ({incomingRequests.length})
                  </h3>
                  <span className="text-xs text-slate-400">Peers who want you as their mentor</span>
                </div>

                {incomingRequests.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    No incoming mentorship requests at this time. Make sure your availability is turned on!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {incomingRequests.map(req => {
                      const menteeAvailability = getUserAvailabilityStatus(req.menteeId);

                      return (
                        <div
                          key={req.id}
                          className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={req.menteeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                                alt={req.menteeName}
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-slate-900">{req.menteeName}</h4>
                                  <LiveAvailabilityBadge availability={menteeAvailability} size="sm" />
                                </div>
                                <p className="text-xs text-slate-500">
                                  Wants mentorship on <strong className="text-emerald-700">{req.topic}</strong> &bull; Level: {req.experienceLevel || 'Beginner'}
                                </p>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                              req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {req.status}
                            </span>
                          </div>

                          {/* Message from mentee */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                            <p className="font-semibold text-slate-900 mb-1">Mentee's Goals & Notes:</p>
                            <p>{req.message}</p>
                            {req.sessionStyle && (
                              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-4 text-[11px] text-slate-500">
                                <span>Style: <strong>{req.sessionStyle}</strong></span>
                                {req.preferredAvailability && <span>Availability: <strong>{req.preferredAvailability}</strong></span>}
                              </div>
                            )}
                          </div>

                          {/* Accept / Decline actions */}
                          {req.status === 'PENDING' && (
                            <div className="pt-1 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRespond(req.id, 'DECLINE')}
                                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleRespond(req.id, 'ACCEPT')}
                                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Accept Mentorship</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Outgoing Requests Section */}
            {(requestFilter === 'ALL' || requestFilter === 'OUTGOING') && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                    Outgoing Mentorship Requests ({outgoingRequests.length})
                  </h3>
                  <span className="text-xs text-slate-400">Mentors you have reached out to</span>
                </div>

                {outgoingRequests.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    You haven't requested mentorship from any mentors yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {outgoingRequests.map(req => (
                      <div
                        key={req.id}
                        className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={req.mentorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                              alt={req.mentorName}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                            />
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{req.mentorName}</h4>
                              <p className="text-xs text-slate-500">
                                Topic: <strong className="text-emerald-700">{req.topic}</strong>
                              </p>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                            req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                          <p className="italic">"{req.message}"</p>
                        </div>

                        {req.status === 'PENDING' && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleRespond(req.id, 'CANCEL')}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-500 transition-colors cursor-pointer"
                            >
                              Cancel Request
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Global Availability Toggle Modal */}
      {showAvailabilityModal && (
        <AvailabilityToggleModal
          isOpen={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(false)}
        />
      )}
    </div>
  );
};
