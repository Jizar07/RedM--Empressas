'use client';

export default function TestLogin() {
  const handleLogin = () => {
    // Direct Discord OAuth2 URL
    const clientId = '1406656805500883104';
    const redirectUri = encodeURIComponent('http://localhost:3051/api/auth/callback/discord');
    const scope = 'identify guilds guilds.members.read';
    
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    window.location.href = discordAuthUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Test Discord Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Click the button below to test Discord OAuth2 directly
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleLogin}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Login with Discord (Direct)
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            This bypasses NextAuth and goes directly to Discord OAuth2
          </p>
        </div>
      </div>
    </div>
  );
}