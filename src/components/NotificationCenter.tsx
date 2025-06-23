import React, { useState } from 'react';
import { X, Bell, Settings, CheckCircle, XCircle, AlertTriangle, Info, Trash2, BookMarked as MarkAsRead, Clock } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types/notification';
import AppSettingsPanel from './AppSettingsPanel';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getNotificationStyles = (notification: Notification) => {
    const baseStyles = "p-4 border-l-4 transition-colors cursor-pointer";
    const readStyles = notification.read 
      ? "bg-gray-50 dark:bg-gray-800/50" 
      : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50";
    
    switch (notification.type) {
      case 'success':
        return `${baseStyles} ${readStyles} border-l-green-400 dark:border-l-green-500`;
      case 'error':
        return `${baseStyles} ${readStyles} border-l-red-400 dark:border-l-red-500`;
      case 'warning':
        return `${baseStyles} ${readStyles} border-l-yellow-400 dark:border-l-yellow-500`;
      default:
        return `${baseStyles} ${readStyles} border-l-blue-400 dark:border-l-blue-500`;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl dark:shadow-2xl border-l border-gray-200 dark:border-gray-700">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Notifications & Settings</h2>
              <button
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex mt-4 space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'notifications'
                    ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'notifications' ? (
              <div className="h-full flex flex-col">
                {/* Notification Actions */}
                {notifications.length > 0 && (
                  <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex space-x-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                          >
                            <MarkAsRead className="h-3 w-3 mr-1" />
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={clearNotifications}
                          className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 rounded-md text-xs font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear all
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No notifications</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        You'll see notifications here when actions complete or require your attention.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={getNotificationStyles(notification)}
                          onClick={() => !notification.read && markAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {getNotificationIcon(notification.type)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${
                                notification.read 
                                  ? 'text-gray-600 dark:text-gray-400' 
                                  : 'text-gray-900 dark:text-gray-100 font-medium'
                              }`}>
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center mt-2 space-x-2">
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTimestamp(notification.timestamp)}
                                </div>
                                
                                {notification.category && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                    {notification.category}
                                  </span>
                                )}
                                
                                {!notification.read && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                                    New
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800/30">
                <AppSettingsPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;