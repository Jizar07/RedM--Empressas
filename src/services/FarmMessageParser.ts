/**
 * Unified Farm Message Parser Service
 * Single source of truth for parsing Discord farm messages
 */

export interface ParsedActivity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda' | 'supply_chain';
  categoria?: 'inventario' | 'financeiro' | 'sistema' | 'supply_chain';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess: boolean;
  displayText?: string; // Formatted text for display when parsing fails
  confidence: 'high' | 'medium' | 'low' | 'none';
  // Supply chain specific fields
  supplyChainType?: 'PLANTS_WITHDRAWN' | 'PLANTS_DEPOSITED' | 'PLANTS_RETURNED' | 'BOXES_CREATED' | 'BOXES_WITHDRAWN' | 'BOXES_RETURNED' | 'FERROVIA_MISSION_COMPLETED' | 'REVENUE_COLLECTED' | 'REVENUE_DISTRIBUTED' | 'MONEY_WITHDRAWN_FROM_FERROVIA' | 'MONEY_DEPOSITED_TO_INVENTORY' | 'WORKER_PAYMENT_OWED';
  workerRole?: 'manager' | 'worker';
}

export class FarmMessageParser {
  private static instance: FarmMessageParser;

  // Item name normalization map
  private itemNameMap: Map<string, string> = new Map([
    // Animals
    ['cow_female', 'Vaca'],
    ['cow_male', 'Touro'],
    ['pig_female', 'Porca'],
    ['pig_male', 'Porco'],
    ['chicken_female', 'Galinha'],
    ['chicken_male', 'Galo'],
    ['sheep', 'Ovelha'],
    ['donkey_male', 'Burro'],
    ['donkey_female', 'Mula'],
    // Crops
    ['wheat', 'Trigo'],
    ['corn', 'Milho'],
    ['seed', 'Semente'],
    // Materials
    ['wood', 'Madeira'],
    ['iron', 'Ferro'],
    ['coal', 'Carvão'],
    ['cascalho', 'Cascalho'],
    // Containers
    ['box', 'Caixa'],
    ['caixa', 'Caixa'],
    // Tools
    ['wateringcan', 'Regador'],
    ['bucket', 'Balde'],
  ]);

  private constructor() {}

  public static getInstance(): FarmMessageParser {
    if (!FarmMessageParser.instance) {
      FarmMessageParser.instance = new FarmMessageParser();
    }
    return FarmMessageParser.instance;
  }

  /**
   * Main parsing function - single entry point for all message parsing
   */
  public parseMessage(message: any): ParsedActivity {
    const content = message.content || '';
    const author = this.extractAuthor(message, content);
    
    const base: ParsedActivity = {
      id: message.id || `msg_${Date.now()}`,
      timestamp: message.timestamp || new Date().toISOString(),
      autor: author,
      content: content,
      parseSuccess: false,
      confidence: 'none'
    };

    // Try different parsing strategies in order of specificity
    let parsed = this.parseSupplyChainMessage(content, base);
    if (parsed.parseSuccess) return parsed;

    parsed = this.parseInventoryMessage(content, base);
    if (parsed.parseSuccess) return parsed;

    parsed = this.parseFinancialMessage(content, base);
    if (parsed.parseSuccess) return parsed;

    parsed = this.parseSaleMessage(content, base);
    if (parsed.parseSuccess) return parsed;

    // Fallback - create clean display text
    return this.createFallbackActivity(content, base);
  }

  /**
   * Parse supply chain related messages (Ferrovia operations)
   */
  private parseSupplyChainMessage(content: string, base: ParsedActivity): ParsedActivity {
    // Pattern 1: Plants withdrawn for box making
    const plantsWithdrawnPattern = /retirou\s+(\d+)x?\s*(.+?)\s+do\s+estoque\s+para\s+fazer\s+caixas/i;
    let match = content.match(plantsWithdrawnPattern);
    if (match) {
      const quantity = parseInt(match[1]);
      const itemName = match[2].trim();
      
      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        item: itemName,
        quantidade: quantity,
        supplyChainType: 'PLANTS_WITHDRAWN',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} retirou ${quantity}x ${itemName} para fazer caixas`
      };
    }

    // Pattern 2: Boxes created and added to inventory
    const boxesCreatedPattern = /criou\s+(\d+)x?\s*caixas?\s+e\s+adicionou\s+ao\s+estoque/i;
    match = content.match(boxesCreatedPattern);
    if (match) {
      const quantity = parseInt(match[1]);
      
      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        item: 'Caixa',
        quantidade: quantity,
        supplyChainType: 'BOXES_CREATED',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} criou ${quantity}x caixas`
      };
    }

    // Pattern 3: Boxes withdrawn for Ferrovia mission
    const boxesWithdrawnPattern = /retirou\s+(\d+)x?\s*caixas?\s+para\s+missão\s+ferrovia/i;
    match = content.match(boxesWithdrawnPattern);
    if (match) {
      const quantity = parseInt(match[1]);

      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        item: 'Caixa',
        quantidade: quantity,
        supplyChainType: 'BOXES_WITHDRAWN',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} retirou ${quantity}x caixas para Ferrovia`
      };
    }

    // Pattern 3b: Boxes returned to inventory (unused from Ferrovia)
    const boxesReturnedPatterns = [
      /devolveu\s+(\d+)x?\s*caixas?\s+(?:para\s+o\s+)?(?:estoque|inventário)/i,
      /retornou\s+(\d+)x?\s*caixas?\s+(?:para\s+o\s+)?(?:estoque|inventário)/i,
      /depositou\s+(\d+)x?\s*caixas?\s+(?:de\s+volta\s+)?(?:no\s+)?(?:estoque|inventário)/i,
      /(?:colocou|botou)\s+(\d+)x?\s*caixas?\s+de\s+volta/i,
      /(?:restante|sobrou)\s+(\d+)x?\s*caixas?\s+(?:devolvidas?|retornadas?)/i
    ];

    for (const pattern of boxesReturnedPatterns) {
      match = content.match(pattern);
      if (match) {
        const quantity = parseInt(match[1]);

        return {
          ...base,
          tipo: 'supply_chain',
          categoria: 'supply_chain',
          item: 'Caixa',
          quantidade: quantity,
          supplyChainType: 'BOXES_RETURNED',
          parseSuccess: true,
          confidence: 'high',
          displayText: `${base.autor} devolveu ${quantity}x caixas ao estoque`
        };
      }
    }

    // Pattern 4: Ferrovia mission completed - Multiple variations
    // Pattern 4a: Standard completion message
    const missionCompletedPattern = /completou\s+missão\s+ferrovia\s+com\s+(\d+)x?\s*caixas?/i;
    match = content.match(missionCompletedPattern);

    // Debug logging for mission detection
    console.log(`🚂 DEBUG - Mission completion check for: "${base.autor}"`);
    console.log(`🚂 Content: "${content}"`);
    console.log(`🚂 Standard pattern test: ${missionCompletedPattern.test(content)}`);

    if (match) {
      const quantity = parseInt(match[1]);
      console.log(`✅ MISSION DETECTED: ${base.autor} completed mission with ${quantity} boxes`);

      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        item: 'Caixa',
        quantidade: quantity,
        supplyChainType: 'FERROVIA_MISSION_COMPLETED',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} completou missão Ferrovia com ${quantity}x caixas`
      };
    }

    // Pattern 4b: Alternative mission completion patterns
    const altMissionPatterns = [
      /ferrovia.*concluída.*(\d+).*caixas?/i,
      /missão.*ferrovia.*finalizada.*(\d+)/i,
      /entregou\s+(\d+).*caixas?.*ferrovia/i,
      /ferrovia.*(\d+).*caixas?.*entregues?/i,
      /completou.*ferrovia.*(\d+)/i
    ];

    console.log(`🚂 Testing ${altMissionPatterns.length} alternative mission patterns...`);

    for (const [index, pattern] of altMissionPatterns.entries()) {
      match = content.match(pattern);
      console.log(`🚂 Pattern ${index + 1} (${pattern.source}): ${pattern.test(content) ? 'MATCH' : 'no match'}`);

      if (match) {
        const quantity = parseInt(match[1]);
        console.log(`✅ ALT MISSION DETECTED: ${base.autor} completed mission with ${quantity} boxes (pattern ${index + 1})`);

        return {
          ...base,
          tipo: 'supply_chain',
          categoria: 'supply_chain',
          item: 'Caixa',
          quantidade: quantity,
          supplyChainType: 'FERROVIA_MISSION_COMPLETED',
          parseSuccess: true,
          confidence: 'medium',
          displayText: `${base.autor} completou missão Ferrovia (detectado: ${quantity}x caixas)`
        };
      }
    }

    console.log(`❌ No mission completion patterns matched for ${base.autor}`);

    // Pattern 5: Revenue collected from Ferrovia
    const revenueCollectedPattern = /coletou\s+\$?([\d,\.]+)\s+da\s+ferrovia/i;
    match = content.match(revenueCollectedPattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      
      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        valor: amount,
        supplyChainType: 'REVENUE_COLLECTED',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} coletou $${match[1]} da Ferrovia`
      };
    }

    // Pattern 6: Revenue distributed to farm bank
    const revenueDistributedPattern = /distribuiu\s+\$?([\d,\.]+)\s+para\s+o\s+banco\s+da\s+fazenda/i;
    match = content.match(revenueDistributedPattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));

      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        valor: amount,
        supplyChainType: 'REVENUE_DISTRIBUTED',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} distribuiu $${match[1]} para o banco da fazenda`
      };
    }

    // Pattern 7: Money withdrawn from Ferrovia
    const moneyWithdrawnPattern = /retirou\s+\$?([\d,\.]+)\s+da\s+ferrovia/i;
    match = content.match(moneyWithdrawnPattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));

      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        valor: amount,
        supplyChainType: 'MONEY_WITHDRAWN_FROM_FERROVIA',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} retirou $${match[1]} da Ferrovia`
      };
    }

    // Pattern 8: Money deposited to inventory
    const moneyDepositedPattern = /depositou\s+\$?([\d,\.]+)\s+no\s+(?:estoque|inventário)/i;
    match = content.match(moneyDepositedPattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));

      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        valor: amount,
        supplyChainType: 'MONEY_DEPOSITED_TO_INVENTORY',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} depositou $${match[1]} no estoque`
      };
    }

    // Pattern 9: Worker payment owed (calculated automatically, not from message)
    // This will be used programmatically when calculating payments

    // Pattern 10: Generic supply chain activity mentions with debugging
    if (content.match(/ferrovia|supply.chain|cadeia.de.suprimentos|caixas?.*missão/i)) {
      // Log for debugging what actual Ferrovia messages look like
      console.log(`🔍 FERROVIA MESSAGE DEBUG - Author: ${base.autor}`);
      console.log(`🔍 Full content: "${content}"`);
      console.log(`🔍 Length: ${content.length} chars`);

      return {
        ...base,
        tipo: 'supply_chain',
        categoria: 'supply_chain',
        parseSuccess: false,
        confidence: 'low',
        displayText: `${base.autor}: ${content.substring(0, 100)}...`
      };
    }

    return base;
  }

  /**
   * Parse inventory-related messages (INSERIR/REMOVER ITEM)
   */
  private parseInventoryMessage(content: string, base: ParsedActivity): ParsedActivity {
    // Multiple regex patterns for different message formats
    const patterns = [
      // Format: "INSERIR ITEM ... Item adicionado: X x Y"
      /(?:INSERIR ITEM|inserir item).*?Item adicionado:\s*(.+?)\s*x\s*(\d+)/i,
      // Format: "REMOVER ITEM ... Item removido: X x Y"
      /(?:REMOVER ITEM|remover item).*?Item removido:\s*(.+?)\s*x\s*(\d+)/i,
      // Format: "Item adicionado: X x Y" (without header)
      /Item adicionado:\s*(.+?)\s*x\s*(\d+)/i,
      // Format: "Item removido: X x Y" (without header)
      /Item removido:\s*(.+?)\s*x\s*(\d+)/i,
      // Format: Just "X x Y" with INSERIR/REMOVER context
      /(?:INSERIR|REMOVER).*?([a-zA-Z_]+)\s*x\s*(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const isAdding = content.toLowerCase().includes('inserir') || 
                        content.toLowerCase().includes('adicionado');
        const itemRaw = match[1].trim();
        const quantity = parseInt(match[2]);

        return {
          ...base,
          tipo: isAdding ? 'adicionar' : 'remover',
          categoria: 'inventario',
          item: this.normalizeItemName(itemRaw),
          quantidade: quantity,
          parseSuccess: true,
          confidence: 'high',
          displayText: `${base.autor} ${isAdding ? 'adicionou' : 'removeu'} ${quantity}x ${this.normalizeItemName(itemRaw)}`
        };
      }
    }

    return base;
  }

  /**
   * Parse financial messages (CAIXA ORGANIZAÇÃO)
   */
  private parseFinancialMessage(content: string, base: ParsedActivity): ParsedActivity {
    if (!content.includes('CAIXA ORGANIZAÇÃO') && !content.includes('DEPÓSITO')) {
      return base;
    }

    const valueMatch = content.match(/Valor depositado:\s*\$?([\d,\.]+)/i);
    const actionMatch = content.match(/Ação:\s*([^,\n]+?)(?=Saldo|Data|$)/i);
    
    if (valueMatch) {
      return {
        ...base,
        tipo: 'deposito',
        categoria: 'financeiro',
        valor: parseFloat(valueMatch[1].replace(',', '.')),
        descricao: actionMatch ? actionMatch[1].trim() : 'Depósito',
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} depositou $${valueMatch[1]} - ${actionMatch?.[1] || 'Depósito'}`
      };
    }

    return base;
  }

  /**
   * Parse sale messages (vendeu X animais)
   */
  private parseSaleMessage(content: string, base: ParsedActivity): ParsedActivity {
    const salePattern = /vendeu\s+(\d+)\s+animais?\s+no\s+matadouro/i;
    const match = content.match(salePattern);
    
    if (match) {
      const valueMatch = content.match(/\$?([\d,\.]+)/);
      const animalCount = parseInt(match[1]);
      
      return {
        ...base,
        tipo: 'venda',
        categoria: 'financeiro',
        valor: valueMatch ? parseFloat(valueMatch[1].replace(',', '.')) : undefined,
        descricao: `Vendeu ${animalCount} animal(is) no matadouro`,
        parseSuccess: true,
        confidence: 'high',
        displayText: `${base.autor} vendeu ${animalCount} animal(is) ${valueMatch ? `por $${valueMatch[1]}` : ''}`
      };
    }

    return base;
  }

  /**
   * Create clean fallback display when parsing fails
   */
  private createFallbackActivity(content: string, base: ParsedActivity): ParsedActivity {
    // Try to extract key information even if full parsing fails
    let displayText = content;
    
    // Clean up Discord formatting
    displayText = displayText
      .replace(/```[a-z]*\n?/g, '') // Remove code blocks
      .replace(/\*\*/g, '') // Remove bold
      .replace(/__/g, '') // Remove underline
      .replace(/~~~/g, '') // Remove strikethrough
      .replace(/\n{2,}/g, '\n') // Reduce multiple newlines
      .trim();

    // If message is too long, truncate intelligently
    if (displayText.length > 150) {
      // Try to find a good cut point
      const cutPoint = displayText.indexOf('\n', 100);
      if (cutPoint > 0 && cutPoint < 150) {
        displayText = displayText.substring(0, cutPoint) + '...';
      } else {
        displayText = displayText.substring(0, 150) + '...';
      }
    }

    // Try to guess category based on keywords
    let categoria: ParsedActivity['categoria'] = 'sistema';
    let confidence: ParsedActivity['confidence'] = 'low';

    if (content.match(/item|inventario|adicionar|remover/i)) {
      categoria = 'inventario';
      confidence = 'medium';
    } else if (content.match(/\$|dinheiro|deposito|valor|vend/i)) {
      categoria = 'financeiro';
      confidence = 'medium';
    }

    return {
      ...base,
      categoria,
      parseSuccess: false,
      confidence,
      displayText: `${base.autor}: ${displayText}`
    };
  }

  /**
   * Extract author from message and content
   */
  private extractAuthor(message: any, content: string): string {
    // Priority 1: Worker name from content (most accurate)
    const workerMatch = content.match(/Autor:\s*([^,\n]+)/i);
    if (workerMatch) {
      const worker = workerMatch[1].trim();
      if (worker && worker !== 'Unknown' && worker.length > 0) {
        return worker;
      }
    }

    // Priority 2: Message author field
    if (message.author && message.author !== 'Unknown') {
      return message.author;
    }

    // Priority 3: Try to extract from other patterns
    const altAuthorMatch = content.match(/^([A-Za-z\s]+?)(?:vendeu|adicionou|removeu|depositou)/i);
    if (altAuthorMatch) {
      return altAuthorMatch[1].trim();
    }

    return 'Sistema';
  }

  /**
   * Normalize item names for consistent display
   */
  private normalizeItemName(rawName: string): string {
    if (!rawName) return 'Item';

    // Check map for known items
    const normalized = this.itemNameMap.get(rawName.toLowerCase());
    if (normalized) return normalized;

    // Check for partial matches
    for (const [key, value] of this.itemNameMap) {
      if (rawName.toLowerCase().includes(key)) {
        return value;
      }
    }

    // Default normalization
    return rawName
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get icon suggestion based on parsed activity
   */
  public getActivityIcon(activity: ParsedActivity): string {
    if (!activity.parseSuccess) return '❓';

    if (activity.categoria === 'financeiro') {
      if (activity.tipo === 'deposito') return '💰';
      if (activity.tipo === 'saque') return '💸';
      if (activity.tipo === 'venda') return '🏪';
      return '💵';
    }

    if (activity.categoria === 'inventario' && activity.item) {
      const itemLower = activity.item.toLowerCase();
      
      // Animals
      if (itemLower.includes('vaca') || itemLower.includes('cow')) return '🐄';
      if (itemLower.includes('touro') || itemLower.includes('bull')) return '🐂';
      if (itemLower.includes('porco') || itemLower.includes('pig')) return '🐷';
      if (itemLower.includes('galinha') || itemLower.includes('chicken')) return '🐔';
      if (itemLower.includes('galo') || itemLower.includes('rooster')) return '🐓';
      if (itemLower.includes('ovelha') || itemLower.includes('sheep')) return '🐑';
      if (itemLower.includes('burro') || itemLower.includes('donkey')) return '🫏';
      
      // Crops
      if (itemLower.includes('trigo') || itemLower.includes('wheat')) return '🌾';
      if (itemLower.includes('milho') || itemLower.includes('corn')) return '🌽';
      if (itemLower.includes('semente') || itemLower.includes('seed')) return '🌱';
      
      // Materials
      if (itemLower.includes('madeira') || itemLower.includes('wood')) return '🪵';
      if (itemLower.includes('caixa') || itemLower.includes('box')) return '📦';
      if (itemLower.includes('ferro') || itemLower.includes('iron')) return '⚙️';
      if (itemLower.includes('carvão') || itemLower.includes('coal')) return '⚫';
      if (itemLower.includes('cascalho')) return '🪨';
      
      // Tools
      if (itemLower.includes('regador') || itemLower.includes('watering')) return '🪣';
      if (itemLower.includes('balde') || itemLower.includes('bucket')) return '🪣';
    }

    // Supply chain specific icons
    if (activity.categoria === 'supply_chain') {
      if (activity.supplyChainType === 'PLANTS_WITHDRAWN') return '🌱';
      if (activity.supplyChainType === 'PLANTS_DEPOSITED') return '🌾';
      if (activity.supplyChainType === 'PLANTS_RETURNED') return '🔄';
      if (activity.supplyChainType === 'BOXES_CREATED') return '📦';
      if (activity.supplyChainType === 'BOXES_WITHDRAWN') return '🚚';
      if (activity.supplyChainType === 'BOXES_RETURNED') return '↩️';
      if (activity.supplyChainType === 'FERROVIA_MISSION_COMPLETED') return '🚂';
      if (activity.supplyChainType === 'REVENUE_COLLECTED') return '💰';
      if (activity.supplyChainType === 'REVENUE_DISTRIBUTED') return '🏦';
      if (activity.supplyChainType === 'MONEY_WITHDRAWN_FROM_FERROVIA') return '💸';
      if (activity.supplyChainType === 'MONEY_DEPOSITED_TO_INVENTORY') return '💳';
      if (activity.supplyChainType === 'WORKER_PAYMENT_OWED') return '💵';
      return '🔗';
    }

    // Default icons based on action
    if (activity.tipo === 'adicionar') return '➕';
    if (activity.tipo === 'remover') return '➖';
    
    return '📋';
  }
}

export default FarmMessageParser.getInstance();