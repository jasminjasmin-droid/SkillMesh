import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  Sparkles, 
  FolderGit2, 
  Send, 
  Inbox, 
  CheckCircle2, 
  X, 
  Check, 
  MessageSquare, 
  ArrowRight, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  ExternalLink,
  Layers,
  Rocket,
  Lightbulb,
  ShieldCheck,
  Tag,
  Code2,
  Palette,
  Briefcase,
  Share2,
  ChevronRight
} from 'lucide-react';
import { UserProfile, ConnectionRequest } from '../../types';
import { ConnectModal } from '../connections/ConnectModal';

export const ProjectCollaborationPage: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    connections, 
    acceptConnection, 
    declineConnection, 
    openUserProfile, 
    openChatForConnection,
    setCurrentView,
    isUserBlocked,
    isUserSuspended,
    upgradeExchangeToCollaboration
  } = useApp();

  const [activeTab, setActiveTab] = useState<'DISCOVER' | 'PROPOSALS' | 'ACTIVE_PROJECTS'>('DISCOVER');
  const [proposalSubTab, setProposalSubTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<'ALL' | 'TECHNICAL' | 'NON_TECHNICAL'>('ALL');
  const [selectedUserForCollab, setSelectedUserForCollab] = useState<UserProfile | null>(null);

  // Upgrade modal state for an existing active exchange
  const [upgradeTargetConn, setUpgradeTargetConn] = useState<ConnectionRequest | null>(null);
  const [upgradeProjectTitle, setUpgradeProjectTitle] = useState('');
  const [upgradeLookingFor, setUpgradeLookingFor] = useState('');
  const [upgradeWhyConnect, setUpgradeWhyConnect] = useState('');
  const [upgradeSuccessToast, setUpgradeSuccessToast] = useState<string | null>(null);

  // Separate Project Collaboration requests from regular skill exchange requests
  const projectRequests = useMemo(() => {
    if (!currentUser) return [];
    return connections.filter(
      c => (c.isProjectCollaboration || c.requestType === 'PROJECT_COLLABORATION') &&
           (c.senderId === currentUser.id || c.receiverId === currentUser.id)
    );
  }, [connections, currentUser]);

  const receivedProposals = useMemo(() => {
    if (!currentUser) return [];
    return projectRequests.filter(c => c.receiverId === currentUser.id);
  }, [projectRequests, currentUser]);

  const pendingReceivedCount = receivedProposals.filter(c => c.status === 'PENDING').length;

  const sentProposals = useMemo(() => {
    if (!currentUser) return [];
    return projectRequests.filter(c => c.senderId === currentUser.id);
  }, [projectRequests, currentUser]);

  const activeProjects = useMemo(() => {
    if (!currentUser) return [];
    return projectRequests.filter(c => c.status === 'ACCEPTED');
  }, [projectRequests, currentUser]);

  // Standard skill exchanges (for optional upgrade)
  const regularActiveExchanges = useMemo(() => {
    if (!currentUser) return [];
    return connections.filter(
      c => c.status === 'ACCEPTED' && 
           !c.isProjectCollaboration && 
           c.requestType !== 'PROJECT_COLLABORATION' &&
           (c.senderId === currentUser.id || c.receiverId === currentUser.id)
    );
  }, [connections, currentUser]);

  // Potential collaborators from all registered users
  const potentialCollaborators = useMemo(() => {
    if (!currentUser) return [];
    return allUsers.filter(user => {
      if (user.id === currentUser.id) return false;
      if (isUserBlocked(user.id) || isUserSuspended(user.id)) return false;

      // Filter by domain
      if (domainFilter !== 'ALL') {
        const hasMatchingDomain = user.offeredSkills.some(s => s.category === domainFilter);
        if (!hasMatchingDomain) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = user.name.toLowerCase().includes(q);
        const titleMatch = user.titleOrRole.toLowerCase().includes(q);
        const bioMatch = user.bio?.toLowerCase().includes(q);
        const skillMatch = user.offeredSkills.some(s => s.name.toLowerCase().includes(q));
        const projectMatch = user.activeProjectDescription?.toLowerCase().includes(q);
        return nameMatch || titleMatch || bioMatch || skillMatch || projectMatch;
      }

      return true;
    });
  }, [allUsers, currentUser, domainFilter, searchQuery, isUserBlocked, isUserSuspended]);

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <Rocket className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Project Collaboration Hub</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">Sign in to discover peer collaborators, build team projects together, and manage collaboration proposals.</p>
          <button
            onClick={() => setCurrentView('login')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Log In to SkillMesh
          </button>
        </div>
      </div>
    );
  }

  const handleStartUpgrade = (conn: ConnectionRequest) => {
    const partnerId = conn.senderId === currentUser.id ? conn.receiverId : conn.senderId;
    const partner = allUsers.find(u => u.id === partnerId);
    setUpgradeTargetConn(conn);
    setUpgradeProjectTitle(currentUser.activeProjectDescription ? 'Team Project: ' + currentUser.activeProjectDescription.slice(0, 30) : 'Collaborative Project');
    setUpgradeLookingFor(conn.wantedSkillName || partner?.offeredSkills[0]?.name || 'Complementary Skills');
    setUpgradeWhyConnect(`Let's team up to build a real-world project combining our skills!`);
  };

  const handleConfirmUpgrade = () => {
    if (!upgradeTargetConn) return;
    const res = upgradeExchangeToCollaboration(upgradeTargetConn.id, {
      projectTitle: upgradeProjectTitle,
      lookingFor: upgradeLookingFor,
      whyConnect: upgradeWhyConnect
    });
    if (res.success) {
      setUpgradeSuccessToast(`Exchange upgraded to Project Collaboration!`);
      setUpgradeTargetConn(null);
      setTimeout(() => setUpgradeSuccessToast(null), 4000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Toast Feedback */}
        {upgradeSuccessToast && (
          <div className="p-4 bg-emerald-600 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {upgradeSuccessToast}
            </span>
            <button onClick={() => setUpgradeSuccessToast(null)} className="text-emerald-200 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
              <Rocket className="w-3.5 h-3.5" />
              <span>Project Collaboration Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Build Real Projects with Skilled Peers
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Find co-builders with complementary technical and creative skills. Propose project collaborations, coordinate in private chats, and ship together.
            </p>
          </div>
          
          <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
            <button
              onClick={() => setActiveTab('DISCOVER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'DISCOVER'
                  ? 'bg-white text-emerald-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Discover Collaborators ({potentialCollaborators.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PROPOSALS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'PROPOSALS'
                  ? 'bg-white text-emerald-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Proposals & Requests</span>
              {pendingReceivedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-extrabold">
                  {pendingReceivedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ACTIVE_PROJECTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ACTIVE_PROJECTS'
                  ? 'bg-white text-emerald-950 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Collaborations ({activeProjects.length})</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: DISCOVER COLLABORATORS                                 */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'DISCOVER' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by skill, project, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-medium">Domain:</span>
                <button
                  onClick={() => setDomainFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    domainFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setDomainFilter('TECHNICAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    domainFilter === 'TECHNICAL'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Technical
                </button>
                <button
                  onClick={() => setDomainFilter('NON_TECHNICAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    domainFilter === 'NON_TECHNICAL'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Non-Technical
                </button>
              </div>
            </div>

            {/* List of Registered Peers Open to Collab */}
            {potentialCollaborators.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No matching collaborators found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search keywords or switching domain filters to find registered peers.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {potentialCollaborators.map((user) => {
                  const hasActiveProject = Boolean(user.activeProjectDescription);
                  const isExistingCollab = activeProjects.some(
                    c => c.senderId === user.id || c.receiverId === user.id
                  );
                  const hasPendingReq = projectRequests.some(
                    c => (c.senderId === user.id || c.receiverId === user.id) && c.status === 'PENDING'
                  );

                  return (
                    <div
                      key={user.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Header - Clickable Avatar & Name */}
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            id={`collab-user-link-${user.id}`}
                            onClick={() => openUserProfile(user.id)}
                            className="flex items-start gap-3 text-left group cursor-pointer focus:outline-hidden min-w-0 flex-1"
                            title={`View ${user.name}'s profile`}
                          >
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                              <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">{user.name}</h4>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              </div>
                              <p className="text-xs text-slate-500 truncate">{user.titleOrRole}</p>
                              {user.institutionName && (
                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1">
                                  {user.institutionName}
                                </span>
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Active Project Pitch (if provided) */}
                        {hasActiveProject && (
                          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-950">
                              <Lightbulb className="w-3 h-3 text-emerald-600" />
                              <span>Active Project Focus:</span>
                            </div>
                            <p className="text-xs text-emerald-800 leading-snug line-clamp-2">
                              {user.activeProjectDescription}
                            </p>
                          </div>
                        )}

                        {/* Offered Skills */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Skills Offered:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {user.offeredSkills.slice(0, 3).map(skill => (
                              <span
                                key={skill.id}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium"
                              >
                                {skill.name} ({skill.proficiency.slice(0, 3)})
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Bio snippet */}
                        {user.bio && (
                          <p className="text-xs text-slate-500 line-clamp-2 italic">
                            "{user.bio}"
                          </p>
                        )}
                      </div>

                      {/* Action Footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openUserProfile(user.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          View Profile
                        </button>

                        {isExistingCollab ? (
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Collaborating</span>
                          </span>
                        ) : hasPendingReq ? (
                          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Proposal Pending</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedUserForCollab(user)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Rocket className="w-3.5 h-3.5" />
                            <span>Propose Collab</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section: Expand Existing Exchanges to Projects */}
            {regularActiveExchanges.length > 0 && (
              <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Expand an Existing Skill Exchange into a Team Project
                    </h3>
                    <p className="text-xs text-slate-500">
                      Already exchanging skills with someone? You can upgrade your partnership to build a real collaborative project without losing your chat history!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {regularActiveExchanges.map((conn) => {
                    const partnerId = conn.senderId === currentUser.id ? conn.receiverId : conn.senderId;
                    const partner = allUsers.find(u => u.id === partnerId);
                    if (!partner) return null;

                    return (
                      <div
                        key={conn.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={partner.avatarUrl}
                            alt={partner.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{partner.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              Swapping: {conn.offeredSkillName} ↔ {conn.wantedSkillName}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartUpgrade(conn)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
                        >
                          + Project
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PROPOSALS & REQUESTS (SEPARATED FROM REGULAR REQUESTS)  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'PROPOSALS' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setProposalSubTab('RECEIVED')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  proposalSubTab === 'RECEIVED'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Received Project Proposals ({receivedProposals.length})</span>
                {pendingReceivedCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingReceivedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setProposalSubTab('SENT')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  proposalSubTab === 'SENT'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sent Project Proposals ({sentProposals.length})</span>
              </button>
            </div>

            {/* Received Proposals List */}
            {proposalSubTab === 'RECEIVED' && (
              <div className="space-y-4">
                {receivedProposals.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                    <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-900">No incoming project collaboration proposals</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      When peers invite you to collaborate on a software, design, or research project, their detailed proposal will appear here.
                    </p>
                  </div>
                ) : (
                  receivedProposals.map((req) => {
                    const sender = allUsers.find(u => u.id === req.senderId);
                    const isPending = req.status === 'PENDING';
                    const isAccepted = req.status === 'ACCEPTED';
                    const isRejected = req.status === 'DECLINED';

                    return (
                      <div
                        key={req.id}
                        className={`bg-white rounded-3xl border p-6 shadow-sm transition-all space-y-4 ${
                          isPending
                            ? 'border-emerald-300 ring-1 ring-emerald-100'
                            : isAccepted
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-slate-200 bg-slate-50/40 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <img
                              src={sender?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={req.senderName}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-900">{req.senderName}</h4>
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                                  🤝 Project Collaboration
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{sender?.titleOrRole || 'Peer Collaborator'}</p>
                            </div>
                          </div>

                          <div>
                            {isPending && (
                              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pending Your Review</span>
                              </span>
                            )}
                            {isAccepted && (
                              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Accepted & Active</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                Declined
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Project Details Box */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4 text-emerald-600" />
                            <h5 className="text-xs font-bold text-slate-900">
                              Project: {req.collaborationDetails?.projectTitle || 'Collaborative Project'}
                            </h5>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Looking for from you:</span>
                              <span className="font-semibold text-emerald-950">
                                {req.collaborationDetails?.lookingFor || req.wantedSkillName || 'Technical / Creative Skills'}
                              </span>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Sender's Contribution:</span>
                              <span className="font-semibold text-purple-900">
                                {req.offeredSkillName || 'Domain Expertise & Development'}
                              </span>
                            </div>
                          </div>

                          {req.note && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Introductory Message & Pitch:</span>
                              <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-xl border border-slate-100">
                                "{req.note}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <button
                            onClick={() => sender && openUserProfile(sender.id)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            View Peer Profile →
                          </button>

                          <div className="flex items-center gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => declineConnection(req.id)}
                                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={() => acceptConnection(req.id)}
                                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Accept Collaboration</span>
                                </button>
                              </>
                            )}

                            {isAccepted && (
                              <button
                                onClick={() => openChatForConnection(req.id)}
                                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Open Project Chat</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Sent Proposals List */}
            {proposalSubTab === 'SENT' && (
              <div className="space-y-4">
                {sentProposals.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                    <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-900">No sent project proposals</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Explore registered peers and invite them to build a project with you to see your sent requests here.
                    </p>
                  </div>
                ) : (
                  sentProposals.map((req) => {
                    const receiver = allUsers.find(u => u.id === req.receiverId);
                    const isPending = req.status === 'PENDING';
                    const isAccepted = req.status === 'ACCEPTED';

                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <img
                              src={receiver?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={req.receiverName}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-900">To: {req.receiverName}</h4>
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                                  🤝 Project Collaboration
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">Project: {req.collaborationDetails?.projectTitle || 'Collaborative Project'}</p>
                            </div>
                          </div>

                          <div>
                            {isPending && (
                              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Awaiting Peer Response</span>
                              </span>
                            )}
                            {isAccepted && (
                              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Accepted & Active</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {req.note && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                            "{req.note}"
                          </p>
                        )}

                        {isAccepted && (
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => openChatForConnection(req.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Go to Project Chat</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: ACTIVE COLLABORATIVE PROJECTS                          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ACTIVE_PROJECTS' && (
          <div className="space-y-6">
            {activeProjects.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <Rocket className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No active project collaborations yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Browse open collaborators or accept incoming project proposals to start your joint building journey.
                </p>
                <button
                  onClick={() => setActiveTab('DISCOVER')}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 cursor-pointer"
                >
                  Discover Collaborators
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeProjects.map((conn) => {
                  const partnerId = conn.senderId === currentUser.id ? conn.receiverId : conn.senderId;
                  const partner = allUsers.find(u => u.id === partnerId);
                  const projectTitle = conn.collaborationDetails?.projectTitle || 'Team Project';

                  return (
                    <div
                      key={conn.id}
                      className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={partner?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={partner?.name || 'Partner'}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">{partner?.name}</h4>
                              <p className="text-xs text-slate-500">{partner?.titleOrRole}</p>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Active Project</span>
                          </span>
                        </div>

                        {/* Project Card */}
                        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4 text-emerald-600" />
                            <h5 className="text-xs font-bold text-emerald-950 truncate">{projectTitle}</h5>
                          </div>

                          <div className="text-xs text-emerald-800 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-emerald-600">Partner Contribution:</span>
                              <span className="font-semibold text-emerald-950 truncate max-w-[160px]">
                                {conn.offeredSkillName}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-emerald-600">Your Contribution:</span>
                              <span className="font-semibold text-emerald-950 truncate max-w-[160px]">
                                {conn.wantedSkillName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => partner && openUserProfile(partner.id)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Profile
                        </button>

                        <button
                          onClick={() => openChatForConnection(conn.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Collaborator Chat</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Connect Modal for Proposing Project Collaboration */}
      {selectedUserForCollab && (
        <ConnectModal
          targetUser={selectedUserForCollab}
          onClose={() => setSelectedUserForCollab(null)}
          initialMode="PROJECT_COLLABORATION"
        />
      )}

      {/* Upgrade Modal for Expanding Existing Exchange */}
      {upgradeTargetConn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">Upgrade to Project Collaboration</h3>
              </div>
              <button onClick={() => setUpgradeTargetConn(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Upgrade this active exchange to a formal team project. You will retain your full chat history and private channel.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Project Name / Working Title *</label>
                <input
                  type="text"
                  value={upgradeProjectTitle}
                  onChange={(e) => setUpgradeProjectTitle(e.target.value)}
                  placeholder="e.g. AI-Powered Study Planner App"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Skills / Focus Needed from Partner</label>
                <input
                  type="text"
                  value={upgradeLookingFor}
                  onChange={(e) => setUpgradeLookingFor(e.target.value)}
                  placeholder="e.g. UI/UX Design, React Frontend"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Project Goals & Note</label>
                <textarea
                  value={upgradeWhyConnect}
                  onChange={(e) => setUpgradeWhyConnect(e.target.value)}
                  rows={3}
                  placeholder="Briefly outline what you would like to build together..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setUpgradeTargetConn(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={!upgradeProjectTitle.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-colors cursor-pointer"
              >
                Confirm Project Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
