import React from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { LogOut } from 'lucide-react';
import NotificationBell from './NotificationBell'; // Import the new component

const Logo = () => (
    <div className="flex items-center">
        <img src="https://i.imgur.com/lUKdBj5.png" alt="Blano AI Logo" className="h-8 w-auto" />
    </div>
);


const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="relative z-10 flex items-center justify-between p-4 glass-panel rounded-b-2xl mx-4 mt-4">
      <Logo />
      <div className="flex items-center space-x-4">
        <NotificationBell /> {/* Add the notification bell */}
        <div className="text-right hidden sm:block">
            <p className="text-white font-medium">{user?.name}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>
        <div className="relative">
            <button 
                onClick={() => authService.logout()}
                className="p-2 bg-white/10 rounded-full text-gray-300 hover:text-white hover:bg-white/20 transition"
                title="Logout"
            >
                <LogOut size={20} />
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
