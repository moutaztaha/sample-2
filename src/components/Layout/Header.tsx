import React, { useState } from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import UserProfileDialog from './UserProfileDialog';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [showUserProfile, setShowUserProfile] = useState(false);
  const navigate = useNavigate();

  const handleProfileClick = () => {
    // Navigate to settings page with profile tab active
    navigate('/settings');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="ml-4 lg:ml-0 flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Factory Management System
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleProfileClick}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="text-sm font-medium text-gray-700">{user?.username}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {user?.role}
              </span>
            </button>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Profile Dialog */}
      <UserProfileDialog 
        isOpen={showUserProfile} 
        onClose={() => setShowUserProfile(false)} 
      />
    </header>
  );
};

export default Header;