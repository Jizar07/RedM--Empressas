'use client';

import { signIn, getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Server, MessageCircle } from 'lucide-react';

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const error = searchParams.get('error');

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  const handleDiscordSignIn = async () => {
    setLoading(true);
    try {
      await signIn('discord', { callbackUrl: '/' });
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center">
            <Server className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            RedM Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your Discord account to access the Atlanta Server dashboard
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-700">
                {error === 'AccessDenied' && 'Access denied. You must be a member of the Atlanta Server Discord.'}
                {error === 'OAuthSignin' && 'Error signing in with Discord. Please try again.'}
                {error === 'OAuthCallback' && 'Error with Discord callback. Please try again.'}
                {error === 'OAuthCreateAccount' && 'Could not create account. Please try again.'}
                {error === 'EmailCreateAccount' && 'Could not create account. Please try again.'}
                {error === 'Callback' && 'Authentication error. Please try again.'}
                {error === 'OAuthAccountNotLinked' && 'Account linking error. Please try again.'}
                {error === 'EmailSignin' && 'Email sign in error. Please try again.'}
                {error === 'CredentialsSignin' && 'Invalid credentials. Please try again.'}
                {error === 'SessionRequired' && 'Please sign in to access this page.'}
                {!['AccessDenied', 'OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'EmailCreateAccount', 'Callback', 'OAuthAccountNotLinked', 'EmailSignin', 'CredentialsSignin', 'SessionRequired'].includes(error) && 'An error occurred during authentication.'}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleDiscordSignIn}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <MessageCircle className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" />
              </span>
              {loading ? 'Signing in...' : 'Sign in with Discord'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-600">
              Only members of the Atlanta Server Discord can access this dashboard.
              <br />
              Make sure you're a member before signing in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}