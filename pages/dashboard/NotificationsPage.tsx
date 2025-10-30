import React from 'react';
import Header from '../../components/Header';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import { CheckCheck, Trash2, CheckCircle, AlertTriangle, Info, BellOff } from 'lucide-react';

const NotificationsPage: React.FC = () => {
    const { notifications, loading, markAllNotificationsAsRead, clearReadNotifications } = useData();
    
    const getIcon = (type: 'success' | 'warning' | 'info' | 'error') => {
        switch(type) {
            case 'success': return <CheckCircle className="text-green-400" />;
            case 'warning': return <AlertTriangle className="text-yellow-400" />;
            case 'info': return <Info className="text-blue-400" />;
            default: return <Info className="text-gray-400" />;
        }
    }

    return (
        <div className="flex flex-col h-full">
            <Header />
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">Central de Notificações</h1>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={markAllNotificationsAsRead}>
                            <CheckCheck size={16} className="mr-2" /> Marcar todas como lidas
                        </Button>
                        <Button variant="ghost" onClick={clearReadNotifications}>
                            <Trash2 size={16} className="mr-2" /> Limpar Lidas
                        </Button>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-lg">
                    {loading ? (
                        <p>Carregando notificações...</p>
                    ) : notifications.length > 0 ? (
                        <ul className="divide-y divide-white/10">
                            {notifications.map(notif => (
                                <li key={notif.id} className={`p-4 flex items-start gap-4 ${!notif.lido ? 'bg-blue-500/10' : ''}`}>
                                    <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>
                                    <div className="flex-grow">
                                        <Link to={notif.link || '#'}>
                                            <p className="text-gray-200">{notif.message}</p>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                                        </Link>
                                    </div>
                                    {!notif.lido && <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <div className="text-center text-gray-500 py-20">
                            <BellOff size={48} className="mx-auto mb-4"/>
                            <p className="text-lg">Tudo limpo!</p>
                            <p className="text-sm">Você não tem nenhuma notificação no momento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;