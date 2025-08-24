import { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_OAUTH_CLIENT_ID!,
      clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET!,
    })
  ],
  callbacks: {
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