// localStorage utility with compression and quota management
import LZString from 'lz-string';

interface Usuario {
  nome: string;
  funcao: 'trabalhador' | 'gerente';
  criado_em: string;
  ativo: boolean;
  ultima_atividade?: string;
  ultima_atualizacao?: string;
  total?: number;
}

interface StorageData {
  usuarios?: Record<string, Usuario>;
  inventario?: any;
  pagamentos?: any;
  deleted_user_timestamps?: Record<string, number>;
}

class LocalStorageManager {
  private readonly MAX_RETRIES = 3;
  private readonly CLEANUP_THRESHOLD = 0.9; // Start cleanup when 90% full

  /**
   * Safely set item in localStorage with quota handling
   */
  setItem(key: string, value: string): boolean {
    let retries = 0;
    
    while (retries < this.MAX_RETRIES) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn(`localStorage quota exceeded for key: ${key}. Attempting cleanup...`);
          
          // Try to clean up old data
          if (this.performCleanup(key)) {
            retries++;
            continue;
          }
          
          // If cleanup didn't help, try compression
          const compressed = this.compressData(value);
          if (compressed.length < value.length * 0.7) { // Only use if significantly smaller
            try {
              localStorage.setItem(key, compressed);
              localStorage.setItem(`${key}_compressed`, 'true');
              return true;
            } catch {
              // Compression didn't help either
            }
          }
        }
        
        console.error(`Failed to save to localStorage: ${key}`, e);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Get item from localStorage with decompression support
   */
  getItem(key: string): string | null {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      
      // Check if data is compressed
      const isCompressed = localStorage.getItem(`${key}_compressed`) === 'true';
      if (isCompressed) {
        return this.decompressData(value);
      }
      
      return value;
    } catch (e) {
      console.error(`Failed to get from localStorage: ${key}`, e);
      return null;
    }
  }

  /**
   * Compress data using LZ-string compression
   */
  private compressData(data: string): string {
    return LZString.compress(data);
  }

  /**
   * Decompress data using LZ-string
   */
  private decompressData(data: string): string {
    return LZString.decompress(data) || data; // Fallback to original if decompression fails
  }

  /**
   * Perform cleanup of old/unnecessary data
   */
  private performCleanup(currentKey: string): boolean {
    try {
      const keysToCheck = [
        'fazenda_usuarios',
        'fazenda_inventario', 
        'fazenda_pagamentos',
        'fazenda_deleted_user_timestamps'
      ];

      // Clean up old data for the specific firm
      for (const key of keysToCheck) {
        if (key === currentKey) continue; // Don't delete the key we're trying to save
        
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            
            // Clean up based on type
            if (key.includes('usuarios')) {
              // Remove inactive users (no activity in last 30 days)
              const cleaned = this.cleanupUsuarios(parsed);
              if (Object.keys(cleaned).length < Object.keys(parsed).length) {
                localStorage.setItem(key, JSON.stringify(cleaned));
              }
            } else if (key.includes('inventario')) {
              // Remove items with 0 quantity
              const cleaned = this.cleanupInventario(parsed);
              localStorage.setItem(key, JSON.stringify(cleaned));
            } else if (key.includes('pagamentos')) {
              // Keep only last 100 payments
              const cleaned = this.cleanupPagamentos(parsed);
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          } catch (e) {
            console.error(`Failed to clean up ${key}:`, e);
          }
        }
      }

      // Also remove old compressed flags
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.endsWith('_compressed') && !localStorage.getItem(key.replace('_compressed', ''))) {
          localStorage.removeItem(key);
        }
      });

      return true;
    } catch (e) {
      console.error('Cleanup failed:', e);
      return false;
    }
  }

  /**
   * Clean up usuarios data
   */
  private cleanupUsuarios(usuarios: Record<string, Usuario>): Record<string, Usuario> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const cleaned: Record<string, Usuario> = {};
    
    Object.entries(usuarios).forEach(([id, user]) => {
      // Keep users with recent activity
      const lastUpdate = user.ultima_atualizacao ? new Date(user.ultima_atualizacao).getTime() : 0;
      const userTotal = user.total ?? 0;
      if (lastUpdate > thirtyDaysAgo || userTotal > 0) {
        cleaned[id] = user;
      }
    });
    
    return cleaned;
  }

  /**
   * Clean up inventario data
   */
  private cleanupInventario(inventario: any): any {
    if (!inventario.itens) return inventario;
    
    const cleaned = { ...inventario };
    cleaned.itens = {};
    
    // Keep only items with quantity > 0
    Object.entries(inventario.itens).forEach(([id, item]: [string, any]) => {
      if (item.quantidade > 0) {
        cleaned.itens[id] = item;
      }
    });
    
    // Keep only last 500 transactions
    if (cleaned.historico_transacoes && cleaned.historico_transacoes.length > 500) {
      cleaned.historico_transacoes = cleaned.historico_transacoes.slice(-500);
    }
    
    return cleaned;
  }

  /**
   * Clean up pagamentos data
   */
  private cleanupPagamentos(pagamentos: any[]): any[] {
    // Keep only last 100 payments
    return pagamentos.slice(-100);
  }

  /**
   * Check storage usage
   */
  getStorageInfo(): { used: number; total: number; percentage: number } {
    let used = 0;
    
    // Calculate used space
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    // Estimate total (usually 5-10MB, we'll use 5MB as conservative estimate)
    const total = 5 * 1024 * 1024; // 5MB in bytes
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  }

  /**
   * Clear all data for a specific firm
   */
  clearFirmData(firmId: string): void {
    const keys = [
      `${firmId}_usuarios`,
      `${firmId}_inventario`,
      `${firmId}_pagamentos`,
      `${firmId}_deleted_user_timestamps`,
      `${firmId}_usuarios_compressed`,
      `${firmId}_inventario_compressed`,
      `${firmId}_pagamentos_compressed`,
      `${firmId}_deleted_user_timestamps_compressed`
    ];

    keys.forEach(key => localStorage.removeItem(key));
  }
}

// Export singleton instance
export const storageManager = new LocalStorageManager();