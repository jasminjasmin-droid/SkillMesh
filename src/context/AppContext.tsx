import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  UserProfile, 
  ConnectionRequest, 
  OfferedSkill, 
  WantedSkill, 
  MatchScoreResult,
  ChatMessage,
  ChatAttachment,
  ConnectionRequestType,
  BlockRecord,
  ReportReason,
  UserReport,
  UserSafetySignalSummary,
  UserStatus,
  AdminOverviewStats,
  AdminUserListItem,
  AdminModerationLog,
  AdminTab,
  MatchPurpose,
  MentorshipSchedule,
  ScheduledSession,
  SessionFormat,
  LiveAvailabilityStatus,
  LiveAvailabilityMode,
  UserLiveAvailability,
  MentorshipRequest,
  ActiveMentorship,
  MentorshipSession,
  AppNotification,
  CallSession,
  CallHistoryRecord,
} from '../types';
import { INITIAL_USERS, INITIAL_CONNECTIONS, INITIAL_MESSAGES } from '../data/seedData';
import { calculateUserMatch } from '../utils/matchingEngine';
import { evaluateUserSafety } from '../utils/safetyEngine';
import { generateInitialsAvatar } from '../utils/avatarUtils';
import {
  isSupabaseConfigured,
  getSupabase,
  fetchSupabaseUsers,
  fetchSupabaseConnections,
  fetchSupabaseMessages,
  saveSupabaseMessage,
  deduplicateConnectionList,
  saveSupabaseUserProfile,
  saveSupabaseOfferedSkill,
  deleteSupabaseOfferedSkill,
  saveSupabaseWantedSkill,
  deleteSupabaseWantedSkill,
  createSupabaseConnection,
  updateSupabaseConnectionStatus,
  saveSupabaseUserReport,
  saveSupabaseBlockRecord,
  deleteSupabaseBlockRecord,
  seedSupabaseIfEmpty,
  isEmailRegisteredInSupabase,
  signUpSupabaseAuth,
  sendSupabaseAuthOtp,
  verifySupabaseAuthOtp,
  signInWithSupabaseAuth,
  updateSupabaseAuthPassword,
  signOutSupabaseAuth,
} from '../services/supabaseClient';
import {
  apiUpdateAvailability,
  apiGetUserAvailability,
  apiGetAllAvailabilities,
  apiSendMentorshipRequest,
  apiGetMentorshipRequests,
  apiRespondMentorshipRequest,
  apiGetActiveMentorships,
  apiUpdateMentorshipStatus,
  apiInitiateCall,
  apiCheckIncomingCall,
  apiRespondToCall,
  apiEndCall,
  apiGetMentorshipSessions,
  apiScheduleMentorshipSession,
  apiUpdateMentorshipSessionStatus,
  apiGetNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiUploadProfileBanner,
  apiDeleteProfileBanner,
  apiUploadProfileAvatar,
  apiAdminVerifyUser,
  apiMarkMessagesRead
} from '../services/upgradeApi';

export type AppView = 
  | 'landing'
  | 'my_skillmesh'
  | 'login'
  | 'signup'
  | 'otp_verify'
  | 'reset_password'
  | 'profile_setup'
  | 'skills_offer_setup'
  | 'skills_want_setup'
  | 'matches'
  | 'requests'
  | 'active_exchanges'
  | 'project_collaboration'
  | 'chat'
  | 'profile_detail'
  | 'my_profile'
  | 'connections'
  | 'admin_dashboard'
  | 'mentorship'
  | 'mentorship_hub';

export interface SignupDraft {
  name: string;
  email: string;
  password?: string;
  delivered?: boolean;
  code?: string;
}

export interface ProfileUpdateParams {
  displayName: string;
  titleOrRole: string;
  bio: string;
  avatarUrl: string;
  status: UserStatus;
  institutionName?: string;
  organizationName?: string;
  occupationDetails?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  matchPurposes?: MatchPurpose[];
  collaborationInterests?: string[];
  activeProjectDescription?: string;
}

interface AppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  allUsers: UserProfile[];
  connections: ConnectionRequest[];
  messages: ChatMessage[];
  blockedUsers: BlockRecord[];
  userReports: UserReport[];
  activeChatConnectionId: string | null;
  setActiveChatConnectionId: (id: string | null) => void;
  signupDraft: SignupDraft | null;
  setSignupDraft: (draft: SignupDraft | null | ((prev: SignupDraft | null) => SignupDraft | null)) => void;
  selectedMatchUser: UserProfile | null;
  selectedProfileUserId: string | null;
  setSelectedProfileUserId: (id: string | null) => void;
  selectedMatchResult: MatchScoreResult | null;
  connectModalTarget: UserProfile | null;
  setConnectModalTarget: (user: UserProfile | null) => void;
  isCloudSynced: boolean;
  
  // Navigation & Actions
  openUserProfile: (userOrId: UserProfile | string) => void;
  handleBackFromProfile: () => void;
  openChatForConnection: (connectionId: string) => boolean;
  openChatWithUser: (otherUserId: string) => boolean;
  getActiveConnectionWithUser: (otherUserId: string) => ConnectionRequest | null;
  getPendingRequestWithUser: (otherUserId: string) => { request: ConnectionRequest; isIncoming: boolean; isOutgoing: boolean } | null;
  initiateSignup: (name: string, email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  resendOTP: (emailOverride?: string, nameOverride?: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (code: string, passwordOverride?: string) => Promise<{ success: boolean; error?: string }>;
  updateSignupPassword: (password: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  
  // Profile & Skills management
  saveProfileBasicInfo: (params: ProfileUpdateParams | string, titleOrRole?: string, bio?: string, avatarUrl?: string, location?: string) => void;
  addOfferedSkill: (skill: Omit<OfferedSkill, 'id'>) => void;
  removeOfferedSkill: (skillId: string) => void;
  addWantedSkill: (skill: Omit<WantedSkill, 'id'>) => void;
  removeWantedSkill: (skillId: string) => void;
  
  // Connections
  sendConnectionRequest: (
    receiverId: string,
    offeredSkillName: string,
    wantedSkillName: string,
    note?: string,
    requestType?: ConnectionRequestType,
    isKnowledgeSharing?: boolean,
    isProjectCollaboration?: boolean,
    collaborationDetails?: { projectTitle?: string; lookingFor?: string; whyConnect?: string; }
  ) => { success: boolean; error?: string };
  acceptConnection: (connectionId: string) => void;
  declineConnection: (connectionId: string) => void;
  rejectConnection: (connectionId: string) => void;
  upgradeExchangeToCollaboration: (
    connectionId: string, 
    details: { projectTitle: string; lookingFor?: string; whyConnect?: string }
  ) => { success: boolean; error?: string };
  
  // Safety & Interaction Controls
  endExchange: (connectionId: string, reason?: string) => { success: boolean; error?: string };
  blockUser: (userIdToBlock: string, reason?: string) => { success: boolean; error?: string };
  unblockUser: (userIdToUnblock: string) => { success: boolean; error?: string };
  isUserBlocked: (userId: string) => boolean;
  isUserBlockedByMe: (userId: string) => boolean;
  getUserSafetyStatus: (userId: string) => UserSafetySignalSummary;
  isUserSuspended: (userId: string) => boolean;
  isCurrentUserSuspended: boolean;
  isCurrentUserBanned: boolean;
  reportUser: (
    reportedUserId: string,
    reason: ReportReason,
    reasonLabel: string,
    description?: string,
    connectionId?: string
  ) => { success: boolean; error?: string };

  // Chat
  sendMessage: (
    connectionId: string,
    text: string,
    attachments?: ChatAttachment[]
  ) => { success: boolean; error?: string };

  // Mentorship & Live Scheduling
  updateMentorshipSchedule: (schedule: MentorshipSchedule) => void;
  scheduledSessions: ScheduledSession[];
  bookMentorshipSession: (params: {
    mentorId: string;
    mentorName: string;
    mentorAvatar?: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    format: SessionFormat;
    topic: string;
    notes?: string;
  }) => { success: boolean; error?: string; session?: ScheduledSession };
  updateSessionStatus: (sessionId: string, status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED', reason?: string) => void;

  // Secure Admin Portal
  isAdmin: boolean;
  adminActiveTab: AdminTab;
  setAdminActiveTab: (tab: AdminTab) => void;
  adminOverviewStats: AdminOverviewStats | null;
  adminUsersList: AdminUserListItem[];
  adminReportsList: UserReport[];
  adminAuditLogs: AdminModerationLog[];
  fetchAdminData: () => Promise<void>;
  adminUpdateUserStatus: (userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED', reason?: string) => Promise<{ success: boolean; error?: string }>;
  adminUpdateReportStatus: (reportId: string, status: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED', resolutionNotes?: string) => Promise<{ success: boolean; error?: string }>;

  // Live Availability
  currentUserAvailability: UserLiveAvailability | null;
  allAvailabilities: Record<string, UserLiveAvailability>;
  toggleAvailability: (status: LiveAvailabilityStatus, mode?: LiveAvailabilityMode, customStatus?: string) => Promise<void>;
  getUserAvailabilityStatus: (userId: string) => { status: LiveAvailabilityStatus; mode: LiveAvailabilityMode; timezone?: string; customStatus?: string; updatedAt?: string };
  updateUserTimezone: (tz: string) => Promise<void>;

  // Peer Mentorship Hub
  mentorshipRequests: { incoming: MentorshipRequest[]; outgoing: MentorshipRequest[]; all: MentorshipRequest[] };
  activeMentorships: ActiveMentorship[];
  mentorshipSessions: MentorshipSession[];
  sendMentorshipRequest: (params: { mentorId: string; topic: string; message: string; experienceLevel?: any; sessionStyle?: any; preferredAvailability?: string }) => Promise<{ success: boolean; error?: string; request?: MentorshipRequest }>;
  respondToMentorshipRequest: (requestId: string, action: 'ACCEPT' | 'DECLINE' | 'CANCEL') => Promise<{ success: boolean; error?: string }>;
  updateMentorshipStatus: (mentorshipId: string, status: 'COMPLETED' | 'ENDED', notes?: string) => Promise<{ success: boolean; error?: string }>;
  scheduleMentorshipSession: (sessionData: Partial<MentorshipSession>) => Promise<{ success: boolean; session?: MentorshipSession; error?: string }>;
  updateMentorshipSessionStatus: (sessionId: string, status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED', notes?: string) => Promise<{ success: boolean; error?: string }>;

  // Calling (WebRTC Voice & Video)
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  startCall: (receiverId: string, receiverName: string, receiverAvatar?: string, type?: 'VOICE' | 'VIDEO', connectionId?: string) => Promise<{ success: boolean; session?: CallSession; error?: string }>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: (durationSeconds?: number) => Promise<void>;

  // Notifications
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;

  // Profile Banner, Avatar, Verification & Chat Read Receipts
  uploadProfileBanner: (bannerData: string, mimeType?: string) => Promise<{ success: boolean; bannerUrl?: string; error?: string }>;
  removeProfileBanner: () => Promise<{ success: boolean; error?: string }>;
  uploadProfileAvatar: (avatarData: string, mimeType?: string) => Promise<{ success: boolean; avatarUrl?: string; error?: string }>;
  adminVerifyUser: (userId: string, isVerified: boolean, notes?: string) => Promise<{ success: boolean; error?: string }>;
  markMessagesAsRead: (connectionId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_USERS_KEY = 'skillmesh_users_v1';
const STORAGE_CURRENT_USER_KEY = 'skillmesh_current_user_v1';
const STORAGE_CONNECTIONS_KEY = 'skillmesh_connections_v1';
const STORAGE_MESSAGES_KEY = 'skillmesh_messages_v1';
const STORAGE_BLOCKED_KEY = 'skillmesh_blocked_v1';
const STORAGE_REPORTS_KEY = 'skillmesh_reports_v1';
const STORAGE_SESSIONS_KEY = 'skillmesh_sessions_v1';
const STORAGE_SIGNUP_DRAFT_KEY = 'skillmesh_signup_draft_v1';

const DEMO_EMAILS = new Set([
  'alex.morgan@demo.com',
  'elena.rostova@demo.com',
  'marcus.vance@demo.com',
  'sarah.jenkins@demo.com',
  'priya.patel@demo.com',
  'david.kim@demo.com',
  'liam.chen@demo.com'
]);

function isDemoUser(user: any): boolean {
  if (!user) return true;
  if (user.email && DEMO_EMAILS.has(user.email.toLowerCase())) return true;
  if (user.id && ['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(user.id)) return true;
  return false;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current authenticated user (null until logged in)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (savedId) {
        const savedUsers = localStorage.getItem(STORAGE_USERS_KEY);
        if (savedUsers) {
          const parsed = JSON.parse(savedUsers);
          if (Array.isArray(parsed)) {
            const found = parsed.filter(u => !isDemoUser(u)).find(u => u.id === savedId);
            if (found) {
              const email = (found.email || '').trim().toLowerCase();
              const isDesignatedAdmin = ['admin.skillmesh@gmail.com', 'admin@skillmesh.com'].includes(email);
              return { ...found, role: isDesignatedAdmin ? ('admin' as const) : ('user' as const) };
            }
          }
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [currentView, setCurrentViewState] = useState<AppView>(() => {
    try {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (pathname.startsWith('/profile/')) {
        const id = pathname.replace('/profile/', '').split('/')[0].split('?')[0];
        if (id) return 'profile_detail';
      }

      const savedId = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (savedId) {
        const savedUsers = localStorage.getItem(STORAGE_USERS_KEY);
        if (savedUsers) {
          const parsed = JSON.parse(savedUsers);
          if (Array.isArray(parsed)) {
            const found = parsed.filter(u => !isDemoUser(u)).find(u => u.id === savedId);
            if (found) {
              const email = (found.email || '').trim().toLowerCase();
              const isDesignatedAdmin = ['admin.skillmesh@gmail.com', 'admin@skillmesh.com'].includes(email);
              if (isDesignatedAdmin) return 'admin_dashboard';
              if (!found.isProfileComplete && (!found.offeredSkills || found.offeredSkills.length === 0)) {
                return 'profile_setup';
              }
              return 'my_skillmesh';
            }
          }
        }
      }
    } catch {
      // fallback
    }
    return 'landing';
  });
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('overview');
  const [adminOverviewStats, setAdminOverviewStats] = useState<AdminOverviewStats | null>(null);
  const [adminUsersList, setAdminUsersList] = useState<AdminUserListItem[]>([]);
  const [adminReportsList, setAdminReportsList] = useState<UserReport[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminModerationLog[]>([]);

  // Mentorship scheduled sessions
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(scheduledSessions));
    } catch (e) {
      console.warn('Storage sync failed for sessions', e);
    }
  }, [scheduledSessions]);

  const ADMIN_EMAILS = useMemo(() => new Set([
    'admin.skillmesh@gmail.com',
    'admin@skillmesh.com'
  ]), []);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const email = (currentUser.email || '').trim().toLowerCase();
    return currentUser.role === 'admin' && ADMIN_EMAILS.has(email);
  }, [currentUser, ADMIN_EMAILS]);

  const previousViewRef = useRef<AppView>('landing');

  // Protected View navigation: regular users cannot switch to admin_dashboard
  const handleSetCurrentView = useCallback((view: AppView) => {
    if (view === 'admin_dashboard' && !isAdmin) {
      console.warn('[SECURITY] Blocked unauthorized attempt to view Admin Dashboard.');
      setCurrentViewState(currentUser ? 'my_skillmesh' : 'landing');
      return;
    }
    setCurrentViewState(prev => {
      if (prev !== 'profile_detail' && view === 'profile_detail') {
        previousViewRef.current = prev;
      } else if (prev !== view && view !== 'profile_detail') {
        previousViewRef.current = prev;
      }
      return view;
    });
  }, [isAdmin, currentUser]);

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(isSupabaseConfigured());
  
  // Initialize real users from localStorage or cloud
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(u => !isDemoUser(u)).map(u => {
            const email = (u.email || '').trim().toLowerCase();
            const isDesignatedAdmin = ['admin.skillmesh@gmail.com', 'admin@skillmesh.com'].includes(email);
            return { ...u, role: isDesignatedAdmin ? ('admin' as const) : ('user' as const) };
          });
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS.filter(u => !isDemoUser(u));
  });

  // Purge any demo accounts from localStorage on startup
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem(STORAGE_USERS_KEY);
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(u => !isDemoUser(u));
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.warn('Storage purge notice:', e);
    }
  }, []);

  // Fetch true registered users from backend on initial mount
  useEffect(() => {
    let isMounted = true;
    async function loadServerUsers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.users)) {
            const genuineUsers = data.users.filter((u: any) => !isDemoUser(u));
            setAllUsers(genuineUsers);
            try {
              localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(genuineUsers));
            } catch {}

            // If current user is no longer in valid users and is not admin, clear session
            if (currentUser && currentUser.role !== 'admin') {
              const stillExists = genuineUsers.some((u: UserProfile) => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
              if (!stillExists) {
                setCurrentUser(null);
                localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Initial server users load notice:', err);
      }
    }
    loadServerUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const [connections, setConnections] = useState<ConnectionRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONNECTIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter connections involving demo accounts
          return deduplicateConnectionList(parsed.filter(c => 
            !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(c.senderId) &&
            !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(c.receiverId)
          ));
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(m => 
            !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(m.senderId) &&
            !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(m.receiverId)
          );
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [blockedUsers, setBlockedUsers] = useState<BlockRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BLOCKED_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [userReports, setUserReports] = useState<UserReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REPORTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [activeChatConnectionId, setActiveChatConnectionId] = useState<string | null>(null);
  const [signupDraft, setSignupDraftState] = useState<SignupDraft | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SIGNUP_DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const setSignupDraft = useCallback((draft: SignupDraft | null | ((prev: SignupDraft | null) => SignupDraft | null)) => {
    setSignupDraftState(prev => {
      const next = typeof draft === 'function' ? draft(prev) : draft;
      try {
        if (next) {
          localStorage.setItem(STORAGE_SIGNUP_DRAFT_KEY, JSON.stringify(next));
        } else {
          localStorage.removeItem(STORAGE_SIGNUP_DRAFT_KEY);
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);
  const [selectedMatchUser, setSelectedMatchUser] = useState<UserProfile | null>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(() => {
    try {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (pathname.startsWith('/profile/')) {
        const id = pathname.replace('/profile/', '').split('/')[0].split('?')[0];
        if (id) return id;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [selectedMatchResult, setSelectedMatchResult] = useState<MatchScoreResult | null>(null);
  const [connectModalTarget, setConnectModalTarget] = useState<UserProfile | null>(null);

  // Sync selectedMatchUser if selectedProfileUserId is set and allUsers updates
  useEffect(() => {
    if (selectedProfileUserId && (!selectedMatchUser || selectedMatchUser.id !== selectedProfileUserId)) {
      const found = allUsers.find(u => u.id === selectedProfileUserId);
      if (found) {
        setSelectedMatchUser(found);
        if (currentUser) {
          setSelectedMatchResult(calculateUserMatch(currentUser, found));
        }
      }
    }
  }, [selectedProfileUserId, allUsers, currentUser, selectedMatchUser]);

  // Handle browser back/forward history navigation for /profile/:userId
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/profile/')) {
        const profileId = pathname.replace('/profile/', '').split('/')[0].split('?')[0];
        if (profileId) {
          setSelectedProfileUserId(profileId);
          const found = allUsers.find(u => u.id === profileId);
          if (found) {
            setSelectedMatchUser(found);
            if (currentUser) {
              setSelectedMatchResult(calculateUserMatch(currentUser, found));
            }
          }
          handleSetCurrentView('profile_detail');
          return;
        }
      }

      if (e.state?.view) {
        handleSetCurrentView(e.state.view);
      } else {
        const dest = previousViewRef.current && previousViewRef.current !== 'profile_detail'
          ? previousViewRef.current
          : (currentUser ? 'matches' : 'landing');
        handleSetCurrentView(dest);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allUsers, currentUser, handleSetCurrentView]);

  // Fetch admin dashboard data from server
  const fetchAdminData = useCallback(async () => {
    if (!currentUser || !isAdmin || currentUser.role !== 'admin') {
      setAdminOverviewStats(null);
      setAdminUsersList([]);
      setAdminReportsList([]);
      setAdminAuditLogs([]);
      return;
    }
    const adminHeaders: Record<string, string> = {
      'x-admin-email': currentUser.email,
      'x-user-role': 'admin',
      'x-user-id': currentUser.id,
      'x-admin-name': currentUser.name,
      'Content-Type': 'application/json'
    };

    try {
      // 1. Bulk sync real client users with server store
      if (allUsers.length > 0) {
        await fetch('/api/admin/users/sync-all', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ users: allUsers }),
        }).catch(err => console.warn('Bulk users sync failed:', err));
      }

      const [overviewRes, usersRes, reportsRes, auditRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: adminHeaders }),
        fetch('/api/admin/users', { headers: adminHeaders }),
        fetch('/api/admin/reports', { headers: adminHeaders }),
        fetch('/api/admin/audit-logs', { headers: adminHeaders }),
      ]);

      // Process reports
      let rawReports: UserReport[] = userReports;
      if (reportsRes.ok) {
        const repData = await reportsRes.json();
        if (repData.success && Array.isArray(repData.reports)) {
          const repMap = new Map<string, UserReport>();
          rawReports.forEach(r => repMap.set(r.id, r));
          repData.reports.forEach((r: UserReport) => repMap.set(r.id, r));
          rawReports = Array.from(repMap.values());
        }
      }
      setAdminReportsList(rawReports);

      // Process users list ensuring 100% accurate accounts & offered skills
      let serverUsers: AdminUserListItem[] = [];
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.success && Array.isArray(data.users)) {
          serverUsers = data.users;
        }
      }

      const usersMap = new Map<string, AdminUserListItem>();
      allUsers.forEach(u => {
        const receivedReportsCount = rawReports.filter(r => r.reportedUserId === u.id).length;
        const receivedBlocksCount = blockedUsers.filter(b => b.blockedUserId === u.id).length;
        usersMap.set(u.id, {
          id: u.id,
          name: u.name,
          email: u.email,
          joinedDate: u.joinedDate || new Date().toISOString(),
          avatarUrl: u.avatarUrl,
          titleOrRole: u.titleOrRole || 'Member',
          bio: u.bio,
          isProfileComplete: Boolean(u.isProfileComplete || (u.offeredSkills && u.offeredSkills.length > 0)),
          accountStatus: u.accountStatus || 'ACTIVE',
          statusReason: u.statusReason,
          statusUpdatedAt: u.statusUpdatedAt,
          offeredSkillsCount: u.offeredSkills ? u.offeredSkills.length : 0,
          wantedSkillsCount: u.wantedSkills ? u.wantedSkills.length : 0,
          receivedReportsCount,
          receivedBlocksCount,
          role: (ADMIN_EMAILS.has(u.email.toLowerCase()) || u.role === 'admin') ? 'admin' : 'user',
          institutionOrOrg: u.organizationName || u.institutionName || u.occupationDetails,
          offeredSkills: u.offeredSkills || [],
          wantedSkills: u.wantedSkills || [],
          flagsCount: receivedReportsCount + receivedBlocksCount,
          reportsReceivedCount: receivedReportsCount,
          blocksReceivedCount: receivedBlocksCount,
          isVerified: Boolean(u.isVerified),
          verificationStatus: u.verificationStatus || (u.isVerified ? 'verified' : 'unverified'),
          verifiedAt: u.verifiedAt,
          verifiedBy: u.verifiedBy,
          verificationNotes: u.verificationNotes,
        });
      });

      serverUsers.forEach(su => {
        const local = usersMap.get(su.id);
        usersMap.set(su.id, {
          ...local,
          ...su,
          isVerified: su.isVerified !== undefined ? su.isVerified : local?.isVerified,
          verificationStatus: su.verificationStatus || local?.verificationStatus,
          averageRating: su.averageRating ?? local?.averageRating ?? 0,
          totalRatings: su.totalRatings ?? local?.totalRatings ?? 0,
          totalExchanges: su.totalExchanges ?? local?.totalExchanges ?? 0,
          completedExchanges: su.completedExchanges ?? local?.completedExchanges ?? 0,
          offeredSkills: (su.offeredSkills && su.offeredSkills.length > 0) ? su.offeredSkills : (local?.offeredSkills || []),
          wantedSkills: (su.wantedSkills && su.wantedSkills.length > 0) ? su.wantedSkills : (local?.wantedSkills || []),
          bio: su.bio || local?.bio,
        });
      });

      const combinedUsersList = Array.from(usersMap.values());
      setAdminUsersList(combinedUsersList);

      if (auditRes.ok) {
        const data = await auditRes.json();
        if (data.success) setAdminAuditLogs(data.logs);
      }

      // Compute exact overview statistics
      const allOfferedSkills = combinedUsersList.flatMap(u => u.offeredSkills || []);
      const uniqueSkillNames = new Set(allOfferedSkills.map(s => s.name.trim().toLowerCase()));

      const activeAccountsCount = combinedUsersList.filter(u => u.accountStatus === 'ACTIVE').length;
      const suspendedAccountsCount = combinedUsersList.filter(u => u.accountStatus === 'SUSPENDED').length;
      const bannedAccountsCount = combinedUsersList.filter(u => u.accountStatus === 'BANNED').length;
      const completedProfilesCount = combinedUsersList.filter(u => u.isProfileComplete).length;
      const incompleteProfilesCount = combinedUsersList.length - completedProfilesCount;

      const pendingReportsCount = rawReports.filter(r => r.status === 'PENDING_REVIEW' || r.status === 'UNDER_REVIEW').length;
      const underReviewReportsCount = rawReports.filter(r => r.status === 'UNDER_REVIEW').length;
      const resolvedReportsCount = rawReports.filter(r => r.status === 'RESOLVED' || r.status === 'DISMISSED').length;

      let flaggedSafetyCount = 0;
      combinedUsersList.forEach(u => {
        const uReps = rawReports.filter(r => r.reportedUserId === u.id);
        const uBlocks = blockedUsers.filter(b => b.blockedUserId === u.id);
        if (uReps.length >= 2 || uBlocks.length >= 2 || u.accountStatus !== 'ACTIVE') {
          flaggedSafetyCount++;
        }
      });

      setAdminOverviewStats({
        totalRegisteredUsers: combinedUsersList.length,
        totalUsers: combinedUsersList.length,
        activeAccountsCount,
        activeUsers: activeAccountsCount,
        suspendedAccountsCount,
        suspendedUsers: suspendedAccountsCount,
        bannedAccountsCount,
        bannedUsers: bannedAccountsCount,
        completedProfilesCount,
        incompleteProfilesCount,
        pendingReportsCount,
        underReviewReportsCount,
        resolvedReportsCount,
        flaggedSafetyCount,
        totalConnectionsCount: connections.length,
        totalOfferedSkillsCount: allOfferedSkills.length,
        uniqueSpecializationsCount: uniqueSkillNames.size,
      });
    } catch (err) {
      console.warn('Error fetching admin data:', err);
    }
  }, [currentUser, isAdmin, allUsers, userReports, blockedUsers, connections.length, ADMIN_EMAILS]);

  // Real-time SSE listener for Admin Dashboard
  useEffect(() => {
    if (!currentUser || !isAdmin || currentUser.role !== 'admin') {
      return;
    }

    // Initial fetch
    fetchAdminData();

    const eventUrl = `/api/admin/events?adminEmail=${encodeURIComponent(currentUser.email)}&adminId=${encodeURIComponent(currentUser.id)}&adminName=${encodeURIComponent(currentUser.name || 'Admin')}`;
    let es: EventSource | null = null;

    try {
      es = new EventSource(eventUrl);

      es.addEventListener('INITIAL_STATE', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.users && Array.isArray(data.users)) {
            const cleanUsers = data.users.filter((u: any) => !isDemoUser(u));
            setAdminUsersList(cleanUsers);
            setAllUsers(prev => {
              const map = new Map<string, UserProfile>();
              cleanUsers.forEach((u: UserProfile) => map.set(u.id, u));
              prev.filter(u => !isDemoUser(u)).forEach(u => {
                if (!map.has(u.id)) map.set(u.id, u);
              });
              return Array.from(map.values());
            });
          }
          if (data.reports && Array.isArray(data.reports)) {
            setAdminReportsList(data.reports);
          }
          if (data.stats) {
            setAdminOverviewStats(data.stats);
          }
        } catch (err) {
          console.warn('Error handling INITIAL_STATE event:', err);
        }
      });

      es.addEventListener('USER_REGISTERED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.user && !isDemoUser(data.user)) {
            setAdminUsersList(prev => {
              const filtered = prev.filter(u => u.id !== data.user.id);
              return [data.user, ...filtered];
            });
            setAllUsers(prev => {
              const filtered = prev.filter(u => u.id !== data.user.id);
              return [data.user, ...filtered];
            });
          }
          if (data.stats) {
            setAdminOverviewStats(data.stats);
          }
        } catch (err) {
          console.warn('Error handling USER_REGISTERED event:', err);
        }
      });

      es.addEventListener('USER_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.user && !isDemoUser(data.user)) {
            setAdminUsersList(prev => prev.map(u => u.id === data.user.id ? { ...u, ...data.user } : u));
            setAllUsers(prev => prev.map(u => u.id === data.user.id ? { ...u, ...data.user } : u));
          }
          if (data.stats) {
            setAdminOverviewStats(data.stats);
          }
        } catch (err) {
          console.warn('Error handling USER_UPDATED event:', err);
        }
      });

      es.addEventListener('USER_STATUS_CHANGED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.user) {
            setAdminUsersList(prev => prev.map(u => u.id === data.user.id ? { ...u, ...data.user } : u));
            setAllUsers(prev => prev.map(u => u.id === data.user.id ? { ...u, ...data.user } : u));
          }
          if (data.log) {
            setAdminAuditLogs(prev => [data.log, ...prev]);
          }
          if (data.stats) {
            setAdminOverviewStats(data.stats);
          }
        } catch (err) {
          console.warn('Error handling USER_STATUS_CHANGED event:', err);
        }
      });

      es.addEventListener('NEW_REPORT', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.report) {
            setAdminReportsList(prev => [data.report, ...prev.filter(r => r.id !== data.report.id)]);
            setUserReports(prev => [data.report, ...prev.filter(r => r.id !== data.report.id)]);
          }
          if (data.stats) {
            setAdminOverviewStats(data.stats);
          }
        } catch (err) {
          console.warn('Error handling NEW_REPORT event:', err);
        }
      });

      es.addEventListener('REPORT_STATUS_CHANGED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.report) {
            setAdminReportsList(prev => prev.map(r => r.id === data.report.id ? data.report : r));
            setUserReports(prev => prev.map(r => r.id === data.report.id ? data.report : r));
          }
          if (data.log) {
            setAdminAuditLogs(prev => [data.log, ...prev]);
          }
          if (data.stats) {
            setAdminOverviewStats(data.stats);
          }
        } catch (err) {
          console.warn('Error handling REPORT_STATUS_CHANGED event:', err);
        }
      });
    } catch (err) {
      console.warn('SSE connection error:', err);
    }

    // High reliability fallback polling every 5 seconds
    const interval = setInterval(() => {
      fetchAdminData();
    }, 5000);

    return () => {
      if (es) es.close();
      clearInterval(interval);
    };
  }, [currentUser, isAdmin, fetchAdminData]);

  // Admin action: Suspend, Ban, or Restore user
  const adminUpdateUserStatus = useCallback(async (
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !isAdmin) return { success: false, error: 'Unauthorized: Admin privileges required.' };

    const targetUser = allUsers.find(u => u.id === userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser.email,
          'x-user-role': 'admin',
          'x-user-id': currentUser.id,
          'x-admin-name': currentUser.name,
        },
        body: JSON.stringify({
          status,
          reason: reason || (status === 'ACTIVE' ? 'Restored by administrator' : 'Moderation review'),
          targetUserName: targetUser?.name || 'User',
          targetUserEmail: targetUser?.email || '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update user status.' };
      }

      // Update in memory and local state
      setAllUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            accountStatus: status,
            statusReason: reason || (status === 'ACTIVE' ? 'Restored by administrator' : 'Moderation review'),
            statusUpdatedAt: new Date().toISOString(),
          };
        }
        return u;
      }));

      if (currentUser.id === userId) {
        setCurrentUser(prev => prev ? {
          ...prev,
          accountStatus: status,
          statusReason: reason,
          statusUpdatedAt: new Date().toISOString(),
        } : null);
      }

      await fetchAdminData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Network error updating user status.' };
    }
  }, [currentUser, isAdmin, allUsers, fetchAdminData]);

  // Admin action: Update report resolution status
  const adminUpdateReportStatus = useCallback(async (
    reportId: string,
    status: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED',
    resolutionNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !isAdmin) return { success: false, error: 'Unauthorized: Admin privileges required.' };

    try {
      const res = await fetch(`/api/admin/reports/${reportId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser.email,
          'x-user-role': 'admin',
          'x-user-id': currentUser.id,
          'x-admin-name': currentUser.name,
        },
        body: JSON.stringify({
          status,
          resolutionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update report status.' };
      }

      setUserReports(prev => prev.map(r => r.id === reportId ? {
        ...r,
        status,
        resolutionNotes: resolutionNotes || r.resolutionNotes,
        resolvedAt: (status === 'RESOLVED' || status === 'DISMISSED') ? new Date().toISOString() : undefined,
        resolvedBy: currentUser.email,
      } : r));

      await fetchAdminData();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error updating report status.' };
    }
  }, [currentUser, isAdmin, fetchAdminData]);

  // Sync user profile with server store
  useEffect(() => {
    if (currentUser) {
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUser),
      }).catch(err => console.warn('User backend sync notice:', err));
    }
  }, [currentUser]);


  // Comprehensive Unified Data Hydration & Polling (Local Backend & Supabase)
  const refreshAllPersistedData = useCallback(async (forcedCurrentUserId?: string) => {
    try {
      // 1. Fetch Users
      let mergedUsers: UserProfile[] = [];
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            mergedUsers = data.users.filter((u: any) => !isDemoUser(u));
          }
        }
      } catch (e) {
        // network notice
      }

      if (isSupabaseConfigured()) {
        try {
          const remoteUsers = await fetchSupabaseUsers();
          if (remoteUsers && remoteUsers.length > 0) {
            const cleanRemoteUsers = remoteUsers.filter(u => !isDemoUser(u));
            const userMap = new Map<string, UserProfile>();
            mergedUsers.forEach(u => userMap.set(u.id, u));
            cleanRemoteUsers.forEach(u => userMap.set(u.id, u));
            mergedUsers = Array.from(userMap.values());
            setIsCloudSynced(true);
          }
        } catch (e) {
          console.warn('Supabase users refresh notice:', e);
        }
      }

      if (mergedUsers.length > 0) {
        setAllUsers(prev => {
          const map = new Map<string, UserProfile>();
          prev.filter(u => !isDemoUser(u)).forEach(u => map.set(u.id, u));
          mergedUsers.forEach(u => map.set(u.id, u));
          return Array.from(map.values());
        });

        const activeId = forcedCurrentUserId || currentUser?.id;
        if (activeId) {
          const matching = mergedUsers.find(u => u.id === activeId);
          if (matching) {
            setCurrentUser(prev => prev ? { ...prev, ...matching } : matching);
          }
        }
      }

      // 2. Fetch Connections / Exchange Requests
      let mergedConnections: ConnectionRequest[] = [];
      try {
        const connRes = await fetch('/api/connections');
        if (connRes.ok) {
          const connData = await connRes.json();
          if (connData.success && Array.isArray(connData.connections)) {
            mergedConnections = connData.connections.filter((c: any) =>
              !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(c.senderId) &&
              !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(c.receiverId)
            );
          }
        }
      } catch (e) {
        // network notice
      }

      if (isSupabaseConfigured()) {
        try {
          const remoteConns = await fetchSupabaseConnections();
          if (remoteConns && remoteConns.length > 0) {
            const cleanRemoteConns = remoteConns.filter(c =>
              !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(c.senderId) &&
              !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(c.receiverId)
            );
            mergedConnections = deduplicateConnectionList([...mergedConnections, ...cleanRemoteConns]);
          }
        } catch (e) {
          console.warn('Supabase connections refresh notice:', e);
        }
      }

      if (mergedConnections.length > 0) {
        setConnections(prev => {
          const combined = deduplicateConnectionList([...mergedConnections, ...prev]);
          return combined;
        });
      }

      // 3. Fetch Messages
      let mergedMessages: ChatMessage[] = [];
      try {
        const msgRes = await fetch('/api/messages');
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          if (msgData.success && Array.isArray(msgData.messages)) {
            mergedMessages = msgData.messages.filter((m: any) =>
              !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(m.senderId) &&
              !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(m.receiverId)
            );
          }
        }
      } catch (e) {
        // network notice
      }

      if (isSupabaseConfigured()) {
        try {
          const remoteMsgs = await fetchSupabaseMessages();
          if (remoteMsgs && remoteMsgs.length > 0) {
            const cleanRemoteMsgs = remoteMsgs.filter(m =>
              !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(m.senderId) &&
              !['user_alex', 'user_elena', 'user_marcus', 'user_sarah', 'user_priya', 'user_david', 'user_liam'].includes(m.receiverId)
            );
            const msgMap = new Map<string, ChatMessage>();
            mergedMessages.forEach(m => msgMap.set(m.id, m));
            cleanRemoteMsgs.forEach(m => msgMap.set(m.id, m));
            mergedMessages = Array.from(msgMap.values());
          }
        } catch (e) {
          console.warn('Supabase messages refresh notice:', e);
        }
      }

      if (mergedMessages.length > 0) {
        setMessages(prev => {
          const msgMap = new Map<string, ChatMessage>();
          prev.forEach(m => msgMap.set(m.id, m));
          mergedMessages.forEach(m => msgMap.set(m.id, m));
          return Array.from(msgMap.values());
        });
      }
    } catch (err) {
      console.warn('Data sync cycle notice:', err);
    }
  }, [currentUser?.id]);

  // Initial load and periodic polling every 4 seconds
  useEffect(() => {
    refreshAllPersistedData();
    const interval = setInterval(() => {
      refreshAllPersistedData();
    }, 4000);

    const handleFocus = () => {
      refreshAllPersistedData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshAllPersistedData]);

  // Sync to localStorage for instant UI speed and offline resilience
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(allUsers));
    } catch (e) {
      console.warn('Storage sync failed', e);
    }
  }, [allUsers]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, currentUser.id);
      } else {
        localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      }
    } catch (e) {
      console.warn('Storage sync failed', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONNECTIONS_KEY, JSON.stringify(connections));
    } catch (e) {
      console.warn('Storage sync failed', e);
    }
  }, [connections]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Storage sync failed', e);
    }
  }, [messages]);

  // Listen to Supabase Auth state changes, Email Confirmations & Password Recovery redirects
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;

    // Check if recovery or signup token is in hash or query parameters
    const currentHash = window.location.hash || '';
    const currentSearch = window.location.search || '';

    if (currentHash.includes('type=recovery') || currentSearch.includes('type=recovery')) {
      setCurrentViewState('reset_password');
    }

    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentViewState('reset_password');
      } else if (event === 'SIGNED_IN' && session?.user) {
        const authUser = session.user;
        const userEmail = (authUser.email || '').trim().toLowerCase();
        if (userEmail) {
          try {
            const remoteUsers = await fetchSupabaseUsers();
            let matching = remoteUsers?.find(u => u.id === authUser.id || u.email.toLowerCase() === userEmail);

            const isAdminEmail = ADMIN_EMAILS.has(userEmail);

            // If no profile exists yet (e.g. confirmed via magic link from email), create initial profile
            if (!matching) {
              const userName = (authUser.user_metadata?.full_name || authUser.user_metadata?.name || signupDraft?.name || userEmail.split('@')[0] || 'Member').trim();
              const defaultAvatar = generateInitialsAvatar(userName);
              const newProfile: UserProfile = {
                id: authUser.id,
                name: userName,
                email: userEmail,
                titleOrRole: isAdminEmail ? 'Platform Administrator' : 'Skill Explorer & Peer Mentor',
                bio: '',
                avatarUrl: defaultAvatar,
                status: 'STUDENT',
                isProfileComplete: false,
                joinedDate: new Date().toISOString().split('T')[0],
                isVerified: true,
                offeredSkills: [],
                wantedSkills: [],
                contactPreference: 'Email',
                contactHandle: userEmail,
                professionalLinks: [],
                role: isAdminEmail ? 'admin' : 'user',
                accountStatus: 'ACTIVE'
              };

              try {
                await saveSupabaseUserProfile(newProfile);
              } catch (err) {
                console.warn('Auto profile create on email confirm notice:', err);
              }

              matching = newProfile;
              setAllUsers(prev => [newProfile, ...prev.filter(u => u.id !== authUser.id && u.email.toLowerCase() !== userEmail)]);
            }

            const enriched: UserProfile = { ...matching, role: isAdminEmail ? ('admin' as const) : matching.role };
            setCurrentUser(enriched);
            setSignupDraft(null);

            try {
              localStorage.setItem(STORAGE_CURRENT_USER_KEY, enriched.id);
            } catch {
              // ignore
            }

            // Route user smoothly to the right view if they arrived via email confirmation or login
            if (currentHash.includes('access_token') || currentHash.includes('type=signup') || currentHash.includes('type=email_change')) {
              if (isAdminEmail) {
                setAdminActiveTab('overview');
                setCurrentViewState('admin_dashboard');
              } else if (!enriched.isProfileComplete) {
                setCurrentViewState('profile_setup');
              } else {
                setCurrentViewState('my_skillmesh');
              }

              // Clean address bar hash without page reload
              try {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              } catch {
                // ignore
              }
            }
          } catch (e) {
            console.warn('Auth state sync notice:', e);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [ADMIN_EMAILS, signupDraft]);

  const updateSignupPassword = useCallback((password: string) => {
    setSignupDraft(prev => prev ? { ...prev, password } : null);
  }, []);

  const initiateSignup = async (name: string, email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim()) return { success: false, error: 'Please enter your full name.' };
    if (!email.trim() || !email.includes('@')) return { success: false, error: 'Please enter a valid email address.' };
    if (!password || password.length < 6) return { success: false, error: 'Password must be at least 6 characters long.' };

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Enforce strict One Email = One Account via Supabase check
    if (isSupabaseConfigured()) {
      try {
        const isRegistered = await isEmailRegisteredInSupabase(cleanEmail);
        if (isRegistered) {
          return { success: false, error: 'An account with this email already exists. Please log in instead or use Forgot Password.' };
        }
      } catch (err) {
        console.warn('Supabase email duplicate check notice:', err);
      }
    }

    // 2. Check local users store to ensure no duplicate
    const existingLocal = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingLocal) {
      return { success: false, error: 'An account with this email already exists. Please log in instead or use Forgot Password.' };
    }

    // 3. Save draft details for verification
    const initialDraft: SignupDraft = {
      name: cleanName,
      email: cleanEmail,
      password: password,
    };
    setSignupDraft(initialDraft);
    try {
      localStorage.setItem('skillmesh_pending_signup_draft', JSON.stringify(initialDraft));
    } catch {}

    // 4. Send secure 6-digit OTP to user's email inbox
    try {
      const sendRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, name: cleanName }),
      });
      const sendData = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok && sendRes.status !== 429) {
        console.warn('[AppContext] Warning from /api/auth/send-otp:', sendData?.error);
      }
    } catch (sendErr) {
      console.warn('[AppContext] Failed to trigger /api/auth/send-otp:', sendErr);
    }

    // 5. Advance smoothly to OTP verification screen
    handleSetCurrentView('otp_verify');
    return { success: true };
  };

  const resendOTP = async (emailOverride?: string, nameOverride?: string): Promise<{ success: boolean; error?: string }> => {
    const targetEmail = (emailOverride || signupDraft?.email || '').trim().toLowerCase();
    const targetName = (nameOverride || signupDraft?.name || '').trim();

    if (!targetEmail) {
      return { success: false, error: 'No signup in progress. Please enter your email.' };
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, name: targetName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to resend code.' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to resend verification code. Please check your connection.' };
    }
  };

  const verifyOTP = async (code: string, passwordOverride?: string): Promise<{ success: boolean; error?: string }> => {
    if (!signupDraft || !signupDraft.email) {
      return { success: false, error: 'Signup session expired. Please restart signup.' };
    }

    const cleanEmail = signupDraft.email.trim().toLowerCase();
    const cleanOtp = code.trim();
    const finalPassword = passwordOverride || signupDraft.password;

    let authUserId = '';

    // 1. First attempt verification via custom backend Brevo OTP store
    try {
      const backendRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanOtp,
          password: finalPassword,
          name: signupDraft.name,
        }),
      });
      const backendData = await backendRes.json();

      if (backendRes.ok && backendData.success) {
        authUserId = backendData.user?.id || '';
      } else if (backendData?.error) {
        return {
          success: false,
          error: backendData.error,
        };
      } else {
        // 2. If no custom OTP record found, try verifying via Supabase Auth OTP as fallback
        const verifyRes = await verifySupabaseAuthOtp(cleanEmail, cleanOtp);
        if (verifyRes.success && verifyRes.user) {
          authUserId = verifyRes.user.id;
        } else {
          return {
            success: false,
            error: verifyRes.error || 'Invalid or expired verification code. Please check your email and try again.',
          };
        }
      }
    } catch (netErr: any) {
      // Fallback to Supabase Auth OTP
      const verifyRes = await verifySupabaseAuthOtp(cleanEmail, cleanOtp);
      if (verifyRes.success && verifyRes.user) {
        authUserId = verifyRes.user.id;
      } else {
        return {
          success: false,
          error: verifyRes.error || 'Invalid or expired verification code. Please check your email and try again.',
        };
      }
    }

    // Ensure fallback user ID if not returned
    if (!authUserId) {
      authUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    // 3. Try to establish active Supabase Auth session via signInWithSupabaseAuth
    if (finalPassword && finalPassword.length >= 6) {
      try {
        await signInWithSupabaseAuth(cleanEmail, finalPassword);
      } catch (signInErr) {
        console.warn('Sign-in after OTP notice:', signInErr);
      }
    }

    // 4. Construct genuine user profile in Supabase PostgreSQL
    const isAdminEmail = ADMIN_EMAILS.has(cleanEmail);
    const defaultAvatar = generateInitialsAvatar(signupDraft.name.trim());
    const newUser: UserProfile = {
      id: authUserId,
      name: signupDraft.name.trim(),
      email: cleanEmail,
      titleOrRole: 'Skill Explorer & Peer Mentor',
      bio: '',
      avatarUrl: defaultAvatar,
      status: 'STUDENT',
      isProfileComplete: false,
      joinedDate: new Date().toISOString().split('T')[0],
      isVerified: true,
      offeredSkills: [],
      wantedSkills: [],
      contactPreference: 'Email',
      contactHandle: cleanEmail,
      professionalLinks: [],
      role: isAdminEmail ? 'admin' : 'user',
      accountStatus: 'ACTIVE'
    };

    if (isSupabaseConfigured()) {
      try {
        await saveSupabaseUserProfile(newUser);
      } catch (err) {
        console.warn('Supabase profile creation notice:', err);
      }
    }

    setAllUsers(prev => [newUser, ...prev.filter(u => u.id !== authUserId && u.email.toLowerCase() !== cleanEmail)]);
    setCurrentUser(newUser);
    setSignupDraft(null);

    try {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, newUser.id);
    } catch {
      // ignore
    }

    if (isAdminEmail) {
      setAdminActiveTab('overview');
      handleSetCurrentView('admin_dashboard');
    } else {
      handleSetCurrentView('profile_setup');
    }

    return { success: true };
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email.trim() || !password) {
      return { success: false, error: 'Please provide both email and password.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Authenticate with Supabase Auth
    const authRes = await signInWithSupabaseAuth(cleanEmail, password);
    if (!authRes.success || !authRes.user) {
      // Check if user is registered in Supabase
      const isReg = await isEmailRegisteredInSupabase(cleanEmail);
      if (!isReg) {
        return { success: false, error: 'No account found for this email. Please create an account.' };
      }
      return { 
        success: false, 
        error: 'Incorrect password. If you forgot your password, please click "Forgot Password?" below to reset it.' 
      };
    }

    const authUser = authRes.user;
    const isUserAdmin = ADMIN_EMAILS.has(cleanEmail);

    // 2. Fetch user profile from Supabase PostgreSQL
    let userProfile: UserProfile | null = null;
    try {
      const remoteUsers = await fetchSupabaseUsers();
      if (remoteUsers && remoteUsers.length > 0) {
        const matching = remoteUsers.find(u => u.id === authUser.id || u.email.toLowerCase() === cleanEmail);
        if (matching) {
          userProfile = { 
            ...matching, 
            id: authUser.id,
            role: isUserAdmin ? 'admin' : (matching.role || 'user') 
          };
        }
      }
    } catch (err) {
      console.warn('Supabase user profile fetch error during login:', err);
    }

    // If profile not yet created in PostgreSQL table, create one from Auth user data
    if (!userProfile) {
      const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Member';
      userProfile = {
        id: authUser.id,
        name,
        email: cleanEmail,
        titleOrRole: 'Skill Explorer & Peer Mentor',
        bio: '',
        avatarUrl: generateInitialsAvatar(name),
        status: 'STUDENT',
        isProfileComplete: false,
        joinedDate: new Date().toISOString().split('T')[0],
        isVerified: true,
        offeredSkills: [],
        wantedSkills: [],
        contactPreference: 'Email',
        contactHandle: cleanEmail,
        professionalLinks: [],
        role: isUserAdmin ? 'admin' : 'user',
        accountStatus: 'ACTIVE'
      };
      if (isSupabaseConfigured()) {
        await saveSupabaseUserProfile(userProfile).catch(err => console.warn('Supabase profile save on login:', err));
      }
    } else {
      if (isSupabaseConfigured()) {
        await saveSupabaseUserProfile(userProfile).catch(err => console.warn('Supabase profile save on login:', err));
      }
    }

    setAllUsers(prev => [userProfile!, ...prev.filter(u => u.id !== userProfile!.id && u.email.toLowerCase() !== cleanEmail)]);
    setCurrentUser(userProfile);

    try {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, userProfile.id);
    } catch {
      // ignore
    }

    // Refresh all data from Supabase for this logged in user
    refreshAllPersistedData(userProfile.id).catch(err => console.warn('Login refresh notice:', err));

    if (isUserAdmin) {
      setAdminActiveTab('overview');
      handleSetCurrentView('admin_dashboard');
    } else if (!userProfile.isProfileComplete && (!userProfile.offeredSkills || userProfile.offeredSkills.length === 0)) {
      handleSetCurrentView('profile_setup');
    } else {
      handleSetCurrentView('my_skillmesh');
    }

    return { success: true };
  };

  const logout = () => {
    signOutSupabaseAuth().catch(err => console.warn('Supabase sign out notice:', err));
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    } catch (e) {
      console.warn('Failed to clear current user from storage:', e);
    }
    handleSetCurrentView('landing');
  };

  const openUserProfile = (userOrId: UserProfile | string) => {
    let targetId = '';
    let targetUser: UserProfile | null = null;
    if (typeof userOrId === 'string') {
      targetId = userOrId.trim();
      targetUser = allUsers.find(u => u.id === targetId) || null;
    } else if (userOrId && userOrId.id) {
      targetId = userOrId.id;
      targetUser = userOrId;
    }

    if (!targetId) return;

    setSelectedProfileUserId(targetId);
    if (targetUser) {
      setSelectedMatchUser(targetUser);
      if (currentUser) {
        const match = calculateUserMatch(currentUser, targetUser);
        setSelectedMatchResult(match);
      } else {
        setSelectedMatchResult(null);
      }
    } else {
      setSelectedMatchUser(null);
      setSelectedMatchResult(null);
    }

    // Push URL state: /profile/:userId
    try {
      if (window.location.pathname !== `/profile/${targetId}`) {
        window.history.pushState({ view: 'profile_detail', userId: targetId }, '', `/profile/${targetId}`);
      }
    } catch (e) {
      // ignore
    }

    handleSetCurrentView('profile_detail');
  };

  const handleBackFromProfile = () => {
    const dest = previousViewRef.current && previousViewRef.current !== 'profile_detail'
      ? previousViewRef.current
      : (currentUser ? 'matches' : 'landing');
    try {
      if (window.location.pathname.startsWith('/profile/')) {
        window.history.pushState({ view: dest }, '', '/');
      }
    } catch (e) {
      // ignore
    }
    handleSetCurrentView(dest);
  };

  const saveProfileBasicInfo = (
    paramsOrName: ProfileUpdateParams | string,
    titleOrRole?: string,
    bio?: string,
    avatarUrl?: string,
    location?: string
  ) => {
    if (!currentUser) return;

    let updated: UserProfile;
    if (typeof paramsOrName === 'object') {
      const p = paramsOrName;
      const professionalLinks = [];
      if (p.linkedinUrl) professionalLinks.push({ platform: 'linkedin' as const, url: p.linkedinUrl, label: 'LinkedIn' });
      if (p.githubUrl) professionalLinks.push({ platform: 'github' as const, url: p.githubUrl, label: 'GitHub' });
      if (p.portfolioUrl) professionalLinks.push({ platform: 'portfolio' as const, url: p.portfolioUrl, label: 'Portfolio' });

      updated = {
        ...currentUser,
        name: p.displayName?.trim() || currentUser.name,
        titleOrRole: p.titleOrRole?.trim() || currentUser.titleOrRole,
        bio: p.bio?.trim() || currentUser.bio,
        avatarUrl: p.avatarUrl || currentUser.avatarUrl,
        status: p.status || currentUser.status,
        institutionName: p.status === 'STUDENT' ? p.institutionName?.trim() : undefined,
        organizationName: p.status === 'WORKING_PROFESSIONAL' ? p.organizationName?.trim() : undefined,
        occupationDetails: p.status === 'OTHER' ? p.occupationDetails?.trim() : undefined,
        location: p.location?.trim() || currentUser.location,
        linkedinUrl: p.linkedinUrl?.trim() || undefined,
        githubUrl: p.githubUrl?.trim() || undefined,
        portfolioUrl: p.portfolioUrl?.trim() || undefined,
        matchPurposes: p.matchPurposes || currentUser.matchPurposes,
        collaborationInterests: p.collaborationInterests || currentUser.collaborationInterests,
        activeProjectDescription: p.activeProjectDescription !== undefined ? p.activeProjectDescription?.trim() : currentUser.activeProjectDescription,
        professionalLinks: professionalLinks.length > 0 ? professionalLinks : currentUser.professionalLinks,
        isProfileComplete: true
      };
    } else {
      updated = {
        ...currentUser,
        name: paramsOrName || currentUser.name,
        titleOrRole: titleOrRole || currentUser.titleOrRole,
        bio: bio || currentUser.bio,
        avatarUrl: avatarUrl || currentUser.avatarUrl,
        location: location || currentUser.location
      };
    }

    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));

    if (isSupabaseConfigured()) {
      saveSupabaseUserProfile(updated).catch(err => console.warn('Supabase save error:', err));
    }
  };

  const addOfferedSkill = (skillData: Omit<OfferedSkill, 'id'>) => {
    if (!currentUser) return;
    const newSkill: OfferedSkill = {
      ...skillData,
      id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    const updated: UserProfile = {
      ...currentUser,
      offeredSkills: [...currentUser.offeredSkills, newSkill]
    };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));

    if (isSupabaseConfigured()) {
      saveSupabaseOfferedSkill(currentUser.id, newSkill).catch(err => console.warn('Supabase skill add error:', err));
    }
  };

  const removeOfferedSkill = (skillId: string) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      offeredSkills: currentUser.offeredSkills.filter(s => s.id !== skillId)
    };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));

    if (isSupabaseConfigured()) {
      deleteSupabaseOfferedSkill(skillId).catch(err => console.warn('Supabase skill remove error:', err));
    }
  };

  const addWantedSkill = (skillData: Omit<WantedSkill, 'id'>) => {
    if (!currentUser) return;
    const newSkill: WantedSkill = {
      ...skillData,
      id: `want_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    const updated: UserProfile = {
      ...currentUser,
      wantedSkills: [...currentUser.wantedSkills, newSkill]
    };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));

    if (isSupabaseConfigured()) {
      saveSupabaseWantedSkill(currentUser.id, newSkill).catch(err => console.warn('Supabase want add error:', err));
    }
  };

  const removeWantedSkill = (skillId: string) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      wantedSkills: currentUser.wantedSkills.filter(s => s.id !== skillId)
    };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));

    if (isSupabaseConfigured()) {
      deleteSupabaseWantedSkill(skillId).catch(err => console.warn('Supabase want remove error:', err));
    }
  };

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Save blocked users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BLOCKED_KEY, JSON.stringify(blockedUsers));
    } catch {
      // ignore
    }
  }, [blockedUsers]);

  // Save reports to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(userReports));
    } catch {
      // ignore
    }
  }, [userReports]);

  // Safety checks & Signal Evaluation
  const isUserBlockedByMe = useCallback((userId: string): boolean => {
    if (!currentUser) return false;
    return blockedUsers.some(b => b.blockerId === currentUser.id && b.blockedUserId === userId);
  }, [currentUser, blockedUsers]);

  const isUserBlocked = useCallback((userId: string): boolean => {
    if (!currentUser) return false;
    return blockedUsers.some(
      b => (b.blockerId === currentUser.id && b.blockedUserId === userId) ||
           (b.blockerId === userId && b.blockedUserId === currentUser.id)
    );
  }, [currentUser, blockedUsers]);

  const getUserSafetyStatus = useCallback((userId: string): UserSafetySignalSummary => {
    return evaluateUserSafety(userId, blockedUsers, userReports);
  }, [blockedUsers, userReports]);

  const isUserSuspended = useCallback((userId: string): boolean => {
    const safety = evaluateUserSafety(userId, blockedUsers, userReports);
    return safety.status === 'SUSPENDED' || safety.status === 'BANNED';
  }, [blockedUsers, userReports]);

  const isCurrentUserBanned = useMemo((): boolean => {
    if (!currentUser) return false;
    return currentUser.accountStatus === 'BANNED';
  }, [currentUser]);

  const isCurrentUserSuspended = useMemo((): boolean => {
    if (!currentUser) return false;
    if (currentUser.accountStatus === 'SUSPENDED' || currentUser.accountStatus === 'BANNED') return true;
    return isUserSuspended(currentUser.id);
  }, [currentUser, isUserSuspended]);

  const endExchange = (connectionId: string, reason?: string) => {
    if (!currentUser) return { success: false, error: 'You must be signed in to manage exchanges.' };
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return { success: false, error: 'Exchange connection not found.' };

    const isParticipant = conn.senderId === currentUser.id || conn.receiverId === currentUser.id;
    if (!isParticipant) {
      return { success: false, error: 'Unauthorized: You are not part of this exchange.' };
    }

    const updatedConn: ConnectionRequest = {
      ...conn,
      status: 'ENDED',
      endedAt: new Date().toISOString(),
      endedBy: currentUser.id,
      endReason: reason || 'Ended by user'
    };

    setConnections(prev => prev.map(c => c.id === connectionId ? updatedConn : c));

    // Backend persistent storage sync
    fetch(`/api/connections/${connectionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endedBy: currentUser.id, endReason: reason || 'Ended by user' })
    }).catch(err => console.warn('End connection backend sync notice:', err));

    if (isSupabaseConfigured()) {
      updateSupabaseConnectionStatus(connectionId, 'ENDED').catch(err => console.warn('Supabase end exchange error:', err));
    }

    return { success: true };
  };

  const blockUser = (userIdToBlock: string, reason?: string) => {
    if (!currentUser) return { success: false, error: 'You must be signed in to block users.' };
    if (currentUser.id === userIdToBlock) return { success: false, error: 'You cannot block yourself.' };

    const targetUser = allUsers.find(u => u.id === userIdToBlock);
    const targetName = targetUser?.name || 'Peer';

    const newBlock: BlockRecord = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blockerId: currentUser.id,
      blockedUserId: userIdToBlock,
      blockedUserName: targetName,
      createdAt: new Date().toISOString(),
      reason
    };

    setBlockedUsers(prev => {
      const exists = prev.some(b => b.blockerId === currentUser.id && b.blockedUserId === userIdToBlock);
      if (exists) return prev;
      return [newBlock, ...prev];
    });

    // Close and terminate any active or pending exchanges between them immediately
    setConnections(prev => prev.map(c => {
      const isBetweenUsers = (c.senderId === currentUser.id && c.receiverId === userIdToBlock) ||
                             (c.senderId === userIdToBlock && c.receiverId === currentUser.id);
      if (isBetweenUsers && (c.status === 'ACCEPTED' || c.status === 'PENDING')) {
        return {
          ...c,
          status: 'BLOCKED' as const,
          endedAt: new Date().toISOString(),
          endedBy: currentUser.id,
          endReason: 'User blocked'
        };
      }
      return c;
    }));

    if (isSupabaseConfigured()) {
      saveSupabaseBlockRecord(newBlock).catch(err => console.warn('Supabase block record error:', err));
      connections.forEach(c => {
        const isBetweenUsers = (c.senderId === currentUser.id && c.receiverId === userIdToBlock) ||
                               (c.senderId === userIdToBlock && c.receiverId === currentUser.id);
        if (isBetweenUsers && (c.status === 'ACCEPTED' || c.status === 'PENDING')) {
          updateSupabaseConnectionStatus(c.id, 'BLOCKED').catch(err => console.warn('Supabase status error:', err));
        }
      });
    }

    // Sync to backend safety store
    fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBlock)
    }).catch(err => console.warn('Block sync notice:', err));

    // If currently chatting with this user, reset active chat
    if (activeChatConnectionId) {
      const currentChatConn = connections.find(c => c.id === activeChatConnectionId);
      if (currentChatConn && (currentChatConn.senderId === userIdToBlock || currentChatConn.receiverId === userIdToBlock)) {
        setActiveChatConnectionId(null);
        handleSetCurrentView('active_exchanges');
      }
    }

    return { success: true };
  };

  const unblockUser = (userIdToUnblock: string) => {
    if (!currentUser) return { success: false, error: 'You must be signed in.' };
    setBlockedUsers(prev => prev.filter(b => !(b.blockerId === currentUser.id && b.blockedUserId === userIdToUnblock)));
    
    if (isSupabaseConfigured()) {
      deleteSupabaseBlockRecord(currentUser.id, userIdToUnblock).catch(err => console.warn('Supabase unblock error:', err));
    }
    return { success: true };
  };

  const reportUser = (
    reportedUserId: string,
    reason: ReportReason,
    reasonLabel: string,
    description: string = '',
    connectionId?: string
  ) => {
    if (!currentUser) return { success: false, error: 'You must be signed in to submit a report.' };

    // Prevent identical duplicate spamming from the same user in quick succession
    const isRecentDuplicate = userReports.some(
      r => r.reporterId === currentUser.id &&
           r.reportedUserId === reportedUserId &&
           r.reason === reason &&
           (Date.now() - new Date(r.createdAt).getTime() < 30000)
    );
    if (isRecentDuplicate) {
      return { success: true };
    }

    const targetUser = allUsers.find(u => u.id === reportedUserId);
    const targetName = targetUser?.name || 'Peer';

    const newReport: UserReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reportedUserId,
      reportedUserName: targetName,
      reason,
      reasonLabel,
      description: description.trim(),
      connectionId,
      createdAt: new Date().toISOString(),
      status: 'PENDING_REVIEW'
    };

    setUserReports(prev => [newReport, ...prev]);

    if (isSupabaseConfigured()) {
      saveSupabaseUserReport(newReport).catch(err => console.warn('Supabase report saving error:', err));
    }

    // Sync report to backend
    fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReport)
    }).catch(err => console.warn('Report sync notice:', err));

    return { success: true };
  };

  // Connection helper queries
  const getActiveConnectionWithUser = (otherUserId: string): ConnectionRequest | null => {
    if (!currentUser) return null;
    return connections.find(
      c => ((c.senderId === currentUser.id && c.receiverId === otherUserId) ||
            (c.senderId === otherUserId && c.receiverId === currentUser.id)) &&
           c.status === 'ACCEPTED'
    ) || null;
  };

  const getPendingRequestWithUser = (otherUserId: string): { request: ConnectionRequest; isIncoming: boolean; isOutgoing: boolean } | null => {
    if (!currentUser) return null;
    const req = connections.find(
      c => ((c.senderId === currentUser.id && c.receiverId === otherUserId) ||
            (c.senderId === otherUserId && c.receiverId === currentUser.id)) &&
           c.status === 'PENDING'
    );
    if (!req) return null;
    return {
      request: req,
      isIncoming: req.receiverId === currentUser.id,
      isOutgoing: req.senderId === currentUser.id
    };
  };

  const openChatWithUser = (otherUserId: string): boolean => {
    if (!currentUser) return false;
    const active = getActiveConnectionWithUser(otherUserId);
    if (active) {
      return openChatForConnection(active.id);
    }
    return false;
  };

  const sendConnectionRequest = (
    receiverId: string,
    offeredSkillName: string,
    wantedSkillName: string,
    note: string = '',
    requestType: ConnectionRequestType = 'MUTUAL_EXCHANGE',
    isKnowledgeSharing = false,
    isProjectCollaboration = false,
    collaborationDetails?: { projectTitle?: string; lookingFor?: string; whyConnect?: string; }
  ) => {
    if (!currentUser) return { success: false, error: 'You must be logged in to send a connection request.' };
    
    if (isCurrentUserSuspended) {
      return { success: false, error: 'Your account is temporarily suspended from sending new exchange requests pending safety review.' };
    }

    if (isUserSuspended(receiverId)) {
      return { success: false, error: 'This user is currently unable to receive new exchange proposals.' };
    }

    if (isUserBlocked(receiverId)) {
      return { success: false, error: 'Interaction with this user is unavailable due to safety settings.' };
    }

    const receiver = allUsers.find(u => u.id === receiverId);
    if (!receiver) return { success: false, error: 'Recipient user was not found.' };

    // 1. Check if an active exchange already exists between the two users in either direction
    const existingActive = connections.find(
      c => ((c.senderId === currentUser.id && c.receiverId === receiverId) ||
            (c.senderId === receiverId && c.receiverId === currentUser.id)) &&
           c.status === 'ACCEPTED'
    );
    if (existingActive) {
      return { success: false, error: 'You already have an active connection with this user.' };
    }

    // 2. Check if a pending exchange request already exists between the two users in either direction
    const existingPending = connections.find(
      c => ((c.senderId === currentUser.id && c.receiverId === receiverId) ||
            (c.senderId === receiverId && c.receiverId === currentUser.id)) &&
           c.status === 'PENDING'
    );
    if (existingPending) {
      if (existingPending.senderId === currentUser.id) {
        return { success: false, error: 'You already have an active pending request sent to this user.' };
      } else {
        return { success: false, error: 'This user has already sent you a connection request. Please review and respond to their proposal in Requests.' };
      }
    }

    // 3. Create canonical connection ID for this user pair to prevent any duplicate creation
    const pairKey = [currentUser.id, receiver.id].sort().join('_');
    const newRequestId = `conn_${pairKey}`;

    const newRequest: ConnectionRequest = {
      id: newRequestId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: receiver.id,
      receiverName: receiver.name,
      offeredSkillName,
      wantedSkillName,
      note,
      contactMethod: 'In-App Chat',
      contactValue: '',
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      requestType: isProjectCollaboration ? 'PROJECT_COLLABORATION' : requestType,
      isKnowledgeSharing: isKnowledgeSharing && !isProjectCollaboration,
      isProjectCollaboration,
      collaborationDetails
    };

    setConnections(prev => {
      // Remove any historical/stale records between these exact two users
      const filtered = prev.filter(c => 
        !((c.senderId === currentUser.id && c.receiverId === receiverId) ||
          (c.senderId === receiverId && c.receiverId === currentUser.id))
      );
      return deduplicateConnectionList([newRequest, ...filtered]);
    });

    // Backend persistent storage sync
    fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest),
    }).catch(err => console.warn('Connection request backend sync notice:', err));

    if (isSupabaseConfigured()) {
      createSupabaseConnection(newRequest).catch(err => console.warn('Supabase connection creation error:', err));
    }

    return { success: true };
  };

  const acceptConnection = (connectionId: string) => {
    if (isCurrentUserSuspended) return;

    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return;

    const userA = conn.senderId;
    const userB = conn.receiverId;
    const otherUserId = userA === currentUser?.id ? userB : userA;

    if (isUserBlocked(otherUserId) || isUserSuspended(otherUserId)) {
      return;
    }

    let acceptedConnId = conn.id;

    setConnections(prev => {
      // Find all connections between these two users
      const isPair = (c: ConnectionRequest) => 
        (c.senderId === userA && c.receiverId === userB) ||
        (c.senderId === userB && c.receiverId === userA);

      const withoutPair = prev.filter(c => !isPair(c));
      const acceptedRecord: ConnectionRequest = {
        ...conn,
        status: 'ACCEPTED'
      };
      acceptedConnId = acceptedRecord.id;

      return deduplicateConnectionList([acceptedRecord, ...withoutPair]);
    });

    // Backend persistent storage sync
    fetch(`/api/connections/${connectionId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.warn('Accept connection backend sync notice:', err));

    if (isSupabaseConfigured()) {
      updateSupabaseConnectionStatus(connectionId, 'ACCEPTED').catch(err => console.warn('Supabase accept error:', err));
    }

    // Direct active chat channel to this accepted exchange
    setActiveChatConnectionId(acceptedConnId);
  };

  const declineConnection = (connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return;

    const userA = conn.senderId;
    const userB = conn.receiverId;

    setConnections(prev => {
      const isPair = (c: ConnectionRequest) => 
        (c.senderId === userA && c.receiverId === userB) ||
        (c.senderId === userB && c.receiverId === userA);

      const withoutPair = prev.filter(c => !isPair(c));
      const declinedRecord: ConnectionRequest = {
        ...conn,
        status: 'DECLINED'
      };

      return deduplicateConnectionList([declinedRecord, ...withoutPair]);
    });

    // Backend persistent storage sync
    fetch(`/api/connections/${connectionId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.warn('Decline connection backend sync notice:', err));

    if (isSupabaseConfigured()) {
      updateSupabaseConnectionStatus(connectionId, 'DECLINED').catch(err => console.warn('Supabase decline error:', err));
    }
  };

  const upgradeExchangeToCollaboration = (
    connectionId: string, 
    details: { projectTitle: string; lookingFor?: string; whyConnect?: string }
  ): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return { success: false, error: 'Connection not found.' };

    const isParticipant = conn.senderId === currentUser.id || conn.receiverId === currentUser.id;
    if (!isParticipant) return { success: false, error: 'Unauthorized.' };

    const updatedConn: ConnectionRequest = {
      ...conn,
      requestType: 'PROJECT_COLLABORATION',
      isProjectCollaboration: true,
      collaborationDetails: {
        projectTitle: details.projectTitle.trim() || 'Collaborative Project',
        lookingFor: details.lookingFor || conn.wantedSkillName || 'Project Skills',
        whyConnect: details.whyConnect || conn.note || 'Project collaboration proposed'
      }
    };

    setConnections(prev => prev.map(c => c.id === connectionId ? updatedConn : c));

    // Send backend sync
    fetch(`/api/connections/${connectionId}/upgrade-collaboration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaborationDetails: updatedConn.collaborationDetails })
    }).catch(err => console.warn('Upgrade collaboration server sync notice:', err));

    return { success: true };
  };

  // Secure Chat: Only allows opening chat if the connection is accepted and current user is a participant
  const openChatForConnection = (connectionId: string): boolean => {
    if (!currentUser) return false;
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return false;
    
    const otherUserId = conn.senderId === currentUser.id ? conn.receiverId : conn.senderId;
    if (isUserBlocked(otherUserId)) {
      return false;
    }

    const isParticipant = conn.senderId === currentUser.id || conn.receiverId === currentUser.id;
    if (!isParticipant || conn.status !== 'ACCEPTED') {
      return false;
    }

    setActiveChatConnectionId(connectionId);
    handleSetCurrentView('chat');
    return true;
  };

  // Send message in private 1-on-1 chat
  const sendMessage = (
    connectionId: string,
    text: string,
    attachments?: ChatAttachment[]
  ): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'User is not authenticated.' };

    if (isCurrentUserSuspended) {
      return { success: false, error: 'Your account interactions are temporarily suspended pending safety review.' };
    }

    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return { success: false, error: 'Exchange connection not found.' };

    const otherUserId = conn.senderId === currentUser.id ? conn.receiverId : conn.senderId;

    if (isUserSuspended(otherUserId)) {
      return { success: false, error: 'This user is currently unable to send or receive messages.' };
    }

    if (isUserBlocked(otherUserId)) {
      return { success: false, error: 'Cannot send message. Communication between these users has been blocked.' };
    }

    const isParticipant = conn.senderId === currentUser.id || conn.receiverId === currentUser.id;
    if (!isParticipant) {
      return { success: false, error: 'Unauthorized: You are not a member of this private exchange.' };
    }

    if (conn.status !== 'ACCEPTED') {
      return { success: false, error: 'Private chat is closed or locked for this exchange.' };
    }

    if (!text.trim() && (!attachments || attachments.length === 0)) {
      return { success: false, error: 'Message cannot be empty.' };
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      connectionId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: otherUserId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      attachments: attachments && attachments.length > 0 ? attachments : undefined
    };

    setMessages(prev => [...prev, newMessage]);

    // Backend persistent storage sync
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMessage)
    }).catch(err => console.warn('Message backend sync notice:', err));

    if (isSupabaseConfigured()) {
      saveSupabaseMessage(newMessage).catch(err => console.warn('Supabase message save notice:', err));
    }

    return { success: true };
  };

  const updateMentorshipSchedule = useCallback((schedule: MentorshipSchedule) => {
    if (!currentUser) return;
    const updatedUser: UserProfile = {
      ...currentUser,
      mentorshipSchedule: schedule,
    };
    setCurrentUser(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (isSupabaseConfigured()) {
      saveSupabaseUserProfile(updatedUser).catch(err => console.warn('Supabase schedule save error:', err));
    }
  }, [currentUser]);

  const bookMentorshipSession = useCallback((params: {
    mentorId: string;
    mentorName: string;
    mentorAvatar?: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    format: SessionFormat;
    topic: string;
    notes?: string;
  }) => {
    if (!currentUser) return { success: false, error: 'Please log in to book a mentorship session.' };
    if (currentUser.id === params.mentorId) return { success: false, error: 'You cannot book a mentorship session with yourself.' };

    const newSession: ScheduledSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mentorId: params.mentorId,
      mentorName: params.mentorName,
      mentorAvatar: params.mentorAvatar,
      menteeId: currentUser.id,
      menteeName: currentUser.name,
      menteeAvatar: currentUser.avatarUrl,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      durationMinutes: params.durationMinutes,
      format: params.format,
      topic: params.topic,
      notes: params.notes,
      meetingUrl: 'https://meet.google.com/new',
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    setScheduledSessions(prev => [newSession, ...prev]);

    // Ensure connection is requested or established
    const existingConn = connections.find(c =>
      (c.senderId === currentUser.id && c.receiverId === params.mentorId) ||
      (c.senderId === params.mentorId && c.receiverId === currentUser.id)
    );

    if (!existingConn) {
      sendConnectionRequest(
        params.mentorId,
        params.topic,
        'Live Mentorship & Skill Sharing',
        `Booked a live ${params.durationMinutes}-min mentorship session for ${params.date} at ${params.startTime}. Notes: ${params.notes || 'Looking forward to our session!'}`,
        'KNOWLEDGE_SHARING'
      );
    }

    return { success: true, session: newSession };
  }, [currentUser, connections, sendConnectionRequest]);

  const updateSessionStatus = useCallback((sessionId: string, status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED', reason?: string) => {
    setScheduledSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          status,
          cancelledReason: reason || s.cancelledReason
        };
      }
      return s;
    }));
  }, []);

  // -------------------------------------------------------------
  // Live Availability State & Methods
  // -------------------------------------------------------------
  const [allAvailabilities, setAllAvailabilities] = useState<Record<string, UserLiveAvailability>>({});

  const currentUserAvailability = useMemo<UserLiveAvailability | null>(() => {
    if (!currentUser) return null;
    return allAvailabilities[currentUser.id] || {
      userId: currentUser.id,
      status: (currentUser.availabilityStatus as LiveAvailabilityStatus) || 'AVAILABLE',
      mode: (currentUser.availabilityMode as LiveAvailabilityMode) || 'BOTH',
      timezone: currentUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      updatedAt: new Date().toISOString()
    };
  }, [currentUser, allAvailabilities]);

  const loadAvailabilities = useCallback(async () => {
    try {
      const res = await apiGetAllAvailabilities();
      if (res) {
        setAllAvailabilities(res);
      }
    } catch (err) {
      console.warn('Failed to load live availabilities:', err);
    }
  }, []);

  const toggleAvailability = useCallback(async (status: LiveAvailabilityStatus, mode: LiveAvailabilityMode = 'BOTH', customStatus?: string) => {
    if (!currentUser) return;
    const tz = currentUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    try {
      const res = await apiUpdateAvailability(currentUser.id, status, mode, tz, customStatus);
      if (res.success && res.availability) {
        setAllAvailabilities(prev => ({
          ...prev,
          [currentUser.id]: res.availability!
        }));
        const updated: UserProfile = {
          ...currentUser,
          availabilityStatus: status,
          availabilityMode: mode,
          timezone: tz,
        };
        setCurrentUser(updated);
        setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
        if (isSupabaseConfigured()) {
          saveSupabaseUserProfile(updated).catch(e => console.warn(e));
        }
      }
    } catch (err) {
      console.warn('Error toggling availability:', err);
    }
  }, [currentUser]);

  const getUserAvailabilityStatus = useCallback((userId: string) => {
    if (allAvailabilities[userId]) {
      const a = allAvailabilities[userId];
      return {
        status: a.status,
        mode: a.mode,
        timezone: a.timezone,
        customStatus: a.customStatus,
        updatedAt: a.updatedAt
      };
    }
    const u = allUsers.find(user => user.id === userId);
    return {
      status: ((u?.availabilityStatus as LiveAvailabilityStatus) || 'AVAILABLE'),
      mode: ((u?.availabilityMode as LiveAvailabilityMode) || 'BOTH'),
      timezone: u?.timezone || 'UTC',
      updatedAt: undefined
    };
  }, [allAvailabilities, allUsers]);

  const updateUserTimezone = useCallback(async (tz: string) => {
    if (!currentUser) return;
    const updated: UserProfile = { ...currentUser, timezone: tz };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    if (isSupabaseConfigured()) {
      saveSupabaseUserProfile(updated).catch(e => console.warn(e));
    }
    if (allAvailabilities[currentUser.id]) {
      const cur = allAvailabilities[currentUser.id];
      await toggleAvailability(cur.status, cur.mode, cur.customStatus);
    }
  }, [currentUser, allAvailabilities, toggleAvailability]);

  // -------------------------------------------------------------
  // Peer Mentorship State & Methods
  // -------------------------------------------------------------
  const [mentorshipRequests, setMentorshipRequests] = useState<{ incoming: MentorshipRequest[]; outgoing: MentorshipRequest[]; all: MentorshipRequest[] }>({ incoming: [], outgoing: [], all: [] });
  const [activeMentorships, setActiveMentorships] = useState<ActiveMentorship[]>([]);
  const [mentorshipSessions, setMentorshipSessions] = useState<MentorshipSession[]>([]);

  const fetchMentorshipData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [reqRes, activeRes, sessRes] = await Promise.all([
        apiGetMentorshipRequests(currentUser.id),
        apiGetActiveMentorships(currentUser.id),
        apiGetMentorshipSessions(currentUser.id)
      ]);
      if (reqRes) {
        setMentorshipRequests({
          incoming: reqRes.incoming || [],
          outgoing: reqRes.outgoing || [],
          all: reqRes.all || []
        });
      }
      if (Array.isArray(activeRes)) {
        setActiveMentorships(activeRes);
      }
      if (Array.isArray(sessRes)) {
        setMentorshipSessions(sessRes);
      }
    } catch (err) {
      console.warn('Error fetching mentorship data:', err);
    }
  }, [currentUser]);

  const sendMentorshipRequest = useCallback(async (params: {
    mentorId: string;
    topic: string;
    message: string;
    experienceLevel?: any;
    sessionStyle?: any;
    preferredAvailability?: string;
  }) => {
    if (!currentUser) return { success: false, error: 'Please log in to request mentorship.' };
    try {
      const res = await apiSendMentorshipRequest({
        mentorId: params.mentorId,
        menteeId: currentUser.id,
        topic: params.topic,
        message: params.message,
        experienceLevel: params.experienceLevel,
        sessionStyle: params.sessionStyle,
        preferredAvailability: params.preferredAvailability
      });
      if (res.success) {
        await fetchMentorshipData();
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send mentorship request.' };
    }
  }, [currentUser, fetchMentorshipData]);

  const respondToMentorshipRequest = useCallback(async (requestId: string, action: 'ACCEPT' | 'DECLINE' | 'CANCEL') => {
    if (!currentUser) return { success: false, error: 'Please log in.' };
    try {
      const res = await apiRespondMentorshipRequest(requestId, currentUser.id, action);
      if (res.success) {
        await fetchMentorshipData();
        if (action === 'ACCEPT') {
          if (isSupabaseConfigured()) {
            fetchSupabaseConnections().then(conns => {
              if (conns && conns.length > 0) setConnections(conns);
            }).catch(e => console.warn(e));
          }
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to respond to request.' };
    }
  }, [currentUser, fetchMentorshipData]);

  const updateMentorshipStatus = useCallback(async (mentorshipId: string, status: 'COMPLETED' | 'ENDED', notes?: string) => {
    if (!currentUser) return { success: false, error: 'Please log in.' };
    try {
      const res = await apiUpdateMentorshipStatus(mentorshipId, currentUser.id, status, notes);
      if (res.success) {
        await fetchMentorshipData();
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update mentorship status.' };
    }
  }, [currentUser, fetchMentorshipData]);

  const scheduleMentorshipSession = useCallback(async (sessionData: Partial<MentorshipSession>) => {
    if (!currentUser) return { success: false, error: 'Please log in.' };
    try {
      const res = await apiScheduleMentorshipSession({
        ...sessionData,
        menteeId: sessionData.menteeId || currentUser.id
      });
      if (res.success) {
        await fetchMentorshipData();
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to schedule session.' };
    }
  }, [currentUser, fetchMentorshipData]);

  const updateMentorshipSessionStatus = useCallback(async (sessionId: string, status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED', notes?: string) => {
    if (!currentUser) return { success: false, error: 'Please log in.' };
    try {
      const res = await apiUpdateMentorshipSessionStatus(sessionId, currentUser.id, status, notes);
      if (res.success) {
        await fetchMentorshipData();
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update session status.' };
    }
  }, [currentUser, fetchMentorshipData]);

  // -------------------------------------------------------------
  // WebRTC Calling State & Handlers
  // -------------------------------------------------------------
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);

  const startCall = useCallback(async (receiverId: string, receiverName: string, receiverAvatar?: string, type: 'VOICE' | 'VIDEO' = 'VOICE', connectionId?: string) => {
    if (!currentUser) return { success: false, error: 'Please log in to call.' };
    try {
      const res = await apiInitiateCall(currentUser.id, receiverId, type, connectionId);
      if (res.success && res.session) {
        setActiveCall(res.session);
        return { success: true, session: res.session };
      }
      return { success: false, error: res.error || 'Failed to start call' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Call failed' };
    }
  }, [currentUser]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !currentUser) return;
    try {
      const res = await apiRespondToCall(incomingCall.id, currentUser.id, 'ACCEPT');
      if (res.success && res.session) {
        setActiveCall(res.session);
        setIncomingCall(null);
      }
    } catch (err) {
      console.warn('Failed to accept call:', err);
    }
  }, [incomingCall, currentUser]);

  const declineCall = useCallback(async () => {
    if (!incomingCall || !currentUser) return;
    try {
      await apiRespondToCall(incomingCall.id, currentUser.id, 'DECLINE');
      setIncomingCall(null);
    } catch (err) {
      console.warn('Failed to decline call:', err);
    }
  }, [incomingCall, currentUser]);

  const endCall = useCallback(async (durationSeconds?: number) => {
    if (!activeCall || !currentUser) return;
    try {
      await apiEndCall(activeCall.id, currentUser.id, durationSeconds || 0);
      setActiveCall(null);
    } catch (err) {
      console.warn('Failed to end call:', err);
      setActiveCall(null);
    }
  }, [activeCall, currentUser]);

  // -------------------------------------------------------------
  // Notifications State & Handlers
  // -------------------------------------------------------------
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await apiGetNotifications(currentUser.id);
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadNotificationCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    }
  }, [currentUser]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    if (!currentUser) return;
    try {
      await apiMarkNotificationRead(id, currentUser.id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Error marking notification read:', err);
    }
  }, [currentUser]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!currentUser) return;
    try {
      await apiMarkAllNotificationsRead(currentUser.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadNotificationCount(0);
    } catch (err) {
      console.warn('Error marking all notifications read:', err);
    }
  }, [currentUser]);

  // -------------------------------------------------------------
  // Profile Banner & Verification & Chat Read Receipts
  // -------------------------------------------------------------
  const uploadProfileBanner = useCallback(async (bannerData: string, mimeType: string = 'image/jpeg') => {
    if (!currentUser) return { success: false, error: 'Please log in.' };
    try {
      const res = await apiUploadProfileBanner(currentUser.id, bannerData, mimeType);
      if (res.success && res.bannerUrl) {
        const updated: UserProfile = { ...currentUser, bannerUrl: res.bannerUrl };
        setCurrentUser(updated);
        setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
        if (isSupabaseConfigured()) {
          saveSupabaseUserProfile(updated).catch(e => console.warn(e));
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to upload banner.' };
    }
  }, [currentUser]);

  const removeProfileBanner = useCallback(async () => {
    if (!currentUser) return { success: false, error: 'Please log in.' };
    try {
      const res = await apiDeleteProfileBanner(currentUser.id);
      if (res.success) {
        const updated: UserProfile = { ...currentUser, bannerUrl: undefined };
        setCurrentUser(updated);
        setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
        if (isSupabaseConfigured()) {
          saveSupabaseUserProfile(updated).catch(e => console.warn(e));
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to remove banner.' };
    }
  }, [currentUser]);

  const uploadProfileAvatar = useCallback(async (avatarData: string, mimeType: string = 'image/jpeg') => {
    if (!currentUser) return { success: false, error: 'Please log in.' };
    try {
      const res = await apiUploadProfileAvatar(currentUser.id, avatarData, mimeType);
      if (res.success && res.avatarUrl) {
        const updated: UserProfile = { ...currentUser, avatarUrl: res.avatarUrl };
        setCurrentUser(updated);
        setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
        if (isSupabaseConfigured()) {
          saveSupabaseUserProfile(updated).catch(e => console.warn(e));
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to upload avatar.' };
    }
  }, [currentUser]);

  const adminVerifyUser = useCallback(async (userId: string, isVerified: boolean, notes?: string) => {
    if (!currentUser) return { success: false, error: 'Admin access required.' };
    try {
      const res = await apiAdminVerifyUser(userId, isVerified, notes, currentUser.email);
      if (res.success) {
        setAllUsers(prev => prev.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              isVerified,
              verificationDate: isVerified ? new Date().toISOString() : undefined,
              verificationNotes: notes || u.verificationNotes
            };
          }
          return u;
        }));
        setAdminUsersList(prev => prev.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              isVerified,
              verificationStatus: isVerified ? 'verified' : 'unverified',
              verifiedAt: isVerified ? new Date().toISOString() : undefined,
              verifiedBy: isVerified ? currentUser.email : undefined,
              verificationNotes: notes || (u as any).verificationNotes
            };
          }
          return u;
        }));
        if (currentUser.id === userId) {
          setCurrentUser(prev => prev ? {
            ...prev,
            isVerified,
            verificationDate: isVerified ? new Date().toISOString() : undefined,
            verificationNotes: notes || prev.verificationNotes
          } : null);
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to verify user.' };
    }
  }, [currentUser]);

  const markMessagesAsRead = useCallback(async (connectionId: string) => {
    if (!currentUser) return;
    try {
      await apiMarkMessagesRead(connectionId, currentUser.id);
      setMessages(prev => prev.map(m => {
        if (m.connectionId === connectionId && m.receiverId === currentUser.id && !m.isRead) {
          return { ...m, isRead: true, readAt: new Date().toISOString() };
        }
        return m;
      }));
    } catch (err) {
      console.warn('Error marking messages as read:', err);
    }
  }, [currentUser]);

  // Periodic Polling
  useEffect(() => {
    loadAvailabilities();
    const interval = setInterval(loadAvailabilities, 30000);
    return () => clearInterval(interval);
  }, [loadAvailabilities]);

  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();
    fetchMentorshipData();

    const notifInterval = setInterval(() => {
      fetchNotifications();
    }, 12000);

    const callInterval = setInterval(async () => {
      if (activeCall) return;
      try {
        const incoming = await apiCheckIncomingCall(currentUser.id);
        if (incoming) {
          setIncomingCall(incoming);
        }
      } catch {
        // silent
      }
    }, 4000);

    return () => {
      clearInterval(notifInterval);
      clearInterval(callInterval);
    };
  }, [currentUser, fetchNotifications, fetchMentorshipData, activeCall]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView: handleSetCurrentView,
        currentUser,
        setCurrentUser,
        allUsers,
        connections,
        messages,
        blockedUsers,
        userReports,
        activeChatConnectionId,
        setActiveChatConnectionId,
        signupDraft,
        setSignupDraft,
        selectedMatchUser,
        selectedProfileUserId,
        setSelectedProfileUserId,
        selectedMatchResult,
        connectModalTarget,
        setConnectModalTarget,
        isCloudSynced,
        openUserProfile,
        handleBackFromProfile,
        openChatForConnection,
        openChatWithUser,
        getActiveConnectionWithUser,
        getPendingRequestWithUser,
        initiateSignup,
        resendOTP,
        verifyOTP,
        updateSignupPassword,
        login,
        logout,
        saveProfileBasicInfo,
        addOfferedSkill,
        removeOfferedSkill,
        addWantedSkill,
        removeWantedSkill,
        sendConnectionRequest,
        acceptConnection,
        declineConnection,
        rejectConnection: declineConnection,
        upgradeExchangeToCollaboration,
        endExchange,
        blockUser,
        unblockUser,
        isUserBlocked,
        isUserBlockedByMe,
        getUserSafetyStatus,
        isUserSuspended,
        isCurrentUserSuspended,
        isCurrentUserBanned,
        reportUser,
        sendMessage,
        isAdmin,
        adminActiveTab,
        setAdminActiveTab,
        adminOverviewStats,
        adminUsersList,
        adminReportsList,
        adminAuditLogs,
        fetchAdminData,
        adminUpdateUserStatus,
        adminUpdateReportStatus,
        updateMentorshipSchedule,
        scheduledSessions,
        bookMentorshipSession,
        updateSessionStatus,

        // New upgraded features
        currentUserAvailability,
        allAvailabilities,
        toggleAvailability,
        getUserAvailabilityStatus,
        updateUserTimezone,
        mentorshipRequests,
        activeMentorships,
        mentorshipSessions,
        sendMentorshipRequest,
        respondToMentorshipRequest,
        updateMentorshipStatus,
        scheduleMentorshipSession,
        updateMentorshipSessionStatus,
        activeCall,
        incomingCall,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        fetchNotifications,
        uploadProfileBanner,
        removeProfileBanner,
        uploadProfileAvatar,
        adminVerifyUser,
        markMessagesAsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
