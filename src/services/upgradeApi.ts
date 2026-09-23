import {
  LiveAvailabilityStatus,
  LiveAvailabilityMode,
  UserLiveAvailability,
  MentorshipRequest,
  ActiveMentorship,
  CallSession,
  CallHistoryRecord,
} from '../types';

/**
 * Live Availability API Client
 */
export async function apiUpdateAvailability(
  userId: string,
  status: LiveAvailabilityStatus,
  mode: LiveAvailabilityMode,
  timezone?: string,
  customStatus?: string
): Promise<{ success: boolean; availability?: UserLiveAvailability; error?: string }> {
  try {
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status, mode, timezone, customStatus }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      availability: data.availability,
      error: data.error,
    };
  } catch (err: any) {
    console.warn('[API] Update availability error:', err);
    return { success: false, error: err.message || 'Failed to update availability' };
  }
}

export async function apiGetUserAvailability(userId: string): Promise<UserLiveAvailability | null> {
  try {
    const res = await fetch(`/api/availability/${encodeURIComponent(userId)}`);
    const data = await res.json();
    return data.success ? data.availability : null;
  } catch (err) {
    console.warn('[API] Get availability error:', err);
    return null;
  }
}

export async function apiGetAllAvailabilities(): Promise<Record<string, UserLiveAvailability>> {
  try {
    const res = await fetch('/api/availability');
    const data = await res.json();
    return data.success ? data.availabilities : {};
  } catch (err) {
    console.warn('[API] Get all availabilities error:', err);
    return {};
  }
}

/**
 * Mentorship API Client
 */
export async function apiSendMentorshipRequest(params: {
  mentorId: string;
  menteeId: string;
  topic: string;
  message: string;
  experienceLevel?: string;
  sessionStyle?: string;
  preferredAvailability?: string;
}): Promise<{ success: boolean; request?: MentorshipRequest; error?: string }> {
  try {
    const res = await fetch('/api/mentorship/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send mentorship request' };
  }
}

export async function apiGetMentorshipRequests(userId: string): Promise<{
  incoming: MentorshipRequest[];
  outgoing: MentorshipRequest[];
  all: MentorshipRequest[];
}> {
  try {
    const res = await fetch(`/api/mentorship/requests?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    return {
      incoming: data.incoming || [],
      outgoing: data.outgoing || [],
      all: data.all || [],
    };
  } catch (err) {
    return { incoming: [], outgoing: [], all: [] };
  }
}

export async function apiRespondMentorshipRequest(
  requestId: string,
  userId: string,
  action: 'ACCEPT' | 'DECLINE' | 'CANCEL'
): Promise<{ success: boolean; request?: MentorshipRequest; mentorship?: ActiveMentorship; connectionId?: string; error?: string }> {
  try {
    const res = await fetch(`/api/mentorship/requests/${encodeURIComponent(requestId)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to respond to request' };
  }
}

export async function apiGetActiveMentorships(userId: string): Promise<ActiveMentorship[]> {
  try {
    const res = await fetch(`/api/mentorships?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    return data.mentorships || [];
  } catch {
    return [];
  }
}

export async function apiUpdateMentorshipStatus(
  mentorshipId: string,
  userId: string,
  status: 'COMPLETED' | 'ENDED',
  notes?: string
): Promise<{ success: boolean; mentorship?: ActiveMentorship; error?: string }> {
  try {
    const res = await fetch(`/api/mentorships/${encodeURIComponent(mentorshipId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status, notes }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update mentorship status' };
  }
}

/**
 * Voice Note Upload API Client
 */
export async function apiUploadVoiceNote(
  audioBase64: string,
  mimeType: string,
  durationSeconds: number
): Promise<{ success: boolean; url?: string; duration?: number; error?: string }> {
  try {
    const res = await fetch('/api/voice-notes/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioData: audioBase64,
        mimeType,
        duration: durationSeconds,
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload voice note' };
  }
}

/**
 * WebRTC Calling API Client
 */
export async function apiInitiateCall(
  callerId: string,
  receiverId: string,
  callType: 'VOICE' | 'VIDEO',
  connectionId?: string
): Promise<{ success: boolean; session?: CallSession; error?: string }> {
  try {
    const res = await fetch('/api/calls/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callerId, receiverId, callType, connectionId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start call' };
  }
}

export async function apiCheckIncomingCall(userId: string): Promise<CallSession | null> {
  try {
    const res = await fetch(`/api/calls/incoming?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    return data.incomingCall || null;
  } catch {
    return null;
  }
}

export async function apiSendCallSignal(
  callId: string,
  fromUserId: string,
  type: 'offer' | 'answer' | 'ice-candidate',
  data: any
): Promise<boolean> {
  try {
    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserId, type, data }),
    });
    const result = await res.json();
    return result.success;
  } catch {
    return false;
  }
}

export async function apiPollCallSignals(
  callId: string,
  forUserId: string,
  afterIndex: number
): Promise<{ sessionStatus: string; signals: any[]; lastIndex: number }> {
  try {
    const res = await fetch(
      `/api/calls/${encodeURIComponent(callId)}/signals?forUserId=${encodeURIComponent(forUserId)}&afterIndex=${afterIndex}`
    );
    const data = await res.json();
    return {
      sessionStatus: data.sessionStatus || 'UNKNOWN',
      signals: data.signals || [],
      lastIndex: data.lastIndex ?? afterIndex,
    };
  } catch {
    return { sessionStatus: 'UNKNOWN', signals: [], lastIndex: afterIndex };
  }
}

export async function apiRespondToCall(
  callId: string,
  receiverId: string,
  action: 'ACCEPT' | 'DECLINE' | 'BUSY'
): Promise<{ success: boolean; session?: CallSession }> {
  try {
    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId, action }),
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

export async function apiEndCall(
  callId: string,
  userId: string,
  durationSeconds: number = 0
): Promise<{ success: boolean; historyRecord?: CallHistoryRecord }> {
  try {
    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, durationSeconds }),
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

export async function apiGetCallHistory(userId: string): Promise<CallHistoryRecord[]> {
  try {
    const res = await fetch(`/api/calls/history?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    return data.history || [];
  } catch {
    return [];
  }
}

/**
 * Mentorship Sessions API Client
 */
export async function apiGetMentorshipSessions(userId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/mentorship/sessions?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    return data.sessions || [];
  } catch {
    return [];
  }
}

export async function apiScheduleMentorshipSession(sessionData: any): Promise<{ success: boolean; session?: any; error?: string }> {
  try {
    const res = await fetch('/api/mentorship/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to schedule session' };
  }
}

export async function apiUpdateMentorshipSessionStatus(
  sessionId: string,
  userId: string,
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/mentorship/sessions/${encodeURIComponent(sessionId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status, notes }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update session status' };
  }
}

/**
 * Notifications API Client
 */
export async function apiGetNotifications(userId: string): Promise<{ notifications: any[]; unreadCount: number }> {
  try {
    const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    return {
      notifications: data.notifications || [],
      unreadCount: data.unreadCount || 0,
    };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export async function apiMarkNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export async function apiMarkAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

/**
 * Profile Banner Upload API Client
 */
export async function apiUploadProfileBanner(
  userId: string,
  bannerData: string,
  mimeType?: string
): Promise<{ success: boolean; bannerUrl?: string; error?: string }> {
  try {
    const res = await fetch('/api/profile/banner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, bannerData, mimeType }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload banner' };
  }
}

/**
 * Profile Avatar Upload API Client
 */
export async function apiUploadProfileAvatar(
  userId: string,
  avatarData: string,
  mimeType?: string
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, avatarData, mimeType }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload avatar' };
  }
}

/**
 * Admin User Verification API Client
 */
export async function apiAdminVerifyUser(
  userIdOrParams: string | {
    userId: string;
    isVerified: boolean;
    notes?: string;
    adminEmail?: string;
    adminId?: string;
  },
  isVerifiedParam?: boolean,
  notesParam?: string,
  adminEmailParam?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let payload: { userId: string; isVerified: boolean; notes?: string; adminEmail?: string; adminId?: string };
    if (typeof userIdOrParams === 'object') {
      payload = userIdOrParams;
    } else {
      payload = {
        userId: userIdOrParams,
        isVerified: Boolean(isVerifiedParam),
        notes: notesParam,
        adminEmail: adminEmailParam,
      };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (payload.adminEmail) headers['x-admin-email'] = payload.adminEmail;
    if (payload.adminId) headers['x-user-id'] = payload.adminId;

    const res = await fetch('/api/admin/verify-user', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify user' };
  }
}

export async function apiRemoveProfileBanner(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/profile/banner/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to remove banner' };
  }
}

export const apiDeleteProfileBanner = apiRemoveProfileBanner;

/**
 * User Projects API Clients
 */
export async function apiGetUserProjects(userId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/projects`);
    const data = await res.json();
    return data.success && Array.isArray(data.projects) ? data.projects : [];
  } catch {
    return [];
  }
}

export async function apiSaveUserProject(
  userId: string,
  project: any
): Promise<{ success: boolean; projects?: any[]; error?: string }> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save project' };
  }
}

export async function apiDeleteUserProject(
  userId: string,
  projectId: string
): Promise<{ success: boolean; projects?: any[]; error?: string }> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete project' };
  }
}

/**
 * Admin API Clients (User Details, Verification, Exchanges, Mentorships, Reviews, Blocks)
 */
export async function apiAdminGetUserDetails(userId: string, adminEmail?: string, adminId?: string): Promise<any> {
  try {
    const headers: Record<string, string> = {};
    if (adminEmail) headers['x-admin-email'] = adminEmail;
    if (adminId) headers['x-user-id'] = adminId;

    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/details`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to get user details' };
  }
}

export async function apiAdminGetVerifications(adminEmail?: string, adminId?: string): Promise<any> {
  try {
    const headers: Record<string, string> = {};
    if (adminEmail) headers['x-admin-email'] = adminEmail;
    if (adminId) headers['x-user-id'] = adminId;

    const res = await fetch('/api/admin/verifications', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load verifications' };
  }
}

export async function apiAdminGetExchanges(adminEmail?: string, adminId?: string): Promise<any> {
  try {
    const headers: Record<string, string> = {};
    if (adminEmail) headers['x-admin-email'] = adminEmail;
    if (adminId) headers['x-user-id'] = adminId;

    const res = await fetch('/api/admin/exchanges', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load exchanges' };
  }
}

export async function apiAdminGetMentorships(adminEmail?: string, adminId?: string): Promise<any> {
  try {
    const headers: Record<string, string> = {};
    if (adminEmail) headers['x-admin-email'] = adminEmail;
    if (adminId) headers['x-user-id'] = adminId;

    const res = await fetch('/api/admin/mentorships', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load mentorships' };
  }
}

export async function apiAdminGetReviews(adminEmail?: string, adminId?: string): Promise<any> {
  try {
    const headers: Record<string, string> = {};
    if (adminEmail) headers['x-admin-email'] = adminEmail;
    if (adminId) headers['x-user-id'] = adminId;

    const res = await fetch('/api/admin/reviews', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load reviews' };
  }
}

export async function apiAdminGetBlocks(adminEmail?: string, adminId?: string): Promise<any> {
  try {
    const headers: Record<string, string> = {};
    if (adminEmail) headers['x-admin-email'] = adminEmail;
    if (adminId) headers['x-user-id'] = adminId;

    const res = await fetch('/api/admin/blocks', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load blocks' };
  }
}

/**
 * Chat Read Receipt API Client
 */
export async function apiMarkMessagesRead(
  connectionId: string,
  readerId: string
): Promise<{ success: boolean; markedCount?: number }> {
  try {
    const res = await fetch('/api/chat/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId, readerId }),
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}
