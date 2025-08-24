import { useSession } from 'next-auth/react';

// Define Discord role IDs for your server
// You'll need to replace these with actual role IDs from your Discord server
export const DISCORD_ROLES = {
  ADMIN: '123456789', // Replace with actual admin role ID
  MODERATOR: '987654321', // Replace with actual moderator role ID
  MEMBER: '111222333', // Replace with actual member role ID
} as const;

export type DiscordRole = keyof typeof DISCORD_ROLES;

export function useAuth() {
  const { data: session, status } = useSession();

  const hasRole = (roleId: string): boolean => {
    if (!session?.user?.roles) return false;
    return session.user.roles.includes(roleId);
  };

  const hasAnyRole = (roleIds: string[]): boolean => {
    if (!session?.user?.roles) return false;
    return roleIds.some(roleId => session.user.roles.includes(roleId));
  };

  const isAdmin = (): boolean => {
    return hasRole(DISCORD_ROLES.ADMIN);
  };

  const isModerator = (): boolean => {
    return hasRole(DISCORD_ROLES.MODERATOR) || isAdmin();
  };

  const isMember = (): boolean => {
    return session?.user?.isInTargetGuild ?? false;
  };

  const canManagePlayers = (): boolean => {
    return isAdmin() || isModerator();
  };

  const canAccessChannelParser = (): boolean => {
    return isAdmin() || isModerator();
  };

  const canViewServerStatus = (): boolean => {
    return isMember(); // All members can view server status
  };

  return {
    session,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    user: session?.user,
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isMember,
    canManagePlayers,
    canAccessChannelParser,
    canViewServerStatus,
  };
}