import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldBan, 
  UserX, 
  X, 
  CheckCircle2, 
  Info,
  Flag,
  HandMetal,
  StopCircle
} from 'lucide-react';
import { ConnectionRequest, ReportReason, UserProfile } from '../../types';

interface EndExchangeModalProps {
  connection?: ConnectionRequest | null;
  partnerName?: string;
  offeredSkill?: string;
  wantedSkill?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirmEnd?: (reason?: string) => void;
  onConfirm?: (reason?: string) => void;
}

export const EndExchangeModal: React.FC<EndExchangeModalProps> = ({
  connection,
  partnerName,
  isOpen = true,
  onClose,
  onCancel,
  onConfirmEnd,
  onConfirm
}) => {
  const [reason, setReason] = useState('Goals completed');
  const [customNote, setCustomNote] = useState('');

  if (isOpen === false) return null;

  const handleClose = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const handleConfirm = () => {
    const finalReason = reason === 'Other' && customNote.trim() ? customNote.trim() : reason;
    if (onConfirmEnd) {
      onConfirmEnd(finalReason);
    } else if (onConfirm) {
      onConfirm(finalReason);
    }
  };

  const displayName = partnerName || connection?.receiverName || 'Peer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <StopCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">End Active Exchange</h3>
              <p className="text-xs text-slate-500">Stop this learning connection with {displayName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-amber-950">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>What happens when you end this exchange:</span>
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900 pl-1">
              <li>The active exchange will be closed and moved to your ended history.</li>
              <li>The private 1-on-1 chat room will become read-only or closed.</li>
              <li><strong>Neither user will be blocked.</strong> You can remain community peers.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Reason for ending (optional):
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                'We accomplished our learning goals',
                'Schedule or availability changed',
                'Skills exchange direction wasn\'t a fit',
                'Other'
              ].map((opt) => (
                <label 
                  key={opt}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    reason === opt 
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="end_reason"
                    checked={reason === opt}
                    onChange={() => setReason(opt)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            {reason === 'Other' && (
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Brief reason (optional)..."
                rows={2}
                className="w-full mt-2 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Keep Exchange Active
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-100 transition-colors flex items-center gap-1.5"
          >
            <StopCircle className="w-4 h-4" />
            <span>End Exchange</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface BlockUserModalProps {
  targetUser?: { id?: string; name?: string; avatarUrl?: string } | null;
  userName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirmBlock?: () => void;
  onConfirm?: () => void;
}

export const BlockUserModal: React.FC<BlockUserModalProps> = ({
  targetUser,
  userName,
  isOpen = true,
  onClose,
  onCancel,
  onConfirmBlock,
  onConfirm
}) => {
  if (isOpen === false) return null;

  const displayName = targetUser?.name || userName || 'this user';

  const handleClose = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const handleConfirm = () => {
    if (onConfirmBlock) onConfirmBlock();
    else if (onConfirm) onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Block {displayName}?</h3>
              <p className="text-xs text-slate-500">Prevent all future interactions with this user</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            When you block <strong>{displayName}</strong>:
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
              <p>They will immediately be prevented from sending you messages or viewing private chats.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
              <p>Any active or pending exchange between you will be terminated.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
              <p>They cannot send you connection requests in the future.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
              <p className="text-slate-500 text-[11px]">They will not be informed that you have blocked them.</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            You can unblock this user anytime from your profile safety settings.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldBan className="w-4 h-4" />
            <span>Block User</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ReportUserModalProps {
  targetUser?: { id?: string; name?: string; avatarUrl?: string } | null;
  userName?: string;
  connectionId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onSubmitReport?: (reason: ReportReason, reasonLabel: string, description: string, alsoBlock: boolean) => void;
  onConfirm?: (reason: ReportReason, reasonLabel: string, description: string, alsoBlock: boolean) => void;
}

const REPORT_REASONS: { key: ReportReason; label: string; description: string }[] = [
  { 
    key: 'HARASSMENT', 
    label: 'Harassment or bullying', 
    description: 'Disrespectful, persistent, threatening, or intimidating behavior' 
  },
  { 
    key: 'INAPPROPRIATE_BEHAVIOR', 
    label: 'Inappropriate behaviour or content', 
    description: 'Unwelcome advances or non-learning misconduct' 
  },
  { 
    key: 'OFFENSIVE_CONTENT', 
    label: 'Abusive or offensive language', 
    description: 'Hate speech, profanity, insults, or discriminatory remarks' 
  },
  { 
    key: 'SPAM_OR_SCAM', 
    label: 'Spam or scam', 
    description: 'Commercial solicitation, phishing links, or financial scams' 
  },
  { 
    key: 'MISLEADING_SKILLS', 
    label: 'Fake or misleading skill information', 
    description: 'Fraudulent portfolio links, fake credentials, or false skill declarations' 
  },
  { 
    key: 'OTHER', 
    label: 'Other', 
    description: 'Other safety concern requiring moderation review' 
  }
];

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  targetUser,
  userName,
  isOpen = true,
  onClose,
  onCancel,
  onSubmitReport,
  onConfirm
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('HARASSMENT');
  const [description, setDescription] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (isOpen === false) return null;

  const displayName = targetUser?.name || userName || 'this user';

  const handleClose = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (selectedReason === 'OTHER' && !description.trim()) {
      setValidationError('Please explain the reason for your report in the description field.');
      return;
    }

    if (description.trim() && description.trim().length < 5) {
      setValidationError('Please provide a little more detail about what happened (at least 5 characters).');
      return;
    }

    const reasonObj = REPORT_REASONS.find(r => r.key === selectedReason) || REPORT_REASONS[0];
    if (onSubmitReport) {
      onSubmitReport(selectedReason, reasonObj.label, description, alsoBlock);
    } else if (onConfirm) {
      onConfirm(selectedReason, reasonObj.label, description, alsoBlock);
    }
    setSubmitted(true);
    setTimeout(() => {
      handleClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Report {displayName}</h3>
              <p className="text-xs text-slate-500">Help keep the Skill Mesh community safe</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Report Submitted</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your report has been submitted. Thank you for helping keep Skill Mesh safe.
            </p>
            {alsoBlock && (
              <p className="text-[11px] text-slate-400">
                {displayName} has also been blocked from sending you messages or requests.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {validationError}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-2">
                Why are you reporting this user?
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.key}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                      selectedReason === r.key
                        ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      checked={selectedReason === r.key}
                      onChange={() => {
                        setSelectedReason(r.key);
                        setValidationError(null);
                      }}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500 shrink-0"
                    />
                    <div>
                      <p className="font-bold text-slate-900">{r.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Please describe what happened: {selectedReason === 'OTHER' && <span className="text-rose-500 font-bold">*</span>}
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setValidationError(null);
                }}
                placeholder={
                  selectedReason === 'OTHER'
                    ? 'Please explain the reason for this report...'
                    : 'Provide additional details or context about the incident to assist our review...'
                }
                rows={3}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none leading-relaxed"
              />
            </div>

            {/* Also block checkbox */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoBlock}
                  onChange={(e) => setAlsoBlock(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="font-semibold">
                  Also block {displayName} to prevent further messages and requests
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Flag className="w-4 h-4" />
                <span>Submit Report</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
