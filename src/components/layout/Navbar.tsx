import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  User, 
  LogOut, 
  Menu, 
  X, 
  CheckCircle2, 
  MessageSquare, 
  ArrowRightLeft, 
  ShieldCheck,
  Activity,
  Users,
  Layers,
  AlertTriangle,
  FileText,
  ChevronRight,
  Shield,
  Compass,
  Home,
  Rocket,
  FolderGit2,
  Bell,
  GraduationCap
} from 'lucide-react';
import { NotificationCenterModal } from '../notifications/NotificationCenterModal';
import { AvailabilityToggleModal } from '../availability/AvailabilityToggleModal';

export const Navbar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    currentUser, 
    logout,
    connections,
    isAdmin,
    adminActiveTab,
    setAdminActiveTab,
    adminReportsList,
    unreadNotificationCount,
    currentUserAvailability,
    mentorshipRequests
  } = useApp();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  // Notification badges
  const pendingReceivedCount = currentUser && !isAdmin
    ? connections.filter(c => c.receiverId === currentUser.id && c.status === 'PENDING' && !c.isProjectCollaboration && c.requestType !== 'PROJECT_COLLABORATION').length
    : 0;

  const pendingProjectProposalsCount = currentUser && !isAdmin
    ? connections.filter(c => c.receiverId === currentUser.id && c.status === 'PENDING' && (c.isProjectCollaboration || c.requestType === 'PROJECT_COLLABORATION')).length
    : 0;

  const activeExchangesCount = currentUser && !isAdmin
    ? connections.filter(c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'ACCEPTED').length
    : 0;

  const pendingReportsCount = isAdmin
    ? adminReportsList.filter(r => r.status === 'PENDING_REVIEW' || r.status === 'UNDER_REVIEW').length
    : 0;

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [drawerOpen]);

  const navigateTo = (view: any) => {
    setCurrentView(view);
    setDrawerOpen(false);
  };

  const navigateAdminTab = (tab: any) => {
    setAdminActiveTab(tab);
    setCurrentView('admin_dashboard');
    setDrawerOpen(false);
  };

  // Helper for active view label in top bar
  const getActiveViewLabel = () => {
    if (isAdmin && currentView === 'admin_dashboard') {
      switch (adminActiveTab) {
        case 'overview': return { label: 'Admin Overview', icon: Activity };
        case 'users': return { label: 'User Directory', icon: Users };
        case 'skills': return { label: 'Skills Aggregation', icon: Layers };
        case 'reports': return { label: 'Safety & Reports', icon: AlertTriangle };
        case 'audit_logs': return { label: 'Audit Logs', icon: FileText };
        default: return { label: 'Admin Portal', icon: ShieldCheck };
      }
    }
    switch (currentView) {
      case 'my_skillmesh': return { label: 'My SkillMesh', icon: Home };
      case 'matches': return { label: 'Discover Matches', icon: Compass };
      case 'mentorship':
      case 'mentorship_hub': return { label: 'Mentorship Hub', icon: GraduationCap };
      case 'project_collaboration': return { label: 'Project Collaboration', icon: Rocket };
      case 'requests':
      case 'connections': return { label: 'Skill Requests', icon: ArrowRightLeft };
      case 'active_exchanges': return { label: 'Active Exchanges', icon: CheckCircle2 };
      case 'chat': return { label: 'Direct Chat', icon: MessageSquare };
      case 'my_profile': return { label: 'My Profile & Skills', icon: User };
      case 'profile_detail': return { label: 'Peer Profile', icon: User };
      case 'profile_setup': return { label: 'Profile Setup', icon: Sparkles };
      case 'landing': return { label: 'SkillMesh P2P', icon: Compass };
      default: return { label: 'SkillMesh', icon: Sparkles };
    }
  };

  const activeViewInfo = getActiveViewLabel();
  const ActiveIcon = activeViewInfo.icon;

  return (
    <>
      {/* Top Header Navigation */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isAdmin 
          ? 'bg-slate-900/95 border-slate-800 text-white shadow-md' 
          : 'bg-white/95 border-slate-200/80 text-slate-800 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Left: Hamburger Button & Brand Logo */}
            <div className="flex items-center gap-3">
              <button
                id="nav-hamburger-btn"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open Navigation Menu"
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  isAdmin 
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700' 
                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 shadow-2xs'
                }`}
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div 
                id="nav-logo"
                onClick={() => {
                  if (isAdmin) {
                    setAdminActiveTab('overview');
                    setCurrentView('admin_dashboard');
                  } else if (currentUser) {
                    setCurrentView('my_skillmesh');
                  } else {
                    setCurrentView('landing');
                  }
                }}
                className="flex items-center gap-2.5 cursor-pointer group select-none"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${
                  isAdmin ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {isAdmin ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <div className="w-3.5 h-3.5 border-2 border-white rounded-xs rotate-45"></div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${isAdmin ? 'text-white' : 'text-slate-900'}`}>
                    SkillMesh
                  </span>
                  {isAdmin ? (
                    <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md hidden xs:inline-block">
                      Admin
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded-sm hidden xs:inline-block">
                      P2P
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: Subtle Current View Indicator Pill & Direct Links */}
            <div className="hidden md:flex items-center gap-2">
              {currentUser && !isAdmin ? (
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/70">
                  <button
                    id="nav-link-my-skillmesh"
                    onClick={() => setCurrentView('my_skillmesh')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentView === 'my_skillmesh'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>My SkillMesh</span>
                  </button>

                  <button
                    id="nav-link-discover"
                    onClick={() => setCurrentView('matches')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentView === 'matches'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Discover Matches</span>
                  </button>

                  <button
                    id="nav-link-mentorship"
                    onClick={() => setCurrentView('mentorship')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentView === 'mentorship' || currentView === 'mentorship_hub'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mentorship</span>
                    {mentorshipRequests?.incoming?.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black">
                        {mentorshipRequests.incoming.length}
                      </span>
                    )}
                  </button>

                  <button
                    id="nav-link-project-collab"
                    onClick={() => setCurrentView('project_collaboration')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentView === 'project_collaboration'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-teal-700'
                    }`}
                  >
                    <Rocket className="w-3.5 h-3.5 text-teal-600" />
                    <span>Project Collab</span>
                    {pendingProjectProposalsCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-black">
                        {pendingProjectProposalsCount}
                      </span>
                    )}
                  </button>

                  <button
                    id="nav-link-chat"
                    onClick={() => setCurrentView('chat')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentView === 'chat'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              ) : (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  isAdmin 
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200' 
                    : 'bg-slate-50 border-slate-200/70 text-slate-700'
                }`}>
                  <ActiveIcon className={`w-3.5 h-3.5 ${isAdmin ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>{activeViewInfo.label}</span>
                </div>
              )}
            </div>

            {/* Right: Quick Action Indicators & User Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Notification Pills for Authenticated Users */}
              {currentUser && !isAdmin && (
                <div className="flex items-center gap-1.5">
                  {pendingReceivedCount > 0 && (
                    <button
                      id="nav-quick-requests-badge"
                      onClick={() => setCurrentView('requests')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                      title={`${pendingReceivedCount} pending connection requests`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                      <span>{pendingReceivedCount}</span>
                    </button>
                  )}
                  {activeExchangesCount > 0 && (
                    <button
                      id="nav-quick-exchanges-badge"
                      onClick={() => setCurrentView('active_exchanges')}
                      className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                      title={`${activeExchangesCount} active skill exchanges in progress`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{activeExchangesCount} Active</span>
                    </button>
                  )}
                </div>
              )}

              {/* Admin Safety Alerts Quick Pill */}
              {currentUser && isAdmin && pendingReportsCount > 0 && (
                <button
                  id="nav-quick-admin-reports-badge"
                  onClick={() => {
                    setAdminActiveTab('reports');
                    setCurrentView('admin_dashboard');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
                  title={`${pendingReportsCount} pending safety reports`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{pendingReportsCount} Reports</span>
                </button>
              )}

              {/* Live Availability Toggle Pill */}
              {currentUser && !isAdmin && (
                <button
                  id="nav-availability-toggle-btn"
                  onClick={() => setShowAvailabilityModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102"
                  style={{
                    backgroundColor: currentUserAvailability?.status === 'AVAILABLE' ? '#ecfdf5' : '#f8fafc',
                    borderColor: currentUserAvailability?.status === 'AVAILABLE' ? '#a7f3d0' : '#e2e8f0',
                    color: currentUserAvailability?.status === 'AVAILABLE' ? '#047857' : '#64748b',
                  }}
                  title="Toggle Live Availability"
                >
                  <span className={`w-2 h-2 rounded-full ${currentUserAvailability?.status === 'AVAILABLE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  <span className="hidden sm:inline">
                    {currentUserAvailability?.status === 'AVAILABLE' ? 'Available' : 'Away'}
                  </span>
                </button>
              )}

              {/* Notification Center Bell */}
              {currentUser && (
                <button
                  id="nav-notification-center-btn"
                  onClick={() => setShowNotifications(true)}
                  className={`relative p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isAdmin
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
                  }`}
                  title="Notification Center"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center animate-in zoom-in-75">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </button>
              )}

              {/* User Profile or Auth Trigger */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <button
                    id="nav-user-profile-chip"
                    onClick={() => {
                      if (isAdmin) {
                        setAdminActiveTab('overview');
                        setCurrentView('admin_dashboard');
                      } else {
                        setCurrentView('my_profile');
                      }
                    }}
                    className={`flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-xl transition-all cursor-pointer ${
                      isAdmin 
                        ? 'hover:bg-slate-800 text-slate-200' 
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-200 overflow-hidden shrink-0 shadow-2xs">
                      {isAdmin ? (
                        <div className="w-full h-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                          👑
                        </div>
                      ) : (
                        <img 
                          src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                          alt={currentUser.name} 
                          className="w-full h-full object-cover" 
                        />
                      )}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-bold leading-tight line-clamp-1">{currentUser.name}</p>
                      <p className={`text-[10px] ${isAdmin ? 'text-emerald-400' : 'text-slate-500'} leading-tight`}>
                        {isAdmin ? 'Administrator' : (currentUser.titleOrRole || 'Member')}
                      </p>
                    </div>
                  </button>

                  <button
                    id="nav-logout-btn"
                    onClick={logout}
                    className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isAdmin 
                        ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' 
                        : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    id="nav-login-btn"
                    onClick={() => setCurrentView('login')}
                    className="text-xs font-bold text-slate-700 hover:text-emerald-700 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    id="nav-signup-btn"
                    onClick={() => setCurrentView('signup')}
                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Side Navigation Drawer Backdrop */}
      {drawerOpen && (
        <div 
          id="nav-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity duration-300 animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Side Navigation Drawer Panel */}
      <aside 
        id="nav-drawer-panel"
        className={`fixed top-0 bottom-0 left-0 w-[85vw] max-w-sm bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-r border-slate-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="SkillMesh Navigation Drawer"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shadow-emerald-950/20 shadow-xs">
              {isAdmin ? (
                <ShieldCheck className="w-5 h-5 text-white" />
              ) : (
                <div className="w-4 h-4 border-2 border-white rounded-xs rotate-45"></div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900">SkillMesh</span>
                {isAdmin ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                    Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-sm">
                    P2P
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Skill-for-Skill Barter Network</p>
            </div>
          </div>

          <button
            id="drawer-close-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Mini Banner (if authenticated) */}
        {currentUser && (
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/80 to-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 border-2 border-emerald-200/80 overflow-hidden shrink-0 shadow-2xs">
                {isAdmin ? (
                  <div className="w-full h-full bg-slate-900 text-emerald-300 flex items-center justify-center text-sm font-bold">
                    👑
                  </div>
                ) : (
                  <img 
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover" 
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
                  {isAdmin ? (
                    <span className="text-[10px] bg-emerald-700 text-white font-extrabold px-1.5 py-0.2 rounded-md">
                      ADMIN
                    </span>
                  ) : currentUser.isVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                <p className="text-[11px] font-semibold text-emerald-700 mt-0.5 truncate">
                  {isAdmin ? 'System Administrator' : (currentUser.titleOrRole || 'Active Member')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Drawer Scrollable Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

          {/* Regular User Navigation Section */}
          {currentUser && !isAdmin && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Main Navigation
              </p>

              {/* 1. My SkillMesh (Personal Home Experience) */}
              <button
                id="drawer-nav-my-skillmesh-btn"
                onClick={() => navigateTo('my_skillmesh')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'my_skillmesh'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className={`w-4 h-4 ${currentView === 'my_skillmesh' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>My SkillMesh</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  currentView === 'my_skillmesh' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-800'
                }`}>
                  Home
                </span>
              </button>

              {/* 2. Discover Matches */}
              <button
                id="drawer-nav-matches-btn"
                onClick={() => navigateTo('matches')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'matches'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Compass className={`w-4 h-4 ${currentView === 'matches' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Discover Matches</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-50 ${currentView === 'matches' ? 'text-white' : 'text-slate-400'}`} />
              </button>

              {/* 2b. Mentorship Hub */}
              <button
                id="drawer-nav-mentorship-btn"
                onClick={() => navigateTo('mentorship')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'mentorship' || currentView === 'mentorship_hub'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className={`w-4 h-4 ${currentView === 'mentorship' || currentView === 'mentorship_hub' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Mentorship Hub</span>
                </div>
                <div className="flex items-center gap-2">
                  {mentorshipRequests?.incoming?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-white">
                      {mentorshipRequests.incoming.length}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 opacity-50 ${currentView === 'mentorship' || currentView === 'mentorship_hub' ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </button>

              {/* 3. Requests */}
              <button
                id="drawer-nav-requests-btn"
                onClick={() => navigateTo('requests')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'requests' || currentView === 'connections'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className={`w-4 h-4 ${currentView === 'requests' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Requests</span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingReceivedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white">
                      {pendingReceivedCount}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 opacity-50 ${currentView === 'requests' ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </button>

              {/* 4. Active Exchanges */}
              <button
                id="drawer-nav-active-exchanges-btn"
                onClick={() => navigateTo('active_exchanges')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'active_exchanges'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={`w-4 h-4 ${currentView === 'active_exchanges' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Active Exchanges</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeExchangesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-white">
                      {activeExchangesCount}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 opacity-50 ${currentView === 'active_exchanges' ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </button>

              {/* 5. Project Collaboration */}
              <button
                id="drawer-nav-project-collab-btn"
                onClick={() => navigateTo('project_collaboration')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'project_collaboration'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-teal-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Rocket className={`w-4 h-4 ${currentView === 'project_collaboration' ? 'text-white' : 'text-teal-600'}`} />
                  <span>Project Collaboration</span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingProjectProposalsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-teal-600 text-white">
                      {pendingProjectProposalsCount}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 opacity-50 ${currentView === 'project_collaboration' ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </button>

              {/* 6. Chat */}
              <button
                id="drawer-nav-chat-btn"
                onClick={() => navigateTo('chat')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'chat'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className={`w-4 h-4 ${currentView === 'chat' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Chat</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-50 ${currentView === 'chat' ? 'text-white' : 'text-slate-400'}`} />
              </button>

              {/* 6. Profile */}
              <button
                id="drawer-nav-profile-btn"
                onClick={() => navigateTo('my_profile')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'my_profile'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className={`w-4 h-4 ${currentView === 'my_profile' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Profile & Skills</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-50 ${currentView === 'my_profile' ? 'text-white' : 'text-slate-400'}`} />
              </button>
            </div>
          )}

          {/* DEDICATED ADMIN PORTAL SECTION: RENDERED STRICTLY ONLY FOR VERIFIED ADMINS */}
          {currentUser && isAdmin && (
            <div className="space-y-1.5">
              <div className="px-3 py-1 flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  Admin Control Center
                </p>
              </div>

              {/* Admin: Overview */}
              <button
                id="drawer-admin-nav-overview-btn"
                onClick={() => navigateAdminTab('overview')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'admin_dashboard' && adminActiveTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4" />
                  <span>Governance Overview</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {/* Admin: Users Directory */}
              <button
                id="drawer-admin-nav-users-btn"
                onClick={() => navigateAdminTab('users')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'admin_dashboard' && adminActiveTab === 'users'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>User Directory</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {/* Admin: Skills & Specialization */}
              <button
                id="drawer-admin-nav-skills-btn"
                onClick={() => navigateAdminTab('skills')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'admin_dashboard' && adminActiveTab === 'skills'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>Skills & Specialization</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {/* Admin: Reports & Safety */}
              <button
                id="drawer-admin-nav-reports-btn"
                onClick={() => navigateAdminTab('reports')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'admin_dashboard' && adminActiveTab === 'reports'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Reports & Safety</span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingReportsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                      {pendingReportsCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </div>
              </button>

              {/* Admin: Audit Logs */}
              <button
                id="drawer-admin-nav-audit-btn"
                onClick={() => navigateAdminTab('audit_logs')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'admin_dashboard' && adminActiveTab === 'audit_logs'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4" />
                  <span>Audit Logs</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            </div>
          )}

          {/* Guest Navigation Section */}
          {!currentUser && (
            <div className="space-y-2">
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Welcome to SkillMesh
              </p>
              <button
                id="drawer-guest-landing-btn"
                onClick={() => navigateTo('landing')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentView === 'landing'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-4 h-4" />
                  <span>How It Works</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              <div className="pt-4 space-y-2">
                <button
                  id="drawer-guest-login-btn"
                  onClick={() => navigateTo('login')}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-center text-sm cursor-pointer"
                >
                  Log In to Account
                </button>
                <button
                  id="drawer-guest-signup-btn"
                  onClick={() => navigateTo('signup')}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs transition-colors text-center text-sm cursor-pointer"
                >
                  Create New Account
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {/* Log Out Button */}
          {currentUser && (
            <button
              id="drawer-logout-btn"
              onClick={() => {
                logout();
                setDrawerOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of SkillMesh</span>
            </button>
          )}

          <p className="text-[10px] text-center text-slate-400 pt-1">
            SkillMesh P2P Exchange • Secure Peer-to-Peer Learning
          </p>
        </div>
      </aside>

      {/* Notifications Modal */}
      <NotificationCenterModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Live Availability Toggle Modal */}
      <AvailabilityToggleModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
      />
    </>
  );
};

