import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useData } from '../context/DataContext';
import NotificationInbox from './NotificationInbox';

const NotificationBell: React.FC = () => {
  const { notifications } = useData();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.lido).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white/10 rounded-full text-gray-300 hover:text-white hover:bg-white/20 transition"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {isOpen && <NotificationInbox onClose={() => setIsOpen(false)} />}
    </div>
  );
};

export default NotificationBell;