import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  Download, 
  Eye, 
  X, 
  ShieldCheck, 
  Sparkles, 
  User, 
  MessageSquare, 
  Clock, 
  FileCheck, 
  AlertCircle, 
  FolderDown, 
  Music, 
  Video, 
  Mic, 
  MicOff, 
  Plus, 
  Search, 
  ChevronRight,
  ExternalLink,
  Code2,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  HeartHandshake,
  ArrowRightLeft,
  MoreVertical,
  ShieldAlert,
  ShieldBan,
  Flag,
  StopCircle,
  Trash2,
  Square,
  Radio,
  Users,
  Phone
} from 'lucide-react';
import { ChatAttachment, ChatMessage, AttachmentType, ConnectionRequest, UserProfile, ReportReason } from '../../types';
import { EndExchangeModal, BlockUserModal, ReportUserModal } from '../common/SafetyModals';
import { VoiceNotePlayer } from './VoiceNotePlayer';

export const PrivateChatPage: React.FC = () => {
  const { 
    currentUser, 
    connections, 
    messages, 
    sendMessage, 
    activeChatConnectionId, 
    setActiveChatConnectionId, 
    allUsers, 
    setCurrentView,
    openUserProfile,
    endExchange,
    blockUser,
    reportUser,
    isUserBlocked,
    isUserBlockedByMe,
    startCall
  } = useApp();

  // Active exchange connection (either accepted or ended for viewing history)
  const activeConnection = connections.find(
    c => c.id === activeChatConnectionId && (c.senderId === currentUser?.id || c.receiverId === currentUser?.id)
  );

  // Accepted/active connections list for switcher
  const userConnections = currentUser ? connections.filter(
    c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && (c.status === 'ACCEPTED' || c.status === 'ENDED')
  ) : [];

  const [messageText, setMessageText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'RESOURCES'>('CHAT');
  const [resourceFilter, setResourceFilter] = useState<'ALL' | AttachmentType>('ALL');
  
  // Note Creator Modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Resource Preview Modal
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);

  // Safety & Moderation state
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
  const [showMobileConversations, setShowMobileConversations] = useState(false);
  const [showEndExchangeModal, setShowEndExchangeModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const safetyMenuRef = useRef<HTMLDivElement | null>(null);

  // Close safety menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (safetyMenuRef.current && !safetyMenuRef.current.contains(e.target as Node)) {
        setShowSafetyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toast feedback auto-dismiss
  useEffect(() => {
    if (feedbackToast) {
      const timer = setTimeout(() => setFeedbackToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [feedbackToast]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChatConnectionId]);

  // Handle active connection fallback if not set
  useEffect(() => {
    if (!activeChatConnectionId && userConnections.length > 0) {
      setActiveChatConnectionId(userConnections[0].id);
    }
  }, [activeChatConnectionId, userConnections, setActiveChatConnectionId]);

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Please sign in to access Chat</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">You need an active account to participate in peer conversations.</p>
          <button
            onClick={() => setCurrentView('login')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Security Check: Connection must exist and currentUser must be a participant
  if (!activeConnection) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Active Exchange Selected</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Private 1-on-1 chat and resource sharing is only unlocked once an exchange or knowledge sharing proposal is <strong>accepted</strong> by both peers.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => setCurrentView('active_exchanges')}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              View Active Exchanges
            </button>
            <button
              onClick={() => setCurrentView('requests')}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Check Pending Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  const otherUserId = activeConnection.senderId === currentUser.id 
    ? activeConnection.receiverId 
    : activeConnection.senderId;

  const isBlockedBetween = isUserBlocked(otherUserId);
  const isExchangeEnded = activeConnection.status === 'ENDED' || activeConnection.status === 'BLOCKED' || isBlockedBetween;

  const otherUser = allUsers.find(u => u.id === otherUserId) || {
    id: otherUserId,
    name: activeConnection.senderId === currentUser.id ? activeConnection.receiverName : activeConnection.senderName,
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
    titleOrRole: 'Community Peer',
    bio: '',
    email: '',
    joinedDate: '2026',
    isVerified: true,
    offeredSkills: [],
    wantedSkills: []
  };

  // Filter messages for this connection
  const connectionMessages = messages.filter(m => m.connectionId === activeConnection.id);

  // Collect all shared resources across messages
  const allResources: { message: ChatMessage; attachment: ChatAttachment }[] = [];
  connectionMessages.forEach(msg => {
    if (msg.attachments) {
      msg.attachments.forEach(att => {
        allResources.push({ message: msg, attachment: att });
      });
    }
  });

  const filteredResources = allResources.filter(item => {
    if (resourceFilter === 'ALL') return true;
    return item.attachment.type === resourceFilter;
  });

  // Helper for formatting file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Process selected local files
  const handleFilesSelected = (files: FileList | null) => {
    if (isExchangeEnded) return;
    if (!files || files.length === 0) return;
    setUploadError(null);

    const maxSizeBytes = 15 * 1024 * 1024; // 15MB limit

    Array.from(files).forEach(file => {
      if (file.size > maxSizeBytes) {
        setUploadError(`"${file.name}" exceeds the maximum 15MB file size limit.`);
        return;
      }

      let type: AttachmentType = 'other';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) type = 'pdf';
      else if (
        file.type.includes('word') || 
        file.name.endsWith('.doc') || 
        file.name.endsWith('.docx')
      ) type = 'word';
      else if (
        file.type.startsWith('text/') || 
        file.name.endsWith('.txt') || 
        file.name.endsWith('.md') || 
        file.name.endsWith('.py') || 
        file.name.endsWith('.js') || 
        file.name.endsWith('.ts') || 
        file.name.endsWith('.json')
      ) type = 'note';
      else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm')) type = 'video';
      else if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.webm')) type = 'audio';

      const reader = new FileReader();

      if (type === 'image' || type === 'video' || type === 'audio') {
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const newAtt: ChatAttachment = {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: file.size,
            type,
            mimeType: file.type,
            dataUrl
          };
          setPendingAttachments(prev => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      } else if (type === 'note' || file.type.startsWith('text/')) {
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const newAtt: ChatAttachment = {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: file.size,
            type: 'note',
            mimeType: file.type || 'text/plain',
            previewText: text.substring(0, 500)
          };
          setPendingAttachments(prev => [...prev, newAtt]);
        };
        reader.readAsText(file);
      } else {
        // PDF or Word docs
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const newAtt: ChatAttachment = {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: file.size,
            type,
            mimeType: file.type,
            dataUrl
          };
          setPendingAttachments(prev => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Submit note modal
  const handleCreateNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || isExchangeEnded) return;

    const title = noteTitle.trim() || 'Learning_Note.txt';
    const finalName = title.includes('.') ? title : `${title}.md`;

    const noteAtt: ChatAttachment = {
      id: `att_note_${Date.now()}`,
      name: finalName,
      size: new Blob([noteContent]).size,
      type: 'note',
      mimeType: 'text/markdown',
      previewText: noteContent
    };

    setPendingAttachments(prev => [...prev, noteAtt]);
    setNoteTitle('');
    setNoteContent('');
    setShowNoteModal(false);
  };

  // Voice recording: Robust MediaRecorder lifecycle
  const startRecording = async () => {
    if (isExchangeEnded) return;
    setUploadError(null);
    setRecordingError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setRecordingError('Voice recording is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
        ''
      ];

      let selectedMimeType = '';
      for (const mt of mimeTypes) {
        if (!mt || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mt))) {
          selectedMimeType = mt;
          break;
        }
      }

      const recorderOptions: MediaRecorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = selectedMimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        
        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/[^a-zA-Z0-9]/g, '_');
            const ext = finalMime.includes('ogg') ? 'ogg' : finalMime.includes('mp4') ? 'mp4' : 'webm';
            
            const voiceAtt: ChatAttachment = {
              id: `att_voice_${Date.now()}`,
              name: `Voice_Note_${timeString}.${ext}`,
              size: audioBlob.size,
              type: 'audio',
              mimeType: finalMime,
              dataUrl: base64data,
              duration: recordDuration || 1
            };
            setPendingAttachments(prev => [...prev, voiceAtt]);
          };
          reader.readAsDataURL(audioBlob);
        }

        // Clean up tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(200); // 200ms slices for smooth data collection
      setIsRecording(true);
      setRecordDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.warn('Microphone recording error:', err);
      let errorMsg = 'Microphone access could not be acquired.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone access was denied. Please allow microphone permissions in your browser bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No microphone device was detected on your system.';
      }
      setRecordingError(errorMsg);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordDuration(0);
    audioChunksRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExchangeEnded) return;
    if (!messageText.trim() && pendingAttachments.length === 0) return;

    const res = sendMessage(activeConnection.id, messageText, pendingAttachments);
    if (res.success) {
      setMessageText('');
      setPendingAttachments([]);
      setUploadError(null);
    } else if (res.error) {
      setUploadError(res.error);
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Safety actions handlers
  const handleConfirmEndExchange = (reason?: string) => {
    const res = endExchange(activeConnection.id, reason);
    setShowEndExchangeModal(false);
    if (res.success) {
      setFeedbackToast('Active exchange ended. Room is now archived.');
    }
  };

  const handleConfirmBlockUser = () => {
    const res = blockUser(otherUserId, 'Blocked from chat safety menu');
    setShowBlockModal(false);
    if (res.success) {
      setFeedbackToast(`${otherUser.name} has been blocked.`);
    }
  };

  const handleConfirmReportUser = (
    reason: ReportReason, 
    reasonLabel: string, 
    description: string, 
    alsoBlock: boolean
  ) => {
    reportUser(otherUserId, reason, reasonLabel, description, activeConnection.id);
    if (alsoBlock) {
      blockUser(otherUserId, `Reported for ${reasonLabel}`);
    }
    setFeedbackToast('Report submitted to moderation team.');
  };

  const handleInitiateCall = async (type: 'VOICE' | 'VIDEO') => {
    if (!otherUserId || !otherUser) return;
    const res = await startCall(otherUserId, otherUser.name, otherUser.avatarUrl, type, activeConnection.id);
    if (!res.success) {
      setFeedbackToast(res.error || 'Failed to initiate call');
    }
  };

  // Helper for rendering attachment card inside a chat message
  const renderAttachment = (att: ChatAttachment, isSender: boolean = false) => {
    if (att.type === 'image') {
      return (
        <div key={att.id} className="mt-2 rounded-2xl overflow-hidden border border-slate-200 bg-black/5 max-w-full">
          <div className="relative overflow-hidden max-h-52 sm:max-h-60 bg-slate-950 flex items-center justify-center">
            <img 
              src={att.dataUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'} 
              alt={att.name}
              onClick={() => setPreviewAttachment(att)}
              className="max-h-52 sm:max-h-60 w-full object-contain cursor-pointer hover:opacity-95 transition-opacity"
            />
          </div>
          <div className="p-2 sm:p-2.5 bg-white/95 flex items-center justify-between gap-2 border-t border-slate-100 min-w-0">
            <div className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
              <p className="truncate">{att.name}</p>
              <p className="text-[10px] text-slate-400 font-normal">{formatFileSize(att.size)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setPreviewAttachment(att)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Zoom Preview"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              {att.dataUrl && (
                <a
                  href={att.dataUrl}
                  download={att.name}
                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (att.type === 'video') {
      return (
        <div key={att.id} className="mt-2 rounded-2xl overflow-hidden border border-slate-200 bg-black max-w-full">
          <video 
            src={att.dataUrl} 
            controls 
            className="max-h-52 sm:max-h-60 w-full object-contain bg-black"
          />
          <div className="p-2 sm:p-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1 truncate text-xs">
              <p className="truncate font-semibold">{att.name}</p>
              <p className="text-[10px] text-slate-400">{formatFileSize(att.size)}</p>
            </div>
            {att.dataUrl && (
              <a
                href={att.dataUrl}
                download={att.name}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      );
    }

    if (att.type === 'audio') {
      return (
        <VoiceNotePlayer
          key={att.id}
          attachment={att}
          isSender={isSender}
        />
      );
    }

    if (att.type === 'note') {
      return (
        <div key={att.id} className="mt-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
              <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-mono font-bold text-slate-200 truncate min-w-0 flex-1">{att.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setPreviewAttachment(att)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-semibold text-slate-300 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                <span className="hidden xs:inline">View Full</span>
              </button>
            </div>
          </div>
          <pre className="text-[10px] sm:text-[11px] font-mono text-emerald-300 bg-black/40 p-2.5 rounded-xl overflow-x-auto max-h-36 leading-relaxed max-w-full whitespace-pre-wrap sm:whitespace-pre break-all sm:break-normal">
            {att.previewText || '// Code or note content'}
          </pre>
        </div>
      );
    }

    // PDF, Word, or Other Documents
    const isPdf = att.type === 'pdf';
    const isWord = att.type === 'word';

    return (
      <div 
        key={att.id} 
        className="mt-2 p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-2 sm:gap-3 min-w-0 max-w-full"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isPdf 
              ? 'bg-red-50 text-red-600 border border-red-100' 
              : isWord 
              ? 'bg-blue-50 text-blue-600 border border-blue-100'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {isPdf ? (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : isWord ? (
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1 truncate">
            <p className="text-xs font-bold text-slate-900 truncate">{att.name}</p>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {formatFileSize(att.size)} &bull; {isPdf ? 'PDF' : isWord ? 'Word' : 'Doc'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setPreviewAttachment(att)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Preview Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {att.dataUrl ? (
            <a
              href={att.dataUrl}
              download={att.name}
              className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
              title="Download Resource"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              onClick={() => setPreviewAttachment(att)}
              className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
              title="Download Resource"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Left Sidebar: Active Exchange Peers & Navigation */}
        <div className={`space-y-4 ${showMobileConversations ? 'block' : 'hidden lg:block'} lg:col-span-1`}>
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                id="back-to-exchanges-btn"
                onClick={() => setCurrentView('active_exchanges')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Exchanges</span>
              </button>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                1-on-1 Encrypted
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Conversations ({userConnections.length})
                </h3>
                <button 
                  onClick={() => setShowMobileConversations(false)} 
                  className="lg:hidden text-xs text-emerald-700 font-bold"
                >
                  Close
                </button>
              </div>
              <div className="space-y-1.5">
                {userConnections.map(conn => {
                  const partnerId = conn.senderId === currentUser.id ? conn.receiverId : conn.senderId;
                  const partner = allUsers.find(u => u.id === partnerId) || {
                    name: conn.senderId === currentUser.id ? conn.receiverName : conn.senderName,
                    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
                    titleOrRole: 'Peer'
                  };

                  const isSelected = conn.id === activeConnection.id;

                  return (
                    <button
                      key={conn.id}
                      onClick={() => {
                        setActiveChatConnectionId(conn.id);
                        setShowMobileConversations(false);
                      }}
                      className={`w-full p-2.5 rounded-2xl text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20 font-bold' 
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          openUserProfile(partnerId);
                        }}
                        className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-white/20 hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer"
                        title={`View ${partner.name}'s profile`}
                      >
                        <img src={partner.avatarUrl} alt={partner.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="truncate flex-grow">
                        <p className="text-xs font-bold truncate">{partner.name}</p>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {conn.isKnowledgeSharing ? 'Knowledge Sharing' : `${conn.offeredSkillName} ↔ ${conn.wantedSkillName}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Privacy & Security Guarantee Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Private Exchange Room</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Messages and shared learning files are strictly confined to you and <strong>{otherUser.name}</strong>. Access is permission-enforced and unlocks only upon mutual agreement.
            </p>
          </div>
        </div>

        {/* Right Area: Chat Window & Shared Resources Panel */}
        <div className={`lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[680px] sm:h-[750px] overflow-hidden min-w-0 ${showMobileConversations ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* Room Header */}
          <div className="p-3 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => setShowMobileConversations(prev => !prev)}
                className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0"
                title="Toggle conversations list"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                type="button"
                id={`chat-header-user-btn-${otherUser.id}`}
                onClick={() => openUserProfile(otherUser.id)}
                className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-left group cursor-pointer focus:outline-hidden"
                title={`View ${otherUser.name}'s profile`}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-xs shrink-0 group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                  <img src={otherUser.avatarUrl} alt={otherUser.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">{otherUser.name}</h2>
                    {activeConnection.isProjectCollaboration ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[9px] sm:text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0">
                        <Users className="w-3 h-3 text-amber-700" />
                        <span>Project Collaboration</span>
                      </span>
                    ) : activeConnection.isKnowledgeSharing ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0">
                        <HeartHandshake className="w-3 h-3 text-emerald-600" />
                        <span>Knowledge Sharing</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[9px] sm:text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0">
                        <ArrowRightLeft className="w-3 h-3 text-teal-600" />
                        <span>Skill Exchange</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                    {activeConnection.isProjectCollaboration ? (
                      <>
                        Collab Focus: <span className="font-semibold text-amber-900">{activeConnection.wantedSkillName}</span> &bull; Bringing: <span className="font-semibold text-amber-900">{activeConnection.offeredSkillName}</span>
                      </>
                    ) : (
                      <>
                        Sharing: <span className="font-semibold text-slate-700">{activeConnection.offeredSkillName}</span> &bull; Learning: <span className="font-semibold text-slate-700">{activeConnection.wantedSkillName}</span>
                      </>
                    )}
                  </p>
                </div>
              </button>
            </div>

            {/* Action Bar: Tab switch and Safety Controls Menu */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {/* Tab switch between Chat & Resources */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl">
                <button
                  id="chat-tab-messages"
                  onClick={() => setActiveTab('CHAT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'CHAT'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>

                <button
                  id="chat-tab-resources"
                  onClick={() => setActiveTab('RESOURCES')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'RESOURCES'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Resources ({allResources.length})</span>
                </button>
              </div>

              {/* Real-time Voice & Video Call Action Buttons */}
              {!isExchangeEnded && !isBlockedBetween && (
                <div className="flex items-center gap-1">
                  <button
                    id="chat-start-voice-call-btn"
                    onClick={() => handleInitiateCall('VOICE')}
                    className="p-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                    title={`Start Voice Call with ${otherUser.name.split(' ')[0]}`}
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  <button
                    id="chat-start-video-call-btn"
                    onClick={() => handleInitiateCall('VIDEO')}
                    className="p-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                    title={`Start Video Call with ${otherUser.name.split(' ')[0]}`}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Safety & Interaction Controls Menu */}
              <div className="relative" ref={safetyMenuRef}>
                <button
                  id="chat-safety-options-btn"
                  onClick={() => setShowSafetyMenu(prev => !prev)}
                  className="p-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs flex items-center gap-1"
                  title="Interaction & Safety Controls"
                >
                  <ShieldAlert className="w-4 h-4 text-slate-700" />
                  <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showSafetyMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Safety & Controls</p>
                    </div>

                    {activeConnection.status === 'ACCEPTED' && (
                      <button
                        id="chat-menu-end-exchange"
                        onClick={() => {
                          setShowSafetyMenu(false);
                          setShowEndExchangeModal(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-bold">End Exchange</p>
                          <p className="text-[10px] text-amber-600/80">Close active swap cleanly</p>
                        </div>
                      </button>
                    )}

                    <button
                      id="chat-menu-block-user"
                      onClick={() => {
                        setShowSafetyMenu(false);
                        setShowBlockModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
                    >
                      <ShieldBan className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <div>
                        <p className="font-bold">Block {otherUser.name.split(' ')[0]}</p>
                        <p className="text-[10px] text-rose-600/80">Prevent further interactions</p>
                      </div>
                    </button>

                    <button
                      id="chat-menu-report-user"
                      onClick={() => {
                        setShowSafetyMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <div>
                        <p className="font-bold">Report User</p>
                        <p className="text-[10px] text-slate-500">Flag policy violations</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Toast Notification Banner */}
          {feedbackToast && (
            <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-between font-semibold shrink-0">
              <span>{feedbackToast}</span>
              <button onClick={() => setFeedbackToast(null)} className="text-emerald-200 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Ended / Blocked Exchange Notification Banner */}
          {isExchangeEnded && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-xs text-amber-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">
                  {isBlockedBetween 
                    ? 'Interaction is blocked between you and this user. Communication is inactive.' 
                    : 'This exchange has ended. History and materials remain saved for your reference.'}
                </span>
              </div>
              <button 
                onClick={() => setCurrentView('active_exchanges')} 
                className="text-[11px] font-bold text-amber-700 hover:underline shrink-0 ml-2"
              >
                Go to Exchanges
              </button>
            </div>
          )}

          {/* Main Body */}
          {activeTab === 'CHAT' ? (
            <div 
              className={`flex-grow flex flex-col overflow-hidden relative min-w-0 ${isDragOver ? 'bg-emerald-50/50' : 'bg-slate-50/40'}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
            >
              {/* Drag overlay feedback */}
              {isDragOver && (
                <div className="absolute inset-0 bg-emerald-600/10 backdrop-blur-xs border-2 border-dashed border-emerald-500 rounded-2xl z-30 flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-emerald-200 text-center">
                    <FolderDown className="w-10 h-10 text-emerald-600 mx-auto mb-2 animate-bounce" />
                    <p className="text-sm font-bold text-slate-900">Drop files to share in chat</p>
                    <p className="text-xs text-slate-500">PDFs, images, notes, code, videos, docs up to 15MB</p>
                  </div>
                </div>
              )}

              {/* Message History Feed */}
              <div className="flex-grow overflow-y-auto p-3 sm:p-6 space-y-4 min-w-0">
                {/* Security info pill */}
                <div className="text-center px-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] sm:text-[11px] font-medium text-slate-500 max-w-full text-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate sm:whitespace-normal">Private connection active. All messages and materials are confidential.</span>
                  </span>
                </div>

                {connectionMessages.length === 0 ? (
                  <div className="text-center py-12 space-y-3 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Start Your Skill Exchange</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Say hello to {otherUser.name}, introduce your learning goals, or share notes, PDFs, code snippets, or voice notes to kick off your sessions.
                    </p>
                  </div>
                ) : (
                  connectionMessages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;
                    const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 sm:gap-3 max-w-[92%] sm:max-w-[80%] md:max-w-[75%] min-w-0 ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden bg-slate-200 shrink-0 mt-1">
                          <img 
                            src={isMe ? currentUser.avatarUrl : otherUser.avatarUrl} 
                            alt={msg.senderName} 
                            className="w-full h-full object-cover" 
                          />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className={`flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[11px] font-bold text-slate-700 truncate">{isMe ? 'You' : msg.senderName}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{formattedTime}</span>
                          </div>

                          <div
                            className={`p-3 sm:p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-2xs break-words [overflow-wrap:anywhere] min-w-0 ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-tr-xs'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                            }`}
                          >
                            {msg.text && (
                              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</p>
                            )}

                            {/* Render attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-2 mt-2 min-w-0">
                                {msg.attachments.map(att => renderAttachment(att, isMe))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending Attachments Staging Bar */}
              {pendingAttachments.length > 0 && (
                <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex flex-wrap gap-2 shrink-0 max-h-28 overflow-y-auto">
                  {pendingAttachments.map(att => (
                    <div 
                      key={att.id}
                      className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-slate-800 min-w-0 max-w-full"
                    >
                      <span className="font-semibold truncate max-w-[120px] sm:max-w-[180px]">{att.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({formatFileSize(att.size)})</span>
                      <button
                        onClick={() => removePendingAttachment(att.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-t border-red-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">{uploadError}</span>
                  </div>
                  <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-800 shrink-0 ml-2">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Recording indicator & controls */}
              {isRecording && (
                <div className="p-2.5 sm:p-3 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs text-rose-800 shrink-0 flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                    </span>
                    <span className="font-bold truncate">Recording Voice Note ({recordDuration}s)</span>
                    <div className="hidden sm:flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-rose-500 rounded-full animate-pulse"></span>
                      <span className="w-1 h-4 bg-rose-600 rounded-full animate-pulse delay-75"></span>
                      <span className="w-1 h-2 bg-rose-400 rounded-full animate-pulse delay-150"></span>
                      <span className="w-1 h-5 bg-rose-700 rounded-full animate-pulse"></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold text-xs flex items-center gap-1 transition-colors"
                      title="Discard recording"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Save & Attach</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Recording Error Banner */}
              {recordingError && (
                <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs border-t border-amber-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span className="truncate">{recordingError}</span>
                  </div>
                  <button onClick={() => setRecordingError(null)} className="text-amber-600 hover:text-amber-900 shrink-0 ml-2">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Message Input & Action Bar */}
              <div className="p-2.5 sm:p-4 bg-white border-t border-slate-200 shrink-0">
                {isExchangeEnded ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
                    {isBlockedBetween 
                      ? 'You cannot send messages to this user because communication is blocked.' 
                      : 'This exchange has ended. Messaging is closed.'}
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        className="hidden"
                        onChange={(e) => handleFilesSelected(e.target.files)}
                      />

                      {/* Attach File Button */}
                      <button
                        type="button"
                        id="chat-attach-file-btn"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                        title="Attach documents, images, code, or videos"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      {/* Create Note / Code Snippet Button */}
                      <button
                        type="button"
                        id="chat-create-note-btn"
                        onClick={() => setShowNoteModal(true)}
                        className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                        title="Share quick note or code snippet"
                      >
                        <FileCode className="w-4 h-4" />
                      </button>

                      {/* Voice Note Button */}
                      <button
                        type="button"
                        id="chat-voice-note-btn"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 sm:p-2.5 rounded-2xl transition-colors shrink-0 ${
                          isRecording 
                            ? 'bg-rose-600 text-white animate-pulse' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title={isRecording ? 'Finish voice note' : 'Record voice note'}
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      {/* Text Input Field */}
                      <div className="flex-grow min-w-0 relative">
                        <input
                          type="text"
                          id="chat-message-input"
                          placeholder={`Message ${otherUser.name.split(' ')[0]}...`}
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                        />
                      </div>

                      {/* Send Button */}
                      <button
                        type="submit"
                        id="chat-send-btn"
                        disabled={!messageText.trim() && pendingAttachments.length === 0}
                        className={`p-2.5 sm:p-3 rounded-2xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          messageText.trim() || pendingAttachments.length > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-950/20'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* Shared Resources Gallery Panel */
            <div className="flex-grow flex flex-col overflow-hidden p-4 sm:p-6 bg-slate-50/50 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Exchange Learning Resources</h3>
                  <p className="text-xs text-slate-500">
                    All study guides, cheat sheets, code files, and diagrams shared between you and {otherUser.name}.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {(['ALL', 'pdf', 'note', 'image', 'word', 'audio'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setResourceFilter(type)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        resourceFilter === type
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {type === 'ALL' ? 'All Files' : type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {filteredResources.length === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-sm shadow-xs">
                    <FolderDown className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-800">No matching resources found</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Upload PDFs, code notes, or images in the chat to build your shared learning library.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 pr-1">
                  {filteredResources.map(({ message, attachment }) => (
                    <div
                      key={attachment.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              {attachment.type === 'image' && <ImageIcon className="w-4 h-4" />}
                              {attachment.type === 'pdf' && <FileText className="w-4 h-4 text-red-600" />}
                              {attachment.type === 'word' && <FileSpreadsheet className="w-4 h-4 text-blue-600" />}
                              {attachment.type === 'note' && <FileCode className="w-4 h-4 text-emerald-600" />}
                              {attachment.type === 'audio' && <Music className="w-4 h-4 text-purple-600" />}
                              {attachment.type === 'video' && <Video className="w-4 h-4 text-amber-600" />}
                            </div>
                            <div className="truncate">
                              <h5 className="text-xs font-bold text-slate-900 truncate">{attachment.name}</h5>
                              <p className="text-[10px] text-slate-400">
                                {formatFileSize(attachment.size)} &bull; Shared by {message.senderName.split(' ')[0]}
                              </p>
                            </div>
                          </div>
                        </div>

                        {attachment.previewText && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-xl mb-3 font-mono">
                            {attachment.previewText}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setPreviewAttachment(attachment)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        {attachment.dataUrl && (
                          <a
                            href={attachment.dataUrl}
                            download={attachment.name}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Note Creator Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Share Note or Code Snippet</h3>
              </div>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNoteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note Title or File Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pandas_groupby_example.py or Week1_Summary.md"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Content / Code / Instructions <span className="text-emerald-600">*</span>
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Type or paste study notes, markdown, formulas, or code..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 text-emerald-300 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 cursor-pointer"
                >
                  Attach to Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Detail & Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 truncate">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm truncate">{previewAttachment.name}</h3>
              </div>
              <button onClick={() => setPreviewAttachment(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-grow overflow-y-auto space-y-4">
              {previewAttachment.type === 'image' && (
                <div className="rounded-2xl overflow-hidden border border-slate-200">
                  <img
                    src={previewAttachment.dataUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&auto=format&fit=crop&q=80'}
                    alt={previewAttachment.name}
                    className="w-full h-auto object-contain max-h-[450px]"
                  />
                </div>
              )}

              {previewAttachment.type === 'note' && (
                <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800">
                  <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                    {previewAttachment.previewText || 'No preview available'}
                  </pre>
                </div>
              )}

              {previewAttachment.type === 'pdf' && (
                <div className="p-8 rounded-2xl bg-red-50/60 border border-red-100 text-center space-y-3">
                  <FileText className="w-16 h-16 text-red-600 mx-auto" />
                  <h4 className="font-bold text-slate-900 text-base">{previewAttachment.name}</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {previewAttachment.previewText || 'Standard PDF study reference document for peer exchange.'}
                  </p>
                  <p className="text-xs font-semibold text-slate-400">File size: {formatFileSize(previewAttachment.size)}</p>
                </div>
              )}

              {previewAttachment.type === 'word' && (
                <div className="p-8 rounded-2xl bg-blue-50/60 border border-blue-100 text-center space-y-3">
                  <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto" />
                  <h4 className="font-bold text-slate-900 text-base">{previewAttachment.name}</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {previewAttachment.previewText || 'Word / Spreadsheet learning material for peer exchange.'}
                  </p>
                  <p className="text-xs font-semibold text-slate-400">File size: {formatFileSize(previewAttachment.size)}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Size: {formatFileSize(previewAttachment.size)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Close
                </button>
                {previewAttachment.dataUrl ? (
                  <a
                    href={previewAttachment.dataUrl}
                    download={previewAttachment.name}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      // Generate and download text blob
                      const blob = new Blob([previewAttachment.previewText || 'Skill Mesh Resource'], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = previewAttachment.name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Resource</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Exchange Confirmation Modal */}
      {showEndExchangeModal && (
        <EndExchangeModal
          isOpen={showEndExchangeModal}
          partnerName={otherUser.name}
          offeredSkill={activeConnection.offeredSkillName}
          wantedSkill={activeConnection.wantedSkillName}
          onConfirm={handleConfirmEndExchange}
          onCancel={() => setShowEndExchangeModal(false)}
        />
      )}

      {/* Block User Modal */}
      {showBlockModal && (
        <BlockUserModal
          isOpen={showBlockModal}
          userName={otherUser.name}
          onConfirm={handleConfirmBlockUser}
          onCancel={() => setShowBlockModal(false)}
        />
      )}

      {/* Report User Modal */}
      {showReportModal && (
        <ReportUserModal
          isOpen={showReportModal}
          userName={otherUser.name}
          onConfirm={handleConfirmReportUser}
          onCancel={() => setShowReportModal(false)}
        />
      )}

    </div>
  );
};
