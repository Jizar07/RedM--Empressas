'use client';

import { useState, useEffect } from 'react';
import { X, User, Hash, Calendar, Shield, Server, Copy, CheckCircle } from 'lucide-react';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const [user, setUser] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    // Read user from cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };

    const userCookie = getCookie('discord_user');
    if (userCookie) {
      try {
        setUser(JSON.parse(decodeURIComponent(userCookie)));
      } catch (e) {
        console.error('Error parsing user cookie:', e);
      }
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen || !user) return null;

  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;

  const bannerColor = user.banner_color || '#5865F2'; // Discord brand color as default

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Profile Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-fadeIn">
          {/* Banner */}
          <div 
            className="h-32 relative"
            style={{ 
              background: `linear-gradient(135deg, ${bannerColor} 0%, ${bannerColor}88 100%)`
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black bg-opacity-20 hover:bg-opacity-30 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Avatar */}
          <div className="px-6 pb-6">
            <div className="-mt-16 mb-4">
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-32 h-32 rounded-full border-4 border-white shadow-xl"
              />
            </div>

            {/* User Info */}
            <div className="space-y-4">
              {/* Username */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.username}
                  <span className="text-gray-500 font-normal">#{user.discriminator}</span>
                </h2>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 gap-3 mt-6">
                {/* Discord ID */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Hash className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Discord ID</p>
                      <p className="text-sm font-medium text-gray-900">{user.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(user.id, 'id')}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {copied === 'id' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Account Type */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Account Type</p>
                      <p className="text-sm font-medium text-gray-900">
                        {user.bot ? 'Bot Account' : 'User Account'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Server Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Server className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Server Status</p>
                      <p className="text-sm font-medium text-green-600">Member of Atlanta Server</p>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Dashboard Access</p>
                      <p className="text-sm font-medium text-gray-900">Full Access</p>
                    </div>
                  </div>
                </div>

                {/* Session Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Session Started</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    window.open(`https://discord.com/users/${user.id}`, '_blank');
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  View on Discord
                </button>
                <button
                  onClick={() => {
                    document.cookie = 'discord_user=; Max-Age=0; path=/';
                    window.location.href = '/';
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}