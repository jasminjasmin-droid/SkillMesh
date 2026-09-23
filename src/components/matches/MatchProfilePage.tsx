import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateUserMatch } from '../../utils/matchingEngine';
import { 
  ArrowLeft, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Send, 
  CheckCircle, 
  ExternalLink, 
  Award, 
  UserCheck, 
  Share2,
  ShieldAlert,
  ArrowRightLeft,
  Compass,
  ShieldBan,
  Flag,
  MoreHorizontal,
  MessageSquare,
  Clock,
  Linkedin,
  Github,
  Globe,
  Users,
  BookOpen,
  HeartHandshake,
  CalendarCheck2,
  AlertCircle,
  Star,
  FolderGit2,
  ShieldCheck
} from 'lucide-react';
import { 
  MatchTypeBadge, 
  ProficiencyBadge, 
  TeachingConfidenceBadge, 
  SelfDeclaredNotice,
  SupportingLinkButton,
  UserStatusBadge,
  SkillEvidenceCard,
  VerifiedTickBadge
} from '../common/Badges';
import { PeerBookingWidget } from '../profile/PeerBookingWidget';
import { UserReputationSection } from '../profile/UserReputationSection';
import { ProjectsPortfolioSection } from '../profile/ProjectsPortfolioSection';
import { BlockUserModal, ReportUserModal } from '../common/SafetyModals';
import { ReportReason, UserProfile, RatingSummary } from '../../types';
import { fetchPublicUserProfile, fetchUserRatings } from '../../services/supabaseClient';
import { getSkillMeshUserId } from '../../utils/skillmeshId';

export const MatchProfilePage: React.FC = () => {
  const { 
    selectedMatchUser, 
    selectedProfileUserId,
    selectedMatchResult, 
    currentUser, 
    handleBackFromProfile, 
    setConnectModalTarget,
    connections,
    allUsers,
    blockUser,
    reportUser,
    isUserBlocked,
    isCurrentUserSuspended,
    getActiveConnectionWithUser,
    getPendingRequestWithUser,
    openChatForConnection
  } = useApp();

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Asynchronous profile state
  const [fetchedPublicData, setFetchedPublicData] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileNotFound, setProfileNotFound] = useState<boolean>(false);

  // Determine effective user ID from selected user or URL pathname
  const routeUserId = typeof window !== 'undefined' && window.location.pathname.startsWith('/profile/')
    ? window.location.pathname.replace('/profile/', '').split('/')[0].split('?')[0]
    : null;
  const effectiveUserId = selectedProfileUserId || selectedMatchUser?.id || routeUserId;

  // Resolve peer either from local state/allUsers or fetch from public profile API
  useEffect(() => {
    let isCancelled = false;

    const resolveProfile = async () => {
      if (!effectiveUserId) {
        setProfileNotFound(true);
        return;
      }

      // 1. Check if we already have selectedMatchUser matching effectiveUserId
      if (selectedMatchUser && selectedMatchUser.id === effectiveUserId) {
        setIsLoadingProfile(false);
        setProfileNotFound(false);
        return;
      }

      // 2. Check if allUsers contains the user
      const existingInAll = allUsers.find(u => u.id === effectiveUserId);
      if (existingInAll) {
        setFetchedPublicData({ profile: existingInAll, exchangeHistory: [] });
        setIsLoadingProfile(false);
        setProfileNotFound(false);
        return;
      }

      // 3. Fetch from public profile API
      setIsLoadingProfile(true);
      setProfileNotFound(false);
      try {
        const result = await fetchPublicUserProfile(effectiveUserId);
        if (isCancelled) return;

        if (result && result.profile) {
          setFetchedPublicData(result);
          setProfileNotFound(false);
        } else {
          setProfileNotFound(true);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Error fetching public user profile:', err);
          setProfileNotFound(true);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    resolveProfile();

    return () => {
      isCancelled = true;
    };
  }, [effectiveUserId, selectedMatchUser, allUsers]);

  // Loading skeleton screen
  if (isLoadingProfile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-28 h-8 bg-slate-200 rounded-xl animate-pulse" />
            <div className="w-20 h-8 bg-slate-200 rounded-xl animate-pulse" />
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
            <div className="h-44 bg-slate-200" />
            <div className="p-8 pt-0 -mt-14 space-y-4">
              <div className="w-24 h-24 rounded-2xl bg-slate-300 ring-4 ring-white" />
              <div className="w-48 h-6 bg-slate-200 rounded-lg" />
              <div className="w-72 h-4 bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4 animate-pulse">
            <div className="w-40 h-5 bg-slate-200 rounded-lg" />
            <div className="h-20 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Not found / Profile Unavailable screen
  const peer = selectedMatchUser && selectedMatchUser.id === effectiveUserId
    ? selectedMatchUser
    : (fetchedPublicData?.profile as UserProfile | undefined);

  if (profileNotFound || !peer) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Profile Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This peer profile could not be found or has been removed from SkillMesh.
          </p>
          <button
            id="back-to-community-btn"
            onClick={handleBackFromProfile}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            Return to Community
          </button>
        </div>
      </div>
    );
  }

  const isBlocked = isUserBlocked(peer.id);
  const activeConnection = getActiveConnectionWithUser(peer.id);
  const pendingInfo = getPendingRequestWithUser(peer.id);
  const matchResult = selectedMatchResult || (currentUser ? calculateUserMatch(currentUser, peer) : null);

  const [peerRatingSummary, setPeerRatingSummary] = useState<RatingSummary | null>(null);

  useEffect(() => {
    if (!peer?.id) return;
    let isCancelled = false;
    fetchUserRatings(peer.id).then((result) => {
      if (!isCancelled && result?.summary) {
        setPeerRatingSummary(result.summary);
      }
    }).catch(console.warn);
    return () => { isCancelled = true; };
  }, [peer?.id]);

  const completedExchangesCount = fetchedPublicData?.exchangeHistory?.length || 
    (connections ? connections.filter(c => 
      (c.senderId === peer.id || c.receiverId === peer.id) && 
      (c.status === 'ACCEPTED' || c.status === 'ENDED')
    ).length : 0);

  const handleConfirmBlock = () => {
    const res = blockUser(peer.id, 'Blocked from profile page');
    setShowBlockModal(false);
    if (res.success) {
      setFeedbackToast(`${peer.name} has been blocked.`);
    }
  };

  const handleConfirmReport = (
    reason: ReportReason, 
    reasonLabel: string, 
    description: string, 
    alsoBlock: boolean
  ) => {
    reportUser(peer.id, reason, reasonLabel, description);
    if (alsoBlock) {
      blockUser(peer.id, `Reported for ${reasonLabel}`);
    }
    setShowReportModal(false);
    setFeedbackToast('Report submitted for moderation review.');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 relative py-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle Geometric Page Background Patterns */}
      <div className="absolute inset-0 bg-pattern-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pattern-dots-emerald opacity-25 mask-radial-fade pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative">
        
        {/* Toast */}
        {feedbackToast && (
          <div className="p-4 bg-emerald-600 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center justify-between animate-in fade-in">
            <span>{feedbackToast}</span>
            <button onClick={() => setFeedbackToast(null)} className="text-emerald-200 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Back navigation & Safety menu */}
        <div className="flex items-center justify-between">
          <button
            id="back-to-matches-btn"
            onClick={handleBackFromProfile}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Report user"
            >
              <Flag className="w-3.5 h-3.5 text-rose-500" />
              <span>Report</span>
            </button>
            <button
              onClick={() => setShowBlockModal(true)}
              className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Block user"
            >
              <ShieldBan className="w-3.5 h-3.5" />
              <span>Block</span>
            </button>
          </div>
        </div>

        {/* Blocked banner if applicable */}
        {isBlocked && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
            <ShieldBan className="w-5 h-5 text-rose-600 shrink-0" />
            <span>You have blocked communications with {peer.name}. Exchange proposals and private messages are disabled.</span>
          </div>
        )}

        {/* Profile Hero Header Card with Cover Mesh Banner & Geometric Grid Overlay */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm relative">
          {/* Cover Banner */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900">
            <img
              src={peer.bannerUrl || "/src/assets/images/profile_banner_mesh_1788511745598.jpg"}
              alt="Profile Cover"
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
            {/* Subtle Geometric Dark Grid Texture on Banner */}
            <div className="absolute inset-0 bg-pattern-grid-dark opacity-35 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-emerald-950/40 to-transparent" />
            
            {/* Quick Mentorship Availability Tag on Cover */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all backdrop-blur-md flex items-center gap-2 shadow-md ${
                peer.mentorshipSchedule?.isEnabled
                  ? 'bg-emerald-500/95 text-slate-950'
                  : 'bg-slate-900/80 text-slate-300 border border-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${peer.mentorshipSchedule?.isEnabled ? 'bg-slate-950 animate-pulse' : 'bg-slate-500'}`} />
                <span>{peer.mentorshipSchedule?.isEnabled ? '🟢 Available for 1-on-1 Sessions' : '⚪ Not Currently Scheduling'}</span>
              </span>
            </div>
          </div>

          {/* Body Content with Overlapping Avatar & Geometric Watermark */}
          <div className="p-6 sm:p-8 pt-0 relative">
            <div className="absolute top-0 right-0 w-64 h-32 bg-pattern-dots opacity-20 pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-14 sm:-mt-16 mb-4 relative z-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white ring-4 ring-white shadow-xl shrink-0">
                  <img
                    src={peer.avatarUrl}
                    alt={peer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1.5 pb-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                      <span>{peer.name}</span>
                      <VerifiedTickBadge isVerified={peer.isVerified} size="md" verifiedBy={peer.verifiedBy} />
                    </h1>
                    {peer.isVerified ? (
                      <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        Verified Member
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                        Standard Member
                      </span>
                    )}
                    <span 
                      id="peer-profile-skillmesh-id"
                      className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold px-2 py-0.5 rounded-full shadow-2xs"
                      title="SkillMesh Member ID"
                    >
                      ID: {getSkillMeshUserId(peer)}
                    </span>
                    {matchResult && (
                      <MatchTypeBadge matchType={matchResult.matchType} />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">{peer.titleOrRole}</p>

                  {/* Rating & Review Count Header Chip */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    <a
                      href="#user-reputation-and-reviews"
                      id="peer-header-rating-badge"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/90 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title="Jump to reviews & ratings"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>
                        {peerRatingSummary && peerRatingSummary.totalRatings > 0
                          ? `${peerRatingSummary.averageRating.toFixed(1)} / 5.0`
                          : 'New Member'}
                      </span>
                      <span className="text-amber-800/80 font-medium">
                        · {peerRatingSummary?.totalRatings || 0} {peerRatingSummary?.totalRatings === 1 ? 'peer review' : 'peer reviews'}
                      </span>
                    </a>

                    {peer.timezone && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{peer.timezone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
                {peer.mentorshipSchedule?.isEnabled && !isBlocked && (
                  <a
                    href="#mentorship-booking-section"
                    className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Book Session</span>
                  </a>
                )}

                {isBlocked ? (
                  <div className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">
                    User Blocked
                  </div>
                ) : activeConnection ? (
                  <button
                    id="profile-hero-chat-btn"
                    onClick={() => openChatForConnection(activeConnection.id)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/20 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open Active Chat</span>
                  </button>
                ) : pendingInfo?.isIncoming ? (
                  <button
                    id="profile-hero-review-btn"
                    onClick={() => setConnectModalTarget(peer)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Review Request</span>
                  </button>
                ) : pendingInfo?.isOutgoing ? (
                  <div className="px-5 py-2.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Request Pending</span>
                  </div>
                ) : isCurrentUserSuspended ? (
                  <div className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold border border-slate-200">
                    Restricted
                  </div>
                ) : (
                  <button
                    id="profile-hero-connect-btn"
                    onClick={() => setConnectModalTarget(peer)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Request Exchange</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status and Details Row */}
            <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
              <UserStatusBadge
                status={peer.status || 'STUDENT'}
                institutionName={peer.institutionName}
                organizationName={peer.organizationName}
                occupationDetails={peer.occupationDetails}
              />

              {peer.location && (
                <span className="flex items-center gap-1 font-medium text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {peer.location}
                </span>
              )}
              <span className="flex items-center gap-1 font-medium text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Member since {peer.joinedDate}
              </span>

              {/* Professional Links */}
              {(peer.linkedinUrl || peer.githubUrl || peer.portfolioUrl) && (
                <div className="flex flex-wrap items-center gap-3 text-xs ml-auto">
                  {peer.linkedinUrl && (
                    <a
                      href={peer.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {peer.githubUrl && (
                    <a
                      href={peer.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-800 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {peer.portfolioUrl && (
                    <a
                      href={peer.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Portfolio</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Bio paragraph */}
            {peer.bio && (
              <div className="mt-5 pt-5 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">About {peer.name.split(' ')[0]}</h3>
                <p>{peer.bio}</p>
              </div>
            )}

            {/* Match Purpose / Intent Badges */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open to Connection Purposes:</h4>
              <div className="flex flex-wrap items-center gap-2">
                {(peer.matchPurposes && peer.matchPurposes.length > 0 ? peer.matchPurposes : ['learn_skill', 'teach_skill', 'exchange_skills', 'project_collaboration']).map(p => {
                  if (p === 'project_collaboration') {
                    return (
                      <span key={p} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                        Project Collaboration
                      </span>
                    );
                  }
                  if (p === 'exchange_skills') {
                    return (
                      <span key={p} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                        Skill Exchange
                      </span>
                    );
                  }
                  if (p === 'teach_skill') {
                    return (
                      <span key={p} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                        Teaching & Mentoring
                      </span>
                    );
                  }
                  return (
                    <span key={p} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                      <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                      Learning New Skills
                    </span>
                  );
                })}
              </div>

              {/* Active Project / Idea Highlights */}
              {peer.activeProjectDescription && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>Current Project / Idea:</span>
                  </div>
                  <p className="italic text-amber-900/90 leading-relaxed">"{peer.activeProjectDescription}"</p>
                  {peer.collaborationInterests && peer.collaborationInterests.length > 0 && (
                    <p className="text-[11px] text-amber-800 font-semibold pt-1">
                      Looking for synergies with: {peer.collaborationInterests.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SkillMesh Journey & Stats Card */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="p-2 text-center border-r border-slate-100">
            <div className="text-xl sm:text-2xl font-black text-slate-900">{completedExchangesCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Exchanges</div>
          </div>
          <div className="p-2 text-center border-r border-slate-100">
            <div className="text-xl sm:text-2xl font-black text-emerald-700">{peer.offeredSkills.length}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Teaching Skills</div>
          </div>
          <div className="p-2 text-center border-r border-slate-100">
            <div className="text-xl sm:text-2xl font-black text-sky-700">{peer.wantedSkills.length}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Learning Skills</div>
          </div>
          <div className="p-2 text-center border-r border-slate-100">
            <div className="text-xl sm:text-2xl font-black text-indigo-700">{peer.projects?.length || 0}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Projects</div>
          </div>
          <a 
            href="#user-reputation-and-reviews"
            className="p-2 text-center col-span-2 sm:col-span-1 cursor-pointer hover:bg-amber-50/50 rounded-xl transition-colors block"
            title="Click to jump to peer reviews"
          >
            <div className="text-xl sm:text-2xl font-black text-amber-600 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{peerRatingSummary?.totalRatings ? peerRatingSummary.averageRating.toFixed(1) : '5.0'}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Peer Rating</div>
          </a>
        </div>

        {/* Match Breakdown & Synergy Card */}
        {matchResult && (
          <div
            className={`rounded-3xl border p-6 sm:p-8 shadow-sm ${
              matchResult.matchType === 'STRONG_MATCH'
                ? 'bg-white border-indigo-200 shadow-indigo-50'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles
                className={`w-5 h-5 ${
                  matchResult.matchType === 'STRONG_MATCH' ? 'text-indigo-600' : 'text-slate-600'
                }`}
              />
              <h2 className="text-base font-bold text-slate-900">
                Match Synergy & Explanation
              </h2>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed italic mb-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              "{matchResult.explanation}"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100">
                <span className="font-bold text-indigo-900 block mb-2 text-xs uppercase tracking-tight">
                  What {peer.name.split(' ')[0]} Offers:
                </span>
                <ul className="space-y-2 text-indigo-950 font-medium">
                  {peer.offeredSkills.map(s => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span>• {s.name}</span>
                      <ProficiencyBadge level={s.proficiency} size="sm" />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100">
                <span className="font-bold text-emerald-900 block mb-2 text-xs uppercase tracking-tight">
                  What {peer.name.split(' ')[0]} Wants to Learn:
                </span>
                <ul className="space-y-2 text-emerald-950 font-medium">
                  {peer.wantedSkills.map(w => (
                    <li key={w.id} className="flex items-center justify-between">
                      <span>• {w.name}</span>
                      <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">{w.currentLevel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Mentorship & Skill-Sharing Booking Section */}
        {!isBlocked && (
          <div id="mentorship-booking-section">
            <PeerBookingWidget
              peer={peer}
              onBookingSuccess={(session) => {
                const timeInfo = session ? ` for ${session.date} at ${session.startTime}` : '';
                setFeedbackToast(`Mentorship session scheduled with ${peer.name}${timeInfo}!`);
              }}
            />
          </div>
        )}

        {/* Skills Offered Section with Full Evidence & Details */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Skills {peer.name.split(' ')[0]} Offers & Proof of Skill</h2>
              <p className="text-xs text-slate-500">Peer teaching competencies with real-world practice & user-provided evidence</p>
            </div>
            <SelfDeclaredNotice compact={true} />
          </div>

          <div className="space-y-5">
            {peer.offeredSkills.map((skill) => (
              <div
                key={skill.id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{skill.name}</h3>
                    <ProficiencyBadge level={skill.proficiency} />
                    <TeachingConfidenceBadge confidence={skill.teachingConfidence} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {skill.yearsOfPractice} of practice
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 text-xs mb-1">Practical Experience & Background:</p>
                  <p>{skill.experienceDescription}</p>
                </div>

                {/* Evidence items */}
                {(() => {
                  const evList = Array.isArray(skill.evidence)
                    ? skill.evidence
                    : skill.evidence
                      ? [skill.evidence]
                      : [];
                  if (evList.length > 0) {
                    return (
                      <div className="space-y-2 pt-1">
                        <p className="text-xs font-bold text-slate-800">User-Provided Proof of Skill ({evList.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {evList.map((ev, idx) => (
                            <SkillEvidenceCard key={ev.id || idx} evidence={ev} skillCategory={skill.category} />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (skill.supportingLink) {
                    return (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <SupportingLinkButton url={skill.supportingLink} linkType={skill.supportingLinkType} />
                        <span className="text-[11px] text-slate-500 italic">User-provided portfolio</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* Skills Wanted Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Skills {peer.name.split(' ')[0]} Wants to Learn</h2>
            <p className="text-xs text-slate-500">Current learning objectives and target areas</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {peer.wantedSkills.map((skill) => (
              <div
                key={skill.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{skill.name}</h3>
                  <ProficiencyBadge level={skill.currentLevel} size="sm" />
                </div>
                {skill.learningGoal && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-700">Goal:</span> {skill.learningGoal}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Projects & Artifacts Showcase */}
        <ProjectsPortfolioSection
          userId={peer.id}
          projects={peer.projects || []}
          isOwner={false}
        />

        {/* Peer Trust & Verification Profile */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Trust & Community Verification</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic reputation signals computed from peer reviews and administrative inspection.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <VerifiedTickBadge isVerified={peer.isVerified} size="md" verifiedBy={peer.verifiedBy} />
              <span className="text-xs font-bold text-slate-700">
                {peer.isVerified ? 'Official Verified Member' : 'Standard Member'}
              </span>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border ${
            peer.isVerified 
              ? 'bg-sky-50/70 border-sky-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                peer.isVerified ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    {peer.isVerified ? 'Admin Verified Credential' : 'Standard Community Member'}
                  </h3>
                  <VerifiedTickBadge isVerified={peer.isVerified} size="sm" />
                </div>
                {peer.isVerified ? (
                  <p className="text-slate-700 leading-relaxed">
                    This member's identity, qualifications, and profile credentials have been formally verified by an authorized SkillMesh platform administrator.
                  </p>
                ) : (
                  <p className="text-slate-600 leading-relaxed">
                    Standard community member undergoing organic peer evaluation. Verified badges are strictly awarded by platform administrators based on substantiated skill demonstrations and peer reviews.
                  </p>
                )}
                {peer.verifiedBy && (
                  <p className="text-[11px] text-slate-500 font-medium pt-1">
                    Verified by: {peer.verifiedBy} {peer.verifiedAt ? `on ${new Date(peer.verifiedAt).toLocaleDateString()}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Peer Ratings & Reputation System */}
        <div id="user-reputation-and-reviews">
          <UserReputationSection 
            targetUser={peer} 
            exchangeHistory={fetchedPublicData?.exchangeHistory} 
          />
        </div>

        {/* Bottom CTA bar */}
        {!isBlocked && (
          <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div>
              <h3 className="font-bold text-base">Ready to exchange knowledge with {peer.name}?</h3>
              <p className="text-xs text-slate-400 mt-0.5">Send a quick connection proposal with your skill exchange offer.</p>
            </div>
            {activeConnection ? (
              <button
                onClick={() => openChatForConnection(activeConnection.id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Active Chat</span>
              </button>
            ) : pendingInfo?.isIncoming ? (
              <button
                onClick={() => setConnectModalTarget(peer)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Review Their Proposal</span>
              </button>
            ) : pendingInfo?.isOutgoing ? (
              <span className="px-5 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Request Sent</span>
              </span>
            ) : isCurrentUserSuspended ? (
              <span className="px-5 py-2 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs">
                Restricted
              </span>
            ) : (
              <button
                id="profile-bottom-connect-btn"
                onClick={() => setConnectModalTarget(peer)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Propose Exchange
              </button>
            )}
          </div>
        )}
      </div>

      {/* Safety Modals */}
      {showBlockModal && (
        <BlockUserModal
          isOpen={showBlockModal}
          userName={peer.name}
          onConfirm={handleConfirmBlock}
          onCancel={() => setShowBlockModal(false)}
        />
      )}

      {showReportModal && (
        <ReportUserModal
          isOpen={showReportModal}
          userName={peer.name}
          onConfirm={handleConfirmReport}
          onCancel={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};


