import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, Columns, Image as ImageIcon, DollarSign, Settings, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

type NavItem = {
  to: string;
  icon: React.ElementType;
  text: string;
  badge?: number;
};

const BottomNavBar: React.FC = () => {
  const { user } = useAuth();
  const { notifications } = useData();

  const unreadCount = notifications.filter(n => !n.lido).length;

  // A lista de navegação agora é construída dinamicamente com base no perfil do usuário
  const navItems: NavItem[] = [
    // Itens exclusivos do Dono (Owner)
    ...(user?.role === 'owner' ? [{ to: '/dashboard', icon: LayoutDashboard, text: 'Dashboard' }] : []),
    
    // Itens comuns a todos
    { to: '/projects', icon: LayoutGrid, text: 'Projetos' },
    { to: '/crm', icon: Columns, text: 'CRM' },
    { to: '/notifications', icon: Bell, text: 'Notificações', badge: unreadCount },
    { to: '/image-generator', icon: ImageIcon, text: 'Imagem' },
    
    // Mais itens exclusivos do Dono (Owner)
    ...(user?.role === 'owner' ? [
        { to: '/finance', icon: DollarSign, text: 'Financeiro' },
        { to: '/account', icon: Settings, text: 'Conta' },
    ] : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <nav className="flex items-center gap-1 sm:gap-2 glass-panel px-3 py-2 rounded-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `relative group flex items-center justify-center h-12 min-w-[3rem] px-2 sm:px-4 rounded-full transition-all duration-300 ease-in-out transform active:translate-y-px ${
                isActive 
                  ? 'bg-gradient-to-r from-[var(--btn-grad-from)] to-[var(--btn-grad-to)] text-white shadow-[0_0_20px_0_var(--btn-glow-color)]' 
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              } focus:outline-none focus:ring-2 focus:ring-[var(--btn-grad-to)] focus:ring-offset-2 focus:ring-offset-gray-900`
            }
            aria-label={item.text}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold ml-2 hidden md:block">{item.text}</span>
            {item.badge && item.badge > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-gray-800/80">
                {item.badge}
              </span>
            ) : null}
            <div className="absolute bottom-full mb-2 hidden md:group-hover:block px-2 py-1 bg-black/80 backdrop-blur-sm text-white text-xs rounded-md shadow-lg whitespace-nowrap transition-opacity opacity-0 group-hover:opacity-100">
                {item.text}
            </div>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default BottomNavBar;