import React, { useState, useEffect } from 'react';
import {
  X,
  BadgeCheck,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Star,
  ArrowRightLeft,
  GraduationCap,
  Calendar,
  Clock,
  ExternalLink,
  Github,
  Globe,
  Award,
  AlertTriangle,
  FileText,
  Mail,
  Building2,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Lock,
  History,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiAdminGetUserDetails, apiAdminVerifyUser } from '../../services/upgradeApi';
import { getSkillMeshUserId } from '../../utils/skillmeshId';
import { VerifiedTickBadge } from '../common/Badges';

interface AdminUserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
  onOpenOtherUser?: (otherUserId: string) => void;
}

type ProfileTab = 'overview' | 'exchanges' | 'mentorship' | 'reviews' | 'safety_audit';

export const AdminUserProfileModal: React.FC<AdminUserProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
  onUserUpdated,
  onOpenOtherUser,
}) => {
  const { currentUser, adminUpdateUserStatus, openUserProfile } = useApp();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);

  // Verification dialog state
  const [verifyModal, setVerifyModal] = useState<{
    isOpen: boolean;
    isVerifiedTarget: boolean;
    reasonNotes: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    isVerifiedTarget: true,
    reasonNotes: '',
    isSubmitting: false,
  });

  // Account status modal (Suspend/Restore)
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    targetStatus: 'SUSPENDED' | 'ACTIVE';
    reason: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    targetStatus: 'SUSPENDED',
    reason: '',
    isSubmitting: false,
  });

  const loadUserDetails = async (idToFetch: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiAdminGetUserDetails(idToFetch, currentUser?.email, currentUser?.id);
      if (res && res.success && res.user) {
        setUserData(res);
      } else {
        setError(res?.error || 'Failed to load user profile information.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching user details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadUserDetails(userId);
      setActiveTab('overview');
    } else {
      setUserData(null);
    }
  }, [isOpen, userId]);

  if (!isOpen || !userId) return null;

  const user = userData?.user;
  const stats = userData?.stats || {
    totalExchanges: 0,
    activeExchanges: 0,
    completedExchanges: 0,
    successfulExchanges: 0,
    cancelledExchanges: 0,
    mentorshipRequestsCount: 0,
    activeMentorshipsCount: 0,
    completedSessionsCount: 0,
    averageRating: 0,
    totalReviews: 0,
    reportsAgainstCount: 0,
    blocksAgainstCount: 0,
  };

  const connections = userData?.connections || [];
  const mentorshipRequests = userData?.mentorshipRequests || [];
  const mentorshipSessions = userData?.sessions || [];
  const ratings = userData?.ratings || [];
  const ratingSummary = userData?.ratingSummary || {
    averageRating: stats.averageRating || 0,
    totalRatings: stats.totalReviews || 0,
    ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
  const auditHistory = userData?.auditHistory || [];
  const reportsAgainst = userData?.reportsAgainst || [];
  const reportsBy = userData?.reportsBy || [];
  const blocksAgainst = userData?.blocksAgainst || [];

  const skillmeshId = user ? getSkillMeshUserId(user) : 'SM-000000';
  const isVerified = Boolean(user?.isVerified);
  const accountStatus = user?.accountStatus || 'ACTIVE';

  const handleToggleVerification = async () => {
    if (!user) return;
    setVerifyModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const targetIsVerified = !isVerified;
      const res = await apiAdminVerifyUser({
        userId: user.id,
        isVerified: targetIsVerified,
        notes: verifyModal.reasonNotes.trim(),
        adminEmail: currentUser?.email,
        adminId: currentUser?.id,
      });

      if (res.success) {
        setVerifyModal({ isOpen: false, isVerifiedTarget: true, reasonNotes: '', isSubmitting: false });
        await loadUserDetails(user.id);
        if (onUserUpdated) onUserUpdated();
      } else {
        alert(res.error || 'Failed to update verification status.');
        setVerifyModal(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (err: any) {
      alert(err.message || 'Error executing verification action.');
      setVerifyModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleUpdateAccountStatus = async () => {
    if (!user) return;
    setStatusModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await adminUpdateUserStatus(
        user.id,
        statusModal.targetStatus,
        statusModal.reason.trim() || `Administrative ${statusModal.targetStatus.toLowerCase()} action`
      );

      if (res && res.success) {
        setStatusModal({ isOpen: false, targetStatus: 'SUSPENDED', reason: '', isSubmitting: false });
        await loadUserDetails(user.id);
        if (onUserUpdated) onUserUpdated();
      } else {
        alert(res?.error || 'Failed to update user account status.');
        setStatusModal(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (err: any) {
      alert(err.message || 'Error executing status change.');
      setStatusModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div
      id="admin-user-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="admin-user-profile-modal-container"
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Close Button */}
        <button
          id="btn-close-admin-user-profile"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors shadow-sm"
          title="Close profile"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading && !user ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Fetching real profile & activity records from Supabase...</p>
          </div>
        ) : error && !user ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">User Profile Unavailable</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={() => loadUserDetails(userId)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : user ? (
          <>
            {/* Header / Banner Area */}
            <div className="relative shrink-0">
              {/* Banner */}
              <div className="h-32 sm:h-36 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
                {user.bannerUrl ? (
                  <img
                    src={user.bannerUrl}
                    alt="Banner"
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-between px-8 text-slate-700/30">
                    <Layers className="w-32 h-32 -rotate-12 transform" />
                    <SparklesDecorative />
                  </div>
                )}
              </div>

              {/* Profile Card Header */}
              <div className="px-6 pb-4 pt-0 -mt-14 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 bg-white">
                <div className="flex items-end gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'user')}`}
                      alt={user.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white object-cover bg-white shadow-md"
                    />
                    {isVerified && (
                      <div className="absolute -bottom-1 -right-1 bg-sky-500 text-white rounded-full p-1 shadow-md border-2 border-white">
                        <BadgeCheck className="w-5 h-5 fill-sky-500 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name & Basic Info */}
                  <div className="pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                        {user.name || 'Member'}
                      </h2>
                      <VerifiedTickBadge isVerified={isVerified} showLabel={true} size="md" />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        accountStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {accountStatus}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-600 mt-0.5">
                      {user.titleOrRole || 'SkillMesh Member'}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/80">
                        ID: {skillmeshId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {user.email}
                      </span>
                      {(user.institutionName || user.organizationName) && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {user.institutionName || user.organizationName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Joined {new Date(user.joinedDate || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Admin Actions */}
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  {isVerified ? (
                    <button
                      id="btn-admin-revoke-verify"
                      onClick={() => setVerifyModal({ isOpen: true, isVerifiedTarget: false, reasonNotes: '', isSubmitting: false })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                    >
                      <UserX className="w-4 h-4 text-amber-600" />
                      Revoke Verification
                    </button>
                  ) : (
                    <button
                      id="btn-admin-grant-verify"
                      onClick={() => setVerifyModal({ isOpen: true, isVerifiedTarget: true, reasonNotes: '', isSubmitting: false })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      Give Verified Badge
                    </button>
                  )}

                  {accountStatus === 'ACTIVE' ? (
                    <button
                      id="btn-admin-suspend-user"
                      onClick={() => setStatusModal({ isOpen: true, targetStatus: 'SUSPENDED', reason: '', isSubmitting: false })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Suspend Account
                    </button>
                  ) : (
                    <button
                      id="btn-admin-restore-user"
                      onClick={() => setStatusModal({ isOpen: true, targetStatus: 'ACTIVE', reason: '', isSubmitting: false })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Restore Account
                    </button>
                  )}

                  <button
                    id="btn-admin-view-public-profile"
                    onClick={() => {
                      onClose();
                      openUserProfile(user.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                    title="Open this user's full member profile page"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    View Member Profile
                  </button>
                </div>
              </div>

              {/* Bio & Key Metrics Strip */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="text-slate-600 max-w-xl line-clamp-2">
                  <span className="font-semibold text-slate-800">Bio: </span>
                  {user.bio || 'No personal biography provided yet.'}
                </div>

                <div className="flex items-center gap-4 text-slate-700 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    <span><strong className="text-slate-900">{stats.successfulExchanges}</strong> exchanges</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <span><strong className="text-slate-900">{stats.completedSessionsCount}</strong> mentorships</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span><strong className="text-slate-900">{stats.averageRating ? stats.averageRating.toFixed(1) : '—'}</strong> ({stats.totalReviews})</span>
                  </div>
                </div>
              </div>

              {/* Tabs Bar */}
              <div className="px-6 bg-white border-b border-slate-200 flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none">
                <button
                  id="tab-admin-overview"
                  onClick={() => setActiveTab('overview')}
                  className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'overview'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Overview & Skills
                </button>
                <button
                  id="tab-admin-exchanges"
                  onClick={() => setActiveTab('exchanges')}
                  className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'exchanges'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Exchanges</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                    {connections.length}
                  </span>
                </button>
                <button
                  id="tab-admin-mentorship"
                  onClick={() => setActiveTab('mentorship')}
                  className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'mentorship'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Mentorship</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                    {mentorshipRequests.length + mentorshipSessions.length}
                  </span>
                </button>
                <button
                  id="tab-admin-reviews"
                  onClick={() => setActiveTab('reviews')}
                  className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'reviews'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Reviews & Ratings</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                    {ratings.length}
                  </span>
                </button>
                <button
                  id="tab-admin-safety"
                  onClick={() => setActiveTab('safety_audit')}
                  className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'safety_audit'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Safety & Audit History</span>
                  {(reportsAgainst.length > 0 || blocksAgainst.length > 0) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                      {reportsAgainst.length + blocksAgainst.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body - Tab Contents */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
              {/* TAB 1: OVERVIEW & SKILLS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Skills Offered */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-600" />
                        Skills Offered to Teach ({user.offeredSkills?.length || 0})
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">Self-Declared Profile Data</span>
                    </div>

                    {user.offeredSkills && user.offeredSkills.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {user.offeredSkills.map((s: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-800">{s.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                {s.proficiency || 'Intermediate'}
                              </span>
                            </div>

                            {s.experienceDescription && (
                              <p className="text-xs text-slate-600 line-clamp-2">
                                {s.experienceDescription}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                              <span>Practice: {s.yearsOfPractice || '1+ yrs'}</span>
                              {s.supportingLink && (
                                <a
                                  href={s.supportingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium"
                                >
                                  Proof / Link <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">No skills offered yet.</p>
                    )}
                  </div>

                  {/* Skills Wanted */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        Skills Wanted to Learn ({user.wantedSkills?.length || 0})
                      </h4>
                    </div>

                    {user.wantedSkills && user.wantedSkills.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {user.wantedSkills.map((s: any, idx: number) => (
                          <div key={idx} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-800">{s.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                                Target: {s.currentLevel || 'Beginner'}
                              </span>
                            </div>
                            {s.learningGoal && (
                              <p className="text-xs text-slate-600">
                                <span className="font-medium text-slate-700">Goal:</span> {s.learningGoal}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">No learning goals listed yet.</p>
                    )}
                  </div>

                  {/* External Links & Verified Metadata */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-600" />
                      Professional & Social Portfolios
                    </h4>
                    <div className="flex flex-wrap items-center gap-3">
                      {user.githubUrl && (
                        <a
                          href={user.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Github className="w-3.5 h-3.5" />
                          GitHub Profile
                        </a>
                      )}
                      {user.linkedinUrl && (
                        <a
                          href={user.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                          LinkedIn Profile
                        </a>
                      )}
                      {user.portfolioUrl && (
                        <a
                          href={user.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5 text-purple-600" />
                          Portfolio / Website
                        </a>
                      )}
                      {!user.githubUrl && !user.linkedinUrl && !user.portfolioUrl && (
                        <span className="text-xs text-slate-400 italic">No external portfolio links provided.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: EXCHANGES */}
              {activeTab === 'exchanges' && (
                <div className="space-y-4">
                  {/* Exchange Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-xs text-slate-500 font-medium">Total Requests</div>
                      <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.totalExchanges}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-xs text-slate-500 font-medium">Active Exchanges</div>
                      <div className="text-xl font-bold text-indigo-600 mt-0.5">{stats.activeExchanges}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-xs text-slate-500 font-medium">Completed</div>
                      <div className="text-xl font-bold text-emerald-600 mt-0.5">{stats.completedExchanges}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-xs text-slate-500 font-medium">Cancelled/Declined</div>
                      <div className="text-xl font-bold text-slate-500 mt-0.5">{stats.cancelledExchanges}</div>
                    </div>
                  </div>

                  {/* Exchanges List */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 font-bold text-xs text-slate-700 flex justify-between items-center">
                      <span>Connection & Exchange Interactions ({connections.length})</span>
                      <span className="text-slate-400 font-normal">Click participant to view their profile</span>
                    </div>

                    {connections.length > 0 ? (
                      connections.map((conn: any, idx: number) => {
                        const isSender = conn.senderId === user.id;
                        const otherUserId = isSender ? conn.receiverId : conn.senderId;

                        return (
                          <div key={conn.id || idx} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{isSender ? 'Sent request to:' : 'Received request from:'}</span>
                                <button
                                  type="button"
                                  onClick={() => onOpenOtherUser ? onOpenOtherUser(otherUserId) : loadUserDetails(otherUserId)}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                                >
                                  {conn.otherUserName}
                                  <VerifiedTickBadge isVerified={conn.otherUserVerified} size="xs" />
                                  <span className="text-[10px] text-slate-400 font-mono">({conn.otherUserSkillmeshId})</span>
                                </button>
                              </div>

                              <div className="text-xs text-slate-700 flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  Offers: {conn.offeredSkillName || 'Skill'}
                                </span>
                                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                  Wants: {conn.wantedSkillName || 'Skill'}
                                </span>
                              </div>

                              {conn.note && (
                                <p className="text-[11px] text-slate-500 italic max-w-xl">
                                  "{conn.note}"
                                </p>
                              )}
                            </div>

                            <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0 text-right">
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                conn.status === 'ACCEPTED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : conn.status === 'ENDED' || conn.status === 'COMPLETED'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : conn.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {conn.status}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(conn.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 italic">
                        No skill exchange records found for this member yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: MENTORSHIP */}
              {activeTab === 'mentorship' && (
                <div className="space-y-4">
                  {/* Mentorship Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-xs text-slate-500 font-medium">Total Requests</div>
                      <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.mentorshipRequestsCount}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-xs text-slate-500 font-medium">Active Mentorships</div>
                      <div className="text-xl font-bold text-purple-600 mt-0.5">{stats.activeMentorshipsCount}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-xs text-slate-500 font-medium">Completed Sessions</div>
                      <div className="text-xl font-bold text-emerald-600 mt-0.5">{stats.completedSessionsCount}</div>
                    </div>
                  </div>

                  {/* Sessions List */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 font-bold text-xs text-slate-700">
                      Mentorship Sessions & Scheduled Bookings ({mentorshipSessions.length})
                    </div>
                    {mentorshipSessions.length > 0 ? (
                      mentorshipSessions.map((session: any, idx: number) => {
                        const isMentor = session.mentorId === user.id;
                        const otherName = isMentor ? session.menteeName : session.mentorName;
                        const otherId = isMentor ? session.menteeId : session.mentorId;

                        return (
                          <div key={session.id || idx} className="p-4 hover:bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-800">{session.topic || 'Mentorship Session'}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  session.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                  {session.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {isMentor ? 'Mentee: ' : 'Mentor: '}
                                <button
                                  type="button"
                                  onClick={() => onOpenOtherUser ? onOpenOtherUser(otherId) : loadUserDetails(otherId)}
                                  className="font-bold text-indigo-600 hover:underline"
                                >
                                  {otherName}
                                </button>
                              </div>
                            </div>

                            <div className="text-right text-xs text-slate-500">
                              <div>{session.date} {session.startTime ? `at ${session.startTime}` : ''}</div>
                              <div className="text-[11px] text-slate-400">{session.format || 'VIDEO_CALL'} ({session.durationMinutes || 45}m)</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500 italic">
                        No scheduled or completed mentorship sessions on record.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: REVIEWS & RATINGS */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Rating Breakdown & Average Summary */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-6">
                    <div className="text-center md:border-r border-slate-200 md:pr-8 shrink-0">
                      <div className="text-4xl font-black text-slate-900">
                        {ratingSummary.averageRating ? ratingSummary.averageRating.toFixed(1) : '—'}
                      </div>
                      <div className="flex items-center justify-center gap-1 my-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.round(ratingSummary.averageRating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Based on {ratingSummary.totalRatings} authentic review{ratingSummary.totalRatings === 1 ? '' : 's'}
                      </div>
                    </div>

                    {/* Bars Distribution */}
                    <div className="flex-1 w-full space-y-1.5">
                      {[5, 4, 3, 2, 1].map(stars => {
                        const count = ratingSummary.ratingCounts?.[stars] || 0;
                        const pct = ratingSummary.totalRatings > 0 ? (count / ratingSummary.totalRatings) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-3 text-xs">
                            <span className="w-8 font-bold text-slate-600 flex items-center gap-0.5">
                              {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-right font-medium text-slate-500">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Individual Reviews List */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 font-bold text-xs text-slate-700">
                      Member Reviews Received ({ratings.length})
                    </div>

                    {ratings.length > 0 ? (
                      ratings.map((r: any, idx: number) => (
                        <div key={r.id || idx} className="p-4 space-y-2 hover:bg-slate-50/70 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onOpenOtherUser ? onOpenOtherUser(r.raterId) : loadUserDetails(r.raterId)}
                                className="font-bold text-xs text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                {r.raterName || 'Anonymous Member'}
                                <VerifiedTickBadge isVerified={r.raterVerified} size="xs" />
                                {r.raterSkillmeshId && (
                                  <span className="text-[10px] text-slate-400 font-mono">({r.raterSkillmeshId})</span>
                                )}
                              </button>
                              <span className="text-[11px] text-slate-400">•</span>
                              <div className="flex items-center text-amber-400">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            <span className="text-[10px] text-slate-400">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {r.review && (
                            <p className="text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                              "{r.review}"
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 italic">
                        No peer reviews received by this member yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: SAFETY & AUDIT HISTORY */}
              {activeTab === 'safety_audit' && (
                <div className="space-y-6">
                  {/* Verification & Moderation History */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      Verification & Moderation Audit Trail ({auditHistory.length})
                    </h4>

                    {auditHistory.length > 0 ? (
                      <div className="space-y-3">
                        {auditHistory.map((log: any, idx: number) => (
                          <div key={log.id || idx} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                            <div className="flex items-center justify-between font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.action === 'VERIFIED'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : log.action === 'REVOKED'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : log.action === 'SUSPEND' || log.action === 'BAN'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {log.action}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-slate-600">
                              Admin: <strong className="text-slate-800">{log.adminName || log.adminEmail || 'Admin'}</strong>
                            </div>
                            {log.reason && (
                              <div className="text-slate-700 bg-white p-2 rounded border border-slate-100 text-[11px] mt-1">
                                Reason: {log.reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        No administrative actions recorded for this user yet.
                      </p>
                    )}
                  </div>

                  {/* Safety Signals: Reports Against */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Reports Filed Against This User ({reportsAgainst.length})
                    </h4>

                    {reportsAgainst.length > 0 ? (
                      <div className="space-y-2">
                        {reportsAgainst.map((rep: any, idx: number) => (
                          <div key={rep.id || idx} className="p-3 rounded-lg bg-rose-50/50 border border-rose-200/80 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-rose-800">{rep.reasonLabel || rep.reason}</span>
                              <span className="text-[10px] text-rose-600 font-semibold">{rep.status}</span>
                            </div>
                            {rep.description && (
                              <p className="text-slate-700 text-[11px]">"{rep.description}"</p>
                            )}
                            <div className="text-[10px] text-slate-400">
                              Filed on {new Date(rep.createdAt).toLocaleDateString()} by {rep.reporterName || 'Anonymous'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">No user reports on file. Account is clean.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Verification Confirmation Modal */}
        {verifyModal.isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${verifyModal.isVerifiedTarget ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}>
                  {verifyModal.isVerifiedTarget ? <BadgeCheck className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {verifyModal.isVerifiedTarget ? 'Verify SkillMesh User?' : 'Revoke User Verification?'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {verifyModal.isVerifiedTarget
                      ? 'Awarding a verified badge signals high trust to the community.'
                      : 'This will remove the verified badge from all public profiles and match views.'}
                  </p>
                </div>
              </div>

              {/* Summary Stats Card */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member:</span>
                  <span className="font-bold text-slate-800">{user?.name} ({skillmeshId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Successful Exchanges:</span>
                  <span className="font-bold text-slate-800">{stats.successfulExchanges}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed Mentorships:</span>
                  <span className="font-bold text-slate-800">{stats.completedSessionsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Average Rating:</span>
                  <span className="font-bold text-slate-800">{stats.averageRating ? stats.averageRating.toFixed(1) : '—'} ({stats.totalReviews} reviews)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason or Verification Notes (Saved to Audit Trail)
                </label>
                <textarea
                  value={verifyModal.reasonNotes}
                  onChange={e => setVerifyModal(prev => ({ ...prev, reasonNotes: e.target.value }))}
                  placeholder={verifyModal.isVerifiedTarget ? 'e.g. Identity and skill exchange history verified.' : 'e.g. Incomplete profile credentials.'}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={verifyModal.isSubmitting}
                  onClick={() => setVerifyModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verifyModal.isSubmitting}
                  onClick={handleToggleVerification}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs ${
                    verifyModal.isVerifiedTarget ? 'bg-sky-600 hover:bg-sky-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {verifyModal.isSubmitting ? 'Processing...' : verifyModal.isVerifiedTarget ? 'Confirm & Verify' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suspend / Restore Modal */}
        {statusModal.isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${statusModal.targetStatus === 'SUSPENDED' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {statusModal.targetStatus === 'SUSPENDED' ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {statusModal.targetStatus === 'SUSPENDED' ? 'Suspend Account?' : 'Restore Account Access?'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {statusModal.targetStatus === 'SUSPENDED'
                      ? 'The user will be blocked from logging in, messaging, and matching.'
                      : 'The user will regain normal access to their account.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Action (Recorded in Audit Logs)
                </label>
                <textarea
                  value={statusModal.reason}
                  onChange={e => setStatusModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Provide explicit justification for this administrative action..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={statusModal.isSubmitting}
                  onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={statusModal.isSubmitting}
                  onClick={handleUpdateAccountStatus}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs ${
                    statusModal.targetStatus === 'SUSPENDED' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {statusModal.isSubmitting ? 'Updating...' : statusModal.targetStatus === 'SUSPENDED' ? 'Confirm Suspension' : 'Confirm Restoration'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SparklesDecorative = () => (
  <div className="flex items-center gap-2 opacity-25">
    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
    <div className="w-2 h-2 rounded-full bg-indigo-300" />
    <div className="w-3 h-3 rounded-full bg-indigo-200" />
  </div>
);
