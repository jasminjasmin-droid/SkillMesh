import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Sparkles, Plus, Edit3, Check, Save, MapPin, Mail, ShieldCheck, Share2, UserX, AlertTriangle, Unlock, GraduationCap, Building2, Briefcase, Linkedin, Github, Globe, ExternalLink, AlertCircle, Upload, RefreshCw, Layers, BookOpen, HeartHandshake, ArrowRightLeft, Users, Calendar, Clock, CalendarCheck2, Camera, ImageIcon, Trash2, Star, Award, FolderGit2, CheckCircle2 } from 'lucide-react';
import { OfferedSkillsManager } from '../skills/OfferedSkillsManager';
import { WantedSkillsManager } from '../skills/WantedSkillsManager';
import { ProfileSchedulingManager } from './ProfileSchedulingManager';
import { UserReputationSection } from './UserReputationSection';
import { ProjectsPortfolioSection } from './ProjectsPortfolioSection';
import { SelfDeclaredNotice, UserStatusBadge, VerifiedTickBadge } from '../common/Badges';
import { UserStatus, MatchPurpose, RatingSummary } from '../../types';
import { generateInitialsAvatar } from '../../utils/avatarUtils';
import { fetchUserRatings } from '../../services/supabaseClient';
import { getSkillMeshUserId } from '../../utils/skillmeshId';

export const MyProfilePage: React.FC = () => {
  const { 
    currentUser, 
    setCurrentUser,
    allUsers,
    connections,
    blockedUsers,
    unblockUser,
    isCurrentUserSuspended,
    saveProfileBasicInfo, 
    uploadProfileAvatar,
    uploadProfileBanner,
    removeProfileBanner,
    addOfferedSkill, 
    removeOfferedSkill, 
    addWantedSkill, 
    removeWantedSkill,
    setCurrentView 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'REVIEWS' | 'PROJECTS' | 'OFFERED' | 'WANTED' | 'AVAILABILITY' | 'TRUST' | 'BASIC_INFO' | 'BLOCKED_USERS'>('OFFERED');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isRemovingBanner, setIsRemovingBanner] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);

  // Form states for basic info editing
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [titleOrRole, setTitleOrRole] = useState(currentUser?.titleOrRole || '');
  const [status, setStatus] = useState<UserStatus>(currentUser?.status || 'STUDENT');
  const [institutionName, setInstitutionName] = useState(currentUser?.institutionName || '');
  const [organizationName, setOrganizationName] = useState(currentUser?.organizationName || '');
  const [occupationDetails, setOccupationDetails] = useState(currentUser?.occupationDetails || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(currentUser?.linkedinUrl || '');
  const [githubUrl, setGithubUrl] = useState(currentUser?.githubUrl || '');
  const [portfolioUrl, setPortfolioUrl] = useState(currentUser?.portfolioUrl || '');
  const [matchPurposes, setMatchPurposes] = useState<MatchPurpose[]>(currentUser?.matchPurposes || ['learn_skill', 'teach_skill', 'exchange_skills', 'project_collaboration']);
  const [activeProjectDescription, setActiveProjectDescription] = useState(currentUser?.activeProjectDescription || '');
  const [collaborationInterests, setCollaborationInterests] = useState(currentUser?.collaborationInterests?.join(', ') || '');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unblockMessage, setUnblockMessage] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-3">Please sign in to view your profile.</p>
          <button
            onClick={() => setCurrentView('login')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  const myBlockedRecords = blockedUsers.filter(b => b.blockerId === currentUser.id);

  const handleSaveBasicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!avatarUrl.trim()) {
      setError('Please provide a profile picture URL.');
      return;
    }
    if (status === 'STUDENT' && !institutionName.trim()) {
      setError('Please provide your College / University name.');
      return;
    }
    if (status === 'WORKING_PROFESSIONAL' && !organizationName.trim()) {
      setError('Please provide your Company / Workplace name.');
      return;
    }
    if (status === 'OTHER' && !occupationDetails.trim()) {
      setError('Please describe your current occupation or focus.');
      return;
    }

    const parsedCollabInterests = collaborationInterests
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    saveProfileBasicInfo({
      displayName: displayName.trim(),
      titleOrRole: titleOrRole.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
      status,
      institutionName: status === 'STUDENT' ? institutionName.trim() : undefined,
      organizationName: status === 'WORKING_PROFESSIONAL' ? organizationName.trim() : undefined,
      occupationDetails: status === 'OTHER' ? occupationDetails.trim() : undefined,
      location: location.trim(),
      linkedinUrl: linkedinUrl.trim(),
      githubUrl: githubUrl.trim(),
      portfolioUrl: portfolioUrl.trim(),
      matchPurposes: matchPurposes.length > 0 ? matchPurposes : ['learn_skill', 'teach_skill', 'exchange_skills', 'project_collaboration'],
      activeProjectDescription: activeProjectDescription.trim() || undefined,
      collaborationInterests: parsedCollabInterests.length > 0 ? parsedCollabInterests : undefined
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserRatings(currentUser.id)
        .then(res => setRatingSummary(res.summary))
        .catch(err => console.warn('[MyProfilePage] ratings load error:', err));
    }
  }, [currentUser?.id]);

  const handleRemoveBanner = async () => {
    setIsRemovingBanner(true);
    try {
      const res = await removeProfileBanner();
      if (!res.success && res.error) {
        setError(res.error);
      }
    } finally {
      setIsRemovingBanner(false);
    }
  };

  const myCompletedExchangesCount = connections.filter(
    c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && (c.status === 'ACCEPTED' || c.status === 'ENDED')
  ).length;

  const handleUnblock = (blockedUserId: string, userName: string) => {
    const result = unblockUser(blockedUserId);
    if (result.success) {
      setUnblockMessage(`${userName} has been unblocked. You can now discover each other and connect normally.`);
      setTimeout(() => setUnblockMessage(null), 4000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 relative py-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle Geometric Page Background Patterns */}
      <div className="absolute inset-0 bg-pattern-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pattern-dots-emerald opacity-25 mask-radial-fade pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 relative">
        
        {/* Suspended Account Notice */}
        {isCurrentUserSuspended && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 shadow-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-900">Account Restricted for Safety Review</p>
              <p className="text-amber-800 leading-relaxed">
                Your account is temporarily restricted while under community safety review. You cannot send messages or new exchange requests during this review period.
              </p>
            </div>
          </div>
        )}

        {/* Profile Card Header with Professional Cover Mesh Banner & Geometric Grid Overlay */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm relative">
          {/* Cover Header */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900 group">
            <img
              src={currentUser.bannerUrl || "/src/assets/images/profile_banner_mesh_1788511745598.jpg"}
              alt="Profile Cover"
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
            {/* Subtle Geometric Dark Grid Texture on Banner */}
            <div className="absolute inset-0 bg-pattern-grid-dark opacity-35 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-emerald-950/40 to-transparent" />
            
            {/* Cover photo actions */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <input
                type="file"
                ref={bannerFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setError('Cover banner size should be under 5MB.');
                    return;
                  }
                  setIsUploadingBanner(true);
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    if (event.target?.result) {
                      await uploadProfileBanner(event.target.result as string, file.type);
                      setIsUploadingBanner(false);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <button
                onClick={() => bannerFileInputRef.current?.click()}
                disabled={isUploadingBanner}
                className="px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all shadow-md cursor-pointer opacity-90 hover:opacity-100"
                title="Change cover banner image"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isUploadingBanner ? 'Uploading...' : 'Change Cover Image'}</span>
              </button>
              {currentUser.bannerUrl && (
                <button
                  onClick={handleRemoveBanner}
                  disabled={isRemovingBanner || isUploadingBanner}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-rose-900 text-slate-200 hover:text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="Remove custom banner and use default"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isRemovingBanner ? 'Removing...' : 'Reset Cover'}</span>
                </button>
              )}
            </div>

            {/* Quick Status Tag on Banner */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('AVAILABILITY')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all backdrop-blur-md flex items-center gap-2 cursor-pointer shadow-md ${
                  currentUser.mentorshipSchedule?.isEnabled
                    ? 'bg-emerald-500/95 text-slate-950 hover:bg-emerald-400'
                    : 'bg-slate-900/80 text-emerald-200 border border-emerald-500/30 hover:bg-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${currentUser.mentorshipSchedule?.isEnabled ? 'bg-slate-950 animate-pulse' : 'bg-slate-400'}`} />
                <span>{currentUser.mentorshipSchedule?.isEnabled ? '🟢 Accepting Mentorship Sessions' : '⚪ Set Live Availability'}</span>
              </button>
            </div>
          </div>

          {/* Profile Body with Overlapping Avatar & Subtle Geometric Watermark */}
          <div className="p-6 sm:p-8 pt-0 relative">
            <div className="absolute top-0 right-0 w-64 h-32 bg-pattern-dots opacity-20 pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-14 sm:-mt-16 mb-4 relative z-10">
              <div className="flex items-end gap-4 sm:gap-5">
                <div className="relative group">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white ring-4 ring-white shadow-xl shrink-0">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Photo upload overlay button */}
                  <input
                    type="file"
                    id="profile-avatar-file-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 4 * 1024 * 1024) {
                        setError('Avatar image should be under 4MB.');
                        return;
                      }
                      setIsUploadingPhoto(true);
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        if (event.target?.result) {
                          const base64 = event.target.result as string;
                          setAvatarUrl(base64);
                          await uploadProfileAvatar(base64, file.type);
                          setIsUploadingPhoto(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('profile-avatar-file-upload')?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-2 border-white transition-all cursor-pointer group-hover:scale-105"
                    title="Upload or change profile picture"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                      <span>{currentUser.name}</span>
                      <VerifiedTickBadge isVerified={currentUser.isVerified} size="md" verifiedBy={currentUser.verifiedBy} />
                    </h1>
                    <span className="text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Your Profile
                    </span>
                    <span 
                      id="my-profile-skillmesh-id"
                      className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold px-2 py-0.5 rounded-full shadow-2xs"
                      title="Your unique, persistent SkillMesh Member ID"
                    >
                      ID: {getSkillMeshUserId(currentUser)}
                    </span>
                    {currentUser.isVerified ? (
                      <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        Verified Member
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveSubTab('TRUST')}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                        title="View verification details"
                      >
                        Standard Member
                      </button>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">{currentUser.titleOrRole || 'Peer Learner & Mentor'}</p>

                  {/* Rating & Review Count Header Chip */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <button
                      id="profile-header-rating-badge"
                      onClick={() => setActiveSubTab('REVIEWS')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/90 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title="View all reviews & ratings received from peers"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>
                        {ratingSummary && ratingSummary.totalRatings > 0
                          ? `${ratingSummary.averageRating.toFixed(1)} / 5.0`
                          : 'New Member'}
                      </span>
                      <span className="text-amber-800/80 font-medium">
                        · {ratingSummary?.totalRatings || 0} {ratingSummary?.totalRatings === 1 ? 'peer review' : 'peer reviews'}
                      </span>
                    </button>

                    {/* Timezone pill */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{currentUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                    </span>
                  </div>

                  {currentUser.bio && (
                    <p className="text-xs sm:text-sm text-slate-600 pt-1 max-w-2xl leading-relaxed">
                      {currentUser.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveSubTab('AVAILABILITY')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Manage Schedule</span>
                </button>

                <button
                  onClick={() => setCurrentView('matches')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>See My Matches</span>
                </button>
              </div>
            </div>

            {/* Sub-info bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
              <UserStatusBadge
                status={currentUser.status || 'STUDENT'}
                institutionName={currentUser.institutionName}
                organizationName={currentUser.organizationName}
                occupationDetails={currentUser.occupationDetails}
              />

              {currentUser.location && (
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {currentUser.location}
                </span>
              )}

              {/* Professional Links Bar */}
              {(currentUser.linkedinUrl || currentUser.githubUrl || currentUser.portfolioUrl) && (
                <div className="flex items-center gap-3 text-xs ml-auto">
                  {currentUser.linkedinUrl && (
                    <a
                      href={currentUser.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {currentUser.githubUrl && (
                    <a
                      href={currentUser.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-800 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {currentUser.portfolioUrl && (
                    <a
                      href={currentUser.portfolioUrl}
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
          </div>
        </div>

        {/* SkillMesh Journey & Stats Card */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="p-2 text-center border-r border-slate-100">
            <div className="text-xl sm:text-2xl font-black text-slate-900">{myCompletedExchangesCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Exchanges</div>
          </div>
          <div className="p-2 text-center border-r border-slate-100">
            <div className="text-xl sm:text-2xl font-black text-emerald-700">{currentUser.offeredSkills.length}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Teaching Skills</div>
          </div>
          <div className="p-2 text-center border-r border-slate-100">
            <div className="text-xl sm:text-2xl font-black text-sky-700">{currentUser.wantedSkills.length}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Learning Skills</div>
          </div>
          <div className="p-2 text-center border-r border-slate-100">
            <div className="text-xl sm:text-2xl font-black text-indigo-700">{currentUser.projects?.length || 0}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Projects</div>
          </div>
          <div 
            onClick={() => setActiveSubTab('REVIEWS')}
            className="p-2 text-center col-span-2 sm:col-span-1 cursor-pointer hover:bg-amber-50/50 rounded-xl transition-colors"
            title="Click to view peer reviews"
          >
            <div className="text-xl sm:text-2xl font-black text-amber-600 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{ratingSummary?.totalRatings ? ratingSummary.averageRating.toFixed(1) : '5.0'}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Peer Rating</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            id="tab-reviews-ratings"
            onClick={() => setActiveSubTab('REVIEWS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'REVIEWS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Reviews & Ratings ({ratingSummary?.totalRatings || 0})</span>
          </button>

          <button
            id="tab-portfolio-projects"
            onClick={() => setActiveSubTab('PROJECTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'PROJECTS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Projects ({currentUser.projects?.length || 0})</span>
          </button>

          <button
            id="tab-offered-skills"
            onClick={() => setActiveSubTab('OFFERED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'OFFERED'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Skills I Can Offer ({currentUser.offeredSkills.length})</span>
          </button>

          <button
            id="tab-wanted-skills"
            onClick={() => setActiveSubTab('WANTED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'WANTED'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Skills I Want to Learn ({currentUser.wantedSkills.length})</span>
          </button>

          <button
            id="tab-availability"
            onClick={() => setActiveSubTab('AVAILABILITY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'AVAILABILITY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Availability & Scheduling</span>
            <span className={`w-1.5 h-1.5 rounded-full ${currentUser.mentorshipSchedule?.isEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`} />
          </button>

          <button
            id="tab-trust-verification"
            onClick={() => setActiveSubTab('TRUST')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'TRUST'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'bg-white text-sky-800 hover:bg-sky-50 border border-sky-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
            <span>Trust & Verification</span>
          </button>

          <button
            id="tab-basic-info"
            onClick={() => setActiveSubTab('BASIC_INFO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'BASIC_INFO'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            id="tab-blocked-users"
            onClick={() => setActiveSubTab('BLOCKED_USERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'BLOCKED_USERS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Blocked ({myBlockedRecords.length})</span>
          </button>
        </div>

        {/* Tab 0: Reviews & Ratings */}
        {activeSubTab === 'REVIEWS' && (
          <UserReputationSection targetUser={currentUser} />
        )}

        {/* Tab 0.5: Projects Portfolio */}
        {activeSubTab === 'PROJECTS' && (
          <ProjectsPortfolioSection
            userId={currentUser.id}
            projects={currentUser.projects || []}
            isOwner={true}
            onProjectsUpdated={(newProjects) => {
              const updated = { ...currentUser, projects: newProjects };
              setCurrentUser(updated);
            }}
          />
        )}

        {/* Tab 0.7: Trust & Verification */}
        {activeSubTab === 'TRUST' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Trust & Verification Profile</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Understand how your reputation is computed and how administrative verification protects the SkillMesh community.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <VerifiedTickBadge isVerified={currentUser.isVerified} size="md" verifiedBy={currentUser.verifiedBy} />
                <span className="text-xs font-bold text-slate-700">
                  {currentUser.isVerified ? 'Official Verified Member' : 'Standard Member'}
                </span>
              </div>
            </div>

            {/* Admin Verification Card */}
            <div className={`p-5 rounded-2xl border ${
              currentUser.isVerified 
                ? 'bg-sky-50/70 border-sky-200' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  currentUser.isVerified ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {currentUser.isVerified ? 'Platform Verification Active' : 'Administrative Verification'}
                    </h3>
                    <VerifiedTickBadge isVerified={currentUser.isVerified} size="sm" />
                  </div>
                  {currentUser.isVerified ? (
                    <p className="text-slate-700 leading-relaxed">
                      Your identity and profile qualifications have been officially inspected and verified by an authorized SkillMesh administrator. The blue verified tick is displayed next to your name across match results, profile views, and chat channels.
                    </p>
                  ) : (
                    <p className="text-slate-600 leading-relaxed">
                      Verification on SkillMesh is strictly issued by authorized platform administrators based on verified skill exchanges, authentic peer ratings, and substantiated project portfolios. Users cannot grant themselves verified status.
                    </p>
                  )}
                  {currentUser.verifiedBy && (
                    <p className="text-[11px] text-slate-500 font-medium pt-1">
                      Verified by: {currentUser.verifiedBy} {currentUser.verifiedAt ? `on ${new Date(currentUser.verifiedAt).toLocaleDateString()}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Dimensions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Email Account</span>
                </div>
                <p className="text-xs text-slate-600">{currentUser.email}</p>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Supabase Auth Active
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Peer Reviews</span>
                </div>
                <p className="text-xs text-slate-600">
                  {ratingSummary?.totalRatings || 0} verified peer ratings received
                </p>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                  Avg: {ratingSummary?.totalRatings ? ratingSummary.averageRating.toFixed(1) : '5.0'} / 5.0
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <FolderGit2 className="w-4 h-4 text-indigo-600" />
                  <span>Projects & Artifacts</span>
                </div>
                <p className="text-xs text-slate-600">
                  {currentUser.projects?.length || 0} public portfolio showcase projects
                </p>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  Public Proof of Work
                </span>
              </div>
            </div>

            {/* Self-Declared Notice */}
            <div className="pt-2">
              <SelfDeclaredNotice />
            </div>
          </div>
        )}

        {/* Tab 1: Offered Skills */}
        {activeSubTab === 'OFFERED' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Skills You Can Share</h2>
              <p className="text-xs text-slate-500">
                Peers looking for these skills will discover you and review your user-provided proof of experience.
              </p>
            </div>

            <OfferedSkillsManager
              skills={currentUser.offeredSkills}
              onAddSkill={addOfferedSkill}
              onRemoveSkill={removeOfferedSkill}
            />
          </div>
        )}

        {/* Tab 2: Wanted Skills */}
        {activeSubTab === 'WANTED' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Skills You Want to Learn</h2>
              <p className="text-xs text-slate-500">
                Our matching engine pairs you with peers offering these skills for 1-on-1 exchanges.
              </p>
            </div>

            <WantedSkillsManager
              skills={currentUser.wantedSkills}
              onAddSkill={addWantedSkill}
              onRemoveSkill={removeWantedSkill}
            />
          </div>
        )}

        {/* Tab: Mentorship Availability & Scheduling */}
        {activeSubTab === 'AVAILABILITY' && (
          <ProfileSchedulingManager />
        )}

        {/* Tab 3: Basic Info Form */}
        {activeSubTab === 'BASIC_INFO' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">Personal & Background Information</h2>
              <p className="text-xs text-slate-500">Update your public profile, current status, organization, and professional links.</p>
            </div>

            {saveSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Profile details saved successfully!</span>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveBasicInfo} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-medium"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('STUDENT')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      status === 'STUDENT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('WORKING_PROFESSIONAL')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      status === 'WORKING_PROFESSIONAL'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Professional
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('OTHER')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      status === 'OTHER'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Other
                  </button>
                </div>
              </div>

              {/* Status specific fields */}
              {status === 'STUDENT' && (
                <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-100 space-y-1">
                  <label className="block text-xs font-bold text-sky-900">
                    College / University Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford University, UC Berkeley..."
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  />
                </div>
              )}

              {status === 'WORKING_PROFESSIONAL' && (
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                  <label className="block text-xs font-bold text-emerald-900">
                    Company / Organization / Workplace <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google, Stripe, Local Design Studio..."
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  />
                </div>
              )}

              {status === 'OTHER' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <label className="block text-xs font-bold text-slate-900">
                    Occupation / Learning Focus <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Independent Researcher, Bootcamper..."
                    value={occupationDetails}
                    onChange={(e) => setOccupationDetails(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Headline / Field / Role</label>
                <input
                  type="text"
                  required
                  value={titleOrRole}
                  onChange={(e) => setTitleOrRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Profile Picture</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              setError('Image file size should be less than 2MB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setAvatarUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(generateInitialsAvatar(displayName || currentUser.name))}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Use Initials Avatar</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="Or enter direct image URL..."
                      value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              {/* Match Purpose & Collaboration Intent */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-0.5">
                    🎯 Match Intent & Collaboration Purposes
                  </label>
                  <p className="text-xs text-slate-500">
                    Select the reasons you are looking to connect with peers on SkillMesh:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'learn_skill' as MatchPurpose,
                      label: 'Learn a Skill',
                      desc: 'I want to learn something from another person',
                      icon: BookOpen,
                      color: 'text-teal-700 bg-teal-50 border-teal-100'
                    },
                    {
                      id: 'teach_skill' as MatchPurpose,
                      label: 'Teach or Share a Skill',
                      desc: 'I want to help someone learn what I know',
                      icon: HeartHandshake,
                      color: 'text-emerald-700 bg-emerald-50 border-emerald-100'
                    },
                    {
                      id: 'exchange_skills' as MatchPurpose,
                      label: 'Exchange Skills',
                      desc: 'I want a two-way skill exchange with someone',
                      icon: ArrowRightLeft,
                      color: 'text-teal-700 bg-teal-50 border-teal-100'
                    },
                    {
                      id: 'project_collaboration' as MatchPurpose,
                      label: 'Find a Project Collaborator',
                      desc: 'I want to build a project with complementary skills',
                      icon: Users,
                      color: 'text-amber-700 bg-amber-50 border-amber-100'
                    }
                  ].map(purpose => {
                    const isChecked = matchPurposes.includes(purpose.id);
                    const Icon = purpose.icon;
                    return (
                      <label
                        key={purpose.id}
                        className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                          isChecked
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 opacity-75'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMatchPurposes(prev => [...prev, purpose.id]);
                            } else {
                              // Ensure at least one is selected
                              if (matchPurposes.length > 1) {
                                setMatchPurposes(prev => prev.filter(p => p !== purpose.id));
                              }
                            }
                          }}
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-slate-700" />
                            <span className="text-xs font-bold text-slate-800">{purpose.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">{purpose.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Extended Project Collaboration Details */}
                {matchPurposes.includes('project_collaboration') && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span>Project Collaboration Preferences</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Current Project or Idea Description <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Briefly describe what you're working on or want to build (e.g. AI-assisted study app, indie game, mobile MVP)..."
                        value={activeProjectDescription}
                        onChange={(e) => setActiveProjectDescription(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Ideal Collaborators / Synergies Needed <span className="text-slate-500 font-normal">(Comma-separated)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UI/UX Designer, Backend Developer, Data Scientist"
                        value={collaborationInterests}
                        onChange={(e) => setCollaborationInterests(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Links */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <label className="block text-xs font-bold text-slate-700">Optional Professional Links</label>
                <input
                  type="url"
                  placeholder="LinkedIn URL (https://linkedin.com/in/...)"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <input
                  type="url"
                  placeholder="GitHub URL (https://github.com/...)"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <input
                  type="url"
                  placeholder="Portfolio / Personal Site URL"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                🔒 <strong>Privacy Notice:</strong> Contact details such as personal emails, phone numbers, and physical addresses are kept strictly confidential.
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Blocked Users & Safety */}
        {activeSubTab === 'BLOCKED_USERS' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Blocked Users Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Users you have blocked cannot message you, send exchange requests, or see you in matches.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Safety & Privacy</span>
              </div>
            </div>

            {unblockMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{unblockMessage}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1">
              <p className="font-bold text-slate-800">About Unblocking Peers:</p>
              <p>
                When you unblock a user, you will be able to discover each other again. For safety and privacy, past active exchange channels or archived chat threads are not automatically resumed; you may connect normally through a new exchange proposal.
              </p>
            </div>

            {myBlockedRecords.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No Blocked Users</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You have not blocked any users. If you block someone from chat or their profile, they will be listed here and you can unblock them at any time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBlockedRecords.map((record) => {
                  const targetUser = allUsers.find(u => u.id === record.blockedUserId);
                  const displayName = targetUser?.name || record.blockedUserName || 'Peer';
                  const avatarUrl = targetUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                  const title = targetUser?.titleOrRole || 'Community Member';

                  return (
                    <div
                      key={record.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{displayName}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                              Blocked
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Blocked on {new Date(record.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnblock(record.blockedUserId, displayName)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Unblock User</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

