import { BlockRecord, UserReport, UserSafetyStatus, UserSafetySignalSummary } from '../types';

/**
 * Evaluates safety signals for a specific user.
 * 
 * Safety Principles:
 * 1. Independent Actions: Multiple blocks or reports from the SAME user count only once.
 * 2. Privacy: Thresholds and exact block/report counts are never revealed to other users or publicly displayed.
 * 3. Proportional Response:
 *    - 1-2 signals: Normal monitoring.
 *    - 3-4 independent signals: Flagged for Internal Safety Review.
 *    - 5+ independent signals (or severe report combinations): Temporarily Suspended pending safety review.
 */
export function evaluateUserSafety(
  targetUserId: string,
  blockedUsers: BlockRecord[],
  userReports: UserReport[]
): UserSafetySignalSummary {
  // 1. Collect distinct user IDs who blocked this user (deduplicating repeated actions by the same blocker)
  const uniqueBlockers = new Set<string>();
  blockedUsers
    .filter(b => b.blockedUserId === targetUserId)
    .forEach(b => uniqueBlockers.add(b.blockerId));

  // 2. Collect distinct user IDs who reported this user (deduplicating repeated reports by the same reporter)
  const uniqueReporters = new Set<string>();
  const seriousReports = userReports.filter(r => 
    r.reportedUserId === targetUserId && 
    (r.reason === 'HARASSMENT' || r.reason === 'INAPPROPRIATE_BEHAVIOR' || r.reason === 'OFFENSIVE_CONTENT' || r.reason === 'SPAM_OR_SCAM')
  );
  
  userReports
    .filter(r => r.reportedUserId === targetUserId)
    .forEach(r => uniqueReporters.add(r.reporterId));

  // 3. Collect all distinct accounts that generated a safety signal against this user
  const allDistinctSignalUsers = new Set<string>([
    ...Array.from(uniqueBlockers),
    ...Array.from(uniqueReporters)
  ]);

  const uniqueBlockersCount = uniqueBlockers.size;
  const uniqueReportersCount = uniqueReporters.size;
  const distinctSafetySignalCount = allDistinctSignalUsers.size;

  let status: UserSafetyStatus = 'ACTIVE';
  let flaggedForReview = false;
  let isRestricted = false;

  // Threshold: 5+ independent blocks or reports from different users -> Temporary Suspension
  if (distinctSafetySignalCount >= 5 || uniqueBlockersCount >= 5 || seriousReports.length >= 4) {
    status = 'SUSPENDED';
    flaggedForReview = true;
    isRestricted = true;
  } else if (distinctSafetySignalCount >= 3 || uniqueBlockersCount >= 3 || seriousReports.length >= 2) {
    status = 'FLAGGED_FOR_REVIEW';
    flaggedForReview = true;
    isRestricted = false;
  }

  return {
    userId: targetUserId,
    uniqueBlockersCount,
    uniqueReportersCount,
    distinctSafetySignalCount,
    status,
    isRestricted,
    flaggedForReview
  };
}
