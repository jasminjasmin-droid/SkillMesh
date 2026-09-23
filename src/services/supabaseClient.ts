import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, OfferedSkill, WantedSkill, ConnectionRequest, ChatMessage, UserRating, RatingSummary, RatingEligibility } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;
let hasLoggedSchemaNotice = false;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.trim().length > 0 && 
    supabaseAnonKey.trim().length > 0 &&
    !supabaseUrl.includes('placeholder')
  );
}

/**
 * Check whether PostgREST / Supabase error is due to missing tables
 */
export function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('schema cache') ||
    message.includes('Could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

function handleSupabaseError(context: string, error: any) {
  if (isMissingTableError(error)) {
    if (!hasLoggedSchemaNotice) {
      hasLoggedSchemaNotice = true;
      console.info(
        `[Supabase Sync] Table for ${context} not found in schema cache. Utilizing durable local/backend fallback.`
      );
    }
  } else {
    console.warn(`[Supabase ${context}]:`, error?.message || error);
  }
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

// ----------------------------------------------------
// Database Operations (with graceful fallback returns)
// ----------------------------------------------------

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase URL or Anon Key is missing from environment.' };
  }
  const client = getSupabase();
  if (!client) {
    return { ok: false, message: 'Supabase tables not initialized in SQL schema.' };
  }
  try {
    const { error } = await client.from('profiles').select('id', { count: 'exact', head: true });
    if (error) {
      handleSupabaseError('Test Connection', error);
      return { ok: false, message: `Database query: ${error.message}` };
    }
    return { ok: true, message: 'Successfully connected to Supabase database.' };
  } catch (err: any) {
    handleSupabaseError('Test Connection Exception', err);
    return { ok: false, message: err.message || 'Unknown network error' };
  }
}

/**
 * Fetch all profiles with their offered and wanted skills from Supabase
 */
export async function fetchSupabaseUsers(): Promise<UserProfile[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: profiles, error: profileErr } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profileErr) {
      handleSupabaseError('fetch profiles', profileErr);
      return null;
    }
    if (!profiles) {
      return null;
    }

    const { data: offeredSkills, error: offErr } = await client
      .from('offered_skills')
      .select('*');

    const { data: wantedSkills, error: wantErr } = await client
      .from('wanted_skills')
      .select('*');

    if (offErr) handleSupabaseError('fetch offered_skills', offErr);
    if (wantErr) handleSupabaseError('fetch wanted_skills', wantErr);

    // Map relational tables back to UserProfile objects
    const users: UserProfile[] = profiles.map((p) => {
      const userOffered: OfferedSkill[] = (offeredSkills || [])
        .filter((s) => s.user_id === p.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          proficiency: s.proficiency,
          experienceDescription: s.experience_description || '',
          yearsOfPractice: s.years_of_practice || '',
          teachingConfidence: s.teaching_confidence || 'Both',
          supportingLink: s.supporting_link || undefined,
          supportingLinkType: s.supporting_link_type || undefined,
        }));

      const userWanted: WantedSkill[] = (wantedSkills || [])
        .filter((w) => w.user_id === p.id)
        .map((w) => ({
          id: w.id,
          name: w.name,
          currentLevel: w.current_level,
          learningGoal: w.learning_goal || '',
        }));

      return {
        id: p.id,
        name: p.name,
        email: p.email || '',
        titleOrRole: p.title_or_role || '',
        bio: p.bio || '',
        avatarUrl: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        bannerUrl: p.banner_url || undefined,
        status: p.status || 'STUDENT',
        institutionName: p.institution_name || undefined,
        organizationName: p.organization_name || undefined,
        occupationDetails: p.occupation_details || undefined,
        isProfileComplete: p.is_profile_complete ?? true,
        professionalLinks: p.professional_links || undefined,
        linkedinUrl: p.linkedin_url || undefined,
        githubUrl: p.github_url || undefined,
        portfolioUrl: p.portfolio_url || undefined,
        location: p.location || '',
        joinedDate: p.joined_date || new Date().toISOString().split('T')[0],
        isVerified: Boolean(p.is_verified && p.verification_status !== 'unverified'),
        verificationStatus: p.verification_status || (p.is_verified ? 'verified' : 'unverified'),
        verifiedAt: p.verified_at || undefined,
        verifiedBy: p.verified_by || undefined,
        verificationNotes: p.verification_notes || undefined,
        projects: Array.isArray(p.projects) ? p.projects : [],
        timezone: p.timezone || 'UTC',
        availabilityStatus: p.availability_status || 'UNAVAILABLE',
        availabilityMode: p.availability_mode || 'BOTH',
        availabilityUpdatedAt: p.availability_updated_at || undefined,
        contactPreference: p.contact_preference || 'Email',
        contactHandle: p.contact_handle || '',
        offeredSkills: userOffered,
        wantedSkills: userWanted,
      };
    });

    return users;
  } catch (err) {
    console.error('Unexpected error fetching from Supabase:', err);
    return null;
  }
}

export function getPairKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(':::');
}

export function deduplicateConnectionList(conns: ConnectionRequest[]): ConnectionRequest[] {
  const priorityOrder: Record<string, number> = {
    ACCEPTED: 5,
    PENDING: 4,
    ENDED: 3,
    DECLINED: 2,
    BLOCKED: 1,
  };

  const map = new Map<string, ConnectionRequest>();

  for (const conn of conns) {
    const pair = getPairKey(conn.senderId, conn.receiverId);
    const existing = map.get(pair);
    if (!existing) {
      map.set(pair, conn);
    } else {
      const existingScore = priorityOrder[existing.status] || 0;
      const newScore = priorityOrder[conn.status] || 0;
      if (newScore > existingScore) {
        map.set(pair, conn);
      } else if (newScore === existingScore) {
        const existingTime = new Date(existing.createdAt).getTime();
        const newTime = new Date(conn.createdAt).getTime();
        if (newTime > existingTime) {
          map.set(pair, conn);
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Fetch all connections from Supabase
 */
export async function fetchSupabaseConnections(): Promise<ConnectionRequest[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('connection_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Error fetching connections from Supabase:', error);
      return null;
    }

    const connections: ConnectionRequest[] = data.map((c) => ({
      id: c.id,
      senderId: c.sender_id,
      senderName: c.sender_name,
      receiverId: c.receiver_id,
      receiverName: c.receiver_name,
      offeredSkillName: c.offered_skill_name,
      wantedSkillName: c.wanted_skill_name,
      note: c.note || '',
      contactMethod: c.contact_method || 'Email',
      contactValue: c.contact_value || '',
      createdAt: c.created_at,
      status: c.status,
      requestType: c.request_type,
      isKnowledgeSharing: Boolean(c.is_knowledge_sharing),
      isProjectCollaboration: Boolean(c.is_project_collaboration),
      collaborationDetails: c.collaboration_details,
      endedAt: c.ended_at,
      endedBy: c.ended_by,
      endReason: c.end_reason
    }));

    return deduplicateConnectionList(connections);
  } catch (err) {
    console.error('Unexpected error in fetchSupabaseConnections:', err);
    return null;
  }
}

/**
 * Upsert a user's profile and skills into Supabase
 */
export async function saveSupabaseUserProfile(user: UserProfile): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const uAny = user as any;
    // 1. Upsert Profile
    const { error: profileErr } = await client
      .from('profiles')
      .upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        title_or_role: user.titleOrRole,
        bio: user.bio,
        avatar_url: user.avatarUrl,
        banner_url: uAny.bannerUrl || null,
        status: user.status,
        institution_name: user.institutionName,
        organization_name: user.organizationName,
        occupation_details: user.occupationDetails,
        is_profile_complete: user.isProfileComplete ?? true,
        professional_links: user.professionalLinks,
        linkedin_url: user.linkedinUrl,
        github_url: user.githubUrl,
        portfolio_url: user.portfolioUrl,
        location: user.location,
        joined_date: user.joinedDate,
        is_verified: user.isVerified,
        verification_status: uAny.verificationStatus || (user.isVerified ? 'verified' : 'unverified'),
        verified_at: uAny.verifiedAt || null,
        verified_by: uAny.verifiedBy || null,
        verification_notes: uAny.verificationNotes || null,
        projects: uAny.projects || [],
        timezone: uAny.timezone || 'UTC',
        contact_preference: user.contactPreference,
        contact_handle: user.contactHandle,
        updated_at: new Date().toISOString(),
      });

    if (profileErr) {
      handleSupabaseError('upsert profile', profileErr);
      return false;
    }

    // 2. Sync Offered Skills
    for (const s of user.offeredSkills) {
      const { error: offErr } = await client.from('offered_skills').upsert({
        id: s.id,
        user_id: user.id,
        name: s.name,
        proficiency: s.proficiency,
        experience_description: s.experienceDescription,
        years_of_practice: s.yearsOfPractice,
        teaching_confidence: s.teachingConfidence,
        supporting_link: s.supportingLink || null,
        supporting_link_type: s.supportingLinkType || null,
      });
      if (offErr) handleSupabaseError('upsert offered_skill', offErr);
    }

    // 3. Sync Wanted Skills
    for (const w of user.wantedSkills) {
      const { error: wantErr } = await client.from('wanted_skills').upsert({
        id: w.id,
        user_id: user.id,
        name: w.name,
        current_level: w.currentLevel,
        learning_goal: w.learningGoal,
      });
      if (wantErr) handleSupabaseError('upsert wanted_skill', wantErr);
    }

    return true;
  } catch (err) {
    handleSupabaseError('save profile exception', err);
    return false;
  }
}

/**
 * Save / delete single skills
 */
export async function saveSupabaseOfferedSkill(userId: string, skill: OfferedSkill): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('offered_skills').upsert({
      id: skill.id,
      user_id: userId,
      name: skill.name,
      proficiency: skill.proficiency,
      experience_description: skill.experienceDescription,
      years_of_practice: skill.yearsOfPractice,
      teaching_confidence: skill.teachingConfidence,
      supporting_link: skill.supportingLink || null,
      supporting_link_type: skill.supportingLinkType || null,
    });
    if (error) {
      handleSupabaseError('save offered_skill', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('save offered_skill exception', err);
    return false;
  }
}

export async function deleteSupabaseOfferedSkill(skillId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('offered_skills').delete().eq('id', skillId);
    if (error) {
      handleSupabaseError('delete offered_skill', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('delete offered_skill exception', err);
    return false;
  }
}

export async function saveSupabaseWantedSkill(userId: string, skill: WantedSkill): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('wanted_skills').upsert({
      id: skill.id,
      user_id: userId,
      name: skill.name,
      current_level: skill.currentLevel,
      learning_goal: skill.learningGoal,
    });
    if (error) {
      handleSupabaseError('save wanted_skill', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('save wanted_skill exception', err);
    return false;
  }
}

export async function deleteSupabaseWantedSkill(skillId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('wanted_skills').delete().eq('id', skillId);
    if (error) {
      handleSupabaseError('delete wanted_skill', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('delete wanted_skill exception', err);
    return false;
  }
}

/**
 * Connection Requests
 */
export async function createSupabaseConnection(conn: ConnectionRequest): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('connection_requests').upsert({
      id: conn.id,
      sender_id: conn.senderId,
      sender_name: conn.senderName,
      receiver_id: conn.receiverId,
      receiver_name: conn.receiverName,
      offered_skill_name: conn.offeredSkillName,
      wanted_skill_name: conn.wantedSkillName,
      note: conn.note,
      contact_method: conn.contactMethod || 'In-App Chat',
      contact_value: conn.contactValue || '',
      status: conn.status,
      request_type: conn.requestType || 'MUTUAL_EXCHANGE',
      is_knowledge_sharing: Boolean(conn.isKnowledgeSharing),
      is_project_collaboration: Boolean(conn.isProjectCollaboration),
      collaboration_details: conn.collaborationDetails || null,
      created_at: conn.createdAt,
    });
    if (error) {
      handleSupabaseError('create connection', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('create connection exception', err);
    return false;
  }
}

export async function updateSupabaseConnectionStatus(
  connId: string,
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'ENDED' | 'BLOCKED'
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('connection_requests')
      .update({ status })
      .eq('id', connId);
    if (error) {
      handleSupabaseError('update connection status', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('update connection status exception', err);
    return false;
  }
}

/**
 * Messages in Supabase
 */
export async function fetchSupabaseMessages(connectionId?: string): Promise<ChatMessage[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    let query = client.from('messages').select('*').order('created_at', { ascending: true });
    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }
    const { data, error } = await query;
    if (error) {
      handleSupabaseError('fetch messages', error);
      return null;
    }
    if (!data) return [];
    return data.map((m: any) => ({
      id: m.id,
      connectionId: m.connection_id,
      senderId: m.sender_id,
      senderName: m.sender_name || 'Peer',
      receiverId: m.receiver_id || '',
      text: m.text || '',
      attachments: Array.isArray(m.attachments) ? m.attachments : [],
      createdAt: m.created_at,
    }));
  } catch (err) {
    handleSupabaseError('fetch messages exception', err);
    return null;
  }
}

export async function saveSupabaseMessage(message: ChatMessage): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('messages').upsert({
      id: message.id,
      connection_id: message.connectionId,
      sender_id: message.senderId,
      sender_name: message.senderName,
      text: message.text,
      attachments: message.attachments || [],
      created_at: message.createdAt,
    });
    if (error) {
      handleSupabaseError('save message', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('save message exception', err);
    return false;
  }
}

export async function saveSupabaseUserReport(report: any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('user_reports')
      .insert({
        id: report.id,
        reporter_id: report.reporterId,
        reporter_name: report.reporterName,
        reported_user_id: report.reportedUserId,
        reported_user_name: report.reportedUserName,
        reason: report.reason,
        reason_label: report.reasonLabel,
        description: report.description,
        connection_id: report.connectionId,
        created_at: report.createdAt,
        status: report.status || 'PENDING_REVIEW'
      });
    if (error) {
      handleSupabaseError('save report', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('save report exception', err);
    return false;
  }
}

export async function saveSupabaseBlockRecord(blockRecord: any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('user_blocks')
      .upsert({
        id: blockRecord.id,
        blocker_id: blockRecord.blockerId,
        blocked_user_id: blockRecord.blockedUserId,
        reason: blockRecord.reason || null,
        created_at: blockRecord.createdAt || new Date().toISOString()
      });
    if (error) {
      handleSupabaseError('save block record', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('save block record exception', err);
    return false;
  }
}

export async function deleteSupabaseBlockRecord(blockerId: string, blockedUserId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_user_id', blockedUserId);
    if (error) {
      handleSupabaseError('delete block record', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('delete block record exception', err);
    return false;
  }
}

/**
 * Seed helper: only sync genuine registered accounts, never demo accounts
 */
export async function seedSupabaseIfEmpty(initialUsers: UserProfile[], initialConnections: ConnectionRequest[]): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const genuineUsers = initialUsers.filter(u => 
      u.email && 
      !u.email.toLowerCase().includes('@demo.com') && 
      !u.id.startsWith('user_alex') && 
      !u.id.startsWith('user_elena') &&
      !u.id.startsWith('user_liam') &&
      !u.id.startsWith('user_maya') &&
      !u.id.startsWith('user_marcus')
    );

    if (genuineUsers.length === 0) return false;

    const { count, error } = await client.from('profiles').select('id', { count: 'exact', head: true });
    if (error) {
      handleSupabaseError('seed probe', error);
      return false;
    }

    if (count === 0) {
      for (const u of genuineUsers) {
        await saveSupabaseUserProfile(u);
      }
      return true;
    }
    return false;
  } catch (err) {
    handleSupabaseError('seed exception', err);
    return false;
  }
}

/**
 * Check if an email is registered in Supabase (case-insensitive)
 */
export async function isEmailRegisteredInSupabase(email: string, excludeUserId?: string): Promise<boolean> {
  const client = getSupabase();
  if (!client || !email) return false;

  try {
    const cleanEmail = email.trim().toLowerCase();
    let query = client.from('profiles').select('id', { count: 'exact', head: true }).ilike('email', cleanEmail);
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }
    const { count, error } = await query;
    if (error) {
      handleSupabaseError('check email registered', error);
      return false;
    }
    return (count || 0) > 0;
  } catch (err) {
    handleSupabaseError('check email registered exception', err);
    return false;
  }
}

// ----------------------------------------------------
// Supabase Auth Native Operations
// ----------------------------------------------------

/**
 * Sign Up with Name, Email & Password via Supabase Auth
 */
export async function signUpSupabaseAuth(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: any; session?: any; requiresEmailVerification?: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  try {
    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          full_name: cleanName,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.warn('[Supabase Auth] signUp error:', error);
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already exists')) {
        return {
          success: false,
          error: 'An account with this email already exists. Please log in or use Forgot Password.',
        };
      }
      // If Supabase's built-in confirmation email provider is rate-limited or unconfigured,
      // allow proceeding to the application's 6-digit OTP verification flow.
      if (
        msg.includes('confirmation email') ||
        msg.includes('confirmation') ||
        msg.includes('rate limit') ||
        msg.includes('smtp') ||
        msg.includes('email provider') ||
        (error as any).status === 500 ||
        (error as any).status === 429
      ) {
        console.warn('[Supabase Auth] Supabase confirmation email provider is rate-limited or disabled. Proceeding with application 6-digit OTP verification:', error.message);
        return {
          success: true,
          user: data?.user || undefined,
          requiresEmailVerification: true,
        };
      }
      return { success: false, error: error.message };
    }

    // Supabase Auth returns empty identities array if user is already registered (enumeration prevention)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        success: false,
        error: 'An account with this email already exists. Please log in or use Forgot Password.',
      };
    }

    // If session is returned immediately (email confirmation disabled or auto-confirmed)
    if (data.session && data.user) {
      return {
        success: true,
        user: data.user,
        session: data.session,
        requiresEmailVerification: false,
      };
    }

    // Email confirmation required
    return {
      success: true,
      user: data.user,
      requiresEmailVerification: true,
    };
  } catch (err: any) {
    console.error('[Supabase Auth] signUp exception:', err);
    return { success: false, error: err?.message || 'Failed to sign up.' };
  }
}

/**
 * Send OTP / Magic Code to email via official Supabase Auth
 */
export async function sendSupabaseAuthOtp(email: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await client.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.warn('[Supabase Auth] signInWithOtp error:', error);
      const msg = error.message.toLowerCase();
      if (msg.includes('confirmation email') || msg.includes('rate limit') || msg.includes('smtp')) {
        return { success: false, error: 'Built-in email provider is currently rate-limited. Please use the application verification code.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Auth] signInWithOtp exception:', err);
    return { success: false, error: err?.message || 'Failed to dispatch email verification code.' };
  }
}

/**
 * Verify 6-digit email OTP token via Supabase Auth
 */
export async function verifySupabaseAuthOtp(
  email: string,
  token: string
): Promise<{ success: boolean; user?: any; session?: any; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  try {
    // 1. Try signup OTP
    const signupAttempt = await client.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    if (!signupAttempt.error && signupAttempt.data?.user) {
      return {
        success: true,
        user: signupAttempt.data.user,
        session: signupAttempt.data.session,
      };
    }

    // 2. Try email OTP fallback
    const emailAttempt = await client.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    });

    if (!emailAttempt.error && emailAttempt.data?.user) {
      return {
        success: true,
        user: emailAttempt.data.user,
        session: emailAttempt.data.session,
      };
    }

    const err = signupAttempt.error || emailAttempt.error;
    console.warn('[Supabase Auth] verifyOtp failed:', err);
    return {
      success: false,
      error: err?.message || 'Invalid or expired verification code. Please check your email.',
    };
  } catch (err: any) {
    console.error('[Supabase Auth] verifyOtp exception:', err);
    return { success: false, error: err?.message || 'Invalid or expired verification code.' };
  }
}

/**
 * Sign In with Email & Password via Supabase Auth
 */
export async function signInWithSupabaseAuth(
  email: string,
  password: string
): Promise<{ success: boolean; user?: any; session?: any; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.warn('[Supabase Auth] signInWithPassword error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (err: any) {
    console.error('[Supabase Auth] signInWithPassword exception:', err);
    return { success: false, error: err?.message || 'Sign in failed.' };
  }
}

/**
 * Update authenticated user's password in Supabase Auth
 */
export async function updateSupabaseAuthPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    const { data, error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.warn('[Supabase Auth] updateUser password error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Auth] updateUser password exception:', err);
    return { success: false, error: err?.message || 'Failed to update password.' };
  }
}

/**
 * Request a 6-digit password reset verification code via email (valid for 25 minutes)
 */
export async function requestPasswordResetCode(email: string): Promise<{
  success: boolean;
  message: string;
  cooldownRemaining?: number;
  error?: string;
  fallbackToLink?: boolean;
}> {
  const cleanEmail = email.trim().toLowerCase();

  const doFetch = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data: any = {};
      try {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          if (res.status === 429) {
            data = { error: 'Please wait a moment before requesting another reset code.' };
          } else if (res.status >= 500) {
            data = { error: `Server is momentarily unavailable (status ${res.status}). Retrying...` };
          }
        }
      } catch {
        data = {};
      }

      return { res, data };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    let result: { res: Response; data: any };
    try {
      result = await doFetch();
    } catch (firstErr: any) {
      // Small pause and 1 quick retry for transient network glitches
      await new Promise(r => setTimeout(r, 800));
      result = await doFetch();
    }

    const { res, data } = result;

    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || `A 6-digit verification code has been sent to ${cleanEmail}.`,
      };
    } else {
      const errMsg = data.error || (res.status === 429 
        ? 'Please wait a few seconds before requesting a new code.'
        : 'Could not send verification code at this time.');
      return {
        success: false,
        message: errMsg,
        cooldownRemaining: data.cooldownRemaining,
        error: errMsg,
      };
    }
  } catch (err: any) {
    // If the server API fails or times out, seamlessly try Supabase's native reset email
    console.warn('[AUTH] OTP request failed, attempting direct Supabase reset link fallback:', err?.message || err);
    try {
      const fallbackRes = await requestSupabasePasswordReset(cleanEmail);
      if (fallbackRes.success) {
        return {
          success: true,
          message: `A password reset link has been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`,
          fallbackToLink: true,
        };
      }
    } catch {
      // ignore fallback error and report primary error
    }

    return {
      success: false,
      message: err?.name === 'AbortError' 
        ? 'Request timed out. Please check your internet connection and try again.' 
        : (err?.message || 'Network error while requesting verification code. Please try again.'),
      error: err?.message,
    };
  }
}

/**
 * Change password in the app using the 6-digit verification code
 */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  try {
    const res = await fetch('/api/auth/reset-password-with-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        code: cleanCode,
        newPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Your password has been successfully updated!',
      };
    } else {
      return {
        success: false,
        message: data.error || 'Failed to reset password with code.',
        error: data.error,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error while updating password.',
      error: err?.message,
    };
  }
}

/**
 * Trigger official password reset email via Supabase Auth
 */
export async function requestSupabasePasswordReset(email: string): Promise<{ success: boolean; message: string; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, message: 'Supabase is not configured.', error: 'Supabase client unavailable' };
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });

    if (error) {
      console.warn('[Supabase Auth] resetPasswordForEmail error:', error);
      return {
        success: false,
        message: error.message,
        error: error.message,
      };
    }

    // Also record in password_reset_requests for governance tracking
    const requestId = `pwd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    saveSupabasePasswordResetRequest({
      id: requestId,
      email: cleanEmail,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    return {
      success: true,
      message: `Password reset email sent to ${cleanEmail}. Please check your inbox and click the link to reset your password.`,
    };
  } catch (err: any) {
    console.error('[Supabase Auth] resetPasswordForEmail exception:', err);
    return {
      success: false,
      message: err?.message || 'Failed to send password reset email.',
      error: err?.message,
    };
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function signOutSupabaseAuth(): Promise<void> {
  const client = getSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('[Supabase Auth] signOut notice:', e);
    }
  }
}

/**
 * Fetch password reset requests from Supabase
 */
export async function fetchSupabasePasswordResetRequests(): Promise<any[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('password_reset_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError('fetch password reset requests', error);
      return null;
    }

    return (data || []).map(r => ({
      id: r.id,
      email: (r.email || '').toLowerCase(),
      name: r.name || undefined,
      status: r.status || 'PENDING',
      adminNotes: r.admin_notes || undefined,
      tempPasswordHint: r.temp_password_hint || undefined,
      resolvedAt: r.resolved_at || undefined,
      resolvedBy: r.resolved_by || undefined,
      createdAt: r.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    handleSupabaseError('fetch password reset requests exception', err);
    return null;
  }
}

/**
 * Submit password reset request to Supabase
 */
export async function saveSupabasePasswordResetRequest(request: any): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('password_reset_requests').upsert({
      id: request.id,
      email: (request.email || '').toLowerCase(),
      name: request.name || null,
      status: request.status || 'PENDING',
      admin_notes: request.adminNotes || null,
      temp_password_hint: request.tempPasswordHint || null,
      resolved_at: request.resolvedAt || null,
      resolved_by: request.resolvedBy || null,
      created_at: request.createdAt || new Date().toISOString(),
    });

    if (error) {
      handleSupabaseError('save password reset request', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('save password reset request exception', err);
    return false;
  }
}

// --------------------------------------------------------------------
// User Ratings & Reputation Client Services
// --------------------------------------------------------------------

/**
 * Fetch ratings and summary for a given user
 */
export async function fetchUserRatings(userId: string): Promise<{ ratings: UserRating[]; summary: RatingSummary }> {
  const defaultSummary: RatingSummary = {
    averageRating: 0,
    totalRatings: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };

  if (!userId) {
    return { ratings: [], summary: defaultSummary };
  }

  try {
    const res = await fetch(`/api/ratings/user/${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          ratings: data.ratings || [],
          summary: data.summary || defaultSummary,
        };
      }
    }
  } catch (err) {
    console.warn('[Ratings Service] fetchUserRatings error:', err);
  }

  // Fallback: Direct Supabase query if backend endpoint was unreachable
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('user_ratings')
        .select('*')
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let sum = 0;
        const ratings: UserRating[] = data.map((r: any) => {
          const star = Math.max(1, Math.min(5, Math.round(Number(r.rating)))) as 1 | 2 | 3 | 4 | 5;
          distribution[star] = (distribution[star] || 0) + 1;
          sum += star;
          return {
            id: r.id,
            raterId: r.rater_id,
            raterName: 'Peer Member',
            ratedUserId: r.rated_user_id,
            rating: star,
            review: r.review || undefined,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        });

        const averageRating = ratings.length > 0 ? Number((sum / ratings.length).toFixed(1)) : 0;
        return {
          ratings,
          summary: {
            averageRating,
            totalRatings: ratings.length,
            distribution,
          },
        };
      }
    } catch (e) {
      // ignore
    }
  }

  return { ratings: [], summary: defaultSummary };
}

/**
 * Check if the active user is eligible to rate this peer
 */
export async function checkRatingEligibility(raterId: string, ratedUserId: string): Promise<RatingEligibility> {
  if (!raterId || !ratedUserId) {
    return { canRate: false, reason: 'User ID missing' };
  }

  if (raterId === ratedUserId) {
    return { canRate: false, reason: 'You cannot rate yourself.' };
  }

  try {
    const res = await fetch(`/api/ratings/eligibility?raterId=${encodeURIComponent(raterId)}&ratedUserId=${encodeURIComponent(ratedUserId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          canRate: data.canRate,
          reason: data.reason,
          existingRating: data.existingRating || null,
          connectionId: data.connectionId,
        };
      }
    }
  } catch (err) {
    console.warn('[Ratings Service] checkRatingEligibility error:', err);
  }

  return {
    canRate: false,
    reason: 'Ratings are available after you complete an accepted SkillMesh connection.',
  };
}

/**
 * Submit or update a user rating
 */
export async function submitUserRating(
  raterId: string,
  ratedUserId: string,
  rating: number,
  review?: string,
  skillName?: string,
  interactionType?: string,
  interactionId?: string
): Promise<{ success: boolean; rating?: UserRating; summary?: RatingSummary; error?: string }> {
  try {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raterId, ratedUserId, rating, review, skillName, interactionType, interactionId }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to submit rating.' };
    }

    return {
      success: true,
      rating: data.rating,
      summary: data.summary,
    };
  } catch (err: any) {
    console.error('[Ratings Service] submitUserRating error:', err);
    return { success: false, error: err?.message || 'Network error submitting rating.' };
  }
}

/**
 * Delete an existing user rating
 */
export async function deleteUserRating(
  ratingId: string,
  raterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/ratings/${encodeURIComponent(ratingId)}?raterId=${encodeURIComponent(raterId)}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to delete rating.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error deleting rating.' };
  }
}

/**
 * Fetch a sanitized public profile for a user
 */
export async function fetchPublicUserProfile(userId: string): Promise<{
  profile: UserProfile;
  ratingSummary: RatingSummary;
  ratings: UserRating[];
  stats: {
    totalExchanges: number;
    skillsTaught: number;
    skillsLearned: number;
    ratingsReceived: number;
    averageRating: number;
  };
  exchangeHistory: any[];
} | null> {
  if (!userId) return null;

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/public-profile`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.profile) {
        return {
          profile: data.profile,
          ratingSummary: data.ratingSummary,
          ratings: data.ratings || [],
          stats: data.stats || {
            totalExchanges: 0,
            skillsTaught: 0,
            skillsLearned: 0,
            ratingsReceived: 0,
            averageRating: 0,
          },
          exchangeHistory: data.exchangeHistory || [],
        };
      }
    }
  } catch (err) {
    console.warn('[Ratings Service] fetchPublicUserProfile error:', err);
  }

  return null;
}



