/**
 * Shared utility functions for item name handling and display
 */

/**
 * Get the best display name for an item, checking multiple sources in priority order
 * @param itemId - The item identifier
 * @param customizations - Firm-specific customizations (highest priority)
 * @param translations - Global translation mappings
 * @param inventoryOverrides - Persistent inventory overrides
 * @returns The best available display name for the item
 */
export function getBestDisplayName(
  itemId?: string,
  customizations?: Record<string, string>,
  translations?: Record<string, string>,
  inventoryOverrides?: Record<string, string>
): string {
  if (!itemId) return 'Item';

  // Priority 1: Firm-specific customizations (e.g., custom names set by managers)
  if (customizations?.[itemId]) {
    return customizations[itemId];
  }

  // Priority 2: Persistent inventory overrides (e.g., names from inventory data)
  if (inventoryOverrides?.[itemId]) {
    return inventoryOverrides[itemId];
  }

  // Priority 3: Global Portuguese translations
  if (translations?.[itemId]) {
    return translations[itemId];
  }

  // Fallback: Format the item ID nicely
  return normalizeText(itemId);
}

/**
 * Normalize text by replacing underscores/hyphens with spaces and capitalizing words
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()) // Capitalize first letter of each word
    .trim();
}

/**
 * Normalize channel name for Discord (lowercase, spaces to hyphens, remove special chars)
 * @param name - Name to normalize
 * @returns Discord-compatible channel name
 */
export function normalizeToChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')           // Spaces to hyphens
    .replace(/[^a-z0-9\-_]/g, '')   // Remove special chars except hyphens and underscores
    .replace(/-+/g, '-')            // Multiple hyphens to single hyphen
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
}

/**
 * Format currency value for display
 * @param value - Numeric value to format
 * @param currency - Currency symbol (default: '$')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string = '$'): string {
  return `${currency}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format quantity for display
 * @param quantity - Numeric quantity
 * @returns Formatted quantity string
 */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString('pt-BR');
}

/**
 * Parse item name from various formats
 * @param text - Text potentially containing an item name
 * @returns Extracted item name or null
 */
export function parseItemName(text: string): string | null {
  if (!text) return null;

  // Try to extract item name from common patterns
  const patterns = [
    /(?:depositou|removeu|adicionou|retirou)\s+\d+x?\s+([A-Za-z_\s]+)/i,
    /\d+x?\s+([A-Za-z_\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}
