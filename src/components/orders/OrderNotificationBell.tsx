import { useState } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { useOrderNotifications } from '../../contexts/OrderNotificationContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { OrderNotification } from '../../types/order';

export default function OrderNotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    playSound,
    setPlaySound
  } = useOrderNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: OrderNotification) => {
    await markAsRead(notification.id);
    navigate(`/restaurant/orders/${notification.orderId}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPlaySound(!playSound)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          {playSound ? (
            <Volume2 className="h-5 w-5 text-gray-600" />
          ) : (
            <VolumeX className="h-5 w-5 text-gray-400" />
          )}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full hover:bg-gray-100"
        >
          {unreadCount > 0 ? (
            <Bell className="h-6 w-6 text-blue-500" />
          ) : (
            <BellOff className="h-6 w-6 text-gray-400" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Order Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{notification.customerName}</span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-sm font-medium">
                      ${notification.amount.toFixed(2)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      notification.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : notification.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {notification.status}
                    </span>
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