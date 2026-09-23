import { UserProfile, MatchScoreResult, MatchType, OfferedSkill, WantedSkill, MatchPurpose } from '../types';

/**
 * Normalizes skill strings to enable friendly matching (e.g., "Microsoft Excel" vs "Excel", "python" vs "Python")
 */
export function normalizeSkillName(name: string): string {
  if (!name) return '';
  const cleaned = name.trim().toLowerCase();
  
  // Aliases and standardizations
  if (cleaned.includes('excel') || cleaned.includes('spreadsheet')) return 'excel';
  if (cleaned.includes('python')) return 'python';
  if (cleaned.includes('react') || cleaned.includes('reactjs') || cleaned.includes('react.js')) return 'react';
  if (cleaned.includes('graphic design') || cleaned.includes('design') || cleaned.includes('ui/ux') || cleaned.includes('visual design')) return 'graphic design';
  if (cleaned.includes('figma')) return 'figma';
  if (cleaned.includes('data analysis') || cleaned.includes('pandas') || cleaned.includes('analytics')) return 'data analysis';
  if (cleaned.includes('public speaking') || cleaned.includes('presentation') || cleaned.includes('toastmaster')) return 'public speaking';
  if (cleaned.includes('spanish')) return 'spanish';
  if (cleaned.includes('copywriting') || cleaned.includes('writing') || cleaned.includes('content')) return 'writing';
  if (cleaned.includes('javascript') || cleaned.includes('js') || cleaned.includes('typescript') || cleaned.includes('ts')) return 'javascript';
  if (cleaned.includes('sql') || cleaned.includes('database') || cleaned.includes('postgres') || cleaned.includes('mongodb')) return 'database';
  if (cleaned.includes('node') || cleaned.includes('express') || cleaned.includes('backend') || cleaned.includes('api')) return 'backend';
  if (cleaned.includes('flutter') || cleaned.includes('react native') || cleaned.includes('android') || cleaned.includes('ios') || cleaned.includes('mobile')) return 'mobile';

  return cleaned;
}

export function areSkillsMatching(skillA: string, skillB: string): boolean {
  const normA = normalizeSkillName(skillA);
  const normB = normalizeSkillName(skillB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  return false;
}

/**
 * Skill categorization tags for detecting complementary project collaboration synergies
 */
interface SkillDomainInfo {
  isFrontend: boolean;
  isBackend: boolean;
  isDesign: boolean;
  isMobile: boolean;
  isDataAI: boolean;
  isContentMarketing: boolean;
  isProductManagement: boolean;
}

function analyzeUserSkillDomains(user: UserProfile): SkillDomainInfo {
  const allSkillText = [
    ...user.offeredSkills.map(s => `${s.name} ${s.experienceDescription || ''}`),
    user.titleOrRole || '',
    user.bio || '',
    user.activeProjectDescription || '',
    ...(user.collaborationInterests || [])
  ].join(' ').toLowerCase();

  return {
    isFrontend: /frontend|react|vue|angular|svelte|html|css|tailwind|javascript|typescript|next\.?js|web development/i.test(allSkillText),
    isBackend: /backend|node|express|python|django|fastapi|flask|java|spring|go|golang|c#|\.net|sql|database|postgres|mongodb|api|docker|devops|aws|cloud/i.test(allSkillText),
    isDesign: /design|ui\/ux|ui|ux|figma|adobe|photoshop|illustrator|wirefram|prototyp|user research|visual design/i.test(allSkillText),
    isMobile: /mobile|flutter|react native|ios|swift|android|kotlin|app development/i.test(allSkillText),
    isDataAI: /data science|data analysis|machine learning|ai|deep learning|pandas|numpy|pytorch|tensorflow|nlp|python/i.test(allSkillText),
    isContentMarketing: /content|writing|copywriting|seo|marketing|social media|technical writing|blogging|growth/i.test(allSkillText),
    isProductManagement: /product manager|product management|scrum|agile|project management|business analysis|strategy/i.test(allSkillText)
  };
}

/**
 * Identifies complementary project collaboration synergies between two users
 */
export function checkComplementaryCollaborationSynergy(
  currentUser: UserProfile,
  candidateUser: UserProfile
): {
  isComplementary: boolean;
  synergyScore: number;
  synergyReason: string;
  theirRelevantSkills: string[];
  yourRelevantSkills: string[];
} {
  // If either user has no skills at all, no meaningful skill synergy can be computed
  const hasCurrentSkills = (currentUser.offeredSkills && currentUser.offeredSkills.length > 0) ||
                           (currentUser.wantedSkills && currentUser.wantedSkills.length > 0);
  const hasCandidateSkills = (candidateUser.offeredSkills && candidateUser.offeredSkills.length > 0) ||
                             (candidateUser.wantedSkills && candidateUser.wantedSkills.length > 0);

  if (!hasCurrentSkills || !hasCandidateSkills) {
    return {
      isComplementary: false,
      synergyScore: 0,
      synergyReason: '',
      theirRelevantSkills: [],
      yourRelevantSkills: []
    };
  }

  const currentDomains = analyzeUserSkillDomains(currentUser);
  const candidateDomains = analyzeUserSkillDomains(candidateUser);

  let synergyScore = 0;
  const synergyReasons: string[] = [];

  const theirOffered = candidateUser.offeredSkills.map(s => s.name);
  const yourOffered = currentUser.offeredSkills.map(s => s.name);

  // Check 1: Frontend + Backend Synergy
  if ((currentDomains.isFrontend && candidateDomains.isBackend) || (currentDomains.isBackend && candidateDomains.isFrontend)) {
    synergyScore += 40;
    synergyReasons.push('Frontend & Backend complementary development synergy');
  }

  // Check 2: UI/UX Design + Development Synergy
  if (
    (currentDomains.isDesign && (candidateDomains.isFrontend || candidateDomains.isBackend || candidateDomains.isMobile)) ||
    (candidateDomains.isDesign && (currentDomains.isFrontend || currentDomains.isBackend || currentDomains.isMobile))
  ) {
    synergyScore += 45;
    synergyReasons.push('UI/UX Product Design & Engineering synergy');
  }

  // Check 3: Mobile Development + Backend Synergy
  if ((currentDomains.isMobile && candidateDomains.isBackend) || (currentDomains.isBackend && candidateDomains.isMobile)) {
    synergyScore += 40;
    synergyReasons.push('Mobile App & Cloud API Backend synergy');
  }

  // Check 4: Content/Copywriting + Tech/Design Synergy
  if (
    (currentDomains.isContentMarketing && (candidateDomains.isFrontend || candidateDomains.isDesign)) ||
    (candidateDomains.isContentMarketing && (currentDomains.isFrontend || currentDomains.isDesign))
  ) {
    synergyScore += 35;
    synergyReasons.push('Content / Product Marketing & Design/Dev synergy');
  }

  // Check 5: Data Science/AI + Software Engineering Synergy
  if (
    (currentDomains.isDataAI && (candidateDomains.isFrontend || candidateDomains.isBackend)) ||
    (candidateDomains.isDataAI && (currentDomains.isFrontend || currentDomains.isBackend))
  ) {
    synergyScore += 35;
    synergyReasons.push('Data Science/AI & Application Engineering synergy');
  }

  // Check 6: User Wants what Candidate Offers (or vice-versa)
  let directCrossNeed = false;
  for (const wanted of currentUser.wantedSkills) {
    for (const offered of candidateUser.offeredSkills) {
      if (areSkillsMatching(wanted.name, offered.name)) {
        synergyScore += 25;
        directCrossNeed = true;
      }
    }
  }
  for (const wanted of candidateUser.wantedSkills) {
    for (const offered of currentUser.offeredSkills) {
      if (areSkillsMatching(wanted.name, offered.name)) {
        synergyScore += 25;
        directCrossNeed = true;
      }
    }
  }

  // Check 7: Both open to Project Collaboration purpose
  const currentOpenToCollab = !currentUser.matchPurposes || currentUser.matchPurposes.includes('project_collaboration');
  const candidateOpenToCollab = !candidateUser.matchPurposes || candidateUser.matchPurposes.includes('project_collaboration');

  if (currentOpenToCollab && candidateOpenToCollab) {
    synergyScore += 20;
  }

  const isComplementary = synergyScore >= 40 || (directCrossNeed && synergyScore >= 30);

  return {
    isComplementary,
    synergyScore: Math.min(synergyScore, 98),
    synergyReason: synergyReasons.length > 0 ? synergyReasons.join(' & ') : 'Complementary project collaboration capabilities',
    theirRelevantSkills: theirOffered.slice(0, 3),
    yourRelevantSkills: yourOffered.slice(0, 3)
  };
}

/**
 * Evaluates the match between current active user and a candidate user
 */
export function calculateUserMatch(
  currentUser: UserProfile, 
  candidateUser: UserProfile,
  filterPurpose?: MatchPurpose | 'ALL'
): MatchScoreResult {
  // Never match with oneself
  if (currentUser.id === candidateUser.id) {
    return {
      targetUser: candidateUser,
      matchType: 'NO_MATCH',
      mutualTeachSkills: [],
      mutualLearnSkills: [],
      oneWayTeachSkills: [],
      oneWayLearnSkills: [],
      explanation: 'Same user',
      matchScore: 0,
    };
  }

  // Zero-skills guard: if current user has 0 offered and 0 wanted skills, no matches should be formed
  const hasCurrentUserSkills = (currentUser.offeredSkills && currentUser.offeredSkills.length > 0) || 
                               (currentUser.wantedSkills && currentUser.wantedSkills.length > 0);
  const hasCandidateSkills = (candidateUser.offeredSkills && candidateUser.offeredSkills.length > 0) || 
                             (candidateUser.wantedSkills && candidateUser.wantedSkills.length > 0);

  if (!hasCurrentUserSkills || !hasCandidateSkills) {
    return {
      targetUser: candidateUser,
      matchType: 'NO_MATCH',
      mutualTeachSkills: [],
      mutualLearnSkills: [],
      oneWayTeachSkills: [],
      oneWayLearnSkills: [],
      explanation: !hasCurrentUserSkills 
        ? 'Add skills to your profile to discover compatible peers.'
        : `${candidateUser.name} has not listed skills yet.`,
      matchScore: 0,
    };
  }

  // 1. Check what Candidate can teach Current User (Candidate Offers -> Current User Wants)
  const candidateTeachesCurrentUser: { theyTeach: OfferedSkill; youLearn: WantedSkill }[] = [];
  for (const offered of candidateUser.offeredSkills) {
    for (const wanted of currentUser.wantedSkills) {
      if (areSkillsMatching(offered.name, wanted.name)) {
        candidateTeachesCurrentUser.push({ theyTeach: offered, youLearn: wanted });
      }
    }
  }

  // 2. Check what Current User can teach Candidate (Current User Offers -> Candidate Wants)
  const currentUserTeachesCandidate: { youTeach: OfferedSkill; theyLearn: WantedSkill }[] = [];
  for (const offered of currentUser.offeredSkills) {
    for (const wanted of candidateUser.wantedSkills) {
      if (areSkillsMatching(offered.name, wanted.name)) {
        currentUserTeachesCandidate.push({ youTeach: offered, theyLearn: wanted });
      }
    }
  }

  // 3. Check Project Collaboration & Complementary Synergy
  const collabSynergy = checkComplementaryCollaborationSynergy(currentUser, candidateUser);

  // Strong Match: Mutual two-way exchange possible
  const isStrongMatch = candidateTeachesCurrentUser.length > 0 && currentUserTeachesCandidate.length > 0;

  // Knowledge Share: Candidate has skill Current User wants, OR Current User has skill Candidate wants
  const isKnowledgeShare = !isStrongMatch && (candidateTeachesCurrentUser.length > 0 || currentUserTeachesCandidate.length > 0);

  // Project Collaboration Match: High complementary synergy or direct collaboration interest
  const isCollaborationMatch = collabSynergy.isComplementary;

  let matchType: MatchType = 'NO_MATCH';
  let matchScore = 0;
  let explanation = '';

  if (filterPurpose === 'project_collaboration' || (isCollaborationMatch && !isStrongMatch && !isKnowledgeShare)) {
    matchType = 'PROJECT_COLLABORATION';
    matchScore = collabSynergy.synergyScore;

    const theirSkills = candidateUser.offeredSkills.map(s => s.name).join(', ') || candidateUser.titleOrRole;
    const yourSkills = currentUser.offeredSkills.map(s => s.name).join(', ') || currentUser.titleOrRole;

    explanation = `Project Collaborator Match: ${collabSynergy.synergyReason}. ${candidateUser.name} (${theirSkills}) has complementary skills that synergize with your expertise in ${yourSkills}.`;
  } else if (isStrongMatch) {
    matchType = 'STRONG_MATCH';
    matchScore = 95 + Math.min(candidateTeachesCurrentUser.length + currentUserTeachesCandidate.length, 5);
    
    const teachSkillNames = Array.from(new Set(candidateTeachesCurrentUser.map(m => m.theyTeach.name))).join(', ');
    const learnSkillNames = Array.from(new Set(currentUserTeachesCandidate.map(m => m.youTeach.name))).join(', ');
    
    explanation = `Strong two-way exchange: ${candidateUser.name} can teach you ${teachSkillNames} (${candidateTeachesCurrentUser[0].theyTeach.proficiency}), and is looking to learn ${learnSkillNames} which you offer (${currentUserTeachesCandidate[0].youTeach.proficiency}).`;
  } else if (isCollaborationMatch) {
    // If it has strong collaboration synergy along with knowledge share
    matchType = isKnowledgeShare ? 'RELEVANT_MATCH' : 'PROJECT_COLLABORATION';
    matchScore = Math.max(80, collabSynergy.synergyScore);
    explanation = `Complementary Collaboration & Knowledge Share: ${candidateUser.name} offers complementary skills (${collabSynergy.synergyReason}) suited for building together.`;
  } else if (isKnowledgeShare) {
    matchType = 'KNOWLEDGE_SHARE';
    
    if (candidateTeachesCurrentUser.length > 0) {
      matchScore = 75 + candidateTeachesCurrentUser.length * 5;
      const teachSkillNames = Array.from(new Set(candidateTeachesCurrentUser.map(m => m.theyTeach.name))).join(', ');
      explanation = `Knowledge sharing opportunity: ${candidateUser.name} offers ${teachSkillNames} (${candidateTeachesCurrentUser[0].theyTeach.proficiency}) which you want to learn. Connect for voluntary 1-on-1 knowledge sharing.`;
    } else {
      matchScore = 65 + currentUserTeachesCandidate.length * 5;
      const learnSkillNames = Array.from(new Set(currentUserTeachesCandidate.map(m => m.youTeach.name))).join(', ');
      explanation = `Knowledge sharing opportunity: You offer ${learnSkillNames} which ${candidateUser.name} is looking to learn. You can volunteer to share your expertise.`;
    }
  } else {
    matchType = 'NO_MATCH';
    matchScore = 0;
    explanation = `Open peer in the community. You can connect to propose voluntary knowledge sharing or collaborate on a project.`;
  }

  return {
    targetUser: candidateUser,
    matchType,
    mutualTeachSkills: isStrongMatch ? candidateTeachesCurrentUser : [],
    mutualLearnSkills: isStrongMatch ? currentUserTeachesCandidate : [],
    oneWayTeachSkills: !isStrongMatch ? candidateTeachesCurrentUser : [],
    oneWayLearnSkills: !isStrongMatch ? currentUserTeachesCandidate : [],
    complementarySkills: collabSynergy.isComplementary ? {
      theirSkills: collabSynergy.theirRelevantSkills,
      yourSkills: collabSynergy.yourRelevantSkills,
      synergyReason: collabSynergy.synergyReason
    } : undefined,
    isCollaborationMatch,
    explanation,
    matchScore,
  };
}

/**
 * Finds and sorts all matches for a given user from the user pool
 */
export function getRankedMatchesForUser(
  currentUser: UserProfile, 
  allUsers: UserProfile[],
  filterPurpose?: MatchPurpose | 'ALL'
): MatchScoreResult[] {
  const results: MatchScoreResult[] = [];

  for (const user of allUsers) {
    if (user.id === currentUser.id) continue;
    const match = calculateUserMatch(currentUser, user, filterPurpose);
    results.push(match);
  }

  // Sort by match score and relevance
  return results.sort((a, b) => {
    if (filterPurpose === 'project_collaboration') {
      if (a.isCollaborationMatch && !b.isCollaborationMatch) return -1;
      if (b.isCollaborationMatch && !a.isCollaborationMatch) return 1;
    }
    if (a.matchType === 'STRONG_MATCH' && b.matchType !== 'STRONG_MATCH') return -1;
    if (b.matchType === 'STRONG_MATCH' && a.matchType !== 'STRONG_MATCH') return 1;
    if (a.matchType === 'PROJECT_COLLABORATION' && b.matchType === 'NO_MATCH') return -1;
    if (b.matchType === 'PROJECT_COLLABORATION' && a.matchType === 'NO_MATCH') return 1;
    if ((a.matchType === 'KNOWLEDGE_SHARE' || a.matchType === 'RELEVANT_MATCH') && b.matchType === 'NO_MATCH') return -1;
    if ((b.matchType === 'KNOWLEDGE_SHARE' || b.matchType === 'RELEVANT_MATCH') && a.matchType === 'NO_MATCH') return 1;
    return b.matchScore - a.matchScore;
  });
}

