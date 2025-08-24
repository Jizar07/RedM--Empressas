'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Shield, ChevronDown } from 'lucide-react';

export default function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session) {
    return null;
  }

  const { user } = session;
  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <img
          src={avatarUrl}
          alt={`${user.username}'s avatar`}
          className="w-8 h-8 rounded-full"
        />
        <div className="text-left text-sm">
          <div className="font-medium text-gray-900">{user.username}</div>
          <div className="text-gray-500">#{user.discriminator}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <img
                  src={avatarUrl}
                  alt={`${user.username}'s avatar`}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-medium text-gray-900">{user.username}</div>
                  <div className="text-sm text-gray-500">#{user.discriminator}</div>
                  {user.isInTargetGuild && (
                    <div className="flex items-center mt-1">
                      <Shield className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">Server Member</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}