import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Sparkles, ArrowRight, ArrowLeft, Check, Camera, Upload, RefreshCw, GraduationCap, Building2, Briefcase, Globe, Github, Linkedin, AlertCircle } from 'lucide-react';
import { UserStatus } from '../../types';
import { OfferedSkillsManager } from '../skills/OfferedSkillsManager';
import { WantedSkillsManager } from '../skills/WantedSkillsManager';
import { generateInitialsAvatar } from '../../utils/avatarUtils';

export const ProfileSetupWizard: React.FC = () => {
  const { 
    currentUser, 
    saveProfileBasicInfo, 
    addOfferedSkill, 
    removeOfferedSkill, 
    addWantedSkill, 
    removeWantedSkill,
    setCurrentView 
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 1 local state
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [titleOrRole, setTitleOrRole] = useState(currentUser?.titleOrRole || '');
  const [status, setStatus] = useState<UserStatus>(currentUser?.status || 'STUDENT');
  const [institutionName, setInstitutionName] = useState(currentUser?.institutionName || '');
  const [organizationName, setOrganizationName] = useState(currentUser?.organizationName || '');
  const [occupationDetails, setOccupationDetails] = useState(currentUser?.occupationDetails || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatarUrl || generateInitialsAvatar(currentUser?.name || 'Peer')
  );
  const [linkedinUrl, setLinkedinUrl] = useState(currentUser?.linkedinUrl || '');
  const [githubUrl, setGithubUrl] = useState(currentUser?.githubUrl || '');
  const [portfolioUrl, setPortfolioUrl] = useState(currentUser?.portfolioUrl || '');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file size should be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseInitialsAvatar = () => {
    setAvatarUrl(generateInitialsAvatar(displayName || currentUser?.name || 'Peer'));
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!avatarUrl.trim()) {
      setError('Please select or provide a profile picture.');
      return;
    }
    if (status === 'STUDENT' && !institutionName.trim()) {
      setError('Please provide your College or University name.');
      return;
    }
    if (status === 'WORKING_PROFESSIONAL' && !organizationName.trim()) {
      setError('Please provide your Company or Workplace name.');
      return;
    }
    if (status === 'OTHER' && !occupationDetails.trim()) {
      setError('Please describe your current occupation or learning focus.');
      return;
    }
    if (!titleOrRole.trim()) {
      setError('Please enter your primary title or role (e.g. CS Student, Frontend Developer).');
      return;
    }

    setError(null);
    saveProfileBasicInfo({
      displayName: displayName.trim(),
      titleOrRole: titleOrRole.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
      status,
      institutionName: status === 'STUDENT' ? institutionName.trim() : undefined,
      organizationName: status === 'WORKING_PROFESSIONAL' ? organizationName.trim() : undefined,
      occupationDetails: status === 'OTHER' ? occupationDetails.trim() : undefined,
      location: location.trim(),
      linkedinUrl: linkedinUrl.trim(),
      githubUrl: githubUrl.trim(),
      portfolioUrl: portfolioUrl.trim()
    });
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!currentUser?.offeredSkills.length) {
      setError('Please add at least one skill you can offer with evidence.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleFinishWizard = () => {
    setCurrentView('my_skillmesh');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Stepper Progress Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Profile Setup & Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {step === 1 && 'Complete your profile'}
            {step === 2 && 'What skills can you share?'}
            {step === 3 && 'What skills do you want to learn?'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
            {step === 1 && 'To help peers know who they are connecting with, provide your basic profile and background.'}
            {step === 2 && 'Offer at least one skill with user-provided evidence (GitHub, projects, portfolio).'}
            {step === 3 && 'Specify what you hope to learn to discover strong peer exchange matches.'}
          </p>

          {/* Stepper bar */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                      : step > s
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 sm:w-16 h-1 mx-1.5 rounded-full ${
                      step > s ? 'bg-teal-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Step Content Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {/* STEP 1: Basic Profile */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Profile Picture */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Profile Picture <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 border-2 border-emerald-600 shadow-sm shrink-0 self-center sm:self-auto">
                    <img
                      src={avatarUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleUseInitialsAvatar}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Generate Initials Avatar</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="Or enter a direct image URL..."
                      value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              {/* Current Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStatus('STUDENT')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      status === 'STUDENT'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className={`w-4 h-4 ${status === 'STUDENT' ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs">Student</span>
                    </div>
                    <span className="text-[11px] text-slate-500">College / University</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('WORKING_PROFESSIONAL')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      status === 'WORKING_PROFESSIONAL'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Building2 className={`w-4 h-4 ${status === 'WORKING_PROFESSIONAL' ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs">Professional</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Company / Workplace</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('OTHER')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      status === 'OTHER'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Briefcase className={`w-4 h-4 ${status === 'OTHER' ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs">Other</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Independent / Learner</span>
                  </button>
                </div>
              </div>

              {/* Conditional Education/Work fields */}
              {status === 'STUDENT' && (
                <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-100 space-y-1">
                  <label className="block text-xs font-bold text-sky-900 mb-1">
                    College / University Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford University, UC Berkeley, MIT..."
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-sky-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                  />
                  <p className="text-[11px] text-sky-700 mt-1">Displayed on your profile so peer learners know your academic context.</p>
                </div>
              )}

              {status === 'WORKING_PROFESSIONAL' && (
                <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 space-y-1">
                  <label className="block text-xs font-bold text-teal-950 mb-1">
                    Company / Organization / Workplace <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google, Stripe, Local Design Agency, Freelance Studio..."
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-teal-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                  />
                  <p className="text-[11px] text-teal-700 mt-1">Displayed on your profile so peers can see your professional domain.</p>
                </div>
              )}

              {status === 'OTHER' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Current Occupation / Focus <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Independent Researcher, Bootcamper, Career Transitioner..."
                    value={occupationDetails}
                    onChange={(e) => setOccupationDetails(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                  />
                </div>
              )}

              {/* Title / Field / Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Headline / Role / Major <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science Sophomore, Senior Product Designer, ML Enthusiast..."
                  value={titleOrRole}
                  onChange={(e) => setTitleOrRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  About You (Bio)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell peers what you are working on, your background, and why you love exchanging knowledge..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location / Timezone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA (PST) or Remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              {/* Optional Professional Links */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Optional Professional Links
                </label>
                <div className="space-y-2.5">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Linkedin className="w-4 h-4 text-blue-600" />
                    </div>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Github className="w-4 h-4 text-slate-800" />
                    </div>
                    <input
                      type="url"
                      placeholder="https://github.com/username"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Globe className="w-4 h-4 text-teal-600" />
                    </div>
                    <input
                      type="url"
                      placeholder="https://portfolio.me or personal site"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500">
                🔒 <strong>Privacy Assurance:</strong> Your personal email address, phone number, and physical address are kept strictly private and never published to the community.
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  id="wizard-step1-next-btn"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Offered Skills</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Offered Skills */}
          {step === 2 && (
            <div className="space-y-6">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <OfferedSkillsManager
                skills={currentUser?.offeredSkills || []}
                onAddSkill={addOfferedSkill}
                onRemoveSkill={removeOfferedSkill}
                isWizard={true}
              />

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setError(null); setStep(1); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  id="wizard-step2-next-btn"
                  onClick={handleStep2Next}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Skills You Want</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Wanted Skills */}
          {step === 3 && (
            <div className="space-y-6">
              <WantedSkillsManager
                skills={currentUser?.wantedSkills || []}
                onAddSkill={addWantedSkill}
                onRemoveSkill={removeWantedSkill}
                isWizard={true}
              />

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setError(null); setStep(2); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  id="wizard-finish-btn"
                  onClick={handleFinishWizard}
                  className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Find My Matches</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

