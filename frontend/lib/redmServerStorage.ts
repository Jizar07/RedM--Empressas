import { RedMServer } from './redmServersApi';

const SERVERS_KEY = 'redmServerList';
const ACTIVE_SERVER_KEY = 'activeRedMServerId';

/**
 * Get all saved RedM servers from localStorage
 */
export function getServerList(): RedMServer[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SERVERS_KEY);
    if (!stored) return [];

    return JSON.parse(stored) as RedMServer[];
  } catch (error) {
    console.error('Error reading RedM server list from localStorage:', error);
    return [];
  }
}

/**
 * Save the complete server list to localStorage
 */
function saveServerList(servers: RedMServer[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
  } catch (error) {
    console.error('Error saving RedM server list to localStorage:', error);
  }
}

/**
 * Add a new server to the list
 */
export function addServer(server: RedMServer): void {
  const servers = getServerList();

  // Check if server already exists (by id or ip:port)
  const exists = servers.some(s => s.id === server.id || `${s.ip}:${s.port}` === `${server.ip}:${server.port}`);
  if (exists) {
    console.warn('Server already exists in the list');
    return;
  }

  servers.push(server);
  saveServerList(servers);
}

/**
 * Remove a server from the list
 */
export function removeServer(serverId: string): void {
  const servers = getServerList();
  const filtered = servers.filter(s => s.id !== serverId);
  saveServerList(filtered);

  // If we're removing the active server, clear the active selection
  const activeId = getActiveServerId();
  if (activeId === serverId) {
    clearActiveServer();
  }
}

/**
 * Get the currently active server ID
 */
export function getActiveServerId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(ACTIVE_SERVER_KEY);
  } catch (error) {
    console.error('Error reading active server ID from localStorage:', error);
    return null;
  }
}

/**
 * Get the currently active server
 */
export function getSelectedRedMServer(): RedMServer | null {
  const activeId = getActiveServerId();
  if (!activeId) return null;

  const servers = getServerList();
  return servers.find(s => s.id === activeId) || null;
}

/**
 * Set the active server
 */
export function setActiveServer(serverId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ACTIVE_SERVER_KEY, serverId);

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('serverSelectionChanged'));
  } catch (error) {
    console.error('Error setting active server ID in localStorage:', error);
  }
}

/**
 * Clear the active server selection
 */
export function clearActiveServer(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ACTIVE_SERVER_KEY);
  } catch (error) {
    console.error('Error clearing active server from localStorage:', error);
  }
}

// Legacy compatibility - remove in future
export function saveSelectedRedMServer(server: RedMServer): void {
  addServer(server);
  setActiveServer(server.id);
}
