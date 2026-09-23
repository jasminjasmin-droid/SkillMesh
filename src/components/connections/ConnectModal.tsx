import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  MessageSquare, 
  AlertCircle, 
  ArrowRightLeft, 
  HeartHandshake, 
  ShieldCheck, 
  Clock, 
  Check,
  ExternalLink,
  Users,
  Layers,
  FileCode
} from 'lucide-react';
import { UserProfile, ConnectionRequestType } from '../../types';

interface ConnectModalProps {
  targetUser: UserProfile | null;
  onClose: () => void;
  initialMode?: ConnectionRequestType;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ targetUser, onClose, initialMode = 'MUTUAL_EXCHANGE' }) => {
  const { 
    currentUser, 
    sendConnectionRequest, 
    setCurrentView,
    getActiveConnectionWithUser,
    getPendingRequestWithUser,
    acceptConnection,
    declineConnection,
    openChatForConnection,
    openChatWithUser
  } = useApp();

  if (!targetUser || !currentUser) return null;

  const activeConnection = getActiveConnectionWithUser(targetUser.id);
  const pendingInfo = getPendingRequestWithUser(targetUser.id);

  const defaultTheirSkill = targetUser.offeredSkills[0]?.name || '';
  const defaultMySkill = currentUser.offeredSkills[0]?.name || '';

  const [requestMode, setRequestMode] = useState<ConnectionRequestType>(initialMode);
  const [sharingDirection, setSharingDirection] = useState<'LEARN_FROM_PEER' | 'SHARE_MY_SKILL'>('LEARN_FROM_PEER');
  const [wantedSkillName, setWantedSkillName] = useState(defaultTheirSkill);
  const [offeredSkillName, setOfferedSkillName] = useState(defaultMySkill);
  
  // Project collaboration specific fields
  const [projectTitle, setProjectTitle] = useState(currentUser.activeProjectDescription ? 'Active Project Collaboration' : '');
  const [collabLookingFor, setCollabLookingFor] = useState(defaultTheirSkill || 'Relevant Skill / Domain');
  const [collabMyContribution, setCollabMyContribution] = useState(defaultMySkill || 'Complementary Technical / Design Skills');

  const [note, setNote] = useState(
    initialMode === 'PROJECT_COLLABORATION'
      ? `Hi ${targetUser.name.split(' ')[0]}! I noticed your skills in ${defaultTheirSkill || 'your field'}. I'm looking for a collaborator with complementary skills to build a project together.`
      : `Hi ${targetUser.name.split(' ')[0]}! I saw you offer ${defaultTheirSkill || 'skills'} on Skill Mesh. I would love to connect and exchange knowledge with you.`
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptExisting = (requestId: string) => {
    acceptConnection(requestId);
    setAcceptedSuccess(true);
  };

  const handleDeclineExisting = (requestId: string) => {
    declineConnection(requestId);
    onClose();
  };

  const handleModeChange = (mode: ConnectionRequestType) => {
    setRequestMode(mode);
    setError(null);
    if (mode === 'PROJECT_COLLABORATION') {
      if (!note || note.includes('exchange knowledge')) {
        setNote(`Hi ${targetUser.name.split(' ')[0]}! I'd love to collaborate on a project combining your skills in ${defaultTheirSkill || 'your domain'} with my background in ${defaultMySkill || 'my field'}.`);
      }
    } else if (mode === 'MUTUAL_EXCHANGE') {
      if (!note || note.includes('collaborate on a project')) {
        setNote(`Hi ${targetUser.name.split(' ')[0]}! I saw you offer ${defaultTheirSkill || 'skills'} on Skill Mesh. I would love to connect and exchange knowledge with you.`);
      }
    } else if (mode === 'KNOWLEDGE_SHARING') {
      if (!note || note.includes('collaborate on a project')) {
        setNote(`Hi ${targetUser.name.split(' ')[0]}! I'd love to connect for voluntary knowledge sharing and peer guidance in ${defaultTheirSkill || 'skills'}.`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isProjectCollaboration = requestMode === 'PROJECT_COLLABORATION';
    const isKnowledgeSharing = requestMode === 'KNOWLEDGE_SHARING';

    // Mandatory note validation for Project Collaboration
    if (isProjectCollaboration) {
      if (!note.trim() || note.trim().length < 10) {
        setError('Please provide an introductory message explaining what you are building and why you would like to collaborate.');
        return;
      }
    }

    let finalWanted = wantedSkillName;
    let finalOffered = offeredSkillName;

    if (isProjectCollaboration) {
      finalWanted = collabLookingFor || targetUser.offeredSkills[0]?.name || 'Complementary Skills';
      finalOffered = collabMyContribution || currentUser.offeredSkills[0]?.name || 'Collaborator Contribution';
    } else if (isKnowledgeSharing) {
      if (sharingDirection === 'LEARN_FROM_PEER') {
        finalWanted = wantedSkillName || (targetUser.offeredSkills[0]?.name || 'General Knowledge Sharing');
        finalOffered = 'Voluntary Knowledge Sharing (Recipient)';
      } else {
        finalWanted = 'Voluntary Knowledge Sharing (Learner)';
        finalOffered = offeredSkillName || (currentUser.offeredSkills[0]?.name || 'Voluntary Mentorship');
      }
    }

    if (!finalWanted && !finalOffered) {
      setError('Please select at least one skill or topic to connect.');
      return;
    }

    const collaborationDetails = isProjectCollaboration ? {
      projectTitle: projectTitle.trim() || 'Collaborative Project',
      lookingFor: finalWanted,
      whyConnect: note.trim()
    } : undefined;

    const res = sendConnectionRequest(
      targetUser.id,
      finalOffered,
      finalWanted,
      note.trim(),
      requestMode,
      isKnowledgeSharing,
      isProjectCollaboration,
      collaborationDetails
    );

    if (res.success) {
      setIsSuccess(true);
    } else if (res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="connect-proposal-modal"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              <img
                src={targetUser.avatarUrl}
                alt={targetUser.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {activeConnection 
                  ? `Connected with ${targetUser.name}`
                  : pendingInfo?.isIncoming
                  ? `Respond to ${targetUser.name}'s Request`
                  : pendingInfo?.isOutgoing
                  ? `Pending Request to ${targetUser.name}`
                  : requestMode === 'PROJECT_COLLABORATION'
                  ? `Collaborate with ${targetUser.name}`
                  : `Connect with ${targetUser.name}`}
              </h3>
              <p className="text-xs text-slate-500">1-on-1 peer skill exchange & project collaboration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {acceptedSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Request Accepted!</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                You and <strong>{targetUser.name}</strong> are now connected. Your shared private chat and resource vault are unlocked!
              </p>
              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onClose();
                    openChatWithUser(targetUser.id);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Shared Chat</span>
                </button>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                {requestMode === 'PROJECT_COLLABORATION' ? 'Collaboration Request Sent!' : 'Connection Request Sent!'}
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Your proposal has been sent to <strong>{targetUser.name}</strong>. Once they accept, your <strong>Private In-App Chat</strong> will unlock automatically in <strong>Active Exchanges</strong> to coordinate project goals, share notes, and build together.
              </p>
              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onClose();
                    setCurrentView('requests');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors cursor-pointer"
                >
                  View My Requests
                </button>
              </div>
            </div>
          ) : activeConnection ? (
            /* ACTIVE EXCHANGE ALREADY EXISTS */
            <div className="space-y-4 py-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Active Connection Exists</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  You already have an active connection with <strong>{targetUser.name}</strong>. You can chat in real time, create shared notes, and upload resources.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Connection Focus:</span>
                  <span className="font-semibold text-slate-700">
                    {activeConnection.offeredSkillName} ↔ {activeConnection.wantedSkillName}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onClose();
                    openChatForConnection(activeConnection.id);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Go to Private Chat</span>
                </button>
              </div>
            </div>
          ) : pendingInfo?.isIncoming ? (
            /* INCOMING PENDING REQUEST FROM TARGET USER */
            <div className="space-y-4 py-1">
              <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                <p className="text-xs text-teal-950 font-medium">
                  <strong>{targetUser.name}</strong> already sent you a proposal. Review their offer below to accept or decline.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                {pendingInfo.request.isProjectCollaboration && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    <Users className="w-3 h-3 text-amber-600" />
                    <span>Project Collaboration Proposal</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {pendingInfo.request.isProjectCollaboration ? 'They Bring' : 'They Offer to Teach'}
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-1">{pendingInfo.request.offeredSkillName}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {pendingInfo.request.isProjectCollaboration ? 'Looking For' : 'They Want to Learn'}
                    </p>
                    <p className="text-xs font-bold text-teal-700 mt-1">{pendingInfo.request.wantedSkillName}</p>
                  </div>
                </div>

                {pendingInfo.request.note && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Their Message</p>
                    <p className="text-xs text-slate-700 italic">"{pendingInfo.request.note}"</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleDeclineExisting(pendingInfo.request.id)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Decline Proposal
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptExisting(pendingInfo.request.id)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept & Unlock Chat</span>
                </button>
              </div>
            </div>
          ) : pendingInfo?.isOutgoing ? (
            /* OUTGOING PENDING REQUEST SENT BY CURRENT USER */
            <div className="space-y-4 py-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Request Pending</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  You have already sent a proposal to <strong>{targetUser.name}</strong> on {new Date(pendingInfo.request.createdAt).toLocaleDateString()}. Waiting for their response.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Your Offered Skill:</span>
                  <span className="font-semibold text-slate-800">{pendingInfo.request.offeredSkillName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Requested / Complementary Skill:</span>
                  <span className="font-semibold text-teal-700">{pendingInfo.request.wantedSkillName}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onClose();
                    setCurrentView('requests');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors cursor-pointer"
                >
                  View Sent Requests
                </button>
              </div>
            </div>
          ) : (
            /* NEW REQUEST PROPOSAL FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Connection Mode Selector: 3 Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Connection Purpose / Intent
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => handleModeChange('MUTUAL_EXCHANGE')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      requestMode === 'MUTUAL_EXCHANGE'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px]">2-Way Exchange</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('PROJECT_COLLABORATION')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      requestMode === 'PROJECT_COLLABORATION'
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px]">Collaborate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('KNOWLEDGE_SHARING')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      requestMode === 'KNOWLEDGE_SHARING'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HeartHandshake className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="text-[11px]">Share Knowledge</span>
                  </button>
                </div>
              </div>

              {/* PROJECT COLLABORATION MODE */}
              {requestMode === 'PROJECT_COLLABORATION' ? (
                <div className="space-y-3 p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-950">Project Collaboration Request</span>
                    </div>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                      Complementary Synergies
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Propose building a project together. Either person can initiate, and your shared private workspace unlocks upon acceptance.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Skill / Role You Need from {targetUser.name.split(' ')[0]}:
                      </label>
                      <select
                        value={collabLookingFor}
                        onChange={(e) => setCollabLookingFor(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                      >
                        {targetUser.offeredSkills.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.proficiency})
                          </option>
                        ))}
                        <option value="Project Collaborator / Co-builder">General Project Partner</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Skill You Will Bring to the Project:
                      </label>
                      <select
                        value={collabMyContribution}
                        onChange={(e) => setCollabMyContribution(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                      >
                        {currentUser.offeredSkills.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.proficiency})
                          </option>
                        ))}
                        <option value="Product & Execution Strategy">Product & Execution Strategy</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : requestMode === 'KNOWLEDGE_SHARING' ? (
                <div className="space-y-3 p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900">Voluntary Knowledge Sharing</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                      No strict two-way trade required
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSharingDirection('LEARN_FROM_PEER')}
                      className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                        sharingDirection === 'LEARN_FROM_PEER'
                          ? 'bg-white border-emerald-400 text-emerald-900 shadow-xs'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <p className="font-bold text-[11px] text-emerald-800">Learn from {targetUser.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Request peer guidance & mentoring</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSharingDirection('SHARE_MY_SKILL')}
                      className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                        sharingDirection === 'SHARE_MY_SKILL'
                          ? 'bg-white border-emerald-400 text-emerald-900 shadow-xs'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <p className="font-bold text-[11px] text-emerald-800">Share your skill with {targetUser.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Volunteer your expertise</p>
                    </button>
                  </div>

                  {sharingDirection === 'LEARN_FROM_PEER' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Skill {targetUser.name} offers:
                      </label>
                      <select
                        value={wantedSkillName}
                        onChange={(e) => setWantedSkillName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {targetUser.offeredSkills.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.proficiency})
                          </option>
                        ))}
                        <option value="General Guidance & Advice">General Guidance & Career Advice</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Skill you are willing to volunteer / teach:
                      </label>
                      <select
                        value={offeredSkillName}
                        onChange={(e) => setOfferedSkillName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {currentUser.offeredSkills.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.proficiency})
                          </option>
                        ))}
                        <option value="Mentorship & Code Review">Mentorship & Code Review</option>
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                /* Skills Selection for 2-Way Exchange */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Skill You Want to Learn <span className="text-emerald-700">*</span>
                    </label>
                    <select
                      value={wantedSkillName}
                      onChange={(e) => setWantedSkillName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-medium"
                    >
                      {targetUser.offeredSkills.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.proficiency})
                        </option>
                      ))}
                      <option value="General Guidance">General Guidance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Skill You Offer in Return <span className="text-emerald-700">*</span>
                    </label>
                    <select
                      value={offeredSkillName}
                      onChange={(e) => setOfferedSkillName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-medium"
                    >
                      {currentUser.offeredSkills.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.proficiency})
                        </option>
                      ))}
                      <option value="Peer Collaboration">Peer Collaboration</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Note / Introductory Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {requestMode === 'PROJECT_COLLABORATION' ? (
                      <span>
                        Project Note & Collaboration Goals <span className="text-red-500">* (Required)</span>
                      </span>
                    ) : (
                      <span>Introduction & Goals <span className="text-slate-400 font-normal">(Optional context)</span></span>
                    )}
                  </label>
                  {requestMode === 'PROJECT_COLLABORATION' && (
                    <span className="text-[10px] text-amber-700 font-bold">
                      Explain what you're building & why you want to connect
                    </span>
                  )}
                </div>
                <textarea
                  rows={requestMode === 'PROJECT_COLLABORATION' ? 4 : 3}
                  required={requestMode === 'PROJECT_COLLABORATION'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    requestMode === 'PROJECT_COLLABORATION'
                      ? "1. What you are working on or planning to build\n2. What kind of collaborator or skill you need\n3. Why you would like to connect with them specifically..."
                      : "Share what you hope to accomplish or why you'd like to connect..."
                  }
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl outline-none transition-all ${
                    requestMode === 'PROJECT_COLLABORATION'
                      ? 'bg-amber-50/40 border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800'
                      : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:bg-white'
                  }`}
                />
              </div>

              {/* Privacy Model Notice */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800 text-[11px]">Privacy-First Communication</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Personal contact information is never requested or shared. Once {targetUser.name.split(' ')[0]} accepts your request, your <strong>Private In-App Chat</strong> will unlock automatically.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-connection-proposal-btn"
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                    requestMode === 'PROJECT_COLLABORATION'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'
                      : requestMode === 'KNOWLEDGE_SHARING'
                      ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-100'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {requestMode === 'PROJECT_COLLABORATION' 
                      ? 'Send Collaboration Request' 
                      : requestMode === 'KNOWLEDGE_SHARING' 
                      ? 'Send Knowledge Sharing Request' 
                      : 'Send Exchange Request'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

