import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getRankedMatchesForUser } from '../../utils/matchingEngine';
import { MatchScoreResult, MatchType } from '../../types';
import { ProficiencyBadge, SelfDeclaredNotice, UserStatusBadge } from '../common/Badges';
import { 
  Sparkles, 
  Search, 
  ArrowRightLeft, 
  User, 
  MapPin, 
  CheckCircle, 
  Send,
  Plus,
  AlertTriangle,
  MessageSquare,
  Clock,
  Users
} from 'lucide-react';

export const MatchResultsPage: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    isUserBlocked,
    isUserSuspended,
    isCurrentUserSuspended,
    openUserProfile, 
    setConnectModalTarget, 
    setCurrentView,
    connections,
    getActiveConnectionWithUser,
    getPendingRequestWithUser,
    openChatForConnection
  } = useApp();

  const [matchTypeFilter, setMatchTypeFilter] = useState<'ALL' | 'PROJECT_COLLABORATION' | 'STRONG_MATCH' | 'RELEVANT_MATCH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('ALL');

  // Compute matches for the current user, excluding any blocked or suspended candidates
  const rankedMatches: MatchScoreResult[] = useMemo(() => {
    if (!currentUser) return [];
    const eligibleCandidates = allUsers.filter(u => 
      u.id !== currentUser.id && 
      !isUserBlocked(u.id) && 
      !isUserSuspended(u.id)
    );
    const purposeFilter = matchTypeFilter === 'PROJECT_COLLABORATION' ? 'project_collaboration' : undefined;
    return getRankedMatchesForUser(currentUser, eligibleCandidates, purposeFilter);
  }, [currentUser, allUsers, isUserBlocked, isUserSuspended, matchTypeFilter]);

  // Unique skills offered by matched users for quick filter pills
  const availableOfferedSkills = useMemo(() => {
    const skills = new Set<string>();
    rankedMatches.forEach(m => {
      m.targetUser.offeredSkills.forEach(s => skills.add(s.name));
    });
    return Array.from(skills);
  }, [rankedMatches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return rankedMatches.filter(match => {
      // Filter out NO_MATCH by default unless search query specifically matches their name
      if (match.matchType === 'NO_MATCH' && !searchQuery.trim()) {
        return false;
      }

      // Match type filter
      if (matchTypeFilter !== 'ALL' && match.matchType !== matchTypeFilter) {
        return false;
      }

      // Skill filter
      if (selectedSkillFilter !== 'ALL') {
        const hasSkill = match.targetUser.offeredSkills.some(
          s => s.name.toLowerCase() === selectedSkillFilter.toLowerCase()
        );
        if (!hasSkill) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = match.targetUser.name.toLowerCase().includes(query);
        const titleMatch = match.targetUser.titleOrRole.toLowerCase().includes(query);
        const offerMatch = match.targetUser.offeredSkills.some(s => s.name.toLowerCase().includes(query));
        const wantMatch = match.targetUser.wantedSkills.some(s => s.name.toLowerCase().includes(query));
        const projMatch = match.targetUser.activeProjectDescription?.toLowerCase().includes(query);
        if (!nameMatch && !titleMatch && !offerMatch && !wantMatch && !projMatch) return false;
      }

      return true;
    });
  }, [rankedMatches, matchTypeFilter, selectedSkillFilter, searchQuery]);

  const collabMatchesCount = rankedMatches.filter(m => m.matchType === 'PROJECT_COLLABORATION').length;
  const strongMatchesCount = rankedMatches.filter(m => m.matchType === 'STRONG_MATCH').length;
  const relevantMatchesCount = rankedMatches.filter(m => m.matchType === 'RELEVANT_MATCH').length;

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Please sign in to view matches</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">You need an active profile with skills to find peer matches.</p>
          <button
            onClick={() => setCurrentView('login')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Log In or Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        
        {/* Left Aside Sidebar: My Skills Summary */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          {/* I Can Offer Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">I can offer</h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {currentUser.offeredSkills.length}
              </span>
            </div>

            <div className="space-y-3">
              {currentUser.offeredSkills.length > 0 ? (
                currentUser.offeredSkills.map(skill => (
                  <div key={skill.id} className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-emerald-950">{skill.name}</span>
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">
                        {skill.proficiency === 'Beginner' ? 'BEG' : skill.proficiency === 'Intermediate' ? 'INT' : 'ADV'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-tight">
                      {skill.yearsOfPractice || '1+ yr'}. {skill.teachingConfidence === 'Beginners' ? 'Comfortable with beginners.' : 'Comfortable with all levels.'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No skills offered yet.</p>
              )}
            </div>

            <button
              id="sidebar-add-offered-skill-btn"
              onClick={() => setCurrentView('my_profile')}
              className="w-full mt-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              + Add Skill
            </button>
          </div>

          {/* I Want to Learn Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">I want to learn</h3>
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                {currentUser.wantedSkills.length}
              </span>
            </div>

            <div className="space-y-2">
              {currentUser.wantedSkills.length > 0 ? (
                currentUser.wantedSkills.map((skill, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <div 
                      key={skill.id} 
                      className={`flex items-center gap-2 p-2.5 rounded-lg ${
                        isEven ? 'bg-teal-50 text-teal-900' : 'bg-emerald-50 text-emerald-900'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isEven ? 'bg-teal-500' : 'bg-emerald-500'}`}></div>
                      <span className="text-sm font-medium">{skill.name}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No learning goals added yet.</p>
              )}
            </div>

            <button
              id="sidebar-add-wanted-skill-btn"
              onClick={() => setCurrentView('my_profile')}
              className="w-full mt-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors cursor-pointer"
            >
              + Add Goal
            </button>
          </div>

          {/* Notice */}
          <SelfDeclaredNotice compact={true} />
        </aside>

        {/* Right Section: Smart Matches */}
        <section className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Smart Matches</h1>
              <p className="text-sm text-slate-500">Based on your current skill set and learning goals</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Match Type Pills */}
              <button
                id="filter-pill-all"
                onClick={() => setMatchTypeFilter('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  matchTypeFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Matches ({collabMatchesCount + strongMatchesCount + relevantMatchesCount})
              </button>

              <button
                id="filter-pill-collab"
                onClick={() => setMatchTypeFilter('PROJECT_COLLABORATION')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  matchTypeFilter === 'PROJECT_COLLABORATION'
                    ? 'bg-amber-600 text-white shadow-xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Collaborators ({collabMatchesCount})</span>
              </button>

              <button
                id="filter-pill-strong"
                onClick={() => setMatchTypeFilter('STRONG_MATCH')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  matchTypeFilter === 'STRONG_MATCH'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Strong ({strongMatchesCount})
              </button>

              <button
                id="filter-pill-relevant"
                onClick={() => setMatchTypeFilter('RELEVANT_MATCH')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  matchTypeFilter === 'RELEVANT_MATCH'
                    ? 'bg-teal-700 text-white shadow-xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Relevant ({relevantMatchesCount})
              </button>
            </div>
          </div>

          {/* Search & Skill Pill bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="matches-search-input"
                type="text"
                placeholder="Search by skill or peer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
            </div>

            {availableOfferedSkills.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs py-1">
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider shrink-0 mr-1">
                  Offered:
                </span>
                <button
                  onClick={() => setSelectedSkillFilter('ALL')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                    selectedSkillFilter === 'ALL'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {availableOfferedSkills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkillFilter(skill)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                      selectedSkillFilter === skill
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Matches Grid */}
          {filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              {filteredMatches.map((match) => {
                const peer = match.targetUser;
                const isCollab = match.matchType === 'PROJECT_COLLABORATION';
                const isStrong = match.matchType === 'STRONG_MATCH';
                const activeConn = getActiveConnectionWithUser(peer.id);
                const pendingInfo = getPendingRequestWithUser(peer.id);

                const offeredSkillNames = peer.offeredSkills.map(s => s.name).join(', ');
                const wantedSkillNames = peer.wantedSkills.map(w => w.name).join(', ');

                return (
                  <div
                    key={peer.id}
                    id={`match-card-${peer.id}`}
                    className={`p-6 rounded-3xl flex flex-col relative overflow-hidden transition-all ${
                      isCollab
                        ? 'bg-white border-2 border-amber-300 shadow-md shadow-amber-50/70'
                        : isStrong
                        ? 'bg-white border border-emerald-200 shadow-lg shadow-emerald-900/5'
                        : 'bg-white border border-slate-200 shadow-sm opacity-95 hover:opacity-100'
                    }`}
                  >
                    {/* Top right match badge */}
                    <div className="absolute top-0 right-0 p-4">
                      {isCollab ? (
                        <span className="px-3 py-1 bg-amber-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest flex items-center gap-1 shadow-xs">
                          <Users className="w-3 h-3" />
                          Project Collaborator
                        </span>
                      ) : isStrong ? (
                        <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-xs">
                          Strong Match
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-teal-50 text-teal-800 text-[10px] font-bold rounded-full uppercase tracking-widest border border-teal-100">
                          Relevant Match
                        </span>
                      )}
                    </div>

                    {/* Profile Header - Clickable Avatar & Name */}
                    <div className="flex items-start gap-4 mb-4">
                      <button
                        type="button"
                        id={`match-user-header-${peer.id}`}
                        onClick={() => openUserProfile(peer)}
                        className="flex items-start gap-4 text-left group cursor-pointer focus:outline-hidden"
                        title={`View ${peer.name}'s profile`}
                      >
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                          <img 
                            src={peer.avatarUrl} 
                            alt={peer.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                            {peer.name}
                          </h4>
                          <p className="text-xs font-semibold text-slate-600">{peer.titleOrRole}</p>
                          <div className="pt-0.5">
                            <UserStatusBadge
                              status={peer.status || 'STUDENT'}
                              institutionName={peer.institutionName}
                              organizationName={peer.organizationName}
                              occupationDetails={peer.occupationDetails}
                              size="sm"
                            />
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Exchange details */}
                    <div className="flex-grow space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0">
                          {isCollab ? '🛠️' : '🤝'}
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">
                          <span className="font-bold text-slate-900 uppercase tracking-tight mr-1">
                            Offers:
                          </span> 
                          {offeredSkillNames || 'None specified'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0">
                          🎯
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">
                          <span className="font-bold text-slate-900 uppercase tracking-tight mr-1">
                            {isCollab ? 'Looking For:' : 'Wants:'}
                          </span> 
                          {wantedSkillNames || (peer.collaborationInterests?.join(', ') || 'Collaborators')}
                        </p>
                      </div>

                      {/* Active Project / Idea highlight for Project Collaborators */}
                      {peer.activeProjectDescription && (
                        <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-0.5">
                          <span className="font-bold text-amber-900 text-[10px] uppercase tracking-wider block">
                            Active Project:
                          </span>
                          <p className="italic text-amber-900 leading-snug line-clamp-2">
                            "{peer.activeProjectDescription}"
                          </p>
                        </div>
                      )}

                      {/* Explanation Quote Box */}
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[11px] leading-relaxed text-slate-500 italic">
                          "{match.explanation}"
                        </p>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-6 flex gap-3">
                      <button
                        id={`view-profile-btn-${peer.id}`}
                        onClick={() => openUserProfile(peer)}
                        className={`flex-grow py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                          isCollab
                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-200 hover:bg-amber-700'
                            : isStrong
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700'
                            : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        View Full Profile
                      </button>

                      {activeConn ? (
                        <button
                          id={`open-chat-btn-${peer.id}`}
                          onClick={() => openChatForConnection(activeConn.id)}
                          className="px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-bold border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>Chat</span>
                        </button>
                      ) : pendingInfo?.isIncoming ? (
                        <button
                          id={`review-request-btn-${peer.id}`}
                          onClick={() => setConnectModalTarget(peer)}
                          className="px-4 py-3 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-sm font-bold border border-teal-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft className="w-4 h-4 text-teal-600" />
                          <span>Review Request</span>
                        </button>
                      ) : pendingInfo?.isOutgoing ? (
                        <button
                          disabled
                          className="px-4 py-3 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200 flex items-center gap-1.5"
                        >
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Request Sent</span>
                        </button>
                      ) : isCurrentUserSuspended ? (
                        <button
                          disabled
                          title="Account suspended from sending new exchange requests pending safety review."
                          className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl text-sm font-semibold cursor-not-allowed border border-slate-200"
                        >
                          Restricted
                        </button>
                      ) : (
                        <button
                          id={`connect-btn-${peer.id}`}
                          onClick={() => setConnectModalTarget(peer)}
                          className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                            isCollab
                              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                              : isStrong
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isCollab ? 'Collaborate' : 'Request Exchange'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No matching peers found</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                We couldn't find an active peer matching your current filter criteria. Try resetting filters or adding more skills you want to learn.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setMatchTypeFilter('ALL');
                    setSelectedSkillFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setCurrentView('my_profile')}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-900/20 cursor-pointer"
                >
                  Add More Skills
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
