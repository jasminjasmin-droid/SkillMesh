import React from 'react';
import { ProficiencyLevel, TeachingConfidence, MatchType, UserStatus, SkillEvidence } from '../../types';
import { 
  Sparkles, 
  ArrowRightLeft, 
  UserCheck, 
  ShieldAlert, 
  ExternalLink, 
  Award, 
  CheckCircle2, 
  GraduationCap, 
  Briefcase, 
  Building2, 
  Github, 
  FileText, 
  FolderGit2, 
  Globe, 
  Layers, 
  Info,
  Check,
  BadgeCheck
} from 'lucide-react';

export const VerifiedTickBadge: React.FC<{
  isVerified?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  verifiedBy?: string;
  tooltip?: string;
  className?: string;
}> = ({
  isVerified = true,
  size = 'sm',
  showLabel = false,
  verifiedBy,
  tooltip,
  className = ''
}) => {
  if (!isVerified) return null;

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const titleText = tooltip || (verifiedBy ? `Verified Profile by Admin (${verifiedBy})` : 'Verified Profile — Admin Confirmed Member');

  if (showLabel) {
    return (
      <span
        id="profile-verified-badge-labeled"
        title={titleText}
        className={`inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200/80 rounded-full font-bold px-2 py-0.5 text-[11px] shadow-2xs ${className}`}
      >
        <BadgeCheck className={`${iconSizes[size]} text-sky-600 fill-sky-100 shrink-0`} />
        <span>Verified</span>
      </span>
    );
  }

  return (
    <span
      id="profile-verified-tick-icon"
      title={titleText}
      className={`inline-flex items-center justify-center text-sky-500 hover:text-sky-600 transition-colors shrink-0 ${className}`}
    >
      <BadgeCheck className={`${iconSizes[size]} fill-sky-100 text-sky-600 drop-shadow-2xs`} />
    </span>
  );
};

export const ProficiencyBadge: React.FC<{ level: ProficiencyLevel; size?: 'sm' | 'md' }> = ({ level, size = 'sm' }) => {
  const styles: Record<ProficiencyLevel, string> = {
    Beginner: 'bg-emerald-100 text-emerald-800',
    Intermediate: 'bg-slate-200 text-slate-800',
    Advanced: 'bg-teal-100 text-teal-900',
  };

  const shortCode = level === 'Beginner' ? 'BEG' : level === 'Intermediate' ? 'INT' : 'ADV';

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${styles[level]}`}>
        {shortCode}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold px-2.5 py-0.5 text-xs ${styles[level]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {level}
    </span>
  );
};

export const UserStatusBadge: React.FC<{ 
  status: UserStatus; 
  institutionName?: string; 
  organizationName?: string; 
  occupationDetails?: string;
  size?: 'sm' | 'md';
}> = ({ status, institutionName, organizationName, occupationDetails, size = 'sm' }) => {
  if (status === 'STUDENT') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded-lg ${size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'}`}>
        <GraduationCap className={size === 'sm' ? 'w-3.5 h-3.5 text-sky-600' : 'w-4 h-4 text-sky-600'} />
        <span>Student {institutionName ? `at ${institutionName}` : ''}</span>
      </span>
    );
  }

  if (status === 'WORKING_PROFESSIONAL') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg ${size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'}`}>
        <Building2 className={size === 'sm' ? 'w-3.5 h-3.5 text-emerald-600' : 'w-4 h-4 text-emerald-600'} />
        <span>Professional {organizationName ? `at ${organizationName}` : ''}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg ${size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'}`}>
      <Briefcase className={size === 'sm' ? 'w-3.5 h-3.5 text-slate-500' : 'w-4 h-4 text-slate-500'} />
      <span>{occupationDetails || 'Community Member'}</span>
    </span>
  );
};

export const TeachingConfidenceBadge: React.FC<{ confidence: TeachingConfidence }> = ({ confidence }) => {
  const text = {
    Beginners: 'Guides Beginners',
    Intermediate: 'Guides Intermediate',
    Both: 'Guides Beg & Int',
  }[confidence];

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/80">
      <UserCheck className="w-3 h-3 text-slate-400" />
      {text}
    </span>
  );
};

export const MatchTypeBadge: React.FC<{ matchType: MatchType; size?: 'sm' | 'md' }> = ({ matchType, size = 'md' }) => {
  if (matchType === 'PROJECT_COLLABORATION') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-xs">
        <Sparkles className="w-3 h-3 text-amber-100" />
        <span>Project Collaborator</span>
      </span>
    );
  }

  if (matchType === 'STRONG_MATCH') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-xs">
        <Sparkles className="w-3 h-3" />
        <span>Strong 2-Way Exchange</span>
      </span>
    );
  }

  if (matchType === 'KNOWLEDGE_SHARE' || matchType === 'RELEVANT_MATCH') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-widest border border-emerald-300 shadow-xs">
        <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
        <span>Knowledge Share Match</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider border border-slate-200">
      Open Peer
    </span>
  );
};

export const SelfDeclaredNotice: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>User-provided skill evidence &bull; AI relevance verified</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed">
      <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-slate-900">User-Provided Proof of Skill & Experience</p>
        <p className="text-slate-500 mt-0.5">
          Evidence links, portfolios, and repositories are submitted directly by users. AI checks evaluate topic relevance, not official real-world identity or official credential authenticity.
        </p>
      </div>
    </div>
  );
};

export const SupportingLinkButton: React.FC<{ url: string; linkType?: string; label?: string }> = ({ url, linkType, label }) => {
  if (!url) return null;
  const displayLabel = label || (linkType 
    ? `${linkType.charAt(0).toUpperCase() + linkType.slice(1)} Portfolio` 
    : 'View Evidence');

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <Award className="w-3 h-3 text-emerald-600" />
      <span>{displayLabel}</span>
      <ExternalLink className="w-3 h-3 ml-0.5 text-emerald-500" />
    </a>
  );
};

export const SkillEvidenceCard: React.FC<{ evidence?: SkillEvidence; skillCategory?: string }> = ({ evidence, skillCategory }) => {
  if (!evidence) return null;

  const getIcon = () => {
    switch (evidence.type) {
      case 'github_repo':
        return <Github className="w-4 h-4 text-slate-800" />;
      case 'project_link':
        return <Globe className="w-4 h-4 text-emerald-600" />;
      case 'portfolio':
        return <Layers className="w-4 h-4 text-teal-600" />;
      case 'work_sample':
      case 'published_work':
        return <FileText className="w-4 h-4 text-teal-600" />;
      case 'certificate':
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <FolderGit2 className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (evidence.type) {
      case 'github_repo':
        return 'GitHub Repository / Code';
      case 'project_link':
        return 'Live Project';
      case 'portfolio':
        return 'Portfolio Showcase';
      case 'work_sample':
        return 'Work Sample';
      case 'published_work':
        return 'Published Work';
      case 'certificate':
        return 'Course / Credential Certificate';
      default:
        return 'Skill Proof';
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {getIcon()}
          <span className="text-xs font-bold text-slate-900">{evidence.title || getTypeLabel()}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {getTypeLabel()}
        </span>
      </div>

      {evidence.description && (
        <p className="text-xs text-slate-600 leading-relaxed">
          {evidence.description}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        {evidence.url ? (
          <a
            href={evidence.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            <span>Inspect Project Proof</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">Detailed work sample on profile</span>
        )}

        {evidence.aiRelevanceCheck && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200" title={evidence.aiRelevanceCheck.feedback}>
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>AI Relevance: {evidence.aiRelevanceCheck.score}%</span>
          </div>
        )}
      </div>

      {/* Notice */}
      <p className="text-[10px] text-slate-400 italic">
        User-provided evidence &bull; AI relevance verified
      </p>
    </div>
  );
};
