import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  AlertTriangle,
  FileText,
  Activity,
  Search,
  Filter,
  RefreshCw,
  UserX,
  UserCheck,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  Lock,
  ArrowLeft,
  Mail,
  Calendar,
  Sparkles,
  Info,
  Layers,
  Award,
  TrendingUp,
  BookOpen,
  Tag,
  Star,
  Check,
  KeyRound,
  Download,
  SendHorizontal,
  BadgeCheck,
} from 'lucide-react';
import { 
  UserProfile, 
  UserReport, 
  AdminUserListItem, 
  AdminModerationLog, 
  AdminTab,
  OfferedSkill,
  WantedSkill,
  PasswordResetRequest
} from '../../types';
import { UserGrowthAnalytics } from './UserGrowthAnalytics';
import { VerifiedTickBadge } from '../common/Badges';
import { AdminUserProfileModal } from './AdminUserProfileModal';
import { getSkillMeshUserId } from '../../utils/skillmeshId';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    setCurrentView,
    adminActiveTab,
    setAdminActiveTab,
    adminOverviewStats,
    adminUsersList,
    adminReportsList,
    adminAuditLogs,
    fetchAdminData,
    adminUpdateUserStatus,
    adminUpdateReportStatus,
    adminVerifyUser,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Password Resets state
  const [passwordResetsList, setPasswordResetsList] = useState<PasswordResetRequest[]>([]);
  const [resetSearchQuery, setResetSearchQuery] = useState('');
  const [resetStatusFilter, setResetStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'REJECTED'>('ALL');
  const [resolveResetModal, setResolveResetModal] = useState<{
    isOpen: boolean;
    item: PasswordResetRequest | null;
    status: 'RESOLVED' | 'REJECTED';
    adminNotes: string;
    tempPasswordHint: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    item: null,
    status: 'RESOLVED',
    adminNotes: '',
    tempPasswordHint: '',
    isSubmitting: false,
  });

  // User tab state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'FLAGGED'>('ALL');
  const [userVerificationFilter, setUserVerificationFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'admin' | 'user'>('ALL');
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserListItem | null>(null);
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);

  // Skill Overview tab state
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [skillSortOrder, setSkillSortOrder] = useState<'MOST_USERS' | 'ALPHABETICAL' | 'DEMAND'>('MOST_USERS');
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<string>('ALL');

  // Report tab state
  const [reportStatusFilter, setReportStatusFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'>('ALL');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Action Dialog state
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'SUSPEND' | 'BAN' | 'RESTORE' | 'RESOLVE_REPORT' | 'DISMISS_REPORT';
    targetId: string;
    targetName: string;
    reasonText: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    type: 'SUSPEND',
    targetId: '',
    targetName: '',
    reasonText: '',
    isSubmitting: false,
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    provider: string;
    brevoLoginAddress: string;
    senderFormatted: string;
    senderEmail: string;
    smtpHost: string;
    smtpPort: number;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchEmailStatus = async () => {
    try {
      const res = await fetch('/api/auth/email-status');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmailStatus(data);
        }
      }
    } catch {
      // Non-critical background status check
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAdminData(),
        fetchEmailStatus(),
      ]);
      
      // Fetch password reset requests
      if (currentUser) {
        try {
          const res = await fetch('/api/admin/password-resets', {
            headers: {
              'x-admin-email': currentUser.email,
              'x-admin-userid': currentUser.id,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.requests)) {
              setPasswordResetsList(data.requests);
            }
          }
        } catch (err) {
          console.warn('Password reset requests fetch notice:', err);
        }
      }

      setLastRefreshed(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    try {
      const exportObject = {
        exportDate: new Date().toISOString(),
        exportedBy: currentUser?.email,
        totalUsers: adminUsersList.length,
        users: adminUsersList,
        reports: adminReportsList,
        passwordResets: passwordResetsList,
        auditLogs: adminAuditLogs,
        overviewStats: adminOverviewStats,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `skillmesh-governance-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Platform governance dataset exported successfully.');
    } catch (err) {
      showToast('Failed to export platform data.', 'error');
    }
  };

  const handleConfirmResolveReset = async () => {
    if (!resolveResetModal.item) return;

    setResolveResetModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch(`/api/admin/password-resets/${resolveResetModal.item.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || '',
          'x-admin-userid': currentUser?.id || '',
        },
        body: JSON.stringify({
          status: resolveResetModal.status,
          adminNotes: resolveResetModal.adminNotes,
          tempPasswordHint: resolveResetModal.tempPasswordHint,
          email: resolveResetModal.item.email,
          name: resolveResetModal.item.name,
        }),
      });

      if (res.ok) {
        showToast(`Password reset request marked as ${resolveResetModal.status}.`);
        setPasswordResetsList(prev =>
          prev.map(r =>
            r.id === resolveResetModal.item?.id
              ? { ...r, status: resolveResetModal.status, adminNotes: resolveResetModal.adminNotes, resolvedAt: new Date().toISOString() }
              : r
          )
        );
        setResolveResetModal({
          isOpen: false,
          item: null,
          status: 'RESOLVED',
          adminNotes: '',
          tempPasswordHint: '',
          isSubmitting: false,
        });
      } else {
        showToast('Failed to update password reset request.', 'error');
      }
    } catch (err) {
      showToast('Network error updating password reset.', 'error');
    } finally {
      setResolveResetModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  useEffect(() => {
    if (isAdmin) {
      handleRefresh();
    }
  }, [isAdmin]);

  // If unauthorized user somehow renders this view
  if (!currentUser || !isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            This area requires verified SkillMesh Administrator authorization credentials.
          </p>
          <button
            onClick={() => setCurrentView('matches')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    return adminUsersList.filter(u => {
      const q = userSearchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.offeredSkills?.some(s => s.name.toLowerCase().includes(q)) ||
        u.wantedSkills?.some(s => s.name.toLowerCase().includes(q));

      const matchesStatus = 
        userStatusFilter === 'ALL' ||
        (userStatusFilter === 'FLAGGED' ? (u.flagsCount > 0 || u.reportsReceivedCount > 0) : u.accountStatus === userStatusFilter);

      const matchesVerification = 
        userVerificationFilter === 'ALL' ||
        (userVerificationFilter === 'VERIFIED' ? Boolean(u.isVerified) : !u.isVerified);

      const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;

      return matchesQuery && matchesStatus && matchesVerification && matchesRole;
    });
  }, [adminUsersList, userSearchQuery, userStatusFilter, userVerificationFilter, userRoleFilter]);

  // Grouped skills by offered skill name
  const groupedSkills = useMemo(() => {
    const map = new Map<string, {
      displayName: string;
      category: string;
      offeredUsers: Array<{ user: AdminUserListItem; skill: OfferedSkill }>;
      wantedCount: number;
      levelCounts: { Beginner: number; Intermediate: number; Advanced: number; Expert: number };
    }>();

    // Collect all offered skills
    adminUsersList.forEach(user => {
      if (user.offeredSkills && Array.isArray(user.offeredSkills)) {
        user.offeredSkills.forEach(skill => {
          const key = skill.name.trim().toLowerCase();
          if (!key) return;

          if (!map.has(key)) {
            map.set(key, {
              displayName: skill.name.trim(),
              category: skill.category || 'General',
              offeredUsers: [],
              wantedCount: 0,
              levelCounts: { Beginner: 0, Intermediate: 0, Advanced: 0, Expert: 0 }
            });
          }

          const entry = map.get(key)!;
          // Avoid duplicate user entry for same skill
          if (!entry.offeredUsers.some(ou => ou.user.id === user.id)) {
            entry.offeredUsers.push({ user, skill });
            const level = skill.proficiency || 'Intermediate';
            if (level in entry.levelCounts) {
              entry.levelCounts[level as keyof typeof entry.levelCounts]++;
            } else {
              entry.levelCounts.Intermediate++;
            }
          }
        });
      }

      // Collect wanted skills demand
      if (user.wantedSkills && Array.isArray(user.wantedSkills)) {
        user.wantedSkills.forEach(wSkill => {
          const key = wSkill.name.trim().toLowerCase();
          if (map.has(key)) {
            map.get(key)!.wantedCount++;
          }
        });
      }
    });

    let list = Array.from(map.values());

    // Filter by search query
    if (skillSearchQuery.trim()) {
      const q = skillSearchQuery.toLowerCase().trim();
      list = list.filter(item => 
        item.displayName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.offeredUsers.some(ou => ou.user.name.toLowerCase().includes(q) || ou.user.email.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (selectedSkillCategory !== 'ALL') {
      list = list.filter(item => item.category.toLowerCase() === selectedSkillCategory.toLowerCase());
    }

    // Sort order
    if (skillSortOrder === 'MOST_USERS') {
      list.sort((a, b) => b.offeredUsers.length - a.offeredUsers.length || a.displayName.localeCompare(b.displayName));
    } else if (skillSortOrder === 'ALPHABETICAL') {
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else if (skillSortOrder === 'DEMAND') {
      list.sort((a, b) => b.wantedCount - a.wantedCount || b.offeredUsers.length - a.offeredUsers.length);
    }

    return list;
  }, [adminUsersList, skillSearchQuery, selectedSkillCategory, skillSortOrder]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return adminReportsList.filter(r => {
      const q = reportSearchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        r.reporterName.toLowerCase().includes(q) ||
        r.reportedUserName.toLowerCase().includes(q) ||
        r.reasonLabel.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q));

      const matchesStatus = reportStatusFilter === 'ALL' || r.status === reportStatusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [adminReportsList, reportSearchQuery, reportStatusFilter]);

  // Filtered password resets
  const filteredPasswordResets = useMemo(() => {
    return passwordResetsList.filter(r => {
      const q = resetSearchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        r.email.toLowerCase().includes(q) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        r.id.toLowerCase().includes(q);

      const matchesStatus = resetStatusFilter === 'ALL' || r.status === resetStatusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [passwordResetsList, resetSearchQuery, resetStatusFilter]);

  // Execute moderation actions
  const handleConfirmAction = async () => {
    if (!actionModal.targetId) return;

    setActionModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      if (actionModal.type === 'SUSPEND') {
        const res = await adminUpdateUserStatus(actionModal.targetId, 'SUSPENDED', actionModal.reasonText || 'Suspended by admin for safety review');
        if (res.success) {
          showToast(`User ${actionModal.targetName} suspended.`);
        } else {
          showToast(res.error || 'Failed to suspend user', 'error');
        }
      } else if (actionModal.type === 'BAN') {
        const res = await adminUpdateUserStatus(actionModal.targetId, 'BANNED', actionModal.reasonText || 'Banned by admin for policy violation');
        if (res.success) {
          showToast(`User ${actionModal.targetName} banned permanently.`);
        } else {
          showToast(res.error || 'Failed to ban user', 'error');
        }
      } else if (actionModal.type === 'RESTORE') {
        const res = await adminUpdateUserStatus(actionModal.targetId, 'ACTIVE', actionModal.reasonText || 'Account reinstated by admin');
        if (res.success) {
          showToast(`User ${actionModal.targetName} restored to active status.`);
        } else {
          showToast(res.error || 'Failed to restore user', 'error');
        }
      } else if (actionModal.type === 'RESOLVE_REPORT') {
        const res = await adminUpdateReportStatus(actionModal.targetId, 'RESOLVED', actionModal.reasonText || 'Report investigated and resolved');
        if (res.success) {
          showToast('Report marked as Resolved.');
        } else {
          showToast(res.error || 'Failed to resolve report', 'error');
        }
      } else if (actionModal.type === 'DISMISS_REPORT') {
        const res = await adminUpdateReportStatus(actionModal.targetId, 'DISMISSED', actionModal.reasonText || 'Report dismissed after review');
        if (res.success) {
          showToast('Report dismissed.');
        } else {
          showToast(res.error || 'Failed to dismiss report', 'error');
        }
      }

      setActionModal({
        isOpen: false,
        type: 'SUSPEND',
        targetId: '',
        targetName: '',
        reasonText: '',
        isSubmitting: false
      });
    } finally {
      setActionModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-semibold ${
            toastMessage.type === 'success' 
              ? 'bg-slate-900 text-white border-slate-700' 
              : 'bg-red-600 text-white border-red-500'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-300" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Header & Overview Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                SkillMesh Administration
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                Real-Time Live
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Safety & User Governance Portal
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
              Monitor real registered accounts, evaluate safety flags, manage trust & safety reports, and inspect platform specializations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              id="admin-export-btn"
              onClick={handleExportData}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              title="Export platform dataset as JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export Platform Data</span>
            </button>

            <button
              id="admin-refresh-btn"
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-slate-400">Total Registered</p>
            <p className="text-2xl font-black text-white mt-1">
              {adminOverviewStats?.totalRegisteredUsers ?? adminUsersList.length}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-emerald-400">Active Accounts</p>
            <p className="text-2xl font-black text-emerald-300 mt-1">
              {adminOverviewStats?.activeAccountsCount ?? adminUsersList.filter(u => u.accountStatus === 'ACTIVE').length}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-indigo-400">Offered Skills</p>
            <p className="text-2xl font-black text-indigo-300 mt-1">
              {adminOverviewStats?.totalOfferedSkillsCount ?? adminUsersList.reduce((acc, u) => acc + (u.offeredSkills?.length || 0), 0)}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-purple-400">Specializations</p>
            <p className="text-2xl font-black text-purple-300 mt-1">
              {adminOverviewStats?.uniqueSpecializationsCount ?? groupedSkills.length}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-amber-400">Pending Reports</p>
            <p className="text-2xl font-black text-amber-300 mt-1">
              {adminOverviewStats?.pendingReportsCount ?? adminReportsList.filter(r => r.status === 'PENDING_REVIEW' || r.status === 'UNDER_REVIEW').length}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] font-medium text-red-400">Suspended / Banned</p>
            <p className="text-2xl font-black text-red-300 mt-1">
              {(adminOverviewStats?.suspendedAccountsCount ?? 0) + (adminOverviewStats?.bannedAccountsCount ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          id="admin-tab-overview"
          onClick={() => setAdminActiveTab('overview')}
          className={`pb-4 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            adminActiveTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Governance Overview</span>
        </button>

        <button
          id="admin-tab-users"
          onClick={() => setAdminActiveTab('users')}
          className={`pb-4 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            adminActiveTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
            {adminUsersList.length}
          </span>
        </button>

        <button
          id="admin-tab-skills"
          onClick={() => setAdminActiveTab('skills')}
          className={`pb-4 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            adminActiveTab === 'skills'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>Skills & Specialization</span>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full font-bold">
            {groupedSkills.length} Unique
          </span>
        </button>

        <button
          id="admin-tab-reports"
          onClick={() => setAdminActiveTab('reports')}
          className={`pb-4 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            adminActiveTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Reports & Safety Flags</span>
          {adminReportsList.filter(r => r.status === 'PENDING_REVIEW' || r.status === 'UNDER_REVIEW').length > 0 && (
            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
              {adminReportsList.filter(r => r.status === 'PENDING_REVIEW' || r.status === 'UNDER_REVIEW').length}
            </span>
          )}
        </button>

        <button
          id="admin-tab-password-resets"
          onClick={() => setAdminActiveTab('password_resets')}
          className={`pb-4 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            adminActiveTab === 'password_resets'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-500" />
          <span>Password Resets</span>
          {passwordResetsList.filter(p => p.status === 'PENDING').length > 0 && (
            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
              {passwordResetsList.filter(p => p.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          id="admin-tab-audit"
          onClick={() => setAdminActiveTab('audit_logs')}
          className={`pb-4 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            adminActiveTab === 'audit_logs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* TAB CONTENT: Overview */}
      {adminActiveTab === 'overview' && (
        <div className="space-y-6">
          {/* User Growth Analytics Chart & Growth Velocity */}
          <UserGrowthAnalytics users={adminUsersList} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Safety Signals & Health Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Platform Health & Safety Signals</h3>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  Operational
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                SkillMesh monitors user interactions, mutual block counts, and incoming peer reports. Accounts with high risk indicators are flagged automatically for administrative oversight.
              </p>

              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-semibold text-slate-700">Account Integrity</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {adminUsersList.length > 0 ? `${Math.round((adminUsersList.filter(u => u.accountStatus === 'ACTIVE').length / adminUsersList.length) * 100)}% Active` : '100%'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                    <span className="text-xs font-semibold text-slate-700">Report Resolution Ratio</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {adminReportsList.length > 0 ? `${adminReportsList.filter(r => r.status === 'RESOLVED' || r.status === 'DISMISSED').length} / ${adminReportsList.length}` : 'All Clear (0 Open)'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                    <span className="text-xs font-semibold text-slate-700">Active Admin Session</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{currentUser.email}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Policy Shortcuts */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Administrative Directives</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setAdminActiveTab('reports');
                    setReportStatusFilter('PENDING_REVIEW');
                  }}
                  className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/70 text-left transition-colors cursor-pointer group"
                >
                  <p className="text-xs font-bold text-amber-900 flex items-center justify-between">
                    <span>Review Pending Reports</span>
                    <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    {adminReportsList.filter(r => r.status === 'PENDING_REVIEW' || r.status === 'UNDER_REVIEW').length} item(s) awaiting review
                  </p>
                </button>

                <button
                  onClick={() => {
                    setAdminActiveTab('skills');
                  }}
                  className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 hover:bg-indigo-100/70 text-left transition-colors cursor-pointer group"
                >
                  <p className="text-xs font-bold text-indigo-900 flex items-center justify-between">
                    <span>Skills Specializations</span>
                    <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                  <p className="text-[11px] text-indigo-700 mt-1">
                    {groupedSkills.length} unique subject groups
                  </p>
                </button>

                <button
                  onClick={() => {
                    setAdminActiveTab('users');
                    setUserStatusFilter('FLAGGED');
                  }}
                  className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 hover:bg-purple-100/70 text-left transition-colors cursor-pointer group"
                >
                  <p className="text-xs font-bold text-purple-900 flex items-center justify-between">
                    <span>Inspect Flagged Users</span>
                    <ChevronRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                  <p className="text-[11px] text-purple-700 mt-1">
                    Accounts with safety signals or blocks
                  </p>
                </button>

                <button
                  onClick={() => setAdminActiveTab('audit_logs')}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-left transition-colors cursor-pointer group"
                >
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Recent Audit Logs</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {adminAuditLogs.length} action(s) recorded
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Reports Quick Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent User Reports</h3>
                <p className="text-xs text-slate-500">Submitted by SkillMesh members regarding exchanges or conduct</p>
              </div>
              <button
                onClick={() => setAdminActiveTab('reports')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Reports</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {adminReportsList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No user reports recorded on the platform.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="pb-3 font-semibold">Reported User</th>
                      <th className="pb-3 font-semibold">Reporter</th>
                      <th className="pb-3 font-semibold">Reason</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminReportsList.slice(0, 5).map(report => (
                      <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-slate-900">{report.reportedUserName}</td>
                        <td className="py-3 text-slate-600">{report.reporterName}</td>
                        <td className="py-3">
                          <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                            {report.reasonLabel}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            report.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-800' :
                            report.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800' :
                            report.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setAdminActiveTab('reports');
                              setReportSearchQuery(report.reportedUserName);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: User Management */}
      {adminActiveTab === 'users' && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-user-search-input"
                  type="text"
                  placeholder="Search users by name, email, user ID, or skill..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className="text-slate-400 text-[11px] pl-2 font-medium">Status:</span>
                  {(['ALL', 'ACTIVE', 'SUSPENDED', 'BANNED', 'FLAGGED'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setUserStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-colors cursor-pointer text-[11px] ${
                        userStatusFilter === status
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className="text-slate-400 text-[11px] pl-2 font-medium">Verification:</span>
                  {(['ALL', 'VERIFIED', 'UNVERIFIED'] as const).map(vStatus => (
                    <button
                      key={vStatus}
                      id={`btn-filter-verify-${vStatus.toLowerCase()}`}
                      onClick={() => setUserVerificationFilter(vStatus)}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
                        userVerificationFilter === vStatus
                          ? 'bg-white text-sky-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {vStatus === 'VERIFIED' && <BadgeCheck className="w-3 h-3 text-sky-600" />}
                      <span>{vStatus}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                  <span className="text-slate-400 text-[11px] pl-2 font-medium">Role:</span>
                  {(['ALL', 'admin', 'user'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-colors cursor-pointer text-[11px] ${
                        userRoleFilter === role
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {role.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No users match criteria</h4>
                <p className="text-xs text-slate-500">Try adjusting your search query or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">User & ID</th>
                      <th className="py-3.5 px-4 font-bold">Verification</th>
                      <th className="py-3.5 px-4 font-bold">Role</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Activity & Rating</th>
                      <th className="py-3.5 px-4 font-bold">Safety Signals</th>
                      <th className="py-3.5 px-4 font-bold">Skills</th>
                      <th className="py-3.5 px-4 font-bold">Joined</th>
                      <th className="py-3.5 px-4 font-bold text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(user => {
                      const isSelf = user.id === currentUser.id;
                      const hasFlags = (user.flagsCount > 0) || (user.reportsReceivedCount > 0) || (user.blocksReceivedCount > 0);
                      const smId = user.skillmeshId || getSkillMeshUserId(user);

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                </div>
                                {user.isVerified && (
                                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs">
                                    <VerifiedTickBadge size="sm" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => setInspectedUserId(user.id)}
                                    className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{user.name}</span>
                                    {user.isVerified && <VerifiedTickBadge size="sm" />}
                                  </button>
                                  {isSelf && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded">
                                    {smId}
                                  </span>
                                  <span className="text-[11px] text-slate-500">{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {user.isVerified ? (
                              <span className="bg-sky-50 text-sky-800 border border-sky-200/80 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1">
                                <BadgeCheck className="w-3.5 h-3.5 text-sky-600" />
                                Verified Member
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md text-[10px]">
                                Unverified
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {user.role === 'admin' ? (
                              <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 w-max">
                                <Shield className="w-3 h-3" />
                                ADMIN
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium text-[11px]">User</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                              user.accountStatus === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : user.accountStatus === 'SUSPENDED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                : 'bg-red-50 text-red-700 border border-red-200/80'
                            }`}>
                              {user.accountStatus === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {user.accountStatus === 'SUSPENDED' && <Clock className="w-3 h-3 text-amber-600" />}
                              {user.accountStatus === 'BANNED' && <Ban className="w-3 h-3 text-red-600" />}
                              <span>{user.accountStatus}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[11px]">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <span className="font-semibold text-slate-900">{user.successfulExchanges || user.completedExchanges || 0}</span>
                                <span className="text-slate-500 text-[10px]">exchanges</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-semibold text-slate-900">{user.completedMentorships || 0}</span>
                                <span className="text-slate-500 text-[10px]">sessions</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                <span className="font-bold text-slate-800">
                                  {user.averageRating ? Number(user.averageRating).toFixed(1) : 'No reviews'}
                                </span>
                                {user.totalReviews ? (
                                  <span className="text-slate-400">({user.totalReviews} reviews)</span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {hasFlags ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {user.reportsReceivedCount > 0 && (
                                  <span className="bg-red-50 text-red-700 border border-red-200/80 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {user.reportsReceivedCount} Reports
                                  </span>
                                )}
                                {user.blocksReceivedCount > 0 && (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {user.blocksReceivedCount} Blocks
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Good Standing</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-[11px] text-slate-600">
                            <div>
                              <span className="font-semibold text-slate-800">{user.offeredSkills?.length || 0}</span> offered
                            </div>
                            <div className="text-slate-400 text-[10px]">
                              {user.wantedSkills?.length || 0} wanted
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {user.joinedDate ? new Date(user.joinedDate).toLocaleDateString() : 'N/A'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setInspectedUserId(user.id)}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Inspect Full Member Profile & Verification"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {!isSelf && (
                                <>
                                  {user.accountStatus === 'ACTIVE' ? (
                                    <>
                                      <button
                                        onClick={() => setActionModal({
                                          isOpen: true,
                                          type: 'SUSPEND',
                                          targetId: user.id,
                                          targetName: user.name,
                                          reasonText: '',
                                          isSubmitting: false,
                                        })}
                                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                        title="Suspend User Account"
                                      >
                                        <Clock className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setActionModal({
                                          isOpen: true,
                                          type: 'BAN',
                                          targetId: user.id,
                                          targetName: user.name,
                                          reasonText: '',
                                          isSubmitting: false,
                                        })}
                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                        title="Ban User Permanently"
                                      >
                                        <Ban className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => setActionModal({
                                        isOpen: true,
                                        type: 'RESTORE',
                                        targetId: user.id,
                                        targetName: user.name,
                                        reasonText: '',
                                        isSubmitting: false,
                                      })}
                                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="Restore User Account"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Skills & Specialization Overview */}
      {adminActiveTab === 'skills' && (
        <div className="space-y-6">
          {/* Header Bar and Search */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-700" />
                  <span>Skills & Specialization Groups</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive index of all skills offered by registered platform members.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-skill-search-input"
                    type="text"
                    placeholder="Search skills (e.g. Python, Design)..."
                    value={skillSearchQuery}
                    onChange={e => setSkillSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
                  <button
                    onClick={() => setSkillSortOrder('MOST_USERS')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-[11px] ${
                      skillSortOrder === 'MOST_USERS' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Most Users
                  </button>
                  <button
                    onClick={() => setSkillSortOrder('ALPHABETICAL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-[11px] ${
                      skillSortOrder === 'ALPHABETICAL' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A-Z
                  </button>
                  <button
                    onClick={() => setSkillSortOrder('DEMAND')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-[11px] ${
                      skillSortOrder === 'DEMAND' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    High Demand
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Skills Grid */}
          {groupedSkills.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No skill specializations match search</h4>
              <p className="text-xs text-slate-500">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedSkills.map(group => (
                <div 
                  key={group.displayName.toLowerCase()} 
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {group.category}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
                          <span>{group.displayName}</span>
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-xl">
                          <Users className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{group.offeredUsers.length} user{group.offeredUsers.length === 1 ? '' : 's'}</span>
                        </span>
                        {group.wantedCount > 0 && (
                          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            {group.wantedCount} want to learn
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Proficiency breakdown */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {group.levelCounts.Expert > 0 && (
                        <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 rounded-md">
                          Expert: {group.levelCounts.Expert}
                        </span>
                      )}
                      {group.levelCounts.Advanced > 0 && (
                        <span className="text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/60 px-2 py-0.5 rounded-md">
                          Advanced: {group.levelCounts.Advanced}
                        </span>
                      )}
                      {group.levelCounts.Intermediate > 0 && (
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-md">
                          Intermediate: {group.levelCounts.Intermediate}
                        </span>
                      )}
                      {group.levelCounts.Beginner > 0 && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-md">
                          Beginner: {group.levelCounts.Beginner}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Users Offering this Skill */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700">Members Offering ({group.offeredUsers.length}):</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {group.offeredUsers.map(({ user, skill }) => (
                        <div 
                          key={user.id}
                          onClick={() => setSelectedUserDetail(user)}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-100 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
                              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                                {user.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {user.titleOrRole || 'Member'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-1.5 py-0.5 rounded">
                              {skill.proficiency || 'Intermediate'}
                            </span>
                            {skill.yearsOfPractice ? (
                              <p className="text-[9px] text-slate-400 mt-0.5">{skill.yearsOfPractice} yrs exp</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Reports & Safety Flags */}
      {adminActiveTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-report-search-input"
                  type="text"
                  placeholder="Search reports by user name, reason, or details..."
                  value={reportSearchQuery}
                  onChange={e => setReportSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 text-xs">
                <span className="text-slate-400 text-[11px] pl-2 font-medium">Status:</span>
                {(['ALL', 'PENDING_REVIEW', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setReportStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-xl font-bold transition-colors cursor-pointer text-[11px] ${
                      reportStatusFilter === status
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredReports.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No reports found</h4>
                <p className="text-xs text-slate-500">Platform moderation reports matching criteria are empty.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredReports.map(report => (
                  <div key={report.id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg text-xs">
                          {report.reasonLabel}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          report.status === 'PENDING_REVIEW' ? 'bg-amber-500 text-white' :
                          report.status === 'UNDER_REVIEW' ? 'bg-blue-600 text-white' :
                          report.status === 'RESOLVED' ? 'bg-emerald-600 text-white' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>

                      <span className="text-slate-400 text-xs">
                        Reported on {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-slate-400 font-semibold text-[10px]">Reported Account</p>
                        <p className="font-bold text-slate-900 text-sm">{report.reportedUserName}</p>
                        <p className="text-slate-500 text-[11px]">ID: {report.reportedUserId}</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-slate-400 font-semibold text-[10px]">Submitted By</p>
                        <p className="font-bold text-slate-900 text-sm">{report.reporterName}</p>
                        <p className="text-slate-500 text-[11px]">ID: {report.reporterId}</p>
                      </div>
                    </div>

                    {report.description && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900 block mb-1">Details / User Statement:</span>
                        {report.description}
                      </div>
                    )}

                    {report.resolutionNotes && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                        <span className="font-bold">Moderation Resolution:</span> {report.resolutionNotes}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {report.status !== 'RESOLVED' && (
                        <button
                          onClick={() => setActionModal({
                            isOpen: true,
                            type: 'RESOLVE_REPORT',
                            targetId: report.id,
                            targetName: `Report against ${report.reportedUserName}`,
                            reasonText: '',
                            isSubmitting: false,
                          })}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          Mark as Resolved
                        </button>
                      )}

                      {report.status !== 'DISMISSED' && (
                        <button
                          onClick={() => setActionModal({
                            isOpen: true,
                            type: 'DISMISS_REPORT',
                            targetId: report.id,
                            targetName: `Report against ${report.reportedUserName}`,
                            reasonText: '',
                            isSubmitting: false,
                          })}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Dismiss Report
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const targetUser = adminUsersList.find(u => u.id === report.reportedUserId);
                          if (targetUser) {
                            setSelectedUserDetail(targetUser);
                          } else {
                            showToast('User record not found', 'error');
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Inspect User Record
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Password Resets */}
      {adminActiveTab === 'password_resets' && (
        <div className="space-y-6">
          {/* Brevo Email Dispatch Relay Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 relative overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-extrabold text-white text-sm sm:text-base">Brevo Email Delivery Relay</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      emailStatus?.configured
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emailStatus?.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {emailStatus?.configured ? `Active (${emailStatus.provider})` : 'Awaiting Brevo Key'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Transactional notifications and reset emails are dispatched using account <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[11px] font-semibold">hello.skillmesh@gmail.com</code>.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:self-center bg-slate-800/80 px-3.5 py-2.5 rounded-2xl border border-slate-700/80 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Sender Identity</span>
                  <span className="font-mono text-emerald-400 text-xs font-bold truncate max-w-[200px] sm:max-w-[240px]">
                    {emailStatus?.senderFormatted || 'SkillMesh <hello.skillmesh@gmail.com>'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Member Password Reset Requests</h3>
                <p className="text-xs text-slate-500">Track and fulfill secure credential reset requests submitted by SkillMesh peers</p>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'PENDING', 'RESOLVED', 'REJECTED'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setResetStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      resetStatusFilter === status
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                    {status === 'PENDING' && passwordResetsList.filter(p => p.status === 'PENDING').length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px]">
                        {passwordResetsList.filter(p => p.status === 'PENDING').length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={resetSearchQuery}
                onChange={e => setResetSearchQuery(e.target.value)}
                placeholder="Search password requests by member email, name, or request ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Resets Table */}
            {filteredPasswordResets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No password reset requests matching the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-3">Member / Email</th>
                      <th className="pb-3 px-3">Requested At</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3">Admin Notes / Resolution</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPasswordResets.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">{item.email}</div>
                          {item.name && <div className="text-[11px] text-slate-500">{item.name}</div>}
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {item.id}</div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            item.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 max-w-xs">
                          {item.adminNotes ? (
                            <p className="text-xs truncate">{item.adminNotes}</p>
                          ) : (
                            <span className="text-slate-400 italic">No notes</span>
                          )}
                          {item.resolvedBy && (
                            <p className="text-[10px] text-slate-400 mt-0.5">Resolved by {item.resolvedBy}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'PENDING' ? (
                              <>
                                <button
                                  onClick={() =>
                                    setResolveResetModal({
                                      isOpen: true,
                                      item,
                                      status: 'RESOLVED',
                                      adminNotes: 'Password reset link sent to member email.',
                                      tempPasswordHint: '',
                                      isSubmitting: false,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                >
                                  Resolve
                                </button>
                                <button
                                  onClick={() =>
                                    setResolveResetModal({
                                      isOpen: true,
                                      item,
                                      status: 'REJECTED',
                                      adminNotes: 'Duplicate or unverified request dismissed.',
                                      tempPasswordHint: '',
                                      isSubmitting: false,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                                >
                                  Dismiss
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setResolveResetModal({
                                    isOpen: true,
                                    item,
                                    status: item.status as 'RESOLVED' | 'REJECTED',
                                    adminNotes: item.adminNotes || '',
                                    tempPasswordHint: item.tempPasswordHint || '',
                                    isSubmitting: false,
                                  })
                                }
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                              >
                                Edit Record
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Audit Log */}
      {adminActiveTab === 'audit_logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Administrative Audit Trail</h3>
            <p className="text-xs text-slate-500">Immutable record of governance decisions, account bans, suspensions, and report resolutions.</p>
          </div>

          {adminAuditLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No moderation events recorded in this session.
            </div>
          ) : (
            <div className="space-y-3">
              {adminAuditLogs.map(log => (
                <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        log.action.includes('BAN') ? 'bg-red-100 text-red-800' :
                        log.action.includes('SUSPEND') ? 'bg-amber-100 text-amber-800' :
                        log.action.includes('RESTORE') ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {log.targetUserName || log.targetUserId}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="text-xs text-slate-600 italic">
                        Reason: {log.reason}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    <p className="font-semibold text-slate-600">By: {log.adminEmail}</p>
                    <p>{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden">
                  <img src={selectedUserDetail.avatarUrl} alt={selectedUserDetail.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedUserDetail.name}</h3>
                  <p className="text-xs text-slate-500">{selectedUserDetail.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-slate-400 text-[10px] font-semibold">Account Status</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedUserDetail.accountStatus}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-slate-400 text-[10px] font-semibold">Role</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedUserDetail.role.toUpperCase()}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-slate-400 text-[10px] font-semibold">Reports Received</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedUserDetail.reportsReceivedCount}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-slate-400 text-[10px] font-semibold">Blocks Received</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedUserDetail.blocksReceivedCount}</p>
              </div>
            </div>

            {selectedUserDetail.bio && (
              <div>
                <p className="text-xs font-bold text-slate-800 mb-1">Bio</p>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                  {selectedUserDetail.bio}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-slate-800 mb-2">Offered Skills ({selectedUserDetail.offeredSkills?.length || 0})</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedUserDetail.offeredSkills && selectedUserDetail.offeredSkills.length > 0 ? (
                  selectedUserDetail.offeredSkills.map(s => (
                    <span key={s.id} className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-medium">
                      {s.name} ({s.proficiency || 'Intermediate'})
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No offered skills listed.</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 mb-2">Wanted Skills ({selectedUserDetail.wantedSkills?.length || 0})</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedUserDetail.wantedSkills && selectedUserDetail.wantedSkills.length > 0 ? (
                  selectedUserDetail.wantedSkills.map(s => (
                    <span key={s.id} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-xl font-medium">
                      {s.name} ({s.currentLevel || 'Beginner'})
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No wanted skills listed.</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL ADMIN USER PROFILE & VERIFICATION MANAGEMENT MODAL */}
      {inspectedUserId && (
        <AdminUserProfileModal
          userId={inspectedUserId}
          isOpen={Boolean(inspectedUserId)}
          onClose={() => setInspectedUserId(null)}
          onUserUpdated={() => {
            fetchAdminData();
          }}
          onOpenOtherUser={(otherId) => {
            setInspectedUserId(otherId);
          }}
        />
      )}

      {/* CONFIRMATION / ACTION MODAL */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                actionModal.type === 'BAN' ? 'bg-red-100 text-red-600' :
                actionModal.type === 'SUSPEND' ? 'bg-amber-100 text-amber-600' :
                'bg-emerald-100 text-emerald-600'
              }`}>
                {actionModal.type === 'BAN' && <Ban className="w-5 h-5" />}
                {actionModal.type === 'SUSPEND' && <Clock className="w-5 h-5" />}
                {(actionModal.type === 'RESTORE' || actionModal.type === 'RESOLVE_REPORT') && <CheckCircle2 className="w-5 h-5" />}
                {actionModal.type === 'DISMISS_REPORT' && <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionModal.type === 'BAN' && 'Permanently Ban User'}
                  {actionModal.type === 'SUSPEND' && 'Suspend User Account'}
                  {actionModal.type === 'RESTORE' && 'Restore User Account'}
                  {actionModal.type === 'RESOLVE_REPORT' && 'Resolve User Report'}
                  {actionModal.type === 'DISMISS_REPORT' && 'Dismiss User Report'}
                </h3>
                <p className="text-xs text-slate-500">Target: {actionModal.targetName}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Reason / Moderation Notes:</label>
              <textarea
                value={actionModal.reasonText}
                onChange={e => setActionModal(prev => ({ ...prev, reasonText: e.target.value }))}
                placeholder="Specify the policy violation or administrative rationale..."
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                disabled={actionModal.isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionModal.isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-colors cursor-pointer ${
                  actionModal.type === 'BAN' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' :
                  actionModal.type === 'SUSPEND' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' :
                  'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                }`}
              >
                {actionModal.isSubmitting ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* RESOLVE PASSWORD RESET MODAL */}
      {resolveResetModal.isOpen && resolveResetModal.item && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {resolveResetModal.status === 'RESOLVED' ? 'Fulfill Password Reset' : 'Dismiss Reset Request'}
                </h3>
                <p className="text-xs text-slate-500">{resolveResetModal.item.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Status Decision:</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setResolveResetModal(prev => ({ ...prev, status: 'RESOLVED' }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      resolveResetModal.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Resolved / Sent
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolveResetModal(prev => ({ ...prev, status: 'REJECTED' }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      resolveResetModal.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Dismiss / Reject
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Administrative Notes / Action Log:</label>
                <textarea
                  value={resolveResetModal.adminNotes}
                  onChange={e => setResolveResetModal(prev => ({ ...prev, adminNotes: e.target.value }))}
                  placeholder="e.g. Sent reset magic link to registered mailbox, or verified user identity via support..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setResolveResetModal(prev => ({ ...prev, isOpen: false, item: null }))}
                disabled={resolveResetModal.isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolveReset}
                disabled={resolveResetModal.isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition-colors cursor-pointer"
              >
                {resolveResetModal.isSubmitting ? 'Saving...' : 'Save Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
