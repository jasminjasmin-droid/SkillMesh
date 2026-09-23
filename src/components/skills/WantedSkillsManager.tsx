import React, { useState } from 'react';
import { WantedSkill, ProficiencyLevel } from '../../types';
import { Plus, Trash2, Sparkles, Check, Compass } from 'lucide-react';
import { ProficiencyBadge } from '../common/Badges';

interface WantedSkillsManagerProps {
  skills: WantedSkill[];
  onAddSkill: (skill: Omit<WantedSkill, 'id'>) => void;
  onRemoveSkill: (skillId: string) => void;
  isWizard?: boolean;
}

export const WantedSkillsManager: React.FC<WantedSkillsManagerProps> = ({
  skills,
  onAddSkill,
  onRemoveSkill,
  isWizard = false,
}) => {
  const [isAdding, setIsAdding] = useState(skills.length === 0);
  
  const [name, setName] = useState('');
  const [currentLevel, setCurrentLevel] = useState<ProficiencyLevel>('Beginner');
  const [learningGoal, setLearningGoal] = useState('');
  const [error, setError] = useState<string | null>(null);

  const suggestedSkills = [
    'Python',
    'Microsoft Excel',
    'React',
    'Graphic Design',
    'Figma',
    'Public Speaking',
    'Data Analysis',
    'Spanish',
    'Machine Learning',
    'Copywriting',
  ];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter the name of the skill you want to learn.');
      return;
    }

    onAddSkill({
      name: name.trim(),
      currentLevel,
      learningGoal: learningGoal.trim() || undefined,
    });

    setName('');
    setLearningGoal('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs">
        <Compass className="w-4 h-4 text-emerald-700 shrink-0" />
        <p>
          Listing what you want to learn powers our matching engine to surface peers ready to mentor you in return for your skills.
        </p>
      </div>

      {/* Existing List */}
      <div className="space-y-3">
        {skills.length === 0 && !isAdding && (
          <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300">
            <p className="text-sm font-bold text-slate-700">No requested skills yet</p>
            <p className="text-xs text-slate-500 mt-1">Add what you are interested in learning.</p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Desired Skill
            </button>
          </div>
        )}

        {skills.map((skill) => (
          <div
            key={skill.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors relative flex items-start justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-900 text-base">{skill.name}</h4>
                <span className="text-xs text-slate-500 font-semibold">Your level:</span>
                <ProficiencyBadge level={skill.currentLevel} />
              </div>
              {skill.learningGoal && (
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  <span className="font-bold text-slate-700">Goal:</span> {skill.learningGoal}
                </p>
              )}
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
        ))}
      </div>

      {/* Add Form */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="bg-slate-50/90 rounded-3xl border border-emerald-200/80 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              Add a Skill You Want to Learn
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
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-semibold">{error}</p>
          )}

          {/* Skill Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Skill Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Python, Microsoft Excel, Graphic Design..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 py-0.5 font-medium">Popular:</span>
              {suggestedSkills.slice(0, 5).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setName(s)}
                  className="text-[11px] font-semibold bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Current Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Your Current Level in this Skill <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Beginner', 'Intermediate', 'Advanced'] as ProficiencyLevel[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setCurrentLevel(lvl)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    currentLevel === lvl
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Goal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              What do you want to accomplish? (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Want to automate daily CSV reports, or build portfolio designs in Figma..."
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
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
              Save Wanted Skill
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-600 hover:text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Another Skill You Want to Learn
        </button>
      )}
    </div>
  );
};
