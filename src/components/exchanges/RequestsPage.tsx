import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Inbox, 
  Send, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  Sparkles, 
  User, 
  ShieldAlert, 
  MessageSquare,
  Users,
  Lock,
  ArrowRight
} from 'lucide-react';

export const RequestsPage: React.FC = () => {
  const { 
    currentUser, 
    connections, 
    acceptConnection, 
    rejectConnection, 
    openUserProfile, 
    allUsers,
    setCurrentView
  } = useApp();

  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Please sign in to view Requests</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">You need an active account to view incoming and sent exchange proposals.</p>
          <button
            onClick={() => setCurrentView('login')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Log In to Your Account
          </button>
        </div>
      </div>
    );
  }

  // Filter requests for current user
  const receivedRequests = connections.filter(
    c => c.receiverId === currentUser.id
  );

  const pendingReceived = receivedRequests.filter(c => c.status === 'PENDING');
  const rejectedReceived = receivedRequests.filter(c => c.status === 'DECLINED');

  const sentRequests = connections.filter(
    c => c.senderId === currentUser.id
  );

  const activeAcceptedCount = connections.filter(
    c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'ACCEPTED'
  ).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Inbox className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Exchange Requests</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review incoming skill proposals from peers or track requests you've sent.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="req-view-active-exchanges-btn"
              onClick={() => setCurrentView('active_exchanges')}
              className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active Exchanges ({activeAcceptedCount})</span>
            </button>

            <button
              id="req-view-project-collab-btn"
              onClick={() => setCurrentView('project_collaboration')}
              className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Project Collaboration</span>
            </button>

            <button
              id="req-find-matches-btn"
              onClick={() => setCurrentView('matches')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discover Matches</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            id="tab-received-requests"
            onClick={() => setActiveTab('RECEIVED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'RECEIVED'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Received Requests ({receivedRequests.length})</span>
            {pendingReceived.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingReceived.length}
              </span>
            )}
          </button>

          <button
            id="tab-sent-requests"
            onClick={() => setActiveTab('SENT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'SENT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Sent Requests ({sentRequests.length})</span>
          </button>
        </div>

        {/* RECEIVED REQUESTS TAB */}
        {activeTab === 'RECEIVED' && (
          <div className="space-y-4">
            {receivedRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No incoming exchange requests</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When peers discover your offered skills and request an exchange, you can review and accept or reject their proposal here.
                </p>
              </div>
            ) : (
              receivedRequests.map((req) => {
                const sender = allUsers.find(u => u.id === req.senderId);
                const isPending = req.status === 'PENDING';
                const isAccepted = req.status === 'ACCEPTED';
                const isRejected = req.status === 'DECLINED';

                return (
                  <div
                    key={req.id}
                    id={`request-card-${req.id}`}
                    className={`bg-white rounded-3xl border p-6 sm:p-7 shadow-sm transition-all space-y-4 ${
                      isPending
                        ? 'border-emerald-200 ring-1 ring-emerald-50'
                        : isAccepted
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 bg-slate-50/40 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Sender Info */}
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          id={`req-sender-btn-${req.senderId}`}
                          onClick={() => openUserProfile(req.senderId)}
                          className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm shrink-0 group hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer focus:outline-hidden"
                          title={`View ${req.senderName}'s profile`}
                        >
                          <img
                            src={sender?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={req.senderName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openUserProfile(req.senderId)}
                              className="font-bold text-slate-900 text-base hover:text-emerald-700 transition-colors cursor-pointer text-left focus:outline-hidden"
                              title={`View ${req.senderName}'s profile`}
                            >
                              {req.senderName}
                            </button>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isAccepted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isRejected
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isAccepted ? 'Accepted' : isRejected ? 'Rejected' : 'Pending Review'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{sender?.titleOrRole || 'Peer Learner'}</p>

                          {/* Skill Exchange or Collaboration Proposal Specs */}
                          {req.isProjectCollaboration ? (
                            <div className="mt-3 inline-flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                              <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                                <Users className="w-3 h-3 text-amber-700" />
                                Project Collaboration
                              </span>
                              <span className="font-bold text-slate-800">
                                Looking for: <u className="text-amber-800">{req.wantedSkillName}</u>
                              </span>
                              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-bold text-slate-800">
                                Contributing: <u className="text-amber-800">{req.offeredSkillName}</u>
                              </span>
                            </div>
                          ) : (
                            <div className="mt-3 inline-flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                              <span className="font-bold text-teal-700">
                                Wants to learn from you: <u>{req.wantedSkillName}</u>
                              </span>
                              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-bold text-emerald-700">
                                Offers to teach you: <u>{req.offeredSkillName}</u>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons or Status */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <>
                            <button
                              id={`accept-request-${req.id}`}
                              onClick={() => acceptConnection(req.id)}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept Request</span>
                            </button>
                            <button
                              id={`reject-request-${req.id}`}
                              onClick={() => rejectConnection(req.id)}
                              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : isAccepted ? (
                          <button
                            onClick={() => setCurrentView('active_exchanges')}
                            className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Go to Active Exchanges &rarr;</span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Request Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sender's Intro Note */}
                    {req.note && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                        <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                          Message from {req.senderName.split(' ')[0]}:
                        </span>
                        <p className="italic leading-relaxed">"{req.note}"</p>
                      </div>
                    )}

                    {/* Privacy notice */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>
                          {isAccepted 
                            ? 'Exchange accepted! Private 1-on-1 In-App Chat is now unlocked in Active Exchanges.' 
                            : isRejected 
                            ? 'Request was rejected. Communication remains securely closed.'
                            : 'Private communication is locked until accepted. No personal contact info is shared.'}
                        </span>
                      </div>

                      {sender && (
                        <button
                          onClick={() => openUserProfile(sender)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          View {sender.name.split(' ')[0]}'s Profile &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SENT REQUESTS TAB */}
        {activeTab === 'SENT' && (
          <div className="space-y-4">
            {sentRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No sent exchange requests</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Browse your smart matches and click "Request Exchange" to start learning from a peer.
                </p>
                <button
                  onClick={() => setCurrentView('matches')}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Discover Matches
                </button>
              </div>
            ) : (
              sentRequests.map((req) => {
                const receiver = allUsers.find(u => u.id === req.receiverId);
                const isAccepted = req.status === 'ACCEPTED';
                const isRejected = req.status === 'DECLINED';
                const isPending = req.status === 'PENDING';

                return (
                  <div
                    key={req.id}
                    id={`sent-request-card-${req.id}`}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        id={`sent-req-receiver-btn-${req.receiverId}`}
                        onClick={() => openUserProfile(req.receiverId)}
                        className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden"
                        title={`View ${req.receiverName}'s profile`}
                      >
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                          <img
                            src={receiver?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={req.receiverName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">To: {req.receiverName}</h4>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                isAccepted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isRejected
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isAccepted ? 'Accepted' : isRejected ? 'Rejected' : 'Pending Response'}
                            </span>
                          </div>
                          {req.isProjectCollaboration ? (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                                <Users className="w-2.5 h-2.5 text-amber-700" />
                                Collaboration
                              </span>
                              <span>
                                Needed skill: <strong className="text-amber-800">{req.wantedSkillName}</strong> &bull; You bring: <strong className="text-amber-800">{req.offeredSkillName}</strong>
                              </span>
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 mt-0.5">
                              You learn <strong className="text-teal-700">{req.wantedSkillName}</strong> &bull; You teach <strong className="text-emerald-700">{req.offeredSkillName}</strong>
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 font-medium">
                          Sent {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                        {isAccepted && (
                          <div className="mt-1">
                            <button
                              onClick={() => setCurrentView('active_exchanges')}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
                            >
                              View in Active Exchanges &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {req.note && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                        "{req.note}"
                      </p>
                    )}

                    {isRejected && (
                      <p className="text-[11px] text-slate-400">
                        This request was declined. Communication channel remains closed.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
