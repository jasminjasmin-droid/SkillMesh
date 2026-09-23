import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowRightLeft, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Mail, 
  User, 
  ExternalLink, 
  Sparkles,
  Search,
  Users
} from 'lucide-react';
import { ConnectionRequest } from '../../types';

export const ConnectionsPage: React.FC = () => {
  const { 
    currentUser, 
    connections, 
    acceptConnection, 
    declineConnection, 
    openUserProfile, 
    allUsers,
    setCurrentView 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RECEIVED' | 'SENT'>('ACTIVE');

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-3">Please sign in to view your skill connections.</p>
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

  // Filter connections
  const receivedRequests = connections.filter(
    c => c.receiverId === currentUser.id && c.status === 'PENDING'
  );

  const sentRequests = connections.filter(
    c => c.senderId === currentUser.id
  );

  const activeConnections = connections.filter(
    c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'ACCEPTED'
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Connections & Exchanges</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage your peer exchange proposals and contact partners directly.
            </p>
          </div>

          <button
            onClick={() => setCurrentView('matches')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Find New Matches
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ACTIVE'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Exchanges ({activeConnections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('RECEIVED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'RECEIVED'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-500" />
            <span>Received Requests ({receivedRequests.length})</span>
            {receivedRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {receivedRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SENT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Sent Requests ({sentRequests.length})</span>
          </button>
        </div>

        {/* TAB 1: Active Connected Exchanges */}
        {activeTab === 'ACTIVE' && (
          <div className="space-y-4">
            {activeConnections.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No active exchanges yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When you or a peer accept a connection proposal, you can view each other's contact details here to schedule your first 1-on-1 swap session.
                </p>
                <button
                  onClick={() => setCurrentView('matches')}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Browse Matches
                </button>
              </div>
            ) : (
              activeConnections.map((conn) => {
                const isSender = conn.senderId === currentUser.id;
                const peerId = isSender ? conn.receiverId : conn.senderId;
                const peer = allUsers.find(u => u.id === peerId);

                return (
                  <div
                    key={conn.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          id={`conn-peer-link-${peerId}`}
                          onClick={() => openUserProfile(peerId)}
                          className="flex items-start gap-4 text-left group cursor-pointer focus:outline-hidden"
                          title={`View ${peer?.name || 'partner'}'s profile`}
                        >
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                            <img
                              src={peer?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={peer?.name || 'Peer'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                                {peer?.name || 'Skill Partner'}
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                Active Exchange
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{peer?.titleOrRole}</p>
                            
                            {/* Swap pair badge */}
                            <div className="mt-3 inline-flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                              <span className="font-bold text-teal-800">
                                {isSender ? `You learn: ${conn.wantedSkillName}` : `They learn: ${conn.wantedSkillName}`}
                              </span>
                              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-bold text-emerald-700">
                                {isSender ? `You teach: ${conn.offeredSkillName}` : `They teach: ${conn.offeredSkillName}`}
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Contact Info Box */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1 sm:max-w-xs self-stretch sm:self-auto">
                        <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                          Direct Contact Info
                        </span>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold font-mono text-xs">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{conn.contactMethod}: {conn.contactValue}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Reach out directly to arrange your video call or study session!
                        </p>
                      </div>
                    </div>

                    {conn.note && (
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-900">Proposal Note: </span>
                        "{conn.note}"
                      </div>
                    )}

                    {peer && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => openUserProfile(peer)}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          View Full Peer Profile &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Received Proposals */}
        {activeTab === 'RECEIVED' && (
          <div className="space-y-4">
            {receivedRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No pending received proposals</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When other peers find your offered skills in search and send an exchange request, they will appear here.
                </p>
              </div>
            ) : (
              receivedRequests.map((req) => {
                const sender = allUsers.find(u => u.id === req.senderId);

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-7 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          id={`received-sender-link-${req.senderId}`}
                          onClick={() => openUserProfile(req.senderId)}
                          className="flex items-start gap-4 text-left group cursor-pointer focus:outline-hidden"
                          title={`View ${req.senderName}'s profile`}
                        >
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                            <img
                              src={sender?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={req.senderName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                              {req.senderName}
                            </h3>
                            <p className="text-xs text-slate-500">{sender?.titleOrRole || 'Peer Learner'}</p>
                            <div className="mt-2 text-xs space-y-1">
                              <p>
                                Wants to learn from you: <strong className="text-teal-700">{req.wantedSkillName}</strong>
                              </p>
                              <p>
                                Offers to teach you: <strong className="text-emerald-700">{req.offeredSkillName}</strong>
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          id={`accept-conn-${req.id}`}
                          onClick={() => acceptConnection(req.id)}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept Exchange</span>
                        </button>
                        <button
                          id={`decline-conn-${req.id}`}
                          onClick={() => declineConnection(req.id)}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>

                    {req.note && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                        <p className="font-bold text-slate-900 mb-0.5">Message from {req.senderName.split(' ')[0]}:</p>
                        <p>"{req.note}"</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: Sent Proposals */}
        {activeTab === 'SENT' && (
          <div className="space-y-4">
            {sentRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No sent proposals yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Browse your matches and click "Connect" on any profile to send a skill exchange request.
                </p>
                <button
                  onClick={() => setCurrentView('matches')}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Browse Matches
                </button>
              </div>
            ) : (
              sentRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id={`sent-receiver-link-${req.receiverId}`}
                        onClick={() => openUserProfile(req.receiverId)}
                        className="font-bold text-slate-900 text-sm hover:text-emerald-700 transition-colors text-left cursor-pointer"
                        title={`View ${req.receiverName}'s profile`}
                      >
                        To: {req.receiverName}
                      </button>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          req.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'DECLINED'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Exchange: You learn <span className="font-bold text-teal-700">{req.wantedSkillName}</span> &bull; You teach <span className="font-bold text-emerald-700">{req.offeredSkillName}</span>
                    </p>
                    {req.note && (
                      <p className="text-xs text-slate-500 italic mt-1">"{req.note}"</p>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Sent {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
