import { FirmConfig } from '@/types/firms';

/**
 * Get the appropriate emoji for a firm based on its configuration
 * @param firm - The firm configuration object
 * @returns The emoji string to display
 */
export function getFirmEmoji(firm: FirmConfig): string {
  // If firm has explicit emoji field, use it
  if (firm.emoji) {
    return firm.emoji;
  }

  // Map based on firm ID or name (case-insensitive)
  const firmId = firm.id.toLowerCase();
  const firmName = firm.name.toLowerCase();

  // Check ID first (more reliable)
  if (firmId.includes('fazenda')) return '🌾';
  if (firmId === 'ferrovia') return '🚂';
  if (firmId === 'bercario') return '🐣';
  if (firmId === 'veterinaria') return '🏥';
  if (firmId === 'armaria') return '🏪';

  // Fallback to name-based matching
  if (firmName.includes('fazenda')) return '🌾';
  if (firmName.includes('ferrovia')) return '🚂';
  if (firmName.includes('berç') || firmName.includes('berc')) return '🐣';
  if (firmName.includes('veterin')) return '🏥';
  if (firmName.includes('armar')) return '🏪';

  // Default fallback
  return '🏢';
}
