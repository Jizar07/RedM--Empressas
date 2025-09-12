'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  const handleLogin = () => {
    signIn('discord');
  };

  const handleLogout = () => {
    signOut();
  };

  if (status === 'loading') {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-400 text-white rounded-md text-sm font-medium cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (session) {
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