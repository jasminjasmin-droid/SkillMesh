import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Share2, 
  Search, 
  MessageSquare, 
  Users, 
  ShieldCheck, 
  BookOpen, 
  Laptop, 
  Palette, 
  BarChart, 
  Languages 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView, currentUser, isAdmin } = useApp();

  // Interactive matching simulation state
  const [selectedOffered, setSelectedOffered] = useState('Excel');
  const [selectedWanted, setSelectedWanted] = useState('Python');

  const popularSkills = [
    { name: 'Python', icon: Laptop, count: 'Programming & Scripts' },
    { name: 'Excel & Data', icon: BarChart, count: 'Formulas & Dashboards' },
    { name: 'UI/UX & Figma', icon: Palette, count: 'Design & Prototyping' },
    { name: 'Public Speaking', icon: Users, count: 'Presentations & Pitch' },
    { name: 'Languages', icon: Languages, count: 'Conversation Practice' },
    { name: 'Copywriting', icon: BookOpen, count: 'Writing & Editorial' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Hero Section with Sophisticated Geometric Background Pattern */}
      <section className="relative overflow-hidden pt-14 pb-20 lg:pt-24 lg:pb-32 border-b border-slate-200/80 bg-white">
        {/* Subtle Geometric Background Pattern Grid + Radial Fade */}
        <div className="absolute inset-0 bg-pattern-grid-emerald opacity-60 mask-radial-fade pointer-events-none" />
        
        {/* Ambient Ethereal Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-emerald-200/30 via-teal-100/25 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Technical Corner Crosshairs */}
        <div className="absolute top-6 left-6 text-slate-300 font-mono text-xs select-none pointer-events-none hidden md:block">
          + 01 // P2P_MESH
        </div>
        <div className="absolute top-6 right-6 text-slate-300 font-mono text-xs select-none pointer-events-none hidden md:block">
          SYS_READY // +
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 backdrop-blur-xs border border-emerald-200/90 text-emerald-800 text-xs font-semibold mb-6 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Peer-to-Peer Skill Exchange Network</span>
              <span className="text-emerald-400">•</span>
              <span className="text-emerald-700 font-medium">Algorithmic Matching</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Learn from people. <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-500 bg-clip-text text-transparent">
                Share what you know.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Skip static tutorial videos. Find real peers eager to trade practical skills 1-on-1: 
              <span className="text-slate-900 font-medium"> offer what you're good at, learn what you need.</span>
            </p>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {currentUser ? (
                <>
                  <button
                    id="hero-myskillmesh-cta"
                    onClick={() => setCurrentView(isAdmin ? 'admin_dashboard' : 'my_skillmesh')}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>{isAdmin ? 'Go to Admin Portal' : 'Go to My SkillMesh'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    id="hero-matches-cta"
                    onClick={() => setCurrentView('matches')}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border border-slate-300 shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Browse Peer Matches</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="hero-signup-cta"
                    onClick={() => setCurrentView('signup')}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>Get Started — It's Free</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    id="hero-login-cta"
                    onClick={() => setCurrentView('login')}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border border-slate-300 shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Log In to Your Account</span>
                  </button>
                </>
              )}
            </div>

            {/* Subtext info */}
            <div className="mt-9 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>No courses or paywalls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Transparent peer matching</span>
              </div>
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Direct reciprocal swaps</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Match Concept Showcase with Subtle Dots Pattern */}
      <section className="relative py-16 sm:py-20 bg-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="absolute inset-0 bg-pattern-dots opacity-70 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-bold mb-2 uppercase tracking-wider">
              Simulation
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How Matching Works
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              See how Skill Mesh algorithmically categorizes peer matches into Strong (Reciprocal) and Relevant connections.
            </p>
          </div>

          {/* Interactive Card with Geometric Border & Header */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pattern-grid opacity-30 pointer-events-none" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">
              {/* Left Selector */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    1. A Skill You Can Offer to Teach
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Excel', 'Graphic Design', 'Public Speaking'].map((skill) => (
                      <button
                        key={skill}
                        onClick={() => setSelectedOffered(skill)}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          selectedOffered === skill
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    2. A Skill You Want to Learn
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Python', 'React', 'Spanish'].map((skill) => (
                      <button
                        key={skill}
                        onClick={() => setSelectedWanted(skill)}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          selectedWanted === skill
                            ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-2xs font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900">Your Exchange Criteria:</p>
                  <p>&bull; You offer: <span className="font-bold text-emerald-700">{selectedOffered}</span></p>
                  <p>&bull; You want to learn: <span className="font-bold text-teal-700">{selectedWanted}</span></p>
                </div>
              </div>

              {/* Right Live Match Outcome Box with Geometric Dark Grid Pattern */}
              <div className="relative rounded-2xl p-6 shadow-md border border-slate-800 bg-slate-950 text-white overflow-hidden">
                <div className="absolute inset-0 bg-pattern-grid-dark opacity-40 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-mono font-bold">ALGORITHM_RESULT</span>
                    {selectedOffered === 'Excel' && selectedWanted === 'Python' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Strong Match (Reciprocal)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        Relevant Match
                      </span>
                    )}
                  </div>

                  {selectedOffered === 'Excel' && selectedWanted === 'Python' ? (
                    <div className="space-y-4">
                      <div className="bg-slate-900/90 rounded-xl p-3.5 text-xs space-y-2 border border-emerald-500/30">
                        <p className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Perfect 2-Way Reciprocal Swap
                        </p>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          A peer teaches you <strong className="text-white">{selectedWanted}</strong>, and simultaneously wants to learn <strong className="text-white">{selectedOffered}</strong> which you offer. Both peers gain mutual value.
                        </p>
                      </div>

                      <button
                        onClick={() => setCurrentView('signup')}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>Create Free Account to Match</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-900/90 rounded-xl p-3.5 text-xs space-y-2 border border-slate-700/80">
                        <p className="text-sky-300 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                          Relevant Peer Match
                        </p>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          A peer offers the skill you want to learn (<strong className="text-white">{selectedWanted}</strong>). You can initiate a connection request to coordinate learning.
                        </p>
                      </div>

                      <button
                        onClick={() => setCurrentView('signup')}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                      >
                        <span>Join SkillMesh to Connect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Simple Steps with Subtle Architectural Grid Pattern */}
      <section className="relative py-20 bg-white border-b border-slate-200/80 overflow-hidden">
        <div className="absolute inset-0 bg-pattern-grid opacity-50 mask-radial-fade pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-3">
              Reciprocal Framework
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How Peer Learning Works
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Three transparent steps from setting up your competency card to scheduling live reciprocal sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-slate-50/80 backdrop-blur-xs rounded-3xl p-8 border border-slate-200/90 relative flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pattern-dots opacity-20 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg shadow-2xs group-hover:scale-105 transition-transform">
                    1
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 tracking-wider">PHASE_01</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Build Your Skill Card</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  List skills you can confidently teach or guide peers in, along with your proficiency level, years of experience, and learning goals.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Verified email onboarding</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50/80 backdrop-blur-xs rounded-3xl p-8 border border-slate-200/90 relative flex flex-col justify-between hover:border-teal-400 hover:shadow-md transition-all group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pattern-dots opacity-20 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-lg shadow-2xs group-hover:scale-105 transition-transform">
                    2
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 tracking-wider">PHASE_02</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Algorithmic Matching</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Our transparent rule-based engine categorizes mutual 2-way swaps as Strong Matches, and single-skill mentors as Relevant Matches.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
                <Search className="w-4 h-4 text-teal-600" />
                <span className="font-medium">Keyword & category filtering</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50/80 backdrop-blur-xs rounded-3xl p-8 border border-slate-200/90 relative flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pattern-dots opacity-20 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-2xs group-hover:scale-105 transition-transform">
                    3
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 tracking-wider">PHASE_03</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Connect and Learn</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  View peer profiles, inspect evidence links, book scheduled mentorship slots, and exchange knowledge 1-on-1.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Direct peer communication</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Skills Grid with Subtle Blueprint Pattern */}
      <section className="relative py-16 sm:py-20 bg-slate-50/70 border-b border-slate-200 overflow-hidden">
        <div className="absolute inset-0 bg-pattern-dots opacity-50 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Peer Exchange Categories</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">Skills Shared Across the Community</h2>
            </div>
            <button
              onClick={() => setCurrentView('signup')}
              className="mt-4 sm:mt-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Join the Network <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularSkills.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  onClick={() => setCurrentView('signup')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all text-center group relative overflow-hidden"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">{cat.count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Peer Community Guarantee / Safety Banner with Geometric Pattern */}
      <section className="relative py-16 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-pattern-grid-emerald opacity-30 mask-radial-fade pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 mb-4 shadow-2xs">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Peer-Led, Mutual Growth</h3>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            SkillMesh operates on trust, reciprocity, and real human practice. Every skill entry is self-declared, accompanied by portfolio links and learning goals, making peer collaborations straightforward and productive.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              id="cta-join-bottom"
              onClick={() => setCurrentView('signup')}
              className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Create Your Skill Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight">SkillMesh</span>
            </div>
            <p className="text-slate-400 text-center sm:text-right max-w-md">
              "I can offer a skill, and I want to learn another skill. Find me relevant people."
            </p>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <p>&copy; {new Date().getFullYear()} SkillMesh Platform. Open peer skill exchange.</p>
            <div className="flex items-center gap-6">
              <button onClick={() => setCurrentView('signup')} className="hover:text-slate-300 cursor-pointer">Sign Up</button>
              <button onClick={() => setCurrentView('login')} className="hover:text-slate-300 cursor-pointer">Log In</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
