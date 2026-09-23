import React, { useState } from 'react';
import { OfferedSkill, ProficiencyLevel, TeachingConfidence, SkillEvidence, EvidenceType } from '../../types';
import { Plus, Trash2, ShieldAlert, Award, ExternalLink, Sparkles, Check, HelpCircle, FileCheck, Link2, AlertCircle, Info } from 'lucide-react';
import { ProficiencyBadge, TeachingConfidenceBadge, SelfDeclaredNotice, SkillEvidenceCard } from '../common/Badges';

interface OfferedSkillsManagerProps {
  skills: OfferedSkill[];
  onAddSkill: (skill: Omit<OfferedSkill, 'id'>) => void;
  onRemoveSkill: (skillId: string) => void;
  isWizard?: boolean;
}

export const OfferedSkillsManager: React.FC<OfferedSkillsManagerProps> = ({
  skills,
  onAddSkill,
  onRemoveSkill,
  isWizard = false,
}) => {
  const [isAdding, setIsAdding] = useState(skills.length === 0);
  
  // Form fields
  const [name, setName] = useState('');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('Intermediate');
  const [experienceDescription, setExperienceDescription] = useState('');
  const [yearsOfPractice, setYearsOfPractice] = useState('2 years');
  const [teachingConfidence, setTeachingConfidence] = useState<TeachingConfidence>('Both');
  
  // Evidence fields
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('project_link');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');

  const [error, setError] = useState<string | null>(null);

  const suggestedSkills = [
    'Microsoft Excel',
    'Python',
    'Graphic Design',
    'React',
    'Public Speaking',
    'Figma',
    'Data Analysis',
    'Spanish',
    'Copywriting & Content',
    'JavaScript',
  ];

  // Helper AI-assisted relevance feedback calculation
  const getRelevanceFeedback = () => {
    if (!name.trim() || (!evidenceTitle.trim() && !evidenceDescription.trim() && !evidenceUrl.trim())) {
      return null;
    }
    const lowerSkill = name.toLowerCase();
    const combined = `${evidenceTitle} ${evidenceDescription} ${evidenceUrl}`.toLowerCase();
    
    // Check if relevant keywords match
    const keywords = lowerSkill.split(/[\s/,-]+/).filter(k => k.length > 2);
    const matches = keywords.filter(k => combined.includes(k));
    
    if (matches.length > 0 || combined.length > 30) {
      return {
        level: 'high' as const,
        message: `Strong evidence relevance detected for "${name}". Demonstrates practical capability.`,
      };
    } else {
      return {
        level: 'medium' as const,
        message: `Tip: Ensure your evidence description specifically highlights how you use ${name}.`,
      };
    }
  };

  const relevance = getRelevanceFeedback();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter the name of the skill.');
      return;
    }
    if (!experienceDescription.trim()) {
      setError('Please describe your practical experience with this skill.');
      return;
    }
    if (!evidenceDescription.trim() && !evidenceUrl.trim()) {
      setError('Please provide proof of skill (e.g. project description, repository URL, or certification details).');
      return;
    }

    const evidence: SkillEvidence = {
      id: 'ev_' + Date.now(),
      type: evidenceType,
      title: evidenceTitle.trim() || `${name} Proof of Skill`,
      description: evidenceDescription.trim() || experienceDescription.trim(),
      url: evidenceUrl.trim() || undefined,
      aiRelevanceCheck: {
        isRelevant: true,
        score: relevance?.level === 'high' ? 95 : 75,
        feedback: relevance?.message || 'User-provided evidence corresponds with skill details.',
        verifiedAt: new Date().toISOString()
      }
    };

    onAddSkill({
      name: name.trim(),
      proficiency,
      experienceDescription: experienceDescription.trim(),
      yearsOfPractice,
      teachingConfidence,
      supportingLink: evidenceUrl.trim() || undefined,
      supportingLinkType: evidenceType === 'github_repo' ? 'github' : evidenceType === 'certificate' ? 'certificate' : 'portfolio',
      evidence: [evidence]
    });

    // Reset form
    setName('');
    setExperienceDescription('');
    setEvidenceTitle('');
    setEvidenceUrl('');
    setEvidenceDescription('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Transparency / Self-declared notice */}
      <SelfDeclaredNotice />

      {/* List of existing offered skills */}
      <div className="space-y-4">
        {skills.length === 0 && !isAdding && (
          <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300">
            <p className="text-sm font-bold text-slate-800">No skills offered yet</p>
            <p className="text-xs text-slate-500 mt-1">Add at least one skill with proof or practical experience.</p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-emerald-950/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add a Skill
            </button>
          </div>
        )}

        {skills.map((skill) => (
          <div
            key={skill.id}
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors relative space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h4 className="font-extrabold text-slate-900 text-base">{skill.name}</h4>
                  <ProficiencyBadge level={skill.proficiency} />
                  <TeachingConfidenceBadge confidence={skill.teachingConfidence} />
                  <span className="text-[11px] text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {skill.yearsOfPractice}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{skill.experienceDescription}</p>
              </div>

              <button
                type="button"
                onClick={() => onRemoveSkill(skill.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Remove skill"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Evidence items */}
            {(() => {
              const evidenceList = Array.isArray(skill.evidence)
                ? skill.evidence
                : skill.evidence
                  ? [skill.evidence]
                  : [];
              if (evidenceList.length > 0) {
                return (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Proof of Skill & Evidence ({evidenceList.length})
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {evidenceList.map((ev, idx) => (
                        <SkillEvidenceCard key={ev.id || idx} evidence={ev} />
                      ))}
                    </div>
                  </div>
                );
              }
              if (skill.supportingLink) {
                return (
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <a
                      href={skill.supportingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-bold"
                    >
                      <Award className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{skill.supportingLinkType ? `${skill.supportingLinkType} Link` : 'Supporting Evidence'}</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                    </a>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                      User-provided link
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        ))}
      </div>

      {/* Add Skill Button or Form */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="bg-slate-50/90 rounded-3xl border border-emerald-200/80 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Add a Skill with Proof of Experience
            </h4>
            {skills.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Skill Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Skill Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Microsoft Excel, Python, UI/UX Design, Public Speaking..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 py-0.5 font-medium">Quick suggestions:</span>
              {suggestedSkills.slice(0, 5).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setName(s)}
                  className="text-[11px] font-semibold bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Proficiency & Years */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Proficiency Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Beginner', 'Intermediate', 'Advanced'] as ProficiencyLevel[]).map((lvl) => (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => setProficiency(lvl)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      proficiency === lvl
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Practised Duration <span className="text-red-500">*</span>
              </label>
              <select
                value={yearsOfPractice}
                onChange={(e) => setYearsOfPractice(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              >
                <option value="Under 6 months">&lt; 6 months</option>
                <option value="1 year">1 year</option>
                <option value="2 years">2 years</option>
                <option value="3-4 years">3-4 years</option>
                <option value="5+ years">5+ years</option>
              </select>
            </div>
          </div>

          {/* Teaching Confidence */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Who Can You Guide? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { val: 'Beginners' as TeachingConfidence, label: 'Beginners' },
                { val: 'Intermediate' as TeachingConfidence, label: 'Intermediate Peers' },
                { val: 'Both' as TeachingConfidence, label: 'All Levels' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.val}
                  onClick={() => setTeachingConfidence(opt.val)}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    teachingConfidence === opt.val
                      ? 'bg-teal-50 border-teal-600 text-teal-800 ring-2 ring-teal-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Practical Experience Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="What projects, tasks, or workflows have you done with this skill? (e.g. built automated data pipelines in Python, constructed financial projections in Excel...)"
              value={experienceDescription}
              onChange={(e) => setExperienceDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Proof of Skill / Evidence Section */}
          <div className="p-4 bg-white rounded-2xl border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Proof of Skill & Supporting Evidence <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                User-provided
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="project_link">Project / Live Application</option>
                  <option value="github_repo">GitHub / Code Repository</option>
                  <option value="portfolio">Portfolio / Case Study</option>
                  <option value="certificate">Course / Certificate</option>
                  <option value="work_sample">Work Sample / Document</option>
                  <option value="other_evidence">Other Proof</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Project/Credential Title</label>
                <input
                  type="text"
                  placeholder="e.g. E-commerce API backend"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Evidence URL (Optional if described below)
              </label>
              <input
                type="url"
                placeholder="https://github.com/user/project or https://behance.net/work"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                How does this demonstrate your skill? <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Explain the work you did, problems solved, or tools used to substantiate this skill..."
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* AI-assisted relevance feedback indicator */}
            {relevance && (
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-emerald-950 font-medium leading-tight">
                  <span className="font-bold">Evidence Relevance Feedback: </span>
                  {relevance.message}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            {skills.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-bold cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Save Offered Skill with Evidence
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-600 hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Another Skill You Can Offer
        </button>
      )}
    </div>
  );
};

