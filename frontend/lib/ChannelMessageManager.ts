import fs from 'fs/promises';
import path from 'path';

interface DiscordMessage {
    id: string;
    timestamp: string;
    author: string;
    content: string;
    source: string;
    channelId: string;
    embedContent?: string;
    rawEmbeds?: any[];
}

interface ChannelLog {
    channelId: string;
    lastUpdated: string;
    messageCount: number;
    messages: DiscordMessage[];
}

export class ChannelMessageManager {
    private readonly MAX_MESSAGES_PER_CHANNEL = 100;
    private readonly channelLogsDir: string;

    constructor() {
        this.channelLogsDir = path.join(process.cwd(), 'public', 'channel-logs');
        this.ensureDirectoryExists();
    }

    private async ensureDirectoryExists(): Promise<void> {
        try {
            await fs.mkdir(this.channelLogsDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create channel-logs directory:', error);
        }
    }

    private getChannelFilePath(channelId: string): string {
        return path.join(this.channelLogsDir, `${channelId}.json`);
    }

    async addMessage(message: DiscordMessage): Promise<void> {
        const channelFilePath = this.getChannelFilePath(message.channelId);
        
        try {
            let channelLog: ChannelLog;
            
            try {
                const data = await fs.readFile(channelFilePath, 'utf8');
                channelLog = JSON.parse(data);
            } catch {
                // File doesn't exist or is invalid, create new log
                channelLog = {
                    channelId: message.channelId,
                    lastUpdated: new Date().toISOString(),
                    messageCount: 0,
                    messages: []
                };
            }

            // Check if message already exists (avoid duplicates)
            const existingIndex = channelLog.messages.findIndex(msg => msg.id === message.id);
            if (existingIndex !== -1) {
                // Update existing message
                channelLog.messages[existingIndex] = message;
            } else {
                // Add new message to the beginning (newest first)
                channelLog.messages.unshift(message);
                
                // Keep only the latest MAX_MESSAGES_PER_CHANNEL messages
                if (channelLog.messages.length > this.MAX_MESSAGES_PER_CHANNEL) {
                    channelLog.messages = channelLog.messages.slice(0, this.MAX_MESSAGES_PER_CHANNEL);
                }
            }

            // Update metadata
            channelLog.messageCount = channelLog.messages.length;
            channelLog.lastUpdated = new Date().toISOString();

            // Write back to file
            await fs.writeFile(channelFilePath, JSON.stringify(channelLog, null, 2), 'utf8');
            
        } catch (error) {
            console.error(`Failed to save message to channel ${message.channelId}:`, error);
            throw error;
        }
    }

    async getChannelMessages(channelId: string): Promise<DiscordMessage[]> {
        const channelFilePath = this.getChannelFilePath(channelId);
        
        try {
            const data = await fs.readFile(channelFilePath, 'utf8');
            const channelLog: ChannelLog = JSON.parse(data);
            return channelLog.messages || [];
        } catch {
            return [];
        }
    }

    async getAllChannelIds(): Promise<string[]> {
        try {
            const files = await fs.readdir(this.channelLogsDir);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch {
            return [];
        }
    }

    async getAllMessages(): Promise<DiscordMessage[]> {
        const channelIds = await this.getAllChannelIds();
        const allMessages: DiscordMessage[] = [];

        for (const channelId of channelIds) {
            const channelMessages = await this.getChannelMessages(channelId);
            allMessages.push(...channelMessages);
        }

        // Sort by timestamp (newest first)
        return allMessages.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    async getChannelStats(): Promise<{ [channelId: string]: { messageCount: number; lastUpdated: string } }> {
        const channelIds = await this.getAllChannelIds();
        const stats: { [channelId: string]: { messageCount: number; lastUpdated: string } } = {};

        for (const channelId of channelIds) {
            const channelFilePath = this.getChannelFilePath(channelId);
            try {
                const data = await fs.readFile(channelFilePath, 'utf8');
                const channelLog: ChannelLog = JSON.parse(data);
                stats[channelId] = {
                    messageCount: channelLog.messageCount,
                    lastUpdated: channelLog.lastUpdated
                };
            } catch {
                stats[channelId] = { messageCount: 0, lastUpdated: 'N/A' };
            }
        }

        return stats;
    }
}

export default ChannelMessageManager;