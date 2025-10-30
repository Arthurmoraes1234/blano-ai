import React from 'react';
import { useData } from '../context/DataContext';
// Fix: Corrected import from firestoreService to supabaseService and used it below.
import { supabaseService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { CheckCheck, MailWarning } from 'lucide-react';

const NotificationInbox: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications } = useData();
  const { agencyId } = useAuth();

  const handleMarkAllAsRead = async () => {
    if (agencyId) {
      await supabaseService.markAllNotificationsAsRead(agencyId);
    }
  };

  const sortedNotifications = [...notifications].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="absolute top-full right-0 mt-2 w-80 max-h-96 glass-panel rounded-lg shadow-2xl z-50 flex flex-col">
      <div className="flex justify-between items-center p-3 border-b border-white/10">
        <h3 className="font-semibold text-white">Notificações</h3>
        <button onClick={handleMarkAllAsRead} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
          <CheckCheck size={14} /> Marcar todas como lidas
        </button>
      </div>
      <div className="overflow-y-auto">
        {sortedNotifications.length > 0 ? (
          <ul className="divide-y divide-white/10">
            {sortedNotifications.slice(0, 10).map(notif => (
              <li key={notif.id} className={`${!notif.lido ? 'bg-blue-500/10' : ''}`}>
                <Link to={notif.link || '#'} onClick={onClose} className="block p-3 hover:bg-white/5">
                  <p className="text-sm text-gray-200">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center p-8 text-gray-500">
            <MailWarning size={32} className="mx-auto mb-2"/>
            <p>Nenhuma notificação.</p>
          </div>
        )}
      </div>
       <div className="p-2 border-t border-white/10 text-center">
         <Link to="/notifications" onClick={onClose} className="text-sm text-[var(--btn-grad-from)] hover:underline">Ver todas</Link>
       </div>
    </div>
  );
};

export default NotificationInbox;
