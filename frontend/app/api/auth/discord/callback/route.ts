import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Discord OAuth error:', error);
    return NextResponse.redirect(`https://fazenda.stoffeltech.com/auth/error?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect('https://fazenda.stoffeltech.com/auth/error?error=NoCode');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_OAUTH_CLIENT_ID!,
        client_secret: process.env.DISCORD_OAUTH_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://fazenda.stoffeltech.com/api/auth/discord/callback',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to get user info: ${userResponse.status}`);
    }

    const userData = await userResponse.json();

    // Set user cookie and redirect to home
    const response = NextResponse.redirect('https://fazenda.stoffeltech.com/');
    response.cookies.set('discord_user', JSON.stringify(userData), {
      httpOnly: false,
      secure: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    return NextResponse.redirect(`https://fazenda.stoffeltech.com/auth/error?error=TokenExchange`);
  }
}