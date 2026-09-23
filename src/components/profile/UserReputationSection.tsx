import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, 
  Award, 
  CheckCircle2, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRightLeft, 
  Trash2, 
  Edit3, 
  User,
  Sparkles,
  HeartHandshake,
  BookOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  fetchUserRatings, 
  checkRatingEligibility, 
  submitUserRating, 
  deleteUserRating 
} from '../../services/supabaseClient';
import { UserProfile, UserRating, RatingSummary, RatingEligibility, ExchangeActivityItem } from '../../types';

interface UserReputationSectionProps {
  targetUser: UserProfile;
  exchangeHistory?: ExchangeActivityItem[];
}

export const UserReputationSection: React.FC<UserReputationSectionProps> = ({ 
  targetUser,
  exchangeHistory: initialExchangeHistory
}) => {
  const { currentUser, openUserProfile, connections } = useApp();

  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [summary, setSummary] = useState<RatingSummary>({
    averageRating: 0,
    totalRatings: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<RatingEligibility | null>(null);

  // Form state for rating submission
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState<string>('');
  const [selectedSkillName, setSelectedSkillName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Compute exchange history from connections if not passed
  const completedExchanges = React.useMemo(() => {
    if (initialExchangeHistory && initialExchangeHistory.length > 0) {
      return initialExchangeHistory;
    }
    // Filter actual accepted connections involving targetUser
    return connections
      .filter(c => c.status === 'ACCEPTED' && (c.senderId === targetUser.id || c.receiverId === targetUser.id))
      .map(c => {
        const isTargetSender = c.senderId === targetUser.id;
        const partnerId = isTargetSender ? c.receiverId : c.senderId;
        const partnerName = isTargetSender ? c.receiverName : c.senderName;
        return {
          id: c.id,
          connectionId: c.id,
          partnerId,
          partnerName,
          skillExchanged: c.offeredSkillName,
          skillReceived: c.wantedSkillName,
          completedAt: c.createdAt || new Date().toISOString(),
          requestType: c.requestType || 'MUTUAL_EXCHANGE'
        };
      });
  }, [initialExchangeHistory, connections, targetUser.id]);

  // Load ratings and eligibility
  const loadRatingsData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserRatings(targetUser.id);
      setRatings(data.ratings);
      setSummary(data.summary);

      if (currentUser && currentUser.id !== targetUser.id) {
        const elig = await checkRatingEligibility(currentUser.id, targetUser.id);
        setEligibility(elig);

        if (elig.existingRating) {
          setSelectedStars(elig.existingRating.rating);
          setReviewText(elig.existingRating.review || '');
          setSelectedSkillName(elig.existingRating.skillName || '');
        } else if (targetUser.offeredSkills && targetUser.offeredSkills.length > 0) {
          setSelectedSkillName(targetUser.offeredSkills[0].name);
        }
      } else {
        setEligibility(null);
      }
    } catch (err) {
      console.warn('Failed to load ratings data:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUser.id, targetUser.offeredSkills, currentUser]);

  useEffect(() => {
    loadRatingsData();
  }, [loadRatingsData]);

  // Handle rating submission
  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (selectedStars < 1 || selectedStars > 5) {
      setActionError('Please select a rating between 1 and 5 stars.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await submitUserRating(
        currentUser.id,
        targetUser.id,
        selectedStars,
        reviewText.trim() || undefined,
        selectedSkillName.trim() || undefined,
        'SKILL_EXCHANGE',
        eligibility?.connectionId || undefined
      );

      if (!res.success) {
        setActionError(res.error || 'Failed to submit rating.');
      } else {
        setActionSuccess(eligibility?.existingRating ? 'Your rating has been updated!' : 'Thank you! Your rating has been submitted.');
        setIsEditing(false);
        // Refresh data
        await loadRatingsData();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error submitting rating.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete rating
  const handleDeleteRating = async (ratingId: string) => {
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to delete your review?')) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const res = await deleteUserRating(ratingId, currentUser.id);
      if (res.success) {
        setActionSuccess('Your review has been removed.');
        setIsEditing(false);
        setReviewText('');
        setSelectedStars(5);
        await loadRatingsData();
      } else {
        setActionError(res.error || 'Failed to remove rating.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error deleting rating.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOwnProfile = currentUser?.id === targetUser.id;
  const ratingLabels: Record<number, string> = {
    1: '1 - Needs Improvement',
    2: '2 - Fair',
    3: '3 - Good',
    4: '4 - Very Good',
    5: '5 - Excellent Mentor'
  };

  return (
    <div id={`user-reputation-${targetUser.id}`} className="space-y-6">
      {/* 1. Main Reputation & Ratings Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">Peer Ratings & Reputation</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified feedback from accepted SkillMesh exchange partners
            </p>
          </div>

          {/* Badges / Highlights */}
          <div className="flex flex-wrap items-center gap-2">
            {summary.totalRatings >= 3 && summary.averageRating >= 4.5 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Highly Rated Peer
              </span>
            )}
            {completedExchanges.length >= 1 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Exchanger
              </span>
            )}
            {targetUser.offeredSkills && targetUser.offeredSkills.length >= 2 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                Skill Sharer
              </span>
            )}
          </div>
        </div>

        {/* Ratings Overview & 5-Star Distribution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left score box */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            {summary.totalRatings > 0 ? (
              <>
                <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                  <span>{summary.averageRating.toFixed(1)}</span>
                  <span className="text-lg font-medium text-slate-400">/ 5.0</span>
                </div>
                <div className="flex items-center gap-1 my-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${
                        s <= Math.round(summary.averageRating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-600">
                  Based on {summary.totalRatings} {summary.totalRatings === 1 ? 'peer rating' : 'peer ratings'}
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                  <Star className="w-6 h-6" />
                </div>
                <div className="text-lg font-bold text-slate-800">New to SkillMesh</div>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                  No ratings yet. Peer reviews will appear here following completed exchanges.
                </p>
              </>
            )}
          </div>

          {/* Right star breakdown bars */}
          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((starVal) => {
              const count = summary.distribution[starVal as keyof typeof summary.distribution] || 0;
              const pct = summary.totalRatings > 0 ? (count / summary.totalRatings) * 100 : 0;
              return (
                <div key={starVal} className="flex items-center gap-3 text-xs">
                  <div className="w-14 flex items-center gap-1 font-semibold text-slate-700 shrink-0">
                    <span>{starVal}</span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-medium text-slate-500 shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skill-Specific Ratings Breakdown */}
        {summary.skillRatings && Object.keys(summary.skillRatings).length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Skill-Specific Ratings & Endorsements</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(summary.skillRatings).map(([skill, sData]) => (
                <div 
                  key={skill} 
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between shadow-2xs hover:border-amber-300 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 truncate block">{skill}</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {sData.totalRatings} {sData.totalRatings === 1 ? 'peer review' : 'peer reviews'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-slate-900">{sData.averageRating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Rating Submission or Status Box */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button 
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button 
              onClick={() => setActionError(null)}
              className="text-rose-700 hover:text-rose-900 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Conditional Rating Interaction Section */}
        {!isOwnProfile && currentUser && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            {/* If eligible and already rated and NOT currently editing */}
            {eligibility?.canRate && eligibility.existingRating && !isEditing ? (
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-tight">Your Feedback</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id={`edit-rating-btn-${targetUser.id}`}
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      id={`delete-rating-btn-${targetUser.id}`}
                      onClick={() => handleDeleteRating(eligibility.existingRating!.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= eligibility.existingRating!.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {eligibility.existingRating.rating} / 5
                  </span>
                </div>

                {eligibility.existingRating.review && (
                  <p className="text-xs sm:text-sm text-emerald-950 italic bg-white/80 p-3 rounded-xl border border-emerald-200/80">
                    "{eligibility.existingRating.review}"
                  </p>
                )}
              </div>
            ) : eligibility?.canRate ? (
              /* Rating Submission / Edit Form */
              <form onSubmit={handleSubmitRating} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {eligibility.existingRating ? `Update your review for ${targetUser.name}` : `Rate your experience with ${targetUser.name}`}
                  </h3>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Interactive Star Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Rating: <span className="font-bold text-amber-600">{ratingLabels[hoveredStars || selectedStars]}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (hoveredStars || selectedStars);
                      return (
                        <button
                          key={star}
                          type="button"
                          id={`rate-star-btn-${star}`}
                          onMouseEnter={() => setHoveredStars(star)}
                          onMouseLeave={() => setHoveredStars(null)}
                          onClick={() => setSelectedStars(star)}
                          className="p-1 rounded-lg hover:bg-amber-100/50 transition-colors cursor-pointer"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star
                            className={`w-7 h-7 transition-transform ${
                              active ? 'text-amber-400 fill-amber-400 scale-110' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Skill Endorsement Picker */}
                <div>
                  <label htmlFor="rating-skill-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Specific Skill Taught / Evaluated <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  {targetUser.offeredSkills && targetUser.offeredSkills.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {targetUser.offeredSkills.map(sk => (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() => setSelectedSkillName(sk.name)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            selectedSkillName === sk.name
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          {sk.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <input
                    id="rating-skill-select"
                    type="text"
                    value={selectedSkillName}
                    onChange={(e) => setSelectedSkillName(e.target.value)}
                    placeholder="e.g. Python, UI/UX Design, Docker, Public Speaking"
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Optional Written Review Textarea */}
                <div>
                  <label htmlFor="rating-review-text" className="block text-xs font-semibold text-slate-700 mb-1">
                    Written Review <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="rating-review-text"
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    maxLength={1000}
                    placeholder={`Share how ${targetUser.name.split(' ')[0]} communicated, mentored, or contributed during your skill exchange...`}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <div className="text-[11px] text-slate-400 text-right mt-1">
                    {reviewText.length}/1000 characters
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    id="submit-peer-rating-btn"
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-950/20 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Saving...' : eligibility.existingRating ? 'Update Rating' : 'Submit Rating'}
                  </button>
                </div>
              </form>
            ) : (
              /* Non-eligible notice */
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  <p className="font-bold text-slate-800">Ratings are community-verified</p>
                  <p className="mt-0.5">
                    {eligibility?.reason || `Ratings and peer reviews unlock automatically after you complete an accepted skill exchange with ${targetUser.name}.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Received Peer Reviews List */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Peer Reviews ({ratings.length})</span>
            </h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse p-4 rounded-2xl bg-slate-50 border border-slate-100 h-24" />
              ))}
            </div>
          ) : ratings.length > 0 ? (
            <div className="space-y-3.5">
              {ratings.map((review) => (
                <div
                  key={review.id}
                  id={`review-item-${review.id}`}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Clickable reviewer profile area */}
                    <button
                      id={`reviewer-link-${review.id}`}
                      onClick={() => openUserProfile(review.raterId)}
                      className="flex items-center gap-3 group text-left cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-white shadow-2xs group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                        {review.raterAvatar ? (
                          <img src={review.raterAvatar} alt={review.raterName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{review.raterName.substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors block">
                          {review.raterName}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </button>

                    {/* Star Badge and Skill Badge */}
                    <div className="flex items-center gap-2">
                      {review.skillName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                          {review.skillName}
                        </span>
                      )}
                      <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-slate-800">{review.rating}.0</span>
                      </div>
                    </div>
                  </div>

                  {review.review && (
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-12 italic">
                      "{review.review}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No Peer Reviews Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Reviews will appear here once {targetUser.name.split(' ')[0]} completes verified exchanges with community peers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. SkillMesh Journey & Exchange History Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              <span>SkillMesh Journey & Exchange History</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed knowledge transfers and collaboration sessions on the network
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
            {completedExchanges.length} {completedExchanges.length === 1 ? 'Exchange' : 'Exchanges'}
          </span>
        </div>

        {completedExchanges.length > 0 ? (
          <div className="space-y-3">
            {completedExchanges.map((item) => (
              <div
                key={item.id}
                id={`exchange-history-${item.id}`}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openUserProfile(item.partnerId)}
                    className="flex items-center gap-2.5 group cursor-pointer text-left"
                    title={`View ${item.partnerName}'s profile`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-white shadow-2xs group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                      <User className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors block">
                        Exchanged with {item.partnerName}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(item.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Exchange Skill Details */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 font-semibold">
                    Taught: {item.skillExchanged}
                  </span>
                  <span className="text-slate-400">↔</span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-100/80 text-sky-800 font-semibold">
                    Learned: {item.skillReceived}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <HeartHandshake className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Journey Just Beginning</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {targetUser.name.split(' ')[0]}'s completed exchange sessions and collaborations will appear on this timeline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
