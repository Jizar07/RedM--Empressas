import axios, { AxiosInstance } from 'axios';
import config from '../config/config';
import { Constants } from '../config/constants';

interface ServerInfo {
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

interface Player {
  id: number;
  name: string;
  ping: number;
  identifiers: string[];
}

class RedMService {
  private api: AxiosInstance;
  private serverUrl: string;
  
  constructor() {
    this.serverUrl = `http://${config.redm.serverIp}:${config.redm.serverPort}`;
    
    this.api = axios.create({
      baseURL: this.serverUrl,
      timeout: Constants.API.Timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  async getServerInfo(): Promise<ServerInfo> {
    try {
      // Try to get server info from FiveM/RedM API endpoints
      const [infoResponse, playersResponse, dynamicResponse] = await Promise.allSettled([
        this.api.get('/info.json'),
        this.api.get('/players.json'),
        this.api.get('/dynamic.json'),
      ]);
      
      let serverInfo: ServerInfo = {
        online: false,
        hostname: 'Unknown Server',
        players: 0,
        maxPlayers: Constants.RedM.MaxPlayers,
        gametype: 'RedM',
        mapname: 'rdr3',
        uptime: 'Unknown',
        resources: [],
        playerList: [],
      };
      
      // Parse info.json response
      if (infoResponse.status === 'fulfilled' && infoResponse.value.data) {
        const info = infoResponse.value.data;
        serverInfo.online = true;
        serverInfo.hostname = info.vars?.sv_projectName || info.vars?.sv_hostname || 'RedM Server';
        serverInfo.maxPlayers = parseInt(info.vars?.sv_maxClients) || Constants.RedM.MaxPlayers;
        serverInfo.gametype = info.vars?.gametype || 'RedM RP';
        serverInfo.mapname = info.vars?.mapname || 'rdr3';
        serverInfo.resources = info.resources || [];
      }
      
      // Parse players.json response
      if (playersResponse.status === 'fulfilled' && playersResponse.value.data) {
        serverInfo.playerList = playersResponse.value.data;
        serverInfo.players = serverInfo.playerList?.length || 0;
      }
      
      // Parse dynamic.json response
      if (dynamicResponse.status === 'fulfilled' && dynamicResponse.value.data) {
        serverInfo.players = dynamicResponse.value.data.clients || serverInfo.players;
        serverInfo.hostname = dynamicResponse.value.data.hostname || serverInfo.hostname;
        serverInfo.gametype = dynamicResponse.value.data.gametype || serverInfo.gametype;
        serverInfo.mapname = dynamicResponse.value.data.mapname || serverInfo.mapname;
        serverInfo.maxPlayers = dynamicResponse.value.data.sv_maxclients || serverInfo.maxPlayers;
      }
      
      // Calculate uptime (this would need actual implementation with stored data)
      serverInfo.uptime = this.calculateUptime();
      
      return serverInfo;
    } catch (error) {
      console.error('Error fetching server info:', error);
      
      // Return offline server info
      return {
        online: false,
        hostname: config.redm.serverIp || 'Unknown Server',
        players: 0,
        maxPlayers: Constants.RedM.MaxPlayers,
        gametype: 'RedM',
        mapname: 'rdr3',
        uptime: 'Offline',
        resources: [],
        playerList: [],
      };
    }
  }
  
  async getPlayerList(): Promise<Player[]> {
    try {
      const response = await this.api.get('/players.json');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching player list:', error);
      return [];
    }
  }

  // Alias for internal API compatibility
  async getServerPlayers(): Promise<Player[]> {
    return this.getPlayerList();
  }
  
  async getPlayerInfo(playerId: string | number): Promise<Player | null> {
    try {
      const players = await this.getPlayerList();
      return players.find(p => p.id === parseInt(playerId.toString())) || null;
    } catch (error) {
      console.error('Error fetching player info:', error);
      return null;
    }
  }
  
  async executeCommand(command: string): Promise<boolean> {
    // This would require RCON implementation
    // For now, returning a placeholder
    console.log(`Executing command: ${command}`);
    return false;
  }
  
  async restartServer(): Promise<boolean> {
    return this.executeCommand('restart');
  }
  
  async kickPlayer(playerId: string | number, reason: string): Promise<boolean> {
    return this.executeCommand(`kick ${playerId} "${reason}"`);
  }
  
  async banPlayer(playerId: string | number, reason: string, duration?: number): Promise<boolean> {
    const durationStr = duration ? `${duration}` : 'permanent';
    return this.executeCommand(`ban ${playerId} "${reason}" ${durationStr}`);
  }
  
  private calculateUptime(): string {
    // This would need to be implemented with actual server start time tracking
    // For now, returning a placeholder
    return 'N/A';
  }
  
  // Method to test server connection
  async testConnection(): Promise<boolean> {
    try {
      await this.api.get('/info.json', { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new RedMService();