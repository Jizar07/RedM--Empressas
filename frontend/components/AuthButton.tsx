'use client';

import { useState, useEffect } from 'react';

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Read user from cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };

    const userCookie = getCookie('discord_user');
    console.log('All cookies:', document.cookie);
    console.log('Discord user cookie:', userCookie);
    
    if (userCookie) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userCookie));
        console.log('Parsed user:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing user cookie:', e);
      }
    }
  }, []);

  const handleLogin = () => {
    // Use NextAuth sign in instead of direct Discord OAuth
    window.location.href = '/api/auth/signin/discord';
  };

  const handleLogout = () => {
    document.cookie = 'discord_user=; Max-Age=0; path=/';
    setUser(null);
    window.location.reload();
  };

  if (user) {
    return (
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
      >
        Logout
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
    >
      Login with Discord
    </button>
  );
}