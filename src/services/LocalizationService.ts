import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

interface DisplayNames {
  display_names: Record<string, string>;
  ultima_atualizacao: string;
}

class LocalizationService {
  private displayNamesPath: string;
  private displayNames!: DisplayNames;

  constructor() {
    this.displayNamesPath = path.join(process.cwd(), 'data', 'custom_display_names.json');
    this.loadDisplayNames();
  }

  private loadDisplayNames(): void {
    try {
      if (existsSync(this.displayNamesPath)) {
        const data = readFileSync(this.displayNamesPath, 'utf8');
        this.displayNames = JSON.parse(data);
      } else {
        console.log('⚠️ Display names file not found, creating default');
        this.displayNames = {
          display_names: {},
          ultima_atualizacao: new Date().toISOString()
        };
        this.saveDisplayNames();
      }
    } catch (error) {
      console.error('❌ Error loading display names:', error);
      this.displayNames = {
        display_names: {},
        ultima_atualizacao: new Date().toISOString()
      };
    }
  }

  private saveDisplayNames(): void {
    try {
      writeFileSync(this.displayNamesPath, JSON.stringify(this.displayNames, null, 2));
    } catch (error) {
      console.error('❌ Error saving display names:', error);
    }
  }

  /**
   * Get the best display name for an item
   * Priority: 1) Custom display name, 2) Formatted ID
   */
  public getBestDisplayName(itemId: string): string {
    if (!itemId) return '';

    // 1. Try custom display name first (highest priority)
    const customName = this.getCustomDisplayName(itemId);
    if (customName) {
      return customName;
    }

    // 2. Try different variations of the itemId
    const variations = [
      itemId.toLowerCase(),
      itemId.replace(/_/g, ' '),
      itemId.replace(/_/g, ' ').toLowerCase(),
      itemId
    ];

    for (const variation of variations) {
      const customName = this.displayNames.display_names[variation];
      if (customName && customName.trim() !== '') {
        return customName;
      }
    }

    // 3. Fallback to normalized formatting
    return this.normalizeAndFormat(itemId);
  }

  /**
   * Get custom display name for an item
   */
  public getCustomDisplayName(itemId: string): string | null {
    if (!itemId) return null;

    const directMatch = this.displayNames.display_names[itemId];
    if (directMatch && directMatch.trim() !== '') {
      return directMatch;
    }

    // Try lowercase version
    const lowerMatch = this.displayNames.display_names[itemId.toLowerCase()];
    if (lowerMatch && lowerMatch.trim() !== '') {
      return lowerMatch;
    }

    return null;
  }

  /**
   * Set custom display name for an item
   */
  public setCustomDisplayName(itemId: string, displayName: string): boolean {
    try {
      if (!itemId || !displayName) return false;

      this.displayNames.display_names[itemId] = displayName;
      this.displayNames.ultima_atualizacao = new Date().toISOString();
      this.saveDisplayNames();
      
      console.log(`📝 Custom display name set: ${itemId} -> ${displayName}`);
      return true;
    } catch (error) {
      console.error('❌ Error setting custom display name:', error);
      return false;
    }
  }

  /**
   * Remove custom display name for an item
   */
  public removeCustomDisplayName(itemId: string): boolean {
    try {
      if (!itemId) return false;

      if (this.displayNames.display_names[itemId]) {
        delete this.displayNames.display_names[itemId];
        this.displayNames.ultima_atualizacao = new Date().toISOString();
        this.saveDisplayNames();
        
        console.log(`🗑️ Custom display name removed: ${itemId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error removing custom display name:', error);
      return false;
    }
  }

  /**
   * Normalize and format item name as fallback
   */
  public normalizeAndFormat(itemId: string): string {
    if (!itemId) return '';

    return itemId
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get all translations
   */
  public getAllTranslations(): Record<string, string> {
    return this.displayNames.display_names;
  }

  /**
   * Extract worker name from Discord message content
   * Looks for patterns like "Autor:Worker Name" or "Autor: John Doe"
   */
  public extractWorkerName(content: string): string | null {
    if (!content) return null;

    // Look for "Autor:" pattern followed by the worker name
    const workerNameMatch = content.match(/Autor:\s*([^,\n\r]+)/i);
    if (workerNameMatch) {
      const workerName = workerNameMatch[1].trim();
      if (workerName && workerName !== 'Unknown' && workerName.length > 0) {
        return workerName;
      }
    }

    return null;
  }

  /**
   * Normalize user names by removing special characters and converting to lowercase
   * Used for matching Discord usernames with worker names
   */
  public normalizeUserName(name: string): string {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
      .trim();
  }
}

// Export singleton instance
export default new LocalizationService();