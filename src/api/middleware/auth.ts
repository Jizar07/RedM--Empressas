import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';

interface AuthenticatedRequest extends Request {
  user?: {
    discordId: string;
    username: string;
    discriminator: string;
    avatar: string;
    isInTargetGuild: boolean;
    roles: string[];
  };
}

interface NextAuthToken {
  discordId: string;
  username: string;
  discriminator: string;
  avatar: string;
  isInTargetGuild: boolean;
  roles: string[];
  iat: number;
  exp: number;
  jti: string;
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Get session token from NextAuth cookie
    const sessionToken = req.cookies['next-auth.session-token'] || req.cookies['__Secure-next-auth.session-token'];
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token found' });
    }

    // Verify the JWT token
    if (!NEXTAUTH_SECRET) {
      return res.status(500).json({ error: 'NextAuth secret not configured' });
    }

    const decoded = jwt.verify(sessionToken, NEXTAUTH_SECRET) as NextAuthToken;
    
    // Check if user is in target guild
    if (!decoded.isInTargetGuild) {
      return res.status(403).json({ error: 'User not in target Discord guild' });
    }

    // Attach user info to request
    req.user = {
      discordId: decoded.discordId,
      username: decoded.username,
      discriminator: decoded.discriminator,
      avatar: decoded.avatar,
      isInTargetGuild: decoded.isInTargetGuild,
      roles: decoded.roles || []
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid session token' });
  }
};

export const requireRole = (roleId: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.user.roles.includes(roleId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAnyRole = (roleIds: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const hasAnyRole = roleIds.some(roleId => req.user!.roles.includes(roleId));
    if (!hasAnyRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole('123456789'); // Replace with actual admin role ID
export const requireModerator = requireAnyRole(['123456789', '987654321']); // Replace with actual admin and moderator role IDs

// Verify Discord guild membership and roles independently
export const verifyDiscordMembership = async (discordId: string): Promise<{ isInGuild: boolean; roles: string[] }> => {
  try {
    const response = await axios.get(
      `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`
        }
      }
    );

    return {
      isInGuild: true,
      roles: response.data.roles || []
    };
  } catch (error) {
    console.error('Error verifying Discord membership:', error);
    return {
      isInGuild: false,
      roles: []
    };
  }
};

export type { AuthenticatedRequest };