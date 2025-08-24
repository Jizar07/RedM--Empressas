export interface ServerInfo {
  online: boolean;
  hostname: string;
  players: number;
  maxPlayers: number;
  gametype: string;
  mapname: string;
  uptime: string;
  resources?: string[];
  playerList?: Player[];
}

export interface Player {
  id: number;
  name: string;
  ping: number;
  identifiers: string[];
  endpoint?: string;
}

export interface KnownPlayer {
  playerId: number;
  name: string;
  displayName?: string;
  job?: string;
  position?: string;
  bootId?: string;
  mailId?: string;
  lastLogin?: string;
  lastLogout?: string;
  ping: number;
  isKnown: boolean;
  notes?: string;
}

export interface BotStats {
  ready: boolean;
  uptime: number;
  guilds: number;
  users: number;
  channels?: number;
  commands?: number;
  ping: number;
}

export type SortField = 'name' | 'ping' | 'lastLogin' | 'job' | 'displayName' | 'isOnline';
export type SortDirection = 'asc' | 'desc';

export interface PlayerFilter {
  search: string;
  onlineOnly: boolean;
  knownOnly: boolean;
  job?: string;
}

export interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
  nickname: string | null; // Server-specific nickname
  avatarURL: string;
  joinedAt?: string;
  lastSeen?: string;
  roles?: {
    id: string;
    name: string;
    color: string;
  }[];
  presence?: {
    status: 'online' | 'idle' | 'dnd' | 'offline';
    activity?: string;
  };
}

export interface OnlineFamilyMember {
  discordId: string;
  discordName: string;
  displayName: string;
  nickname: string | null; // Server nickname
  gamePlayerId: number;
  gamePlayerName: string;
  ping: number;
  avatarURL: string;
  roles: string[];
  joinedAt?: string;
}