import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

export default function NotificationToggle() {
  const { hasPermission, requestPermission, isLoading } = useNotifications();

  if (isLoading) {
    return (
      <div className="p-2">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
      title={hasPermission ? 'Notifications enabled' : 'Enable notifications'}
    >
      {hasPermission ? (
        <Bell className="w-5 h-5" />
      ) : (
        <BellOff className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );
} 