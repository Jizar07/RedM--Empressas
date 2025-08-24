'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Lock } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
  requireRoles?: string[];
  fallback?: ReactNode;
  showFallback?: boolean;
}

export default function RoleGuard({
  children,
  requireAdmin = false,
  requireModerator = false,
  requireRoles = [],
  fallback,
  showFallback = true,
}: RoleGuardProps) {
  const { isAdmin, isModerator, hasAnyRole, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  // Check admin access
  if (requireAdmin && !isAdmin()) {
    return showFallback ? (fallback || <AccessDeniedFallback />) : null;
  }

  // Check moderator access (admins have moderator access)
  if (requireModerator && !isModerator()) {
    return showFallback ? (fallback || <AccessDeniedFallback />) : null;
  }

  // Check specific roles
  if (requireRoles.length > 0 && !hasAnyRole(requireRoles)) {
    return showFallback ? (fallback || <AccessDeniedFallback />) : null;
  }

  return <>{children}</>;
}

function AccessDeniedFallback() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <Lock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
      <p className="text-sm text-gray-600">
        You don't have permission to access this feature.
      </p>
    </div>
  );
}