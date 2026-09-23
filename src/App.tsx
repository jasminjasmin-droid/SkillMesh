import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './components/pages/LandingPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { OTPVerifyPage } from './components/auth/OTPVerifyPage';
import { LoginPage } from './components/auth/LoginPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { ProfileSetupWizard } from './components/onboarding/ProfileSetupWizard';
import { MatchResultsPage } from './components/matches/MatchResultsPage';
import { MatchProfilePage } from './components/matches/MatchProfilePage';
import { MyProfilePage } from './components/profile/MyProfilePage';
import { ConnectionsPage } from './components/connections/ConnectionsPage';
import { RequestsPage } from './components/exchanges/RequestsPage';
import { ActiveExchangesPage } from './components/exchanges/ActiveExchangesPage';
import { ProjectCollaborationPage } from './components/collaboration/ProjectCollaborationPage';
import { PrivateChatPage } from './components/chat/PrivateChatPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MySkillMeshHome } from './components/home/MySkillMeshHome';
import { MentorshipHubPage } from './components/mentorship/MentorshipHubPage';
import { CallOverlayModal } from './components/calling/CallOverlayModal';
import { UserSafetyNoticeBanner } from './components/common/UserSafetyNoticeBanner';
import { ConnectModal } from './components/connections/ConnectModal';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SkillMesh ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center max-w-md w-full space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              We encountered a display issue, but your account and saved settings are secure.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { currentView, connectModalTarget, setConnectModalTarget, isAdmin } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />
      <UserSafetyNoticeBanner />

      <main className="flex-1">
        {currentView === 'landing' && <LandingPage />}
        {currentView === 'my_skillmesh' && <MySkillMeshHome />}
        {currentView === 'signup' && <SignUpPage />}
        {currentView === 'otp_verify' && <OTPVerifyPage />}
        {currentView === 'login' && <LoginPage />}
        {currentView === 'reset_password' && <ResetPasswordPage />}
        {currentView === 'profile_setup' && <ProfileSetupWizard />}
        {currentView === 'matches' && <MatchResultsPage />}
        {currentView === 'profile_detail' && <MatchProfilePage />}
        {currentView === 'my_profile' && <MyProfilePage />}
        {currentView === 'requests' && <RequestsPage />}
        {currentView === 'active_exchanges' && <ActiveExchangesPage />}
        {currentView === 'project_collaboration' && <ProjectCollaborationPage />}
        {currentView === 'chat' && <PrivateChatPage />}
        {currentView === 'connections' && <RequestsPage />}
        {(currentView === 'mentorship' || currentView === 'mentorship_hub') && <MentorshipHubPage />}
        {currentView === 'admin_dashboard' && (isAdmin ? <AdminDashboard /> : <MySkillMeshHome />)}
      </main>

      {/* Global Call Overlay (Voice & Video WebRTC Calls) */}
      <CallOverlayModal />

      {/* Global Connect Modal */}
      {connectModalTarget && (
        <ConnectModal
          targetUser={connectModalTarget}
          onClose={() => setConnectModalTarget(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
