import React, { useState } from 'react';
import { 
  FolderGit2, 
  Plus, 
  ExternalLink, 
  Github, 
  Globe, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sparkles,
  Layers,
  Code2
} from 'lucide-react';
import { UserProject } from '../../types';
import { apiSaveUserProject, apiDeleteUserProject } from '../../services/upgradeApi';

interface ProjectsPortfolioSectionProps {
  userId: string;
  projects?: UserProject[];
  isOwner?: boolean;
  onProjectsUpdated?: (updatedProjects: UserProject[]) => void;
}

export const ProjectsPortfolioSection: React.FC<ProjectsPortfolioSectionProps> = ({
  userId,
  projects: initialProjects = [],
  isOwner = false,
  onProjectsUpdated
}) => {
  const [projectsList, setProjectsList] = useState<UserProject[]>(initialProjects);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillsString, setSkillsString] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSkillsString('');
    setGithubUrl('');
    setLiveDemoUrl('');
    setIsAdding(false);
    setEditingId(null);
    setErrorMessage(null);
  };

  const startEdit = (proj: UserProject) => {
    setEditingId(proj.id);
    setTitle(proj.title);
    setDescription(proj.description || '');
    setSkillsString((proj.skillsUsed || []).join(', '));
    setGithubUrl(proj.githubUrl || '');
    setLiveDemoUrl(proj.liveDemoUrl || '');
    setIsAdding(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Project title is required.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const skillsUsed = skillsString
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const projectPayload: Partial<UserProject> = {
      id: editingId || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      skillsUsed,
      githubUrl: githubUrl.trim() || undefined,
      liveDemoUrl: liveDemoUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await apiSaveUserProject(userId, projectPayload);
      if (res.success && res.projects) {
        setProjectsList(res.projects);
        onProjectsUpdated?.(res.projects);
        resetForm();
      } else {
        // Fallback local update
        let updated: UserProject[];
        if (editingId) {
          updated = projectsList.map(p => p.id === editingId ? { ...p, ...projectPayload } as UserProject : p);
        } else {
          updated = [...projectsList, projectPayload as UserProject];
        }
        setProjectsList(updated);
        onProjectsUpdated?.(updated);
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to remove this project?')) return;
    try {
      const res = await apiDeleteUserProject(userId, projectId);
      if (res.success && res.projects) {
        setProjectsList(res.projects);
        onProjectsUpdated?.(res.projects);
      } else {
        const updated = projectsList.filter(p => p.id !== projectId);
        setProjectsList(updated);
        onProjectsUpdated?.(updated);
      }
    } catch (err) {
      console.warn('Error deleting project:', err);
    }
  };

  return (
    <div id={`projects-section-${userId}`} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Project Portfolio & Real Work</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tangible proofs of skills, code repositories, and applied knowledge
          </p>
        </div>

        {isOwner && !isAdding && (
          <button
            id="add-project-btn"
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {isOwner && isAdding && (
        <form onSubmit={handleSaveProject} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-emerald-600" />
              <span>{editingId ? 'Edit Project Details' : 'Add New Showcase Project'}</span>
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="project-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Project Title *
              </label>
              <input
                id="project-title-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Distributed Task Queue in Go, Next.js E-Commerce Platform"
                maxLength={100}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label htmlFor="project-desc-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Description & Architectural Role
              </label>
              <textarea
                id="project-desc-input"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe what this project does, your primary role, and the technical challenges solved..."
                maxLength={500}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="project-skills-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Skills & Technologies Used <span className="text-slate-400 font-normal">(comma-separated)</span>
              </label>
              <input
                id="project-skills-input"
                type="text"
                value={skillsString}
                onChange={e => setSkillsString(e.target.value)}
                placeholder="e.g. TypeScript, React, PostgreSQL, Docker, Tailwind"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="project-github-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <Github className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="project-github-input"
                    type="url"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="project-demo-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Live Demo / Deployment URL
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="project-demo-input"
                    type="url"
                    value={liveDemoUrl}
                    onChange={e => setLiveDemoUrl(e.target.value)}
                    placeholder="https://myproject.com or preview link"
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update Project' : 'Save Project'}
            </button>
          </div>
        </form>
      )}

      {/* Projects Grid */}
      {projectsList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectsList.map(proj => (
            <div
              key={proj.id}
              id={`project-card-${proj.id}`}
              className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 flex flex-col justify-between hover:border-emerald-200 hover:bg-emerald-50/20 transition-all duration-200 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {proj.title}
                  </h3>

                  {isOwner && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(proj)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-white transition-colors cursor-pointer"
                        title="Edit project"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {proj.description && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {proj.description}
                  </p>
                )}

                {/* Skills tags */}
                {proj.skillsUsed && proj.skillsUsed.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {proj.skillsUsed.map((sk, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white text-slate-700 border border-slate-200/80 shadow-2xs"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Links Footer */}
              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-slate-200/60 text-xs">
                {proj.githubUrl && (
                  <a
                    href={proj.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-950 transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>View Repository</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}

                {proj.liveDemoUrl && (
                  <a
                    href={proj.liveDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-900 transition-colors ml-auto"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Live Demo</span>
                    <ExternalLink className="w-3 h-3 text-emerald-600" />
                  </a>
                )}

                {!proj.githubUrl && !proj.liveDemoUrl && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Showcased portfolio item
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No Projects Showcased Yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {isOwner
              ? 'Add your active projects, GitHub repositories, or live demos to demonstrate your capabilities to exchange partners.'
              : 'Showcase projects and work samples will appear here.'}
          </p>
          {isOwner && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="mt-3 px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Project</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
