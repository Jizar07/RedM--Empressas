export interface RedMServer {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  ip: string;
  port: string;
  locale: string;
  tags: string[];
  upvotePower: number;
}

/**
 * Resolve a server ID to its IP:port using the cfx.re API
 */
async function resolveServerId(serverId: string): Promise<{ ip: string; port: string } | null> {
  try {
    // Fetch server details from cfx.re API
    const response = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${serverId}`);

    if (!response.ok) {
      console.error('[RedM API] Failed to resolve server ID:', serverId);
      return null;
    }

    const data = await response.json();

    // Extract connection endpoint (format: "IP:port")
    const endpoint = data?.Data?.connectEndPoints?.[0];
    if (!endpoint) {
      console.error('[RedM API] No connection endpoint found for server:', serverId);
      return null;
    }

    // Parse IP and port from endpoint
    const [ip, port] = endpoint.split(':');
    if (!ip || !port) {
      console.error('[RedM API] Invalid endpoint format:', endpoint);
      return null;
    }

    console.log(`[RedM API] Resolved ${serverId} to ${ip}:${port}`);
    return { ip, port };
  } catch (error) {
    console.error('[RedM API] Error resolving server ID:', error);
    return null;
  }
}

/**
 * Parse server address from various formats
 * Supports: "https://servers.redm.net/servers/detail/xxxxx", "cfx.re/join/xxxxx", "IP:port"
 */
async function parseServerAddress(address: string): Promise<{ ip: string; port: string; id: string } | null> {
  // Clean up the address
  address = address.trim();

  // Handle servers.redm.net/servers/detail/xxxxx format
  const redmDetailMatch = address.match(/servers\.redm\.net\/servers\/detail\/([a-z0-9]+)/i);
  if (redmDetailMatch) {
    const serverId = redmDetailMatch[1];
    const resolved = await resolveServerId(serverId);
    if (!resolved) return null;
    return { ip: resolved.ip, port: resolved.port, id: serverId };
  }

  // Handle cfx.re/join/xxxxx format
  const cfxMatch = address.match(/cfx\.re\/join\/([a-z0-9]+)/i);
  if (cfxMatch) {
    const serverId = cfxMatch[1];
    const resolved = await resolveServerId(serverId);
    if (!resolved) return null;
    return { ip: resolved.ip, port: resolved.port, id: serverId };
  }

  // Handle IP:port format
  const ipPortMatch = address.match(/(?:https?:\/\/)?([0-9.]+):([0-9]+)/);
  if (ipPortMatch) {
    const ip = ipPortMatch[1];
    const port = ipPortMatch[2];
    return { ip, port, id: `${ip}:${port}` };
  }

  return null;
}

/**
 * Fetch server information from a RedM server
 * @param address Server address (https://servers.redm.net/servers/detail/xxxxx, cfx.re/join/xxxxx, or IP:port)
 * @returns RedMServer object or null if failed
 */
export async function fetchServerInfo(address: string): Promise<RedMServer | null> {
  const parsed = await parseServerAddress(address);
  if (!parsed) {
    console.error('[RedM API] Invalid server address format:', address);
    return null;
  }

  if (!parsed.ip || !parsed.port) {
    console.error('[RedM API] Failed to resolve server address');
    return null;
  }

  try {
    const serverIp = parsed.ip;
    const serverPort = parsed.port;

    // Fetch server info through backend proxy (to avoid CORS)
    const [infoRes, playersRes] = await Promise.allSettled([
      fetch(`/api/server-proxy/info?serverIp=${serverIp}&serverPort=${serverPort}`),
      fetch(`/api/server-proxy/players?serverIp=${serverIp}&serverPort=${serverPort}`)
    ]);

    if (infoRes.status !== 'fulfilled' || !infoRes.value.ok) {
      console.error('[RedM API] Failed to fetch server info');
      return null;
    }

    const infoData = await infoRes.value.json();
    const playersData = playersRes.status === 'fulfilled' && playersRes.value.ok
      ? await playersRes.value.json()
      : [];

    const server: RedMServer = {
      id: parsed.id,
      name: infoData.vars?.sv_projectName || infoData.vars?.sv_hostname || `Server ${serverIp}`,
      players: Array.isArray(playersData) ? playersData.length : 0,
      maxPlayers: parseInt(infoData.vars?.sv_maxClients) || 32,
      ip: serverIp,
      port: serverPort,
      locale: infoData.vars?.locale || '',
      tags: infoData.vars?.tags || [],
      upvotePower: 0
    };

    console.log('[RedM API] Successfully fetched server info:', server.name);
    return server;
  } catch (error) {
    console.error('[RedM API] Error fetching server info:', error);
    return null;
  }
}
