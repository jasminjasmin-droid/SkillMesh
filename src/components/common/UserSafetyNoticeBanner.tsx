import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertOctagon, AlertTriangle, ShieldAlert, Mail } from 'lucide-react';

export const UserSafetyNoticeBanner: React.FC = () => {
  const { currentUser, isCurrentUserBanned, isCurrentUserSuspended } = useApp();

  if (!currentUser || (!isCurrentUserBanned && !isCurrentUserSuspended)) {
    return null;
  }

  return (
    <div className={`border-b px-4 py-3 sm:px-6 ${
      isCurrentUserBanned
        ? 'bg-red-50 border-red-200 text-red-900'
        : 'bg-amber-50 border-amber-200 text-amber-900'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          {isCurrentUserBanned ? (
            <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="font-bold text-sm">
              {isCurrentUserBanned
                ? 'Account Permanently Suspended'
                : 'Account Actions Temporarily Restricted'}
            </p>
            <p className="opacity-90">
              {isCurrentUserBanned
                ? 'This account has been suspended due to platform terms or safety reports. New requests and messages are disabled.'
                : 'Your account is currently under administrative safety review. Sending new connection requests is temporarily restricted.'}
            </p>
          </div>
        </div>

        <a
          href="mailto:support@skillmesh.com?subject=Account%20Safety%20Appeal"
          className="inline-flex items-center gap-1.5 font-bold text-xs underline hover:no-underline shrink-0"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Contact Support</span>
        </a>
      </div>
    </div>
  );
};
