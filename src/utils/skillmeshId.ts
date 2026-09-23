/**
 * SkillMesh Deterministic Special User ID Generator
 * Format: SM-XXXXXX (e.g., SM-000001, SM-000042)
 *
 * Rules:
 * - Deterministic, unique, and persistent
 * - Never randomly regenerated
 * - Visible on the user's profile and in admin views
 * - Supported in search and filtering
 */

const KNOWN_ID_MAP: Record<string, string> = {
  // Designated Root Administrator
  '324a990f-2ac3-4197-9143-9b9b37125a0b': 'SM-000000',
  'admin_skillmesh_root': 'SM-000000',
  'admin.skillmesh@gmail.com': 'SM-000000',
  'admin@skillmesh.com': 'SM-000000',

  // Registered Real Users in Supabase
  'cb890ec9-7d92-4ade-aea0-aafa4debe3fe': 'SM-000001', // sprinklehere0@gmail.com (hellen)
  'sprinklehere0@gmail.com': 'SM-000001',

  '3fa658ac-378a-43cc-8805-167be2b92534': 'SM-000002', // okontafavour04@gmail.com (Okonta Favour)
  'okontafavour04@gmail.com': 'SM-000002',

  '3ebffdb8-d4b7-4b2f-acf4-a629089b5ac4': 'SM-000003', // minazukiii3232@gmail.com (Izzinn)
  'minazukiii3232@gmail.com': 'SM-000003',
};

export function getSkillMeshUserId(user: {
  id?: string;
  email?: string;
  skillmeshId?: string;
  skillmesh_id?: string;
} | null | undefined): string {
  if (!user) return 'SM-000000';

  // 1. If stored custom ID is provided and matches pattern
  if (user.skillmeshId && /^SM-\d{6}$/.test(user.skillmeshId)) {
    return user.skillmeshId;
  }
  if (user.skillmesh_id && /^SM-\d{6}$/.test(user.skillmesh_id)) {
    return user.skillmesh_id;
  }

  // 2. Check known static ID mappings
  const rawId = (user.id || '').trim();
  const rawEmail = (user.email || '').trim().toLowerCase();

  if (rawId && KNOWN_ID_MAP[rawId]) {
    return KNOWN_ID_MAP[rawId];
  }
  if (rawEmail && KNOWN_ID_MAP[rawEmail]) {
    return KNOWN_ID_MAP[rawEmail];
  }

  // 3. Deterministic hash-based 6-digit sequence for any newly registered user
  const seed = (rawId || rawEmail || 'skillmesh_member').toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  // Positive 6-digit number between 100001 and 999999
  const num = (Math.abs(hash) % 899999) + 100001;
  return `SM-${String(num).padStart(6, '0')}`;
}
