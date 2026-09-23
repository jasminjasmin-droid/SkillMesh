import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment credentials (supports both standard and Vite-prefixed environment variables)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let serverSupabaseClient: SupabaseClient | null = null;
let isSchemaVerified: boolean | null = null;

export function isSupabaseConfiguredOnServer(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.trim().length > 0 &&
    supabaseKey.trim().length > 0 &&
    !supabaseUrl.includes('placeholder')
  );
}

export function getServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfiguredOnServer()) return null;
  if (isSchemaVerified === false) return null;

  if (!serverSupabaseClient) {
    try {
      serverSupabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.warn('[SERVER SUPABASE] Failed to initialize client:', err);
      return null;
    }
  }

  return serverSupabaseClient;
}

export async function testServerSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  tables?: {
    profiles: number;
    skills: number;
    connections: number;
    messages: number;
  };
}> {
  if (!isSupabaseConfiguredOnServer()) {
    return {
      connected: false,
      message: 'Supabase URL or Key not set in environment variables.',
    };
  }

  const client = getServerSupabase();
  if (!client) {
    return {
      connected: false,
      message: 'Supabase client could not be instantiated.',
    };
  }

  try {
    const { count: userCount, error: profileErr } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (profileErr) {
      isSchemaVerified = false;
      return {
        connected: false,
        message: `Database table error: ${profileErr.message}. Ensure schema is applied in Supabase SQL editor.`,
      };
    }

    isSchemaVerified = true;

    const { count: skillCount } = await client.from('offered_skills').select('id', { count: 'exact', head: true });
    const { count: connCount } = await client.from('connection_requests').select('id', { count: 'exact', head: true });
    const { count: msgCount } = await client.from('messages').select('id', { count: 'exact', head: true });

    return {
      connected: true,
      message: 'Connected to Supabase PostgreSQL database successfully.',
      tables: {
        profiles: userCount || 0,
        skills: skillCount || 0,
        connections: connCount || 0,
        messages: msgCount || 0,
      },
    };
  } catch (err: any) {
    isSchemaVerified = false;
    return {
      connected: false,
      message: `Supabase query exception: ${err?.message || 'Network error'}`,
    };
  }
}

/**
 * Fetch all genuine registered users from Supabase
 */
export async function fetchSupabaseUsersOnServer(): Promise<any[] | null> {
  const client = getServerSupabase();
  if (!client) return null;

  try {
    const { data: profiles, error: profileErr } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profileErr || !profiles) {
      return null;
    }

    const { data: offeredSkills } = await client.from('offered_skills').select('*');
    const { data: wantedSkills } = await client.from('wanted_skills').select('*');

    return profiles.map(p => {
      const userOffered = (offeredSkills || [])
        .filter(s => s.user_id === p.id)
        .map(s => ({
          id: s.id,
          name: s.name,
          proficiency: s.proficiency,
          category: s.category || 'TECHNICAL',
          description: s.experience_description || '',
          yearsOfExperience: parseInt(s.years_of_practice) || 1,
          experienceDescription: s.experience_description || '',
          yearsOfPractice: s.years_of_practice || '',
          teachingConfidence: s.teaching_confidence || 'Both',
          supportingLink: s.supporting_link || undefined,
          supportingLinkType: s.supporting_link_type || undefined,
        }));

      const userWanted = (wantedSkills || [])
        .filter(w => w.user_id === p.id)
        .map(w => ({
          id: w.id,
          name: w.name,
          currentLevel: w.current_level,
          category: w.category || 'TECHNICAL',
          learningGoal: w.learning_goal || '',
        }));

      return {
        id: p.id,
        name: p.name,
        email: (p.email || '').toLowerCase(),
        joinedDate: p.joined_date || new Date().toISOString(),
        avatarUrl: p.avatar_url || '',
        titleOrRole: p.title_or_role || 'Skill Explorer & Peer Mentor',
        bio: p.bio || '',
        status: p.status || 'STUDENT',
        institutionName: p.institution_name,
        organizationName: p.organization_name,
        occupationDetails: p.occupation_details,
        isProfileComplete: p.is_profile_complete ?? true,
        professionalLinks: p.professional_links,
        linkedinUrl: p.linkedin_url,
        githubUrl: p.github_url,
        portfolioUrl: p.portfolio_url,
        location: p.location || '',
        isVerified: p.is_verified ?? true,
        contactPreference: p.contact_preference || 'Email',
        contactHandle: p.contact_handle || '',
        role: p.role || 'user',
        accountStatus: p.account_status || 'ACTIVE',
        statusReason: p.status_reason,
        statusUpdatedAt: p.status_updated_at,
        offeredSkillsCount: userOffered.length,
        wantedSkillsCount: userWanted.length,
        offeredSkills: userOffered,
        wantedSkills: userWanted,
        institutionOrOrg: p.organization_name || p.institution_name || p.occupation_details,
      };
    });
  } catch (err) {
    console.warn('[SERVER SUPABASE] fetchSupabaseUsersOnServer notice:', err);
    return null;
  }
}

/**
 * Upsert a user and their skills to Supabase
 */
export async function saveSupabaseUserOnServer(user: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client) return false;

  try {
    const { error: profileErr } = await client.from('profiles').upsert({
      id: user.id,
      name: user.name,
      email: (user.email || '').toLowerCase(),
      title_or_role: user.titleOrRole || '',
      bio: user.bio || '',
      avatar_url: user.avatarUrl || '',
      status: user.status || 'STUDENT',
      institution_name: user.institutionName || user.institutionOrOrg || null,
      organization_name: user.organizationName || user.institutionOrOrg || null,
      occupation_details: user.occupationDetails || null,
      is_profile_complete: user.isProfileComplete ?? true,
      professional_links: user.professionalLinks || null,
      linkedin_url: user.linkedinUrl || null,
      github_url: user.githubUrl || null,
      portfolio_url: user.portfolioUrl || null,
      location: user.location || '',
      joined_date: user.joinedDate ? user.joinedDate.split('T')[0] : new Date().toISOString().split('T')[0],
      is_verified: user.isVerified ?? true,
      contact_preference: user.contactPreference || 'Email',
      contact_handle: user.contactHandle || '',
      role: user.role || 'user',
      account_status: user.accountStatus || 'ACTIVE',
      status_reason: user.statusReason || null,
      status_updated_at: user.statusUpdatedAt || null,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.warn('[SERVER SUPABASE] Error saving profile:', profileErr.message);
      return false;
    }

    // Upsert offered skills
    if (Array.isArray(user.offeredSkills)) {
      for (const s of user.offeredSkills) {
        if (!s.name) continue;
        await client.from('offered_skills').upsert({
          id: s.id || `off_${user.id}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: user.id,
          name: s.name,
          proficiency: s.proficiency || 'Intermediate',
          experience_description: s.experienceDescription || s.description || '',
          years_of_practice: s.yearsOfPractice || (s.yearsOfExperience ? `${s.yearsOfExperience} years` : '1 year'),
          teaching_confidence: s.teachingConfidence || 'Both',
          supporting_link: s.supportingLink || null,
          supporting_link_type: s.supportingLinkType || null,
          category: s.category || 'TECHNICAL',
        });
      }
    }

    // Upsert wanted skills
    if (Array.isArray(user.wantedSkills)) {
      for (const w of user.wantedSkills) {
        if (!w.name) continue;
        await client.from('wanted_skills').upsert({
          id: w.id || `want_${user.id}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: user.id,
          name: w.name,
          current_level: w.currentLevel || 'Beginner',
          learning_goal: w.learningGoal || '',
          category: w.category || 'TECHNICAL',
        });
      }
    }

    return true;
  } catch (err) {
    console.warn('[SERVER SUPABASE] saveSupabaseUserOnServer exception:', err);
    return false;
  }
}

/**
 * Fetch all connections from Supabase
 */
export async function fetchSupabaseConnectionsOnServer(): Promise<any[] | null> {
  const client = getServerSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('connection_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    return data.map(c => ({
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
      requestType: c.request_type || 'MUTUAL_EXCHANGE',
      isKnowledgeSharing: Boolean(c.is_knowledge_sharing),
      isProjectCollaboration: Boolean(c.is_project_collaboration),
      collaborationDetails: c.collaboration_details,
      endedAt: c.ended_at,
      endedBy: c.ended_by,
      endReason: c.end_reason,
    }));
  } catch (err) {
    console.warn('[SERVER SUPABASE] fetchSupabaseConnectionsOnServer notice:', err);
    return null;
  }
}

/**
 * Save connection to Supabase
 */
export async function saveSupabaseConnectionOnServer(conn: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client) return false;

  try {
    let senderId = (conn.senderId || '').trim();
    let receiverId = (conn.receiverId || '').trim();

    // Remap any legacy or local admin IDs to the root Supabase Administrator ID
    const ADMIN_SUPABASE_ID = '324a990f-2ac3-4197-9143-9b9b37125a0b';
    if (senderId === 'user_1787907498142_knz3' || senderId === 'admin_skillmesh_root' || conn.senderEmail === 'admin.skillmesh@gmail.com') {
      senderId = ADMIN_SUPABASE_ID;
    }
    if (
      receiverId === 'user_1787907498142_knz3' ||
      receiverId === 'admin_skillmesh_root' ||
      conn.receiverEmail === 'admin.skillmesh@gmail.com' ||
      (conn.receiverName === 'Admin' && receiverId.startsWith('user_'))
    ) {
      receiverId = ADMIN_SUPABASE_ID;
    }

    if (!senderId || !receiverId) {
      console.warn('[SERVER SUPABASE] Missing senderId or receiverId for connection, skipping save.');
      return false;
    }

    // Verify foreign key integrity against profiles table
    const { data: existingProfiles } = await client
      .from('profiles')
      .select('id')
      .in('id', [senderId, receiverId]);

    const profileIdSet = new Set((existingProfiles || []).map(p => p.id));

    if (!profileIdSet.has(senderId)) {
      console.warn(`[SERVER SUPABASE] Skipping connection save: sender_id "${senderId}" does not exist in profiles.`);
      return false;
    }
    if (!profileIdSet.has(receiverId)) {
      console.warn(`[SERVER SUPABASE] Skipping connection save: receiver_id "${receiverId}" does not exist in profiles.`);
      return false;
    }

    const safeConnectionId = (conn.id || `conn_${senderId}_${receiverId}`).replace('user_1787907498142_knz3', ADMIN_SUPABASE_ID);

    const { error } = await client.from('connection_requests').upsert({
      id: safeConnectionId,
      sender_id: senderId,
      sender_name: conn.senderName,
      receiver_id: receiverId,
      receiver_name: conn.receiverName,
      offered_skill_name: conn.offeredSkillName,
      wanted_skill_name: conn.wantedSkillName,
      note: conn.note || '',
      contact_method: conn.contactMethod || 'Email',
      contact_value: conn.contactValue || '',
      status: conn.status || 'PENDING',
      request_type: conn.requestType || 'MUTUAL_EXCHANGE',
      is_knowledge_sharing: Boolean(conn.isKnowledgeSharing),
      is_project_collaboration: Boolean(conn.isProjectCollaboration),
      collaboration_details: conn.collaborationDetails || null,
      ended_at: conn.endedAt || null,
      ended_by: conn.endedBy || null,
      end_reason: conn.endReason || null,
      created_at: conn.createdAt || new Date().toISOString(),
    });

    if (error) {
      console.warn('[SERVER SUPABASE] Error saving connection:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[SERVER SUPABASE] saveSupabaseConnectionOnServer exception:', err);
    return false;
  }
}

/**
 * Fetch messages from Supabase
 */
export async function fetchSupabaseMessagesOnServer(connectionId?: string): Promise<any[] | null> {
  const client = getServerSupabase();
  if (!client) return null;

  try {
    let query = client.from('messages').select('*').order('created_at', { ascending: true });
    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }
    const { data, error } = await query;
    if (error || !data) return null;

    return data.map(m => ({
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
    console.warn('[SERVER SUPABASE] fetchSupabaseMessagesOnServer notice:', err);
    return null;
  }
}

/**
 * Save message to Supabase
 */
export async function saveSupabaseMessageOnServer(msg: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('messages').upsert({
      id: msg.id,
      connection_id: msg.connectionId,
      sender_id: msg.senderId,
      sender_name: msg.senderName,
      receiver_id: msg.receiverId || null,
      text: msg.text || '',
      attachments: msg.attachments || [],
      created_at: msg.createdAt || new Date().toISOString(),
    });

    if (error) {
      console.warn('[SERVER SUPABASE] Error saving message:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[SERVER SUPABASE] saveSupabaseMessageOnServer exception:', err);
    return false;
  }
}

/**
 * Migration helper: Safely writes existing local accounts (e.g. Kitty) to Supabase without duplicates
 */
export async function migrateLocalDataToSupabase(
  localUsers: any[],
  localConnections: any[],
  localMessages: any[]
): Promise<{ migratedUsers: number; migratedConns: number; migratedMsgs: number }> {
  let migratedUsers = 0;
  let migratedConns = 0;
  let migratedMsgs = 0;

  if (!isSupabaseConfiguredOnServer()) {
    return { migratedUsers, migratedConns, migratedMsgs };
  }

  try {
    for (const u of localUsers) {
      const ok = await saveSupabaseUserOnServer(u);
      if (ok) migratedUsers++;
    }

    for (const c of localConnections) {
      const ok = await saveSupabaseConnectionOnServer(c);
      if (ok) migratedConns++;
    }

    for (const m of localMessages) {
      const ok = await saveSupabaseMessageOnServer(m);
      if (ok) migratedMsgs++;
    }

    console.log(
      `[DATABASE MIGRATION] Migrated to Supabase: ${migratedUsers} users, ${migratedConns} connections, ${migratedMsgs} messages.`
    );
  } catch (err) {
    console.warn('[DATABASE MIGRATION] Migration error notice:', err);
  }

  return { migratedUsers, migratedConns, migratedMsgs };
}

/**
 * Check if an email already exists in Supabase profiles (case-insensitive)
 */
export async function checkSupabaseEmailExistsOnServer(email: string, excludeUserId?: string): Promise<{ exists: boolean; existingUser?: any }> {
  const client = getServerSupabase();
  if (!client || !email) return { exists: false };

  try {
    const cleanEmail = email.trim().toLowerCase();
    let query = client
      .from('profiles')
      .select('id, name, email, created_at')
      .ilike('email', cleanEmail);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[SERVER SUPABASE] Email existence check query error:', error.message);
      return { exists: false };
    }

    if (data && data.length > 0) {
      return { exists: true, existingUser: data[0] };
    }
    return { exists: false };
  } catch (err) {
    console.warn('[SERVER SUPABASE] Email check exception:', err);
    return { exists: false };
  }
}

function isMissingTableError(error: any): boolean {
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

/**
 * Fetch password reset requests from Supabase
 */
export async function fetchSupabasePasswordResetsOnServer(): Promise<any[] | null> {
  const client = getServerSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('password_reset_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch password resets notice:', error.message);
      }
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
    return null;
  }
}

/**
 * Save password reset request to Supabase
 */
export async function saveSupabasePasswordResetOnServer(request: any): Promise<boolean> {
  const client = getServerSupabase();
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
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] Save password reset request notice:', error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Admin: Create an authenticated user in Supabase Auth directly (with auto-confirmed email)
 */
export async function createSupabaseAuthUserAdmin(
  email: string,
  password?: string,
  name?: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  const client = getServerSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not available on server.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || cleanEmail.split('@')[0]).trim();

  try {
    // 1. Check if user already exists in auth.users
    const { data: listData, error: listError } = await client.auth.admin.listUsers();
    if (!listError && listData && Array.isArray(listData.users)) {
      const existingUser = (listData.users as any[]).find(u => (u.email || '').toLowerCase() === cleanEmail);
      if (existingUser) {
        // Update password if supplied
        if (password && password.length >= 6) {
          await client.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
            user_metadata: { name: cleanName, full_name: cleanName },
          });
        }
        return { success: true, user: existingUser };
      }
    }

    // 2. Create user with email pre-confirmed
    const { data, error } = await client.auth.admin.createUser({
      email: cleanEmail,
      password: password || crypto.randomUUID().slice(0, 12),
      email_confirm: true,
      user_metadata: {
        name: cleanName,
        full_name: cleanName,
      },
    });

    if (error) {
      console.warn('[SERVER SUPABASE] createSupabaseAuthUserAdmin notice:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, user: data?.user };
  } catch (err: any) {
    console.error('[SERVER SUPABASE] createSupabaseAuthUserAdmin error:', err);
    return { success: false, error: err?.message || 'Failed to create auth user.' };
  }
}

/**
 * Admin: Update user password in Supabase Auth directly
 */
export async function updateSupabaseAuthUserPasswordAdmin(
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const client = getServerSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not available on server.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data: listData, error: listError } = await client.auth.admin.listUsers();
    if (!listError && listData && Array.isArray(listData.users)) {
      const existingUser = (listData.users as any[]).find(u => (u.email || '').toLowerCase() === cleanEmail);
      if (existingUser) {
        const { error: updateErr } = await client.auth.admin.updateUserById(existingUser.id, {
          password: newPassword,
          email_confirm: true,
        });
        if (updateErr) {
          console.warn('[SERVER SUPABASE] update user password error:', updateErr.message);
          return { success: false, error: updateErr.message };
        }
        return { success: true };
      }
    }

    // If user was not found in auth.users, create user with this password
    const { error: createErr } = await client.auth.admin.createUser({
      email: cleanEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        name: cleanEmail.split('@')[0],
      },
    });

    if (createErr) {
      console.warn('[SERVER SUPABASE] create user with password error:', createErr.message);
      return { success: false, error: createErr.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[SERVER SUPABASE] updateSupabaseAuthUserPasswordAdmin error:', err);
    return { success: false, error: err?.message || 'Failed to update user password.' };
  }
}

/**
 * Fetch a single user profile with all offered and wanted skills from Supabase
 */
export async function fetchSupabaseUserProfileById(userId: string): Promise<any | null> {
  const client = getServerSupabase();
  if (!client || !userId) return null;

  try {
    const { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return null;
    }

    const { data: offeredSkills } = await client
      .from('offered_skills')
      .select('*')
      .eq('user_id', userId);

    const { data: wantedSkills } = await client
      .from('wanted_skills')
      .select('*')
      .eq('user_id', userId);

    const userOffered = (offeredSkills || []).map(s => ({
      id: s.id,
      name: s.name,
      proficiency: s.proficiency,
      category: s.category || 'TECHNICAL',
      description: s.experience_description || '',
      yearsOfExperience: parseInt(s.years_of_practice) || 1,
      experienceDescription: s.experience_description || '',
      yearsOfPractice: s.years_of_practice || '',
      teachingConfidence: s.teaching_confidence || 'Both',
      supportingLink: s.supporting_link || undefined,
      supportingLinkType: s.supporting_link_type || undefined,
    }));

    const userWanted = (wantedSkills || []).map(w => ({
      id: w.id,
      name: w.name,
      currentLevel: w.current_level,
      category: w.category || 'TECHNICAL',
      learningGoal: w.learning_goal || '',
    }));

    return {
      id: profile.id,
      name: profile.name,
      email: (profile.email || '').toLowerCase(),
      joinedDate: profile.joined_date || new Date().toISOString(),
      avatarUrl: profile.avatar_url || '',
      titleOrRole: profile.title_or_role || 'Skill Explorer & Peer Mentor',
      bio: profile.bio || '',
      status: profile.status || 'STUDENT',
      institutionName: profile.institution_name,
      organizationName: profile.organization_name,
      occupationDetails: profile.occupation_details,
      isProfileComplete: profile.is_profile_complete ?? true,
      professionalLinks: profile.professional_links,
      linkedinUrl: profile.linkedin_url,
      githubUrl: profile.github_url,
      portfolioUrl: profile.portfolio_url,
      location: profile.location || '',
      isVerified: profile.is_verified ?? true,
      contactPreference: profile.contact_preference || 'Email',
      contactHandle: profile.contact_handle || '',
      role: profile.role || 'user',
      accountStatus: profile.account_status || 'ACTIVE',
      statusReason: profile.status_reason,
      statusUpdatedAt: profile.status_updated_at,
      offeredSkillsCount: userOffered.length,
      wantedSkillsCount: userWanted.length,
      offeredSkills: userOffered,
      wantedSkills: userWanted,
      institutionOrOrg: profile.organization_name || profile.institution_name || profile.occupation_details,
    };
  } catch (err) {
    console.warn('[SERVER SUPABASE] fetchSupabaseUserProfileById notice:', err);
    return null;
  }
}

/**
 * Fetch all ratings for a given user from Supabase
 */
export async function fetchSupabaseRatingsForUser(ratedUserId: string): Promise<any[] | null> {
  const client = getServerSupabase();
  if (!client || !ratedUserId) return null;

  try {
    const { data, error } = await client
      .from('user_ratings')
      .select('*')
      .eq('rated_user_id', ratedUserId)
      .order('created_at', { ascending: false });

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch user_ratings notice:', error.message);
      }
      return null;
    }

    return (data || []).map(r => ({
      id: r.id,
      raterId: r.rater_id,
      ratedUserId: r.rated_user_id,
      rating: Number(r.rating),
      review: r.review || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || r.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    return null;
  }
}

/**
 * Fetch a specific rating between rater and rated user from Supabase
 */
export async function fetchSupabaseRatingBetweenUsers(raterId: string, ratedUserId: string): Promise<any | null> {
  const client = getServerSupabase();
  if (!client || !raterId || !ratedUserId) return null;

  try {
    const { data, error } = await client
      .from('user_ratings')
      .select('*')
      .eq('rater_id', raterId)
      .eq('rated_user_id', ratedUserId)
      .maybeSingle();

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch rating between users notice:', error.message);
      }
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      raterId: data.rater_id,
      ratedUserId: data.rated_user_id,
      rating: Number(data.rating),
      review: data.review || undefined,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || data.created_at || new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Save or update a rating in Supabase
 */
export async function saveSupabaseRatingOnServer(rating: {
  id: string;
  raterId: string;
  ratedUserId: string;
  rating: number;
  review?: string;
  createdAt?: string;
  updatedAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  const client = getServerSupabase();
  if (!client) return { success: false, error: 'Supabase client unavailable' };

  if (rating.raterId === rating.ratedUserId) {
    return { success: false, error: 'Users cannot rate themselves.' };
  }

  if (rating.rating < 1 || rating.rating > 5) {
    return { success: false, error: 'Rating must be an integer between 1 and 5.' };
  }

  try {
    const { error } = await client.from('user_ratings').upsert(
      {
        id: rating.id,
        rater_id: rating.raterId,
        rated_user_id: rating.ratedUserId,
        rating: Math.round(rating.rating),
        review: rating.review?.trim() || null,
        created_at: rating.createdAt || new Date().toISOString(),
        updated_at: rating.updatedAt || new Date().toISOString(),
      },
      { onConflict: 'rater_id,rated_user_id' }
    );

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] Save user_rating notice:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Delete a user rating in Supabase
 */
export async function deleteSupabaseRatingOnServer(ratingId: string, raterId: string): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !ratingId) return false;

  try {
    const { error } = await client
      .from('user_ratings')
      .delete()
      .eq('id', ratingId)
      .eq('rater_id', raterId);

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] Delete user_rating notice:', error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * --------------------------------------------------------------------
 * User Live Availability Functions
 * --------------------------------------------------------------------
 */
export async function fetchSupabaseUserAvailability(userId: string): Promise<any | null> {
  const client = getServerSupabase();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('user_availability')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch user_availability notice:', error.message);
      }
      return null;
    }

    if (!data) return null;

    return {
      userId: data.user_id,
      status: data.availability_status || 'UNAVAILABLE',
      mode: data.availability_mode || 'BOTH',
      customStatus: data.custom_status || undefined,
      updatedAt: data.updated_at || new Date().toISOString()
    };
  } catch (err) {
    return null;
  }
}

export async function fetchAllSupabaseAvailabilities(): Promise<Record<string, any>> {
  const client = getServerSupabase();
  const map: Record<string, any> = {};
  if (!client) return map;

  try {
    const { data, error } = await client
      .from('user_availability')
      .select('*');

    if (error || !data) return map;

    for (const item of data) {
      map[item.user_id] = {
        userId: item.user_id,
        status: item.availability_status || 'UNAVAILABLE',
        mode: item.availability_mode || 'BOTH',
        customStatus: item.custom_status || undefined,
        updatedAt: item.updated_at || new Date().toISOString()
      };
    }
    return map;
  } catch (err) {
    return map;
  }
}

export async function saveSupabaseUserAvailability(record: {
  userId: string;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  mode: 'SKILL_EXCHANGE' | 'MENTORSHIP' | 'BOTH';
  customStatus?: string;
  updatedAt?: string;
}): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !record.userId) return false;

  const timestamp = record.updatedAt || new Date().toISOString();

  try {
    const { error } = await client.from('user_availability').upsert(
      {
        user_id: record.userId,
        availability_status: record.status,
        availability_mode: record.mode,
        custom_status: record.customStatus || null,
        updated_at: timestamp
      },
      { onConflict: 'user_id' }
    );

    if (error && !isMissingTableError(error)) {
      console.warn('[SERVER SUPABASE] save user_availability notice:', error.message);
    }

    // Also update profiles table for redundancy
    await client.from('profiles').update({
      availability_status: record.status,
      availability_mode: record.mode,
      availability_updated_at: timestamp
    }).eq('id', record.userId);

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * --------------------------------------------------------------------
 * Mentorship Requests & Active Mentorships
 * --------------------------------------------------------------------
 */
export async function fetchSupabaseMentorshipRequests(userId: string): Promise<any[]> {
  const client = getServerSupabase();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client
      .from('mentorship_requests')
      .select('*')
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch mentorship_requests notice:', error.message);
      }
      return [];
    }

    return (data || []).map(r => ({
      id: r.id,
      mentorId: r.mentor_id,
      mentorName: r.mentor_name,
      mentorAvatar: r.mentor_avatar,
      mentorTitle: r.mentor_title,
      menteeId: r.mentee_id,
      menteeName: r.mentee_name,
      menteeAvatar: r.mentee_avatar,
      menteeTitle: r.mentee_title,
      topic: r.topic,
      message: r.message,
      experienceLevel: r.experience_level || 'Beginner',
      sessionStyle: r.session_style || 'Flexible',
      preferredAvailability: r.preferred_availability,
      status: r.status,
      connectionId: r.connection_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch (err) {
    return [];
  }
}

export async function saveSupabaseMentorshipRequest(req: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !req.id) return false;

  try {
    const { error } = await client.from('mentorship_requests').upsert({
      id: req.id,
      mentor_id: req.mentorId,
      mentor_name: req.mentorName,
      mentor_avatar: req.mentorAvatar || null,
      mentor_title: req.mentorTitle || null,
      mentee_id: req.menteeId,
      mentee_name: req.menteeName,
      mentee_avatar: req.menteeAvatar || null,
      mentee_title: req.menteeTitle || null,
      topic: req.topic,
      message: req.message,
      experience_level: req.experienceLevel || 'Beginner',
      session_style: req.sessionStyle || 'Flexible',
      preferred_availability: req.preferredAvailability || null,
      status: req.status || 'PENDING',
      connection_id: req.connectionId || null,
      created_at: req.createdAt || new Date().toISOString(),
      updated_at: req.updatedAt || new Date().toISOString()
    }, { onConflict: 'id' });

    if (error && !isMissingTableError(error)) {
      console.warn('[SERVER SUPABASE] save mentorship_request notice:', error.message);
    }
    return !error;
  } catch (err) {
    return false;
  }
}

export async function fetchSupabaseActiveMentorships(userId: string): Promise<any[]> {
  const client = getServerSupabase();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client
      .from('mentorships')
      .select('*')
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch mentorships notice:', error.message);
      }
      return [];
    }

    return (data || []).map(m => ({
      id: m.id,
      requestId: m.request_id,
      mentorId: m.mentor_id,
      mentorName: m.mentor_name,
      mentorAvatar: m.mentor_avatar,
      mentorTitle: m.mentor_title,
      menteeId: m.mentee_id,
      menteeName: m.mentee_name,
      menteeAvatar: m.mentee_avatar,
      menteeTitle: m.mentee_title,
      topic: m.topic,
      status: m.status,
      startDate: m.start_date,
      completedAt: m.completed_at,
      notes: m.notes,
      connectionId: m.connection_id,
      createdAt: m.created_at
    }));
  } catch (err) {
    return [];
  }
}

export async function saveSupabaseActiveMentorship(mentorship: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !mentorship.id) return false;

  try {
    const { error } = await client.from('mentorships').upsert({
      id: mentorship.id,
      request_id: mentorship.requestId || null,
      mentor_id: mentorship.mentorId,
      mentor_name: mentorship.mentorName,
      mentor_avatar: mentorship.mentorAvatar || null,
      mentor_title: mentorship.mentorTitle || null,
      mentee_id: mentorship.menteeId,
      mentee_name: mentorship.menteeName,
      mentee_avatar: mentorship.menteeAvatar || null,
      mentee_title: mentorship.menteeTitle || null,
      topic: mentorship.topic,
      status: mentorship.status || 'ACTIVE',
      start_date: mentorship.startDate || new Date().toISOString(),
      completed_at: mentorship.completedAt || null,
      notes: mentorship.notes || null,
      connection_id: mentorship.connectionId || null,
      created_at: mentorship.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });

    if (error && !isMissingTableError(error)) {
      console.warn('[SERVER SUPABASE] save mentorship notice:', error.message);
    }
    return !error;
  } catch (err) {
    return false;
  }
}

/**
 * --------------------------------------------------------------------
 * Calling & Call History Functions
 * --------------------------------------------------------------------
 */
export async function saveSupabaseCallSession(session: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !session.id) return false;

  try {
    const { error } = await client.from('call_sessions').upsert({
      id: session.id,
      caller_id: session.callerId,
      caller_name: session.callerName,
      caller_avatar: session.callerAvatar || null,
      receiver_id: session.receiverId,
      receiver_name: session.receiverName,
      receiver_avatar: session.receiverAvatar || null,
      call_type: session.callType || 'VOICE',
      status: session.status || 'RINGING',
      connection_id: session.connectionId || null,
      started_at: session.startedAt || null,
      ended_at: session.endedAt || null,
      duration_seconds: session.durationSeconds || 0,
      created_at: session.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    return false;
  }
}

export async function fetchSupabaseCallHistory(userId: string): Promise<any[]> {
  const client = getServerSupabase();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client
      .from('call_history')
      .select('*')
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map(c => ({
      id: c.id,
      callSessionId: c.call_session_id,
      callerId: c.caller_id,
      callerName: c.caller_name,
      callerAvatar: c.caller_avatar,
      receiverId: c.receiver_id,
      receiverName: c.receiver_name,
      receiverAvatar: c.receiver_avatar,
      callType: c.call_type || 'VOICE',
      status: c.status,
      durationSeconds: c.duration_seconds || 0,
      createdAt: c.created_at
    }));
  } catch (err) {
    return [];
  }
}

export async function saveSupabaseCallHistoryRecord(record: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !record.id) return false;

  try {
    const { error } = await client.from('call_history').upsert({
      id: record.id,
      call_session_id: record.callSessionId || null,
      caller_id: record.callerId,
      caller_name: record.callerName,
      caller_avatar: record.callerAvatar || null,
      receiver_id: record.receiverId,
      receiver_name: record.receiverName,
      receiver_avatar: record.receiverAvatar || null,
      call_type: record.callType || 'VOICE',
      status: record.status || 'COMPLETED',
      duration_seconds: record.durationSeconds || 0,
      created_at: record.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    return false;
  }
}

/**
 * --------------------------------------------------------------------
 * Voice Note Storage Upload (Supabase Storage bucket fallback)
 * --------------------------------------------------------------------
 */
export async function uploadVoiceNoteToSupabaseStorage(
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getServerSupabase();
  if (!client) return null;

  try {
    const bucketName = 'voice-notes';
    const { error } = await client.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      return null;
    }

    const { data: publicData } = client.storage.from(bucketName).getPublicUrl(fileName);
    return publicData?.publicUrl || null;
  } catch (err) {
    return null;
  }
}

/**
 * --------------------------------------------------------------------
 * Banner Storage Upload
 * --------------------------------------------------------------------
 */
export async function uploadBannerToSupabaseStorage(
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getServerSupabase();
  if (!client) return null;

  try {
    const bucketName = 'banners';
    const { error } = await client.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      return null;
    }

    const { data: publicData } = client.storage.from(bucketName).getPublicUrl(fileName);
    return publicData?.publicUrl || null;
  } catch (err) {
    return null;
  }
}

/**
 * --------------------------------------------------------------------
 * Chat Attachments Storage Upload
 * --------------------------------------------------------------------
 */
export async function uploadChatAttachmentToSupabaseStorage(
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getServerSupabase();
  if (!client) return null;

  try {
    const bucketName = 'chat-attachments';
    const { error } = await client.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      return null;
    }

    const { data: publicData } = client.storage.from(bucketName).getPublicUrl(fileName);
    return publicData?.publicUrl || null;
  } catch (err) {
    return null;
  }
}

/**
 * --------------------------------------------------------------------
 * Mentorship Sessions (Scheduled, Upcoming, Completed)
 * --------------------------------------------------------------------
 */
export async function fetchSupabaseMentorshipSessions(userId: string): Promise<any[]> {
  const client = getServerSupabase();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client
      .from('mentorship_sessions')
      .select('*')
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
      .order('scheduled_start', { ascending: true });

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch mentorship_sessions notice:', error.message);
      }
      return [];
    }

    return (data || []).map(s => ({
      id: s.id,
      mentorshipRequestId: s.mentorship_request_id,
      mentorId: s.mentor_id,
      mentorName: s.mentor_name,
      mentorAvatar: s.mentor_avatar,
      mentorTitle: s.mentor_title,
      menteeId: s.mentee_id,
      menteeName: s.mentee_name,
      menteeAvatar: s.mentee_avatar,
      menteeTitle: s.mentee_title,
      topic: s.topic,
      scheduledStart: s.scheduled_start,
      scheduledEnd: s.scheduled_end,
      durationMinutes: s.duration_minutes || 45,
      timezone: s.timezone || 'UTC',
      status: s.status,
      notes: s.notes,
      meetingLink: s.meeting_link,
      completedAt: s.completed_at,
      completedBy: s.completed_by,
      cancelledReason: s.cancelled_reason,
      connectionId: s.connection_id,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));
  } catch (err) {
    return [];
  }
}

export async function saveSupabaseMentorshipSession(session: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !session.id) return false;

  try {
    const { error } = await client.from('mentorship_sessions').upsert({
      id: session.id,
      mentorship_request_id: session.mentorshipRequestId || null,
      mentor_id: session.mentorId,
      mentor_name: session.mentorName,
      mentor_avatar: session.mentorAvatar || null,
      mentor_title: session.mentorTitle || null,
      mentee_id: session.menteeId,
      mentee_name: session.menteeName,
      mentee_avatar: session.menteeAvatar || null,
      mentee_title: session.menteeTitle || null,
      topic: session.topic,
      scheduled_start: session.scheduledStart,
      scheduled_end: session.scheduledEnd,
      duration_minutes: session.durationMinutes || 45,
      timezone: session.timezone || 'UTC',
      status: session.status || 'UPCOMING',
      notes: session.notes || null,
      meeting_link: session.meetingLink || null,
      completed_at: session.completedAt || null,
      completed_by: session.completedBy || null,
      cancelled_reason: session.cancelledReason || null,
      connection_id: session.connectionId || null,
      created_at: session.createdAt || new Date().toISOString(),
      updated_at: session.updatedAt || new Date().toISOString()
    }, { onConflict: 'id' });

    if (error && !isMissingTableError(error)) {
      console.warn('[SERVER SUPABASE] save mentorship_session notice:', error.message);
    }
    return !error;
  } catch (err) {
    return false;
  }
}

/**
 * --------------------------------------------------------------------
 * Persistent Global Notifications
 * --------------------------------------------------------------------
 */
export async function fetchSupabaseNotifications(userId: string): Promise<any[]> {
  const client = getServerSupabase();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch notifications notice:', error.message);
      }
      return [];
    }

    return (data || []).map(n => ({
      id: n.id,
      recipientId: n.recipient_id,
      senderId: n.sender_id,
      senderName: n.sender_name,
      senderAvatar: n.sender_avatar,
      type: n.type,
      title: n.title,
      message: n.message,
      relatedId: n.related_id,
      isRead: Boolean(n.is_read),
      readAt: n.read_at,
      createdAt: n.created_at
    }));
  } catch (err) {
    return [];
  }
}

export async function saveSupabaseNotification(notif: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !notif.id || !notif.recipientId) return false;

  try {
    const { error } = await client.from('notifications').upsert({
      id: notif.id,
      recipient_id: notif.recipientId,
      sender_id: notif.senderId || null,
      sender_name: notif.senderName || null,
      sender_avatar: notif.senderAvatar || null,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      related_id: notif.relatedId || null,
      is_read: Boolean(notif.isRead),
      read_at: notif.readAt || null,
      created_at: notif.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });

    if (error && !isMissingTableError(error)) {
      console.warn('[SERVER SUPABASE] save notification notice:', error.message);
    }
    return !error;
  } catch (err) {
    return false;
  }
}

export async function markSupabaseNotificationAsRead(notifId: string): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !notifId) return false;

  try {
    const { error } = await client
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notifId);
    return !error;
  } catch {
    return false;
  }
}

export async function markAllSupabaseNotificationsAsRead(userId: string): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !userId) return false;

  try {
    const { error } = await client
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('is_read', false);
    return !error;
  } catch {
    return false;
  }
}

/**
 * --------------------------------------------------------------------
 * Admin Profile Verification Control
 * --------------------------------------------------------------------
 */
export async function updateSupabaseProfileVerification(
  userId: string,
  isVerified: boolean,
  status: 'verified' | 'unverified',
  notes?: string,
  adminEmail?: string
): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !userId) return false;

  try {
    const updateData: any = {
      is_verified: isVerified,
      updated_at: new Date().toISOString()
    };

    // Also attempt to set verification_status / verified_at / verified_by / verification_notes
    try {
      updateData.verification_status = status;
      updateData.verified_at = isVerified ? new Date().toISOString() : null;
      updateData.verified_by = isVerified ? adminEmail || 'Admin' : null;
      updateData.verification_notes = notes || null;
    } catch {}

    const { error } = await client
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      // If some column didn't exist in Supabase yet, fallback to updating just is_verified
      const { error: fallbackErr } = await client
        .from('profiles')
        .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
        .eq('id', userId);
      return !fallbackErr;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * --------------------------------------------------------------------
 * Audit Logs & User Blocks (Safety & Moderation Audit Trail)
 * --------------------------------------------------------------------
 */
export async function fetchSupabaseAuditLogsOnServer(): Promise<any[]> {
  const client = getServerSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('[SERVER SUPABASE] fetch audit_logs notice:', error.message);
      }
      return [];
    }
    return (data || []).map(l => ({
      id: l.id,
      adminId: l.admin_id,
      adminEmail: l.admin_email,
      adminName: l.admin_name,
      targetUserId: l.target_user_id,
      targetUserName: l.target_user_name,
      targetUserEmail: l.target_user_email,
      action: l.action,
      previousStatus: l.previous_status,
      newStatus: l.new_status,
      reason: l.reason,
      timestamp: l.timestamp,
    }));
  } catch {
    return [];
  }
}

export async function saveSupabaseAuditLogOnServer(log: any): Promise<boolean> {
  const client = getServerSupabase();
  if (!client || !log.id) return false;
  try {
    const { error } = await client.from('audit_logs').upsert({
      id: log.id,
      admin_id: log.adminId,
      admin_email: log.adminEmail,
      admin_name: log.adminName,
      target_user_id: log.targetUserId,
      target_user_name: log.targetUserName,
      target_user_email: log.targetUserEmail,
      action: log.action,
      previous_status: log.previousStatus || null,
      new_status: log.newStatus || null,
      reason: log.reason || null,
      timestamp: log.timestamp || new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error && !isMissingTableError(error)) {
      console.warn('[SERVER SUPABASE] save audit_log notice:', error.message);
    }
    return !error;
  } catch {
    return false;
  }
}

export async function fetchSupabaseUserBlocksOnServer(): Promise<any[]> {
  const client = getServerSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('user_blocks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(b => ({
      id: b.id,
      blockerId: b.blocker_id,
      blockedUserId: b.blocked_user_id,
      reason: b.reason,
      createdAt: b.created_at,
    }));
  } catch {
    return [];
  }
}
