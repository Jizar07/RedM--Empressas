'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireGuildMembership?: boolean;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ 
  children, 
  requireGuildMembership = true,
  requiredRoles = [] 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    // Temporarily disable redirect for testing
    if (!session) {
      console.log('No session found, would redirect to /auth/signin');
      // router.push('/auth/signin');
      return;
    }

    if (requireGuildMembership && !session.user.isInTargetGuild) {
      router.push('/auth/error?error=AccessDenied');
      return;
    }

    if (requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(roleId => 
        session.user.roles?.includes(roleId)
      );
      
      if (!hasRequiredRole) {
        router.push('/auth/error?error=AccessDenied');
        return;
      }
    }
  }, [session, status, router, requireGuildMembership, requiredRoles]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to signin
  }

  if (requireGuildMembership && !session.user.isInTargetGuild) {
    return null; // Will redirect to error page
  }

  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(roleId => 
      session.user.roles?.includes(roleId)
    );
    
    if (!hasRequiredRole) {
      return null; // Will redirect to error page
    }
  }

  return <>{children}</>;
}