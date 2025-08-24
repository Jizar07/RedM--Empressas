import { Client, CategoryChannel, TextChannel, GuildMember } from 'discord.js';

interface UserChannelMatch {
  userId: string;
  username: string;
  nickname: string | null;
  channelId: string | null;
  channelName: string | null;
  matchType: 'exact' | 'partial' | 'none';
  similarity?: number;
}

class UserChannelLinkService {
  private client: Client | null = null;

  setClient(client: Client) {
    this.client = client;
  }

  // Calculate string similarity for nickname matching
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // Levenshtein distance algorithm
  private levenshteinDistance(str1: string, str2: string): number {
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
  }

  // Normalize names for comparison
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .trim();
  }

  // Get all channels in a category
  async getChannelsInCategory(guildId: string, categoryId: string): Promise<TextChannel[]> {
    if (!this.client) throw new Error('Discord client not initialized');
    
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');
    
    const category = guild.channels.cache.get(categoryId) as CategoryChannel;
    if (!category || category.type !== 4) {
      throw new Error('Category not found or invalid');
    }
    
    // Get all text channels in this category
    const channels = category.children.cache
      .filter(channel => channel.type === 0) // Text channels only
      .map(channel => channel as TextChannel);
    
    return Array.from(channels.values());
  }

  // Get all members in guild
  async getGuildMembers(guildId: string): Promise<GuildMember[]> {
    if (!this.client) throw new Error('Discord client not initialized');
    
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');
    
    // Fetch all members
    await guild.members.fetch();
    return Array.from(guild.members.cache.values());
  }

  // Compare users with channels in category and find matches
  async compareUsersWithChannels(
    guildId: string, 
    categoryId: string,
    similarityThreshold: number = 0.7
  ): Promise<UserChannelMatch[]> {
    try {
      console.log(`🔍 Starting user-channel comparison for category ${categoryId}`);
      
      // Get all channels in the category
      const channels = await this.getChannelsInCategory(guildId, categoryId);
      console.log(`📁 Found ${channels.length} channels in category`);
      
      // Get all guild members
      const members = await this.getGuildMembers(guildId);
      console.log(`👥 Found ${members.length} members in guild`);
      
      const matches: UserChannelMatch[] = [];
      
      // Compare each member with each channel
      for (const member of members) {
        if (member.user.bot) continue; // Skip bots
        
        const nickname = member.nickname || member.user.displayName;
        const username = member.user.username;
        
        let bestMatch: UserChannelMatch = {
          userId: member.id,
          username: username,
          nickname: nickname,
          channelId: null,
          channelName: null,
          matchType: 'none'
        };
        
        let bestSimilarity = 0;
        
        // Check against all channels
        for (const channel of channels) {
          const channelName = channel.name;
          
          // Remove emoji prefixes and normalize for comparison
          const cleanChannelName = channelName.replace(/^[^\w\s]+/g, '').trim();
          
          // Test different comparison strategies
          const normalizedNickname = this.normalizeName(nickname);
          const normalizedUsername = this.normalizeName(username);
          const normalizedChannelName = this.normalizeName(cleanChannelName);
          
          // Exact match check
          if (normalizedNickname === normalizedChannelName || normalizedUsername === normalizedChannelName) {
            bestMatch = {
              userId: member.id,
              username: username,
              nickname: nickname,
              channelId: channel.id,
              channelName: channelName,
              matchType: 'exact',
              similarity: 1.0
            };
            break;
          }
          
          // Partial match check (contains)
          if (normalizedChannelName.includes(normalizedNickname) || 
              normalizedNickname.includes(normalizedChannelName) ||
              normalizedChannelName.includes(normalizedUsername) || 
              normalizedUsername.includes(normalizedChannelName)) {
            
            const similarity = Math.max(
              this.calculateSimilarity(normalizedNickname, normalizedChannelName),
              this.calculateSimilarity(normalizedUsername, normalizedChannelName)
            );
            
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              bestMatch = {
                userId: member.id,
                username: username,
                nickname: nickname,
                channelId: channel.id,
                channelName: channelName,
                matchType: 'partial',
                similarity: similarity
              };
            }
          }
          
          // Fuzzy similarity check
          const nicknameSimilarity = this.calculateSimilarity(normalizedNickname, normalizedChannelName);
          const usernameSimilarity = this.calculateSimilarity(normalizedUsername, normalizedChannelName);
          const maxSimilarity = Math.max(nicknameSimilarity, usernameSimilarity);
          
          if (maxSimilarity >= similarityThreshold && maxSimilarity > bestSimilarity) {
            bestSimilarity = maxSimilarity;
            bestMatch = {
              userId: member.id,
              username: username,
              nickname: nickname,
              channelId: channel.id,
              channelName: channelName,
              matchType: maxSimilarity >= 0.9 ? 'exact' : 'partial',
              similarity: maxSimilarity
            };
          }
        }
        
        matches.push(bestMatch);
      }
      
      // Sort by match quality
      matches.sort((a, b) => {
        const aScore = a.similarity || (a.matchType === 'exact' ? 1 : a.matchType === 'partial' ? 0.5 : 0);
        const bScore = b.similarity || (b.matchType === 'exact' ? 1 : b.matchType === 'partial' ? 0.5 : 0);
        return bScore - aScore;
      });
      
      console.log(`✅ Comparison complete: ${matches.filter(m => m.matchType !== 'none').length}/${matches.length} users have channel matches`);
      
      return matches;
    } catch (error) {
      console.error('❌ Error comparing users with channels:', error);
      throw error;
    }
  }

  // Generate a detailed report of the comparison
  generateComparisonReport(matches: UserChannelMatch[]): string {
    const exactMatches = matches.filter(m => m.matchType === 'exact');
    const partialMatches = matches.filter(m => m.matchType === 'partial');
    const noMatches = matches.filter(m => m.matchType === 'none');
    
    let report = `📊 USER-CHANNEL COMPARISON REPORT\n`;
    report += `==========================================\n\n`;
    report += `📈 SUMMARY:\n`;
    report += `• Total Users: ${matches.length}\n`;
    report += `• Exact Matches: ${exactMatches.length}\n`;
    report += `• Partial Matches: ${partialMatches.length}\n`;
    report += `• No Matches: ${noMatches.length}\n`;
    report += `• Match Rate: ${((exactMatches.length + partialMatches.length) / matches.length * 100).toFixed(1)}%\n\n`;
    
    if (exactMatches.length > 0) {
      report += `✅ EXACT MATCHES:\n`;
      exactMatches.forEach(match => {
        report += `• ${match.nickname || match.username} → #${match.channelName}\n`;
      });
      report += `\n`;
    }
    
    if (partialMatches.length > 0) {
      report += `🔍 PARTIAL MATCHES:\n`;
      partialMatches.forEach(match => {
        report += `• ${match.nickname || match.username} → #${match.channelName} (${(match.similarity! * 100).toFixed(1)}%)\n`;
      });
      report += `\n`;
    }
    
    if (noMatches.length > 0 && noMatches.length <= 10) {
      report += `❌ NO MATCHES:\n`;
      noMatches.forEach(match => {
        report += `• ${match.nickname || match.username}\n`;
      });
    } else if (noMatches.length > 10) {
      report += `❌ NO MATCHES: ${noMatches.length} users without channel matches\n`;
    }
    
    return report;
  }
}

export default new UserChannelLinkService();
export { UserChannelMatch };