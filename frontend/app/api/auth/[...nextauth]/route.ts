import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-options"

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }