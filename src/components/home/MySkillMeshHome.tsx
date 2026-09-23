import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  User, 
  GraduationCap, 
  Building2, 
  Briefcase, 
  MapPin, 
  Edit3, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  ArrowRightLeft, 
  MessageSquare, 
  Plus, 
  ExternalLink,
  ChevronRight,
  Star,
  Award,
  Zap,
  Clock,
  Compass,
  Check,
  ShieldCheck,
  Rocket,
  Users
} from 'lucide-react';
import { calculateUserMatch } from '../../utils/matchingEngine';
import { UserProfile, OfferedSkill, WantedSkill } from '../../types';

export const MySkillMeshHome: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    connections, 
    setCurrentView, 
    openUserProfile, 
    setConnectModalTarget,
    openChatForConnection,
    blockedUsers
  } = useApp();

  if (!currentUser) {
    return null;
  }

  // Real filtered peer users (excluding self, blocked, and demo users)
  const availablePeers = useMemo(() => {
    const blockedIds = new Set(
      blockedUsers
        .filter(b => b.blockerId === currentUser.id)
        .map(b => b.blockedUserId)
    );

    return allUsers.filter(u => 
      u.id !== currentUser.id && 
      !blockedIds.has(u.id) &&
      u.accountStatus !== 'SUSPENDED' && 
      u.accountStatus !== 'BANNED'
    );
  }, [allUsers, currentUser.id, blockedUsers]);

  // Compute matched peers ranked by matchScore
  const matchedPeers = useMemo(() => {
    return availablePeers
      .map(peer => {
        const matchResult = calculateUserMatch(currentUser, peer);
        return {
          peer,
          matchResult
        };
      })
      .filter(item => item.matchResult.matchType !== 'NO_MATCH' || item.matchResult.matchScore > 0)
      .sort((a, b) => b.matchResult.matchScore - a.matchResult.matchScore);
  }, [availablePeers, currentUser]);

  // User's active & previous exchanges
  const myActiveExchanges = useMemo(() => {
    return connections.filter(
      c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'ACCEPTED'
    );
  }, [connections, currentUser.id]);

  const myPendingRequests = useMemo(() => {
    return connections.filter(
      c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'PENDING'
    );
  }, [connections, currentUser.id]);

  const myPastExchanges = useMemo(() => {
    return connections.filter(
      c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && 
           (c.status === 'ENDED' || c.status === 'DECLINED')
    );
  }, [connections, currentUser.id]);

  // Greeting by time of day
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    const firstName = currentUser.name.split(' ')[0] || currentUser.name;
    if (hour < 12) return `Good morning, ${firstName}! ✨`;
    if (hour < 18) return `Good afternoon, ${firstName}! ✨`;
    return `Good evening, ${firstName}! ✨`;
  }, [currentUser.name]);

  // Organization / Institution label
  const affiliationLabel = useMemo(() => {
    if (currentUser.status === 'STUDENT' && currentUser.institutionName) {
      return { text: currentUser.institutionName, icon: GraduationCap };
    }
    if (currentUser.status === 'WORKING_PROFESSIONAL' && currentUser.organizationName) {
      return { text: currentUser.organizationName, icon: Building2 };
    }
    if (currentUser.occupationDetails) {
      return { text: currentUser.occupationDetails, icon: Briefcase };
    }
    return null;
  }, [currentUser]);

  const AffiliationIcon = affiliationLabel?.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-9 space-y-9 sm:space-y-11">
      
      {/* ─────────────────────────────────────────────────────────────
          1. 👤 THIS IS WHO I AM — Welcoming Personal Profile Section
      ────────────────────────────────────────────────────────────── */}
      <section id="my-skillmesh-profile-hero" aria-label="Personal Profile Summary">
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-900/50 shadow-xl relative overflow-hidden">
          {/* Subtle atmospheric glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            
            {/* Left: Avatar & Personal Information */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-900/60 p-1 border-2 border-emerald-400/40 shadow-md overflow-hidden">
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                    alt={currentUser.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                {currentUser.isVerified && (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-900 shadow-xs" title="Verified Member">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span>My Personal SkillMesh Space</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {greetingText}
                </h1>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs sm:text-sm text-slate-300">
                  <span className="font-semibold text-white">{currentUser.name}</span>
                  {currentUser.titleOrRole && (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="text-emerald-200">{currentUser.titleOrRole}</span>
                    </>
                  )}
                  {affiliationLabel && AffiliationIcon && (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <AffiliationIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{affiliationLabel.text}</span>
                      </span>
                    </>
                  )}
                  {currentUser.location && (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3 h-3" />
                        <span>{currentUser.location}</span>
                      </span>
                    </>
                  )}
                </div>

                {currentUser.bio && (
                  <p className="text-xs sm:text-sm text-slate-300/90 max-w-2xl pt-1 line-clamp-2 leading-relaxed">
                    "{currentUser.bio}"
                  </p>
                )}
              </div>
            </div>

            {/* Right: Quick Profile Actions & Direct Route to Edit */}
            <div className="flex flex-row md:flex-col items-center sm:items-stretch gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
              <button
                id="my-skillmesh-edit-profile-btn"
                onClick={() => setCurrentView('my_profile')}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer hover:shadow-md"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>View & Edit Profile</span>
              </button>

              <button
                id="my-skillmesh-discover-btn"
                onClick={() => setCurrentView('matches')}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Explore All Matches</span>
              </button>
            </div>

          </div>

          {/* Quick Snapshot Numbers */}
          <div className="mt-6 pt-5 border-t border-slate-800/90 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <p className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Skills You Teach</span>
              </p>
              <p className="text-xl font-black text-white mt-0.5">
                {currentUser.offeredSkills?.length || 0}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <p className="text-[11px] font-medium text-teal-300 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" />
                <span>Skills You Want</span>
              </p>
              <p className="text-xl font-black text-white mt-0.5">
                {currentUser.wantedSkills?.length || 0}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <p className="text-[11px] font-medium text-cyan-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3 h-3" />
                <span>Active Exchanges</span>
              </p>
              <p className="text-xl font-black text-white mt-0.5">
                {myActiveExchanges.length}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <p className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                <span>Matches Available</span>
              </p>
              <p className="text-xl font-black text-white mt-0.5">
                {matchedPeers.length}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          🚀 PROJECT COLLABORATION HUB LAUNCHPAD
      ────────────────────────────────────────────────────────────── */}
      <section id="my-skillmesh-project-collab-banner" aria-label="Project Collaboration Hub">
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-7 border border-teal-800/50 shadow-lg text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
          <div className="space-y-2 relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-teal-500/20 text-teal-200 border border-teal-400/30 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
              <Rocket className="w-3.5 h-3.5 text-teal-300" />
              <span>New Hub: Project Collaboration</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Build Real Projects Together with Matched Peers
            </h2>
            <p className="text-xs sm:text-sm text-teal-200/90 leading-relaxed">
              Step beyond 1-on-1 tutoring. Propose shared apps, research papers, and portfolios. Convert active skill exchanges into joint collaborative workspaces.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <button
              id="home-open-project-collab-btn"
              onClick={() => setCurrentView('project_collaboration')}
              className="px-5 py-3 rounded-2xl bg-white hover:bg-teal-50 text-teal-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-teal-700" />
              <span>Explore Projects Hub &rarr;</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. ✨ WHAT I CAN OFFER & 📚 WHAT I WANT TO LEARN (Grid)
      ────────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8" aria-label="My Skills Overview">
        
        {/* ✨ WHAT I CAN OFFER */}
        <div 
          id="my-skillmesh-offered-skills-card"
          className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-5"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 font-bold">
                  ✨
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">What I Can Offer</h2>
                  <p className="text-xs text-slate-500">Skills you are ready to teach and share with peers</p>
                </div>
              </div>

              <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
                {currentUser.offeredSkills?.length || 0} Listed
              </span>
            </div>

            {/* Skills List */}
            <div className="pt-4 space-y-3">
              {currentUser.offeredSkills && currentUser.offeredSkills.length > 0 ? (
                currentUser.offeredSkills.map(skill => (
                  <div 
                    key={skill.id}
                    className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-slate-50 border border-emerald-100/90 hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{skill.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            skill.proficiency === 'Advanced' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : skill.proficiency === 'Intermediate'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {skill.proficiency}
                          </span>

                          {skill.yearsOfPractice && (
                            <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              ⏱️ {skill.yearsOfPractice}
                            </span>
                          )}

                          {skill.teachingConfidence && (
                            <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              🎓 Mentoring: {skill.teachingConfidence}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {skill.experienceDescription && (
                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-emerald-100/50">
                        {skill.experienceDescription}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                  <p className="text-xs font-bold text-slate-700">No teaching skills added yet</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Add skills you can share or mentor in to let peers match with you.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Keep your teaching areas updated</span>
            <button
              id="my-skillmesh-manage-offered-btn"
              onClick={() => setCurrentView('my_profile')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Teaching Skills</span>
            </button>
          </div>
        </div>

        {/* 📚 WHAT I WANT TO LEARN */}
        <div 
          id="my-skillmesh-wanted-skills-card"
          className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-5"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 font-bold">
                  📚
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">What I Want to Learn</h2>
                  <p className="text-xs text-slate-500">Skills and subjects you are seeking from peer mentors</p>
                </div>
              </div>

              <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-full">
                {currentUser.wantedSkills?.length || 0} Goals
              </span>
            </div>

            {/* Wanted Skills List */}
            <div className="pt-4 space-y-3">
              {currentUser.wantedSkills && currentUser.wantedSkills.length > 0 ? (
                currentUser.wantedSkills.map(skill => (
                  <div 
                    key={skill.id}
                    className="p-4 rounded-2xl bg-gradient-to-r from-teal-50/60 to-emerald-50/40 border border-teal-100/90 hover:border-teal-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{skill.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                            Current: {skill.currentLevel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {skill.learningGoal && (
                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-teal-100/50">
                        🎯 Goal: {skill.learningGoal}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                  <p className="text-xs font-bold text-slate-700">No learning goals added yet</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Add topics you want to learn so SkillMesh can recommend matching peers.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Add new goals anytime</span>
            <button
              id="my-skillmesh-manage-wanted-btn"
              onClick={() => setCurrentView('my_profile')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Learning Goals</span>
            </button>
          </div>
        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          3. 🤝 YOUR MATCHES — Curated Peer Barter Recommendations
      ────────────────────────────────────────────────────────────── */}
      <section id="my-skillmesh-matches-preview" aria-label="Curated Peer Matches">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 font-bold">
                  🤝
                </div>
                <h2 className="text-lg font-bold text-slate-900">Your Personalized Matches</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Peers with compatible exchange skills based on what you can offer and what you want to learn.
              </p>
            </div>

            <button
              id="my-skillmesh-view-all-matches-top-btn"
              onClick={() => setCurrentView('matches')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
            >
              <span>Discover More Matches ({matchedPeers.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Matches Grid Preview (Top 3 Matches) */}
          {matchedPeers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {matchedPeers.slice(0, 3).map(({ peer, matchResult }) => {
                const theyTeach = matchResult.mutualTeachSkills[0]?.theyTeach || peer.offeredSkills[0];
                const youTeach = matchResult.mutualLearnSkills[0]?.youTeach || currentUser.offeredSkills[0];

                return (
                  <div
                    key={peer.id}
                    className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-emerald-300 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Peer Header - Clickable Avatar & Name */}
                      <button
                        type="button"
                        id={`home-match-user-${peer.id}`}
                        onClick={() => openUserProfile(peer)}
                        className="flex items-start gap-3 text-left group cursor-pointer focus:outline-hidden w-full"
                        title={`View ${peer.name}'s profile`}
                      >
                        <img
                          src={peer.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={peer.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 group-hover:scale-105 transition-all"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">{peer.name}</h4>
                            {peer.isVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{peer.titleOrRole || 'SkillMesh Member'}</p>
                          {peer.institutionName && (
                            <p className="text-[11px] text-slate-400 truncate">🎓 {peer.institutionName}</p>
                          )}
                          {peer.organizationName && (
                            <p className="text-[11px] text-slate-400 truncate">🏢 {peer.organizationName}</p>
                          )}
                        </div>
                      </button>

                      {/* Match Badge */}
                      <div className="mt-3">
                        {matchResult.matchType === 'STRONG_MATCH' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            ⭐ Strong Mutual Exchange ({matchResult.matchScore}%)
                          </span>
                        )}
                        {matchResult.matchType === 'RELEVANT_MATCH' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                            ✨ Relevant Match ({matchResult.matchScore}%)
                          </span>
                        )}
                        {matchResult.matchType === 'KNOWLEDGE_SHARE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            🤝 Knowledge Share ({matchResult.matchScore}%)
                          </span>
                        )}
                      </div>

                      {/* Skills Exchange Overlap Box */}
                      <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2 text-xs">
                        {theyTeach && (
                          <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                              They Can Teach You:
                            </p>
                            <p className="font-bold text-emerald-950 truncate mt-0.5">
                              {theyTeach.name} <span className="text-[10px] font-normal text-emerald-700">({theyTeach.proficiency})</span>
                            </p>
                          </div>
                        )}

                        {youTeach && (
                          <div className="p-2 rounded-lg bg-teal-50/70 border border-teal-100">
                            <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                              You Can Teach Them:
                            </p>
                            <p className="font-bold text-teal-950 truncate mt-0.5">
                              {youTeach.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => openUserProfile(peer)}
                        className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer text-center"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => setConnectModalTarget(peer)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
                      >
                        Connect
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <p className="text-sm font-bold text-slate-700">Looking for more matches?</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Add more skills to your teaching list or learning goals to broaden your mutual compatibility.
              </p>
              <button
                onClick={() => setCurrentView('matches')}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Browse All Community Members
              </button>
            </div>
          )}

          {/* Bottom Callout Button */}
          <div className="pt-2 text-center">
            <button
              id="my-skillmesh-discover-more-bottom-btn"
              onClick={() => setCurrentView('matches')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer hover:shadow-lg"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Discover More Matches in the Community</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </section>


      {/* ─────────────────────────────────────────────────────────────
          4. 🕒 MY SKILLMESH JOURNEY — User's Own Activity & History
      ────────────────────────────────────────────────────────────── */}
      <section id="my-skillmesh-journey" aria-label="My SkillMesh Journey">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 font-bold">
                  🕒
                </div>
                <h2 className="text-lg font-bold text-slate-900">My SkillMesh Journey</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Your ongoing skill exchanges, incoming requests, and learning history.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setCurrentView('active_exchanges')}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-colors cursor-pointer"
              >
                {myActiveExchanges.length} Active Exchanges
              </button>
              <button
                onClick={() => setCurrentView('requests')}
                className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200/80 transition-colors cursor-pointer"
              >
                {myPendingRequests.length} Pending
              </button>
            </div>
          </div>

          {/* Active Exchanges Highlight */}
          {myActiveExchanges.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ongoing Skill Exchanges</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {myActiveExchanges.map(conn => {
                  const isSender = conn.senderId === currentUser.id;
                  const otherName = isSender ? conn.receiverName : conn.senderName;
                  const otherId = isSender ? conn.receiverId : conn.senderId;
                  const otherUser = allUsers.find(u => u.id === otherId);

                  return (
                    <div
                      key={conn.id}
                      className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/50 to-slate-50 border border-emerald-200 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          id={`home-exchange-partner-${conn.id}`}
                          onClick={() => openUserProfile(otherId)}
                          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden"
                          title={`View ${otherName}'s profile`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                            <img
                              src={otherUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                              alt={otherName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{otherName}</p>
                            <p className="text-xs text-slate-500">
                              {conn.offeredSkillName} ⇄ {conn.wantedSkillName}
                            </p>
                          </div>
                        </button>

                        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => openChatForConnection(conn.id)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open Chat</span>
                        </button>
                        <button
                          onClick={() => setCurrentView('active_exchanges')}
                          className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* First time journey checklist */
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-slate-50 border border-emerald-100/90 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                  🚀
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your Journey Checklist</h3>
                  <p className="text-xs text-slate-500">Simple steps to complete your first skill exchange</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    (currentUser.offeredSkills?.length || 0) > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {(currentUser.offeredSkills?.length || 0) > 0 ? <Check className="w-3 h-3" /> : '1'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">List Your Skills</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {(currentUser.offeredSkills?.length || 0) > 0 ? 'Completed' : 'Add at least 1 teaching skill'}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    myPendingRequests.length > 0 || myActiveExchanges.length > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {myPendingRequests.length > 0 || myActiveExchanges.length > 0 ? <Check className="w-3 h-3" /> : '2'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Send a Request</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Connect with a matched peer
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    myActiveExchanges.length > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {myActiveExchanges.length > 0 ? <Check className="w-3 h-3" /> : '3'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Exchange Knowledge</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Learn together in direct chat
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Past Exchanges or Completed Journey Note */}
          {myPastExchanges.length > 0 && (
            <div className="pt-2 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Completed & Past Exchanges ({myPastExchanges.length})
              </h3>
              <div className="space-y-2">
                {myPastExchanges.slice(0, 3).map(past => (
                  <div
                    key={past.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600"
                  >
                    <span>
                      Exchanged <strong className="text-slate-800">{past.offeredSkillName}</strong> for <strong className="text-slate-800">{past.wantedSkillName}</strong>
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">
                      {past.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};
