import { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_OAUTH_CLIENT_ID!,
      clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET!,
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
      // Always force your domain
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
      
      // If url contains localhost, replace with correct domain
      if (url.includes('localhost')) {
        const fixedUrl = url.replace(/https?:\/\/localhost:?\d*/, correctDomain);
        console.log('Fixed localhost URL:', url, '->', fixedUrl);
        return fixedUrl;
      }
      
      // If url already contains the correct domain, use it
      if (url.startsWith(correctDomain)) {
        console.log('URL already correct:', url);
        return url;
      }
      
      // Default to the correct domain
      console.log('Using default domain:', correctDomain);
      return correctDomain;
    },
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        token.id = profile.id
        token.username = profile.username
        token.discriminator = profile.discriminator
        token.avatar = profile.avatar
      }
      return token
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.id
        session.user.username = token.username
        session.user.discriminator = token.discriminator  
        session.user.avatar = token.avatar
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}