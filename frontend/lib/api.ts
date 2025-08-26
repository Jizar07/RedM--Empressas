import axios from 'axios';
import { ServerInfo, Player, BotStats, KnownPlayer, DiscordMember, OnlineFamilyMember } from '@/types';

const API_BASE_URL = typeof window !== 'undefined' 
  ? 'http://localhost:3050/api' 
  : 'http://localhost:3050/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const serverApi = {
  // Get server status (try internal first, fallback to authenticated)
  getStatus: async (): Promise<ServerInfo> => {
    try {
      const response = await api.get('/internal/server-status');
      return response.data;
    } catch (error) {
      console.warn('Internal server status failed, trying authenticated endpoint');
      const response = await api.get('/status');
      return response.data;
    }
  },

  // Test server connection
  testConnection: async (): Promise<{ connected: boolean }> => {
    const response = await api.get('/status/test');
    return response.data;
  },

  // Get player list (try internal first, fallback to authenticated)
  getPlayers: async (): Promise<Player[]> => {
    try {
      const response = await api.get('/internal/server-players');
      return response.data;
    } catch (error) {
      console.warn('Internal server players failed, trying authenticated endpoint');
      const response = await api.get('/players');
      return response.data;
    }
  },

  // Get specific player info
  getPlayer: async (id: string | number): Promise<Player> => {
    const response = await api.get(`/players/${id}`);
    return response.data;
  },

  // Kick player
  kickPlayer: async (id: string | number, reason: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/players/${id}/kick`, { reason });
    return response.data;
  },

  // Ban player
  banPlayer: async (id: string | number, reason: string, duration?: number): Promise<{ success: boolean }> => {
    const response = await api.post(`/players/${id}/ban`, { reason, duration });
    return response.data;
  },
};

export const botApi = {
  // Get bot statistics (try internal first, fallback to authenticated)
  getStats: async (): Promise<BotStats> => {
    try {
      const response = await api.get('/internal/status');
      // Map internal status format to BotStats format
      const internalData = response.data;
      return {
        ready: internalData.online,
        uptime: internalData.uptime,
        guilds: 1, // We know we have at least 1 guild if connected
        users: 0, // Not available in internal endpoint
        channels: internalData.connectedChannels?.length || 0,
        commands: 0, // Not available in internal endpoint
        ping: 0, // Not available in internal endpoint
      };
    } catch (error) {
      console.warn('Internal bot status failed, trying authenticated endpoint');
      const response = await api.get('/bot/stats');
      return response.data;
    }
  },

  // Get bot guilds
  getGuilds: async (): Promise<any[]> => {
    const response = await api.get('/bot/guilds');
    return response.data;
  },

  // Get Discord server members
  getDiscordMembers: async (): Promise<DiscordMember[]> => {
    const response = await api.post('/users/info', {
      includeChannels: false,
      includeRoles: true,
      includeActivity: true
    });
    return response.data.users;
  },

  // Get online family members (Discord members who are also in-game)
  getOnlineFamilyMembers: async (): Promise<OnlineFamilyMember[]> => {
    try {
      console.log('🚀 Starting to fetch online family members...');
      
      // Get both players and Discord members
      console.log('📡 Fetching players and Discord members...');
      const [playersResult, discordMembersResult] = await Promise.allSettled([
        serverApi.getPlayers(),
        botApi.getDiscordMembers()
      ]);

      if (playersResult.status === 'rejected') {
        console.error('❌ Failed to fetch players:', playersResult.reason);
        return [];
      }

      if (discordMembersResult.status === 'rejected') {
        console.error('❌ Failed to fetch Discord members:', discordMembersResult.reason);
        return [];
      }

      const players = playersResult.value;
      const discordMembers = discordMembersResult.value;

      console.log('🎮 Game Players:', players.map(p => `"${p.name}" (ID: ${p.id})`));
      console.log('💬 Discord Members:', discordMembers.map(m => `"${m.username}" (Display: "${m.displayName}", Nickname: "${m.nickname}")`));

      // Use the proven similarity algorithm from UserChannelLinkService
      // 60% threshold was found optimal in previous testing (devlog.md)
      const SIMILARITY_THRESHOLD = 0.6;

      // Levenshtein distance algorithm (from UserChannelLinkService)
      const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
          matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
          matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
          for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        
        return matrix[str2.length][str1.length];
      };

      // Calculate similarity using Levenshtein distance (from UserChannelLinkService)
      const calculateSimilarity = (str1: string, str2: string): number => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
      };

      // Normalize names for comparison (from UserChannelLinkService)
      const normalizeName = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') // Remove special characters
          .trim();
      };

      // Test specific cases for debugging
      console.log('🔍 Testing specific known cases...');
      const testCases = [
        { steamName: 'zerobala', discordSearch: 'zerobala' },
        { steamName: 'Gabs17', discordSearch: 'gbis17' }
      ];
      
      testCases.forEach(test => {
        const gamePlayer = players.find(p => p.name.toLowerCase().includes(test.steamName.toLowerCase()));
        const discordMember = discordMembers.find(m => m.username.toLowerCase().includes(test.discordSearch.toLowerCase()));
        
        if (gamePlayer && discordMember) {
          const similarity = calculateSimilarity(normalizeName(gamePlayer.name), normalizeName(discordMember.username));
          const willMatch = similarity >= SIMILARITY_THRESHOLD;
          console.log(`🧪 TEST: "${gamePlayer.name}" <-> "${discordMember.username}" = ${similarity.toFixed(3)} similarity ${willMatch ? '✅' : '❌'} (threshold: ${SIMILARITY_THRESHOLD})`);
        }
      });

      // Match players with Discord members by name
      const familyMembers: OnlineFamilyMember[] = [];
      
      for (const player of players) {
        let matchingMember: DiscordMember | undefined;
        let matchType = 'none';
        let bestSimilarity = 0;

        console.log(`🔍 Matching Steam name "${player.name}" with Discord members...`);

        // Use the proven UserChannelLinkService algorithm
        for (const member of discordMembers) {
          const steamName = player.name;
          const discordUsername = member.username;
          
          // Normalize names for comparison
          const normalizedSteamName = normalizeName(steamName);
          const normalizedDiscordName = normalizeName(discordUsername);
          
          // Exact match check
          if (normalizedSteamName === normalizedDiscordName) {
            matchingMember = member;
            matchType = 'exact';
            bestSimilarity = 1.0;
            console.log(`✅ EXACT MATCH: "${steamName}" === "${discordUsername}"`);
            break;
          }
          
          // Partial match check (contains)
          if (normalizedSteamName.includes(normalizedDiscordName) || 
              normalizedDiscordName.includes(normalizedSteamName)) {
            
            const similarity = calculateSimilarity(normalizedSteamName, normalizedDiscordName);
            
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              matchingMember = member;
              matchType = 'partial';
            }
          }
          
          // Fuzzy similarity check using 60% threshold (proven optimal)
          const similarity = calculateSimilarity(normalizedSteamName, normalizedDiscordName);
          
          if (similarity >= SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            matchingMember = member;
            matchType = similarity >= 0.9 ? 'high_similarity' : 'fuzzy_match';
          }
        }

        // Log results
        if (matchingMember) {
          console.log(`✅ MATCH (${matchType}): "${player.name}" <-> "${matchingMember.username}" (${Math.round(bestSimilarity * 100)}%)`);
        } else {
          console.log(`❌ No match found for: "${player.name}" (no Discord member above ${Math.round(SIMILARITY_THRESHOLD * 100)}% threshold)`);
          
          // Show top 3 closest matches for debugging
          const closeMatches = discordMembers
            .map(member => ({
              username: member.username,
              similarity: calculateSimilarity(normalizeName(player.name), normalizeName(member.username))
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);
            
          console.log(`🔍 Closest matches:`, closeMatches.map(m => `${m.username} (${Math.round(m.similarity * 100)}%)`).join(', '));
        }

        if (matchingMember) {
          console.log(`✅ MATCH FOUND (${matchType}): "${player.name}" <-> "${matchingMember.username}"`);
          familyMembers.push({
            discordId: matchingMember.id,
            discordName: matchingMember.username,
            displayName: matchingMember.displayName,
            nickname: matchingMember.nickname,
            gamePlayerId: player.id,
            gamePlayerName: player.name,
            ping: player.ping,
            avatarURL: matchingMember.avatarURL,
            roles: matchingMember.roles?.map(role => role.name) || [],
            joinedAt: matchingMember.joinedAt
          });
        } else {
          console.log(`❌ No match found for: "${player.name}"`);
        }
      }

      console.log(`🎯 Found ${familyMembers.length} family members online:`);
      familyMembers.forEach(m => {
        console.log(`👤 ${m.discordName} (nickname: "${m.nickname}") -> ${m.gamePlayerName}`);
      });
      return familyMembers;
    } catch (error) {
      console.error('💥 Error fetching online family members:', error);
      throw error;
    }
  },
};

export const channelParserApi = {
  // Parse channel and send to webhook
  parseChannel: async (channelId: string, webhookUrl: string, options?: {
    limit?: number;
    filterUser?: string;
    filterKeyword?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    channelId: string;
    messagesParsed: number;
    filtersApplied: any;
    parsedAt: string;
  }> => {
    const response = await api.post('/channel-parser/parse', {
      channelId,
      webhookUrl,
      ...options
    });
    return response.data;
  },

  // Preview channel messages
  previewChannel: async (channelId: string, limit: number = 10): Promise<{
    channelId: string;
    messages: any[];
    totalMessages: number;
    previewedAt: string;
  }> => {
    const response = await api.get(`/channel-parser/preview/${channelId}?limit=${limit}`);
    return response.data;
  },
};

// Health check
export const healthCheck = async (): Promise<any> => {
  const response = await axios.get('http://localhost:3050/health');
  return response.data;
};

// Local storage helpers for known players
export const knownPlayersStorage = {
  getKnownPlayers: (): KnownPlayer[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('knownPlayers');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading known players from localStorage:', error);
      return [];
    }
  },

  saveKnownPlayer: (player: KnownPlayer): void => {
    if (typeof window === 'undefined') return;
    try {
      const known = knownPlayersStorage.getKnownPlayers();
      const index = known.findIndex(p => p.playerId === player.playerId);
      
      if (index >= 0) {
        known[index] = player;
      } else {
        known.push(player);
      }
      
      localStorage.setItem('knownPlayers', JSON.stringify(known));
    } catch (error) {
      console.error('Error saving known player to localStorage:', error);
    }
  },

  removeKnownPlayer: (playerId: number): void => {
    if (typeof window === 'undefined') return;
    try {
      const known = knownPlayersStorage.getKnownPlayers();
      const filtered = known.filter(p => p.playerId !== playerId);
      localStorage.setItem('knownPlayers', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing known player from localStorage:', error);
    }
  },

  isKnownPlayer: (playerId: number): boolean => {
    const known = knownPlayersStorage.getKnownPlayers();
    return known.some(p => p.playerId === playerId);
  },

  getKnownPlayer: (playerId: number): KnownPlayer | null => {
    const known = knownPlayersStorage.getKnownPlayers();
    return known.find(p => p.playerId === playerId) || null;
  },
};