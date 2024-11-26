import React, { useState } from 'react';
import { Bell, Trash2, X, Check, CheckCheck } from 'lucide-react';
import { useOrderNotifications } from '../contexts/OrderNotificationContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { toast } from 'react-hot-toast';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications = [], unreadCount = 0, markAsRead, markAllAsRead } = useOrderNotifications();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    try {
      await notificationService.deleteAllNotifications(user.uid);
      toast.success('All notifications deleted');
    } catch (error) {
      toast.error('Failed to delete all notifications');
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await notificationService.deleteNotification(user.uid, notificationId);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Notifications</h3>
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                    title="Delete all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b last:border-b-0 ${
                    !notification.read ? 'bg-blue-50' : ''
                  } relative group`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-100"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                        title="Delete notification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 