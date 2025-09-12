'use client';

import { useState } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import UserProfile from './UserProfile';

export default function SimpleUserMenu() {
  const { data: session } = useSession();
  const [showProfile, setShowProfile] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    signOut();
  };

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  // Handle NextAuth user format - use image from session or build from user data
  const avatarUrl = user.image || 
    (user.id && user.avatar 
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${user.discriminator ? parseInt(user.discriminator) % 5 : 0}.png`);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <img
            src={avatarUrl}
            alt={user.username}
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm font-medium text-gray-700">
            {user.name || user.username}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <button
                onClick={() => {
                  setShowProfile(true);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </button>
              <hr className="border-gray-200" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </>
        )}
      </div>

      {/* Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </>
  );
}