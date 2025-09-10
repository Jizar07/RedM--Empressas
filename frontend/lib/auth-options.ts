import { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_OAUTH_CLIENT_ID!,
      clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify guilds"
        }
      }
    })
  ],
  // Use secure cookies only in production
  useSecureCookies: process.env.NODE_ENV === 'production',
  trustHost: true,
  pages: {
    error: '/auth/error'
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always use production domain for OAuth (users can't access localhost)
      const correctDomain = 'https://fazenda.stoffeltech.com';
      
      console.log('NextAuth redirect debug:', { 
        url, 
        baseUrl, 
        correctDomain,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NODE_ENV: process.env.NODE_ENV 
      });
      
      // If url is relative, prepend the correct domain
      if (url.startsWith('/')) {
        console.log('Redirecting to:', `${correctDomain}${url}`);
        return `${correctDomain}${url}`;
      }
      
      // If url is same domain as baseUrl, allow it
      if (url.startsWith(baseUrl)) {
        console.log('URL matches baseUrl:', url);
        return url;
      }
      
      // Default to the correct domain
      console.log('Using default domain:', correctDomain);
      return correctDomain;
    },
    async jwt({ token, account, profile }: any) {
      console.log('NextAuth JWT callback:', { token, account: !!account, profile: !!profile });
      
      if (account && profile) {
        console.log('NextAuth JWT - Setting user data from profile');
        token.id = profile.id
        token.username = profile.username
        token.discriminator = profile.discriminator
        token.avatar = profile.avatar
        
        // Fetch user's guilds using the access token
        if (account.access_token) {
          try {
            console.log('NextAuth JWT - Fetching guilds with access token');
            const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            });
            
            if (guildsResponse.ok) {
              const guilds = await guildsResponse.json();
              console.log('NextAuth JWT - Successfully fetched guilds:', guilds.length);
              token.guilds = guilds;
            } else {
              console.error('NextAuth JWT - Failed to fetch guilds:', guildsResponse.status);
            }
          } catch (error) {
            console.error('NextAuth JWT - Error fetching guilds:', error);
          }
        }
      }
      
      console.log('NextAuth JWT - Returning token:', { ...token, guilds: token.guilds?.length || 0 });
      return token
    },
    async session({ session, token }: any) {
      console.log('NextAuth session callback:', { session: !!session, token: !!token });
      
      if (session?.user) {
        console.log('NextAuth session - Setting user data from token');
        session.user.id = token.id
        session.user.username = token.username
        session.user.discriminator = token.discriminator  
        session.user.avatar = token.avatar
        session.user.guilds = token.guilds || []
        
        console.log('NextAuth session - User guilds:', session.user.guilds?.length || 0);
      }
      
      console.log('NextAuth session - Returning session:', { 
        user: session?.user ? { id: session.user.id, username: session.user.username, guilds: session.user.guilds?.length || 0 } : null
      });
      
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}