import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  CheckCheck, 
  HeartHandshake, 
  Calendar, 
  MessageSquare, 
  ArrowRightLeft, 
  Star, 
  ShieldCheck, 
  ShieldAlert,
  Clock,
  X,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { AppNotification, NotificationType } from '../../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    setCurrentView,
    openChatForConnection
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');

  if (!isOpen) return null;

  const filteredNotifications = activeTab === 'UNREAD' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'MENTORSHIP_REQUEST':
      case 'MENTORSHIP_ACCEPTED':
      case 'MENTORSHIP_DECLINED':
        return <HeartHandshake className="w-4 h-4 text-emerald-600" />;
      case 'SESSION_SCHEDULED':
      case 'SESSION_REMINDER':
        return <Calendar className="w-4 h-4 text-teal-600" />;
      case 'NEW_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return <ArrowRightLeft className="w-4 h-4 text-amber-600" />;
      case 'REVIEW_RECEIVED':
        return <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />;
      case 'VERIFICATION_GRANTED':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'VERIFICATION_REVOKED':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    onClose();

    // Navigate to relevant view
    switch (notif.type) {
      case 'MENTORSHIP_REQUEST':
      case 'MENTORSHIP_ACCEPTED':
      case 'MENTORSHIP_DECLINED':
      case 'SESSION_SCHEDULED':
      case 'SESSION_REMINDER':
        setCurrentView('mentorship');
        break;
      case 'CONNECTION_REQUEST':
        setCurrentView('requests');
        break;
      case 'CONNECTION_ACCEPTED':
        setCurrentView('active_exchanges');
        break;
      case 'NEW_MESSAGE':
        if (notif.relatedId) {
          openChatForConnection(notif.relatedId);
        } else {
          setCurrentView('chat');
        }
        break;
      case 'REVIEW_RECEIVED':
      case 'VERIFICATION_GRANTED':
      case 'VERIFICATION_REVOKED':
        setCurrentView('my_profile');
        break;
      default:
        break;
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const now = new Date();
      const date = new Date(isoString);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden mt-14 sm:mt-16 flex flex-col max-h-[85vh] animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              <p className="text-[11px] text-slate-500">
                {unreadNotificationCount > 0 ? `${unreadNotificationCount} unread alerts` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadNotificationCount > 0 && (
              <button
                type="button"
                id="btn-mark-all-read"
                onClick={() => markAllNotificationsAsRead()}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Mark read</span>
              </button>
            )}
            <button
              type="button"
              id="btn-close-notifications"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Filter */}
        <div className="flex border-b border-slate-100 px-4 pt-2 gap-4 bg-white">
          <button
            type="button"
            id="tab-notif-all"
            onClick={() => setActiveTab('ALL')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'ALL'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            id="tab-notif-unread"
            onClick={() => setActiveTab('UNREAD')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'UNREAD'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Unread ({unreadNotificationCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 p-2 space-y-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No notifications yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {activeTab === 'UNREAD' ? 'You have read all your alerts!' : 'When you receive mentorship requests, messages, or skill updates, they will appear here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                id={`notif-item-${notif.id}`}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 ${
                  !notif.isRead 
                    ? 'bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/60' 
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs truncate ${!notif.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.senderName && (
                    <p className="text-[10px] text-emerald-700 font-medium">
                      From: {notif.senderName}
                    </p>
                  )}
                </div>

                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2"></span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <span className="text-[11px] text-slate-400">
            Real-time updates enabled &bull; Synced with Supabase
          </span>
        </div>
      </div>
    </div>
  );
};
