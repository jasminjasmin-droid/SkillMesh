export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type TeachingConfidence = 'Beginners' | 'Intermediate' | 'Both';
export type MatchPurpose = 'learn_skill' | 'teach_skill' | 'exchange_skills' | 'project_collaboration';
export type MatchType = 'STRONG_MATCH' | 'RELEVANT_MATCH' | 'PROJECT_COLLABORATION' | 'KNOWLEDGE_SHARE' | 'NO_MATCH';
export type ConnectionRequestType = 'MUTUAL_EXCHANGE' | 'PROJECT_COLLABORATION' | 'KNOWLEDGE_SHARING';

export type UserStatus = 'STUDENT' | 'WORKING_PROFESSIONAL' | 'OTHER';
export type SkillCategoryType = 'TECHNICAL' | 'NON_TECHNICAL';
export type EvidenceType = 
  | 'github_repo' 
  | 'project_link' 
  | 'portfolio' 
  | 'work_sample' 
  | 'published_work' 
  | 'certificate' 
  | 'other_evidence';

export type SkillEvidenceType = EvidenceType;

export interface SkillEvidence {
  id?: string;
  type: EvidenceType;
  title: string;
  url?: string;
  description: string;
  aiRelevanceCheck?: {
    isRelevant: boolean;
    score: number;
    feedback: string;
    verifiedAt: string;
  };
}

export interface OfferedSkill {
  id: string;
  name: string;
  category?: SkillCategoryType;
  proficiency: ProficiencyLevel;
  experienceDescription: string;
  yearsOfPractice: string;
  teachingConfidence: TeachingConfidence;
  evidence?: SkillEvidence[] | SkillEvidence;
  supportingLink?: string;
  supportingLinkType?: 'github' | 'portfolio' | 'linkedin' | 'certificate' | 'other';
}

export interface WantedSkill {
  id: string;
  name: string;
  currentLevel: ProficiencyLevel;
  learningGoal?: string;
}

export interface ProfessionalLink {
  platform: 'linkedin' | 'github' | 'portfolio' | 'twitter' | 'other';
  url: string;
  label?: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  id: string;
  startTime: string; // "09:00"
  endTime: string;   // "11:00"
}

export interface DayAvailability {
  day: DayOfWeek;
  isEnabled: boolean;
  slots: TimeSlot[];
}

export interface BlockedPeriod {
  id: string;
  date: string; // "YYYY-MM-DD"
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export type SessionFormat = 'VIDEO_CALL' | 'SCREEN_SHARE' | 'AUDIO_CALL' | 'CHAT';
export type SessionDuration = 15 | 30 | 45 | 60 | 90;

export interface MentorshipSchedule {
  isEnabled: boolean;
  timezone: string;
  weeklyAvailability: DayAvailability[];
  blockedPeriods: BlockedPeriod[];
  preferredDurations: SessionDuration[];
  preferredFormats: SessionFormat[];
  noticeHours: number;
  maxSessionsPerWeek?: number;
  customBookingNote?: string;
  meetingPlatform?: 'Google Meet' | 'Zoom' | 'In-App Video' | 'Discord' | 'Flexible';
  meetingUrl?: string;
}

export interface ScheduledSession {
  id: string;
  connectionId?: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar?: string;
  menteeId: string;
  menteeName: string;
  menteeAvatar?: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "14:00"
  endTime: string;   // "15:00"
  durationMinutes: number;
  format: SessionFormat;
  topic: string;
  notes?: string;
  meetingUrl?: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  cancelledReason?: string;
}

export interface UserProject {
  id: string;
  title: string;
  description: string;
  skillsUsed: string[];
  githubUrl?: string;
  liveDemoUrl?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  titleOrRole: string;
  bio: string;
  avatarUrl: string;
  status: UserStatus;
  institutionName?: string; // College/University for Students
  organizationName?: string; // Company/Organization for Working Professionals
  occupationDetails?: string; // For Other
  location?: string;
  joinedDate: string;
  isVerified: boolean;
  isProfileComplete?: boolean;
  professionalLinks?: ProfessionalLink[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  offeredSkills: OfferedSkill[];
  wantedSkills: WantedSkill[];
  matchPurposes?: MatchPurpose[];
  collaborationInterests?: string[];
  activeProjectDescription?: string;
  contactPreference?: string;
  contactHandle?: string;
  role?: 'admin' | 'user';
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  statusReason?: string;
  statusUpdatedAt?: string;
  mentorshipSchedule?: MentorshipSchedule;
  scheduledSessions?: ScheduledSession[];
  availabilityStatus?: 'AVAILABLE' | 'UNAVAILABLE';
  availabilityMode?: LiveAvailabilityMode;
  availabilityUpdatedAt?: string;
  timezone?: string;
  bannerUrl?: string;
  skillmeshId?: string;
  verificationStatus?: 'verified' | 'unverified' | 'pending' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  projects?: UserProject[];
  ratingSummary?: RatingSummary;
  averageRating?: number;
  totalRatings?: number;
}

export interface MatchScoreResult {
  targetUser: UserProfile;
  matchType: MatchType;
  mutualTeachSkills: {
    theyTeach: OfferedSkill;
    youLearn: WantedSkill;
  }[];
  mutualLearnSkills: {
    youTeach: OfferedSkill;
    theyLearn: WantedSkill;
  }[];
  oneWayTeachSkills: {
    theyTeach: OfferedSkill;
    youLearn: WantedSkill;
  }[];
  oneWayLearnSkills: {
    youTeach: OfferedSkill;
    theyLearn: WantedSkill;
  }[];
  complementarySkills?: {
    theirSkills: string[];
    yourSkills: string[];
    synergyReason: string;
  };
  isCollaborationMatch?: boolean;
  explanation: string;
  matchScore: number;
}

export interface ConnectionRequest {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  offeredSkillName: string;
  wantedSkillName: string;
  note: string;
  contactMethod?: string;
  contactValue?: string;
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'ENDED' | 'BLOCKED';
  requestType?: ConnectionRequestType;
  isKnowledgeSharing?: boolean;
  isProjectCollaboration?: boolean;
  collaborationDetails?: {
    projectTitle?: string;
    lookingFor?: string;
    whyConnect?: string;
  };
  scheduledSession?: ScheduledSession;
  endedAt?: string;
  endedBy?: string;
  endReason?: string;
}

export type AttachmentType = 'image' | 'pdf' | 'word' | 'note' | 'video' | 'audio' | 'other';

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  type: AttachmentType;
  mimeType: string;
  dataUrl?: string;
  previewText?: string;
  duration?: number;
}

export interface ChatMessage {
  id: string;
  connectionId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  isRead?: boolean;
  readAt?: string;
}

export interface BlockRecord {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedUserName: string;
  createdAt: string;
  reason?: string;
}

export type ReportReason = 
  | 'HARASSMENT' 
  | 'INAPPROPRIATE_BEHAVIOR' 
  | 'OFFENSIVE_CONTENT' 
  | 'SPAM_OR_SCAM' 
  | 'MISLEADING_SKILLS'
  | 'IMPERSONATION' 
  | 'OTHER';

export type UserSafetyStatus = 'ACTIVE' | 'FLAGGED_FOR_REVIEW' | 'SUSPENDED' | 'BANNED';

export interface UserSafetySignalSummary {
  userId: string;
  uniqueBlockersCount: number;
  uniqueReportersCount: number;
  distinctSafetySignalCount: number;
  status: UserSafetyStatus;
  isRestricted: boolean;
  flaggedForReview: boolean;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserEmail?: string;
  reason: ReportReason;
  reasonLabel: string;
  description?: string;
  connectionId?: string;
  createdAt: string;
  status: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export type AdminAccountAction = 'SUSPEND' | 'BAN' | 'RESTORE';

export interface AdminModerationLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  targetUserEmail: string;
  action: AdminAccountAction | 'REPORT_STATUS_CHANGE';
  previousStatus: string;
  newStatus: string;
  reason: string;
  timestamp: string;
  relatedReportId?: string;
}

export type AdminTab = 
  | 'overview' 
  | 'users' 
  | 'verification' 
  | 'skills' 
  | 'exchanges' 
  | 'mentorships' 
  | 'reviews' 
  | 'reports' 
  | 'blocks' 
  | 'password_resets' 
  | 'audit_logs';

export interface PasswordResetRequest {
  id: string;
  email: string;
  name?: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  adminNotes?: string;
  tempPasswordHint?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface AdminOverviewStats {
  totalRegisteredUsers: number;
  activeAccountsCount: number;
  suspendedAccountsCount: number;
  bannedAccountsCount: number;
  completedProfilesCount: number;
  incompleteProfilesCount: number;
  pendingReportsCount: number;
  underReviewReportsCount: number;
  resolvedReportsCount: number;
  pendingPasswordResetsCount?: number;
  flaggedSafetyCount: number;
  totalUsers?: number;
  activeUsers?: number;
  suspendedUsers?: number;
  bannedUsers?: number;
  totalConnectionsCount?: number;
  totalOfferedSkillsCount?: number;
  uniqueSpecializationsCount?: number;
  verifiedUsersCount?: number;
  unverifiedUsersCount?: number;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  joinedDate: string;
  avatarUrl: string;
  titleOrRole: string;
  bio?: string;
  isProfileComplete: boolean;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  statusReason?: string;
  statusUpdatedAt?: string;
  offeredSkillsCount: number;
  wantedSkillsCount: number;
  receivedReportsCount: number;
  receivedBlocksCount: number;
  role: 'admin' | 'user';
  institutionOrOrg?: string;
  institutionName?: string;
  offeredSkills?: OfferedSkill[];
  wantedSkills?: WantedSkill[];
  flagsCount?: number;
  reportsReceivedCount?: number;
  blocksReceivedCount?: number;
  isVerified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verificationNotes?: string | null;
  averageRating?: number;
  totalRatings?: number;
  totalReviews?: number;
  totalExchanges?: number;
  completedExchanges?: number;
  successfulExchanges?: number;
  completedMentorships?: number;
  totalMentorships?: number;
  skillmeshId?: string;
  isEligible?: boolean;
}

export interface AdminExchangeItem {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatar: string;
  senderSkillmeshId: string;
  senderVerified: boolean;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  receiverAvatar: string;
  receiverSkillmeshId: string;
  receiverVerified: boolean;
  offeredSkillName: string;
  wantedSkillName: string;
  status: string;
  requestType: string;
  note: string;
  contactMethod: string;
  createdAt: string;
  endedAt?: string | null;
  endedBy?: string | null;
  endReason?: string | null;
  relatedRating?: {
    rating: number;
    review?: string;
    raterName?: string;
    createdAt?: string;
  } | null;
}

export interface AdminMentorshipItem {
  id: string;
  type: 'SESSION' | 'REQUEST';
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  mentorAvatar: string;
  mentorSkillmeshId: string;
  mentorVerified: boolean;
  menteeId: string;
  menteeName: string;
  menteeEmail: string;
  menteeAvatar: string;
  menteeSkillmeshId: string;
  menteeVerified: boolean;
  topic: string;
  status: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  format: string;
  meetingUrl?: string;
  createdAt: string;
}

export interface AdminReviewItem {
  id: string;
  raterId: string;
  raterName: string;
  raterEmail: string;
  raterAvatar: string;
  raterSkillmeshId: string;
  raterVerified: boolean;
  ratedUserId: string;
  ratedUserName: string;
  ratedUserEmail: string;
  ratedUserAvatar: string;
  ratedUserSkillmeshId: string;
  ratedUserVerified: boolean;
  rating: number;
  review: string;
  skillName?: string;
  interactionType?: string;
  createdAt: string;
}

export interface AdminBlockItem {
  id: string;
  blockerId: string;
  blockerName: string;
  blockerEmail: string;
  blockerAvatar: string;
  blockerSkillmeshId: string;
  blockedUserId: string;
  blockedUserName: string;
  blockedUserEmail: string;
  blockedUserAvatar: string;
  blockedUserSkillmeshId: string;
  reason?: string;
  createdAt: string;
}

// --------------------------------------------------------------------
// User Ratings & Reputation Types
// --------------------------------------------------------------------
export interface UserRating {
  id: string;
  raterId: string;
  raterName: string;
  raterAvatar?: string;
  raterTitleOrRole?: string;
  ratedUserId: string;
  rating: number; // 1 to 5 integer
  review?: string;
  skillName?: string;
  interactionType?: 'SKILL_EXCHANGE' | 'MENTORSHIP' | 'PROJECT_COLLABORATION';
  interactionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  distribution: RatingDistribution;
  skillRatings?: Record<string, { averageRating: number; totalRatings: number }>;
}

export interface RatingEligibility {
  canRate: boolean;
  reason?: string;
  existingRating?: UserRating | null;
  connectionId?: string;
}

export interface ExchangeActivityItem {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  offeredSkill: string;
  wantedSkill: string;
  date: string;
  status: 'ACCEPTED' | 'COMPLETED' | 'ENDED';
}

// --------------------------------------------------------------------
// Live Availability Types
// --------------------------------------------------------------------
export type LiveAvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type LiveAvailabilityMode = 'SKILL_EXCHANGE' | 'MENTORSHIP' | 'BOTH';

export interface UserLiveAvailability {
  userId: string;
  status: LiveAvailabilityStatus;
  mode: LiveAvailabilityMode;
  timezone?: string;
  customStatus?: string;
  updatedAt: string;
}

// --------------------------------------------------------------------
// Mentorship Types
// --------------------------------------------------------------------
export type MentorshipExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type MentorshipSessionStyle = 'Video Call' | 'Audio Call' | 'Chat / Asynchronous' | 'Screen Share' | 'Flexible';
export type MentorshipRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'ENDED';

export interface MentorshipRequest {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar?: string;
  mentorTitle?: string;
  menteeId: string;
  menteeName: string;
  menteeAvatar?: string;
  menteeTitle?: string;
  topic: string;
  message: string;
  experienceLevel: MentorshipExperienceLevel;
  sessionStyle: MentorshipSessionStyle;
  preferredAvailability?: string;
  proposedStart?: string;
  proposedEnd?: string;
  durationMinutes?: number;
  timezone?: string;
  recurringPreference?: 'ONE_OFF' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  status: MentorshipRequestStatus;
  connectionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MentorshipSession {
  id: string;
  mentorshipRequestId?: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar?: string;
  mentorTitle?: string;
  menteeId: string;
  menteeName: string;
  menteeAvatar?: string;
  menteeTitle?: string;
  topic: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  timezone: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  meetingLink?: string;
  completedAt?: string;
  completedBy?: string;
  cancelledReason?: string;
  connectionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type NotificationType = 
  | 'MENTORSHIP_REQUEST'
  | 'MENTORSHIP_ACCEPTED'
  | 'MENTORSHIP_DECLINED'
  | 'SESSION_SCHEDULED'
  | 'SESSION_REMINDER'
  | 'NEW_MESSAGE'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'REVIEW_RECEIVED'
  | 'VERIFICATION_GRANTED'
  | 'VERIFICATION_REVOKED';

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ActiveMentorship {
  id: string;
  requestId?: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar?: string;
  mentorTitle?: string;
  menteeId: string;
  menteeName: string;
  menteeAvatar?: string;
  menteeTitle?: string;
  topic: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ENDED';
  startDate: string;
  completedAt?: string;
  completedSessionsCount?: number;
  nextSessionDate?: string;
  notes?: string;
  connectionId?: string;
  createdAt: string;
}

// --------------------------------------------------------------------
// Calling (WebRTC Voice & Video) Types
// --------------------------------------------------------------------
export type CallType = 'VOICE' | 'VIDEO';
export type CallStatus = 'RINGING' | 'ACCEPTED' | 'REJECTED' | 'BUSY' | 'ENDED' | 'MISSED';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  callType: CallType;
  status: CallStatus;
  connectionId?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds: number;
  createdAt: string;
  offer?: any;
  answer?: any;
  iceCandidates?: any[];
}

export interface CallHistoryRecord {
  id: string;
  callSessionId?: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  callType: CallType;
  status: 'COMPLETED' | 'MISSED' | 'DECLINED';
  durationSeconds: number;
  createdAt: string;
}



