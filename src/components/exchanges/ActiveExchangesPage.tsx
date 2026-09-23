import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  ArrowRightLeft, 
  MessageSquare, 
  Sparkles, 
  User, 
  FolderDown,
  HeartHandshake,
  ShieldCheck,
  ShieldAlert,
  ShieldBan,
  Flag,
  History,
  Archive,
  AlertCircle,
  Users
} from 'lucide-react';
import { ConnectionRequest, ReportReason, UserProfile } from '../../types';
import { EndExchangeModal, BlockUserModal, ReportUserModal } from '../common/SafetyModals';

export const ActiveExchangesPage: React.FC = () => {
  const { 
    currentUser, 
    connections, 
    messages, 
    allUsers, 
    openUserProfile, 
    openChatForConnection,
    setCurrentView,
    endExchange,
    blockUser,
    reportUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ENDED'>('ACTIVE');
  
  // Selected connection for safety action
  const [selectedConnection, setSelectedConnection] = useState<ConnectionRequest | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Please sign in</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">Sign in to access your active peer exchanges and private chat channels.</p>
          <button
            onClick={() => setCurrentView('login')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  // Filter active (ACCEPTED) connections
  const activeExchanges = connections.filter(
    c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'ACCEPTED'
  );

  // Filter ended (ENDED) connections
  const endedExchanges = connections.filter(
    c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'ENDED'
  );

  const handleTriggerEnd = (conn: ConnectionRequest, partner: UserProfile | undefined) => {
    setSelectedConnection(conn);
    setTargetUser(partner || null);
    setShowEndModal(true);
  };

  const handleTriggerBlock = (partner: UserProfile | undefined) => {
    if (!partner) return;
    setTargetUser(partner);
    setShowBlockModal(true);
  };

  const handleTriggerReport = (partner: UserProfile | undefined, conn?: ConnectionRequest) => {
    if (!partner) return;
    setTargetUser(partner);
    setSelectedConnection(conn || null);
    setShowReportModal(true);
  };

  const handleConfirmEnd = (reason?: string) => {
    if (!selectedConnection) return;
    const res = endExchange(selectedConnection.id, reason);
    setShowEndModal(false);
    setSelectedConnection(null);
    if (res.success) {
      setFeedbackToast('Exchange closed and moved to Ended Exchanges history.');
    }
  };

  const handleConfirmBlock = () => {
    if (!targetUser) return;
    const res = blockUser(targetUser.id, 'Blocked from active exchanges view');
    setShowBlockModal(false);
    setTargetUser(null);
    if (res.success) {
      setFeedbackToast(`${targetUser.name} has been blocked.`);
    }
  };

  const handleConfirmReport = (
    reason: ReportReason, 
    reasonLabel: string, 
    description: string, 
    alsoBlock: boolean
  ) => {
    if (!targetUser) return;
    reportUser(targetUser.id, reason, reasonLabel, description, selectedConnection?.id);
    if (alsoBlock) {
      blockUser(targetUser.id, `Reported for ${reasonLabel}`);
    }
    setShowReportModal(false);
    setTargetUser(null);
    setSelectedConnection(null);
    setFeedbackToast('Report submitted for safety review.');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Toast */}
        {feedbackToast && (
          <div className="p-4 bg-emerald-600 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center justify-between animate-in fade-in">
            <span>{feedbackToast}</span>
            <button onClick={() => setFeedbackToast(null)} className="text-emerald-200 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Peer Skill Exchanges</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage your active collaborations, private 1-on-1 chats, and historical completed exchanges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="active-discover-matches-btn"
              onClick={() => setCurrentView('matches')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Find More Matches</span>
            </button>
          </div>
        </div>

        {/* Tabs: Active vs Ended History */}
        <div className="flex items-center gap-2 bg-slate-200/80 p-1.5 rounded-2xl max-w-md">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ACTIVE'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Active Exchanges ({activeExchanges.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ENDED')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ENDED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Ended History ({endedExchanges.length})</span>
          </button>
        </div>

        {/* Tab 1: Active Exchanges */}
        {activeTab === 'ACTIVE' && (
          <div className="space-y-6">
            {/* Unlocked Privacy Notice Banner */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-3 text-xs text-emerald-950">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="leading-relaxed">
                <strong className="font-bold">Private Communication Active:</strong> Your dedicated 1-on-1 messaging and shared resource vault are securely active. Either peer can end the exchange or block contact at any time.
              </p>
            </div>

            {/* List of Active Exchanges */}
            {activeExchanges.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">No active exchanges yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Once you or a peer accepts an exchange request, your active exchange will appear here with unlocked private chat and resource sharing.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setCurrentView('requests')}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    View Pending Requests
                  </button>
                  <button
                    onClick={() => setCurrentView('matches')}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-950/20 cursor-pointer"
                  >
                    Discover Matches
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {activeExchanges.map((conn) => {
                  const isSender = conn.senderId === currentUser.id;
                  const peerId = isSender ? conn.receiverId : conn.senderId;
                  const peer = allUsers.find(u => u.id === peerId) || {
                    id: peerId,
                    name: isSender ? conn.receiverName : conn.senderName,
                    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                    titleOrRole: 'Skill Partner'
                  } as UserProfile;

                  const youTeach = isSender ? conn.offeredSkillName : conn.wantedSkillName;
                  const theyTeach = isSender ? conn.wantedSkillName : conn.offeredSkillName;

                  const connMessages = messages.filter(m => m.connectionId === conn.id);
                  let resourceCount = 0;
                  connMessages.forEach(m => {
                    if (m.attachments) resourceCount += m.attachments.length;
                  });

                  return (
                    <div
                      key={conn.id}
                      id={`active-exchange-card-${conn.id}`}
                      className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all space-y-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        {/* Partner Header - Clickable Avatar & Name */}
                        <div className="flex items-start gap-4">
                          <button
                            type="button"
                            id={`active-partner-btn-${peer.id}`}
                            onClick={() => openUserProfile(peer.id)}
                            className="flex items-start gap-4 text-left group cursor-pointer focus:outline-hidden"
                            title={`View ${peer.name}'s profile`}
                          >
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-emerald-300 shadow-sm shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                              <img
                                src={peer?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={peer?.name || 'Partner'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{peer?.name || 'Skill Partner'}</h3>
                                {conn.isProjectCollaboration ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 flex items-center gap-1">
                                    <Users className="w-3 h-3 text-amber-700" />
                                    Project Collaboration
                                  </span>
                                ) : conn.isKnowledgeSharing ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <HeartHandshake className="w-3 h-3 text-emerald-600" />
                                    Knowledge Sharing
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
                                    Mutual Exchange
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{peer?.titleOrRole || 'Peer Learner'}</p>
                              {peer?.location && (
                                <p className="text-[11px] text-slate-400 mt-0.5">{peer.location}</p>
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 sm:max-w-xs w-full">
                          <button
                            id={`open-chat-btn-${conn.id}`}
                            onClick={() => openChatForConnection(conn.id)}
                            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>Open Chat & Vault</span>
                            {connMessages.length > 0 && (
                              <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {connMessages.length}
                              </span>
                            )}
                          </button>

                          <button
                            id={`end-exchange-btn-${conn.id}`}
                            onClick={() => handleTriggerEnd(conn, peer)}
                            className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-xl border border-amber-200/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            <span>End Exchange</span>
                          </button>
                        </div>
                      </div>

                      {/* Skill Exchange or Collaboration Blueprint Grid */}
                      {conn.isProjectCollaboration ? (
                        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                            <Users className="w-3.5 h-3.5 text-amber-700" />
                            <span>Project Collaboration Goals & Synergy</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 block">
                                Your Contribution ({currentUser.name.split(' ')[0]})
                              </span>
                              <p className="font-bold text-slate-900 text-xs">{youTeach}</p>
                            </div>
                            <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l sm:pl-4 border-amber-200 pt-2 sm:pt-0">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 block">
                                Peer Contribution ({peer?.name.split(' ')[0] || 'Partner'})
                              </span>
                              <p className="font-bold text-slate-900 text-xs">{theyTeach}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block">
                              What You Share / Guide ({currentUser.name.split(' ')[0]})
                            </span>
                            <p className="font-bold text-slate-900 text-sm">{youTeach}</p>
                          </div>

                          <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-slate-200 pt-2 sm:pt-0">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-teal-700 block">
                              What They Share / Guide ({peer?.name.split(' ')[0] || 'Partner'})
                            </span>
                            <p className="font-bold text-slate-900 text-sm">{theyTeach}</p>
                          </div>
                        </div>
                      )}

                      {/* Original Note */}
                      {conn.note && (
                        <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/70">
                          <span className="font-bold text-slate-900">Exchange Proposal Message: </span>
                          <span className="italic">"{conn.note}"</span>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                          <span>Connected on {new Date(conn.createdAt).toLocaleDateString()}</span>
                          {resourceCount > 0 && (
                            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <FolderDown className="w-3.5 h-3.5" />
                              {resourceCount} shared {resourceCount === 1 ? 'file' : 'files'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {peer && (
                            <button
                              onClick={() => openUserProfile(peer)}
                              className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              Profile &rarr;
                            </button>
                          )}
                          <button
                            onClick={() => handleTriggerBlock(peer)}
                            className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 text-[11px]"
                          >
                            <ShieldBan className="w-3 h-3" />
                            <span>Block</span>
                          </button>
                          <button
                            onClick={() => handleTriggerReport(peer, conn)}
                            className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 text-[11px]"
                          >
                            <Flag className="w-3 h-3 text-rose-400" />
                            <span>Report</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Ended Exchanges History */}
        {activeTab === 'ENDED' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-3 text-xs text-slate-700">
              <Archive className="w-5 h-5 text-slate-500 shrink-0" />
              <p className="leading-relaxed">
                <strong>Ended Exchanges Archive:</strong> These collaborations were completed or concluded. Past messages and shared resource files are kept saved for your reference in read-only mode.
              </p>
            </div>

            {endedExchanges.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">No ended exchanges in history</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  When you or your peer concludes an exchange, it will be securely archived here for future reference.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {endedExchanges.map((conn) => {
                  const isSender = conn.senderId === currentUser.id;
                  const peerId = isSender ? conn.receiverId : conn.senderId;
                  const peer = allUsers.find(u => u.id === peerId) || {
                    id: peerId,
                    name: isSender ? conn.receiverName : conn.senderName,
                    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                    titleOrRole: 'Former Peer'
                  } as UserProfile;

                  return (
                    <div
                      key={conn.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs opacity-90 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                          type="button"
                          id={`ended-partner-btn-${peer.id}`}
                          onClick={() => openUserProfile(peer.id)}
                          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden"
                          title={`View ${peer.name}'s profile`}
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                            <img src={peer.avatarUrl} alt={peer.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">{peer.name}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Ended
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {conn.offeredSkillName} ↔ {conn.wantedSkillName}
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => openChatForConnection(conn.id)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>View Saved Chat & Files</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span>Started on {new Date(conn.createdAt).toLocaleDateString()}</span>
                        <span>Archived</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Safety Modals */}
      {showEndModal && selectedConnection && targetUser && (
        <EndExchangeModal
          isOpen={showEndModal}
          partnerName={targetUser.name}
          offeredSkill={selectedConnection.offeredSkillName}
          wantedSkill={selectedConnection.wantedSkillName}
          onConfirm={handleConfirmEnd}
          onCancel={() => {
            setShowEndModal(false);
            setSelectedConnection(null);
          }}
        />
      )}

      {showBlockModal && targetUser && (
        <BlockUserModal
          isOpen={showBlockModal}
          userName={targetUser.name}
          onConfirm={handleConfirmBlock}
          onCancel={() => {
            setShowBlockModal(false);
            setTargetUser(null);
          }}
        />
      )}

      {showReportModal && targetUser && (
        <ReportUserModal
          isOpen={showReportModal}
          userName={targetUser.name}
          onConfirm={handleConfirmReport}
          onCancel={() => {
            setShowReportModal(false);
            setTargetUser(null);
          }}
        />
      )}

    </div>
  );
};


