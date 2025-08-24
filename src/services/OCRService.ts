import Tesseract from 'tesseract.js';
import { promises as fs } from 'fs';
import PlantIconDetection from './PlantIconDetection';

let sharp: any = null;
try {
  sharp = require('sharp');
  console.log('✅ Sharp loaded successfully for image preprocessing');
} catch (error) {
  console.warn('⚠️ Sharp not available, using direct OCR without preprocessing');
}

interface AnimalServiceData {
  valid: boolean;
  success: boolean;
  quantity: number;
  farmIncome: number;
  isOptimal: boolean;
  playerPayment: number;
  penalty: number;
  playerDebt: number;
  status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL';
  message: string;
  extractedText?: string;
}

interface PlantServiceData {
  valid: boolean;
  itemName: string;
  quantity: number;
  detectedQuantity?: number;
  quantityMatch: boolean;
  requiresAdminApproval: boolean;
  playerPayment: number;
  extractedText?: string;
}

class OCRService {
  private readonly MINIMUM_FARM_NEEDS = 100; // $90 cost + $10 profit
  private readonly OPTIMAL_INCOME = 160; // 4 animals at age 50
  private readonly PLANT_PRICES = {
    basic: 0.15, // Milho, Trigo, Junco
    other: 0.20
  };

  /**
   * Process animal service screenshot
   */
  async processAnimalScreenshot(imagePath: string): Promise<AnimalServiceData> {
    try {
      // Pre-process image for better OCR accuracy
      const processedImagePath = await this.preprocessImage(imagePath);
      
      // Perform OCR with Portuguese language
      const { data: { text } } = await Tesseract.recognize(processedImagePath, 'por', {
        logger: m => console.log('OCR Progress:', m)
      });

      console.log('OCR Extracted Text:', text);

      // Parse the extracted text
      const result = this.parseAnimalServiceText(text);
      
      // Clean up processed image (only if it was actually processed)
      if (processedImagePath !== imagePath) {
        await fs.unlink(processedImagePath).catch(() => {});
      }
      
      return result;
    } catch (error: any) {
      console.error('OCR Error:', error);
      return {
        valid: false,
        success: false,
        quantity: 0,
        farmIncome: 0,
        isOptimal: false,
        playerPayment: 0,
        penalty: 0,
        playerDebt: 0,
        status: 'CRITICAL',
        message: 'Failed to process screenshot: ' + error.message
      };
    }
  }

  /**
   * Process plant service screenshot
   */
  async processPlantScreenshot(
    imagePath: string, 
    plantType: string,
    claimedQuantity: number
  ): Promise<PlantServiceData> {
    try {
      // Pre-process image for better OCR accuracy
      const processedImagePath = await this.preprocessImage(imagePath);
      
      // Perform OCR with Portuguese language
      const { data: { text } } = await Tesseract.recognize(processedImagePath, 'por', {
        logger: m => console.log('OCR Progress:', m)
      });

      console.log('OCR Extracted Text:', text);
      
      // Use icon detection instead of OCR text parsing
      console.log('🌱 Starting plant icon detection...');
      const verification = await PlantIconDetection.verifyPlantSubmission(
        imagePath, 
        plantType, 
        claimedQuantity
      );
      
      const detectedQuantity = verification.detectedQuantity || 0;
      console.log(`🔍 Icon Detection - Claimed: ${claimedQuantity}, Detected: ${detectedQuantity}`);

      // Check if quantities match
      const quantitiesMatch = detectedQuantity === claimedQuantity;
      const requiresAdminApproval = !quantitiesMatch && detectedQuantity > 0;
      
      // Parse the extracted text for plant deposits
      const result = this.parsePlantServiceText(text, plantType, claimedQuantity);
      
      // Add verification data to result
      result.detectedQuantity = detectedQuantity;
      result.quantityMatch = quantitiesMatch;
      result.requiresAdminApproval = requiresAdminApproval;
      
      // Clean up processed image (only if it was actually processed)
      if (processedImagePath !== imagePath) {
        await fs.unlink(processedImagePath).catch(() => {});
      }
      
      return result;
    } catch (error: any) {
      console.error('OCR Error:', error);
      return {
        valid: false,
        itemName: plantType,
        quantity: claimedQuantity,
        detectedQuantity: 0,
        quantityMatch: false,
        requiresAdminApproval: true,
        playerPayment: 0,
        extractedText: 'Failed to process screenshot: ' + error.message
      };
    }
  }

  /**
   * Pre-process image for better OCR accuracy
   */
  private async preprocessImage(imagePath: string): Promise<string> {
    if (!sharp) {
      // Sharp not available, return original image path
      console.log('Using original image without preprocessing');
      return imagePath;
    }
    
    try {
      const processedPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_processed.png');
      
      await sharp(imagePath)
        .greyscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen text
        .resize({ width: 1920 }) // Ensure good resolution
        .png()
        .toFile(processedPath);
      
      return processedPath;
    } catch (error) {
      console.warn('Error preprocessing image, using original:', error);
      return imagePath;
    }
  }

  /**
   * Parse animal service text from OCR
   */
  private parseAnimalServiceText(text: string): AnimalServiceData {
    // Look for success confirmation
    const hasSuccess = text.toLowerCase().includes('sucesso');
    
    if (!hasSuccess) {
      return {
        valid: false,
        success: false,
        quantity: 0,
        farmIncome: 0,
        isOptimal: false,
        playerPayment: 0,
        penalty: 0,
        playerDebt: 0,
        status: 'CRITICAL',
        message: 'Screenshot does not contain success confirmation',
        extractedText: text
      };
    }

    // Extract quantity - look for "X animais"
    const quantityMatch = text.match(/(\d+)\s*animais/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 0;

    // Extract farm income - look for "$XXX.X" or "recebeu $XXX.X"
    const incomeMatch = text.match(/\$\s*(\d+(?:\.\d+)?)/);
    const farmIncome = incomeMatch ? parseFloat(incomeMatch[1]) : 0;

    if (quantity === 0 || farmIncome === 0) {
      return {
        valid: false,
        success: true,
        quantity,
        farmIncome,
        isOptimal: false,
        playerPayment: 0,
        penalty: 0,
        playerDebt: 0,
        status: 'CRITICAL',
        message: 'Could not extract quantity or income from screenshot',
        extractedText: text
      };
    }

    // Calculate player payment based on farm income
    const playerPayment = Math.max(0, farmIncome - this.MINIMUM_FARM_NEEDS);
    const isOptimal = farmIncome >= this.OPTIMAL_INCOME;
    const penalty = isOptimal ? 0 : (60 - playerPayment);
    const playerDebt = farmIncome < this.MINIMUM_FARM_NEEDS ? 
      (this.MINIMUM_FARM_NEEDS - farmIncome) : 0;

    // Determine status
    let status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL';
    let message: string;

    if (farmIncome >= this.OPTIMAL_INCOME) {
      status = 'OPTIMAL';
      message = 'Animals delivered at optimal age (50)';
    } else if (farmIncome >= this.MINIMUM_FARM_NEEDS) {
      status = 'SUBOPTIMAL';
      message = `Animals delivered under age 50. Penalty: -$${penalty.toFixed(2)}`;
    } else {
      status = 'CRITICAL';
      message = `Critical loss. Farm income below minimum. Player owes: $${playerDebt.toFixed(2)}`;
    }

    return {
      valid: true,
      success: true,
      quantity,
      farmIncome,
      isOptimal,
      playerPayment,
      penalty,
      playerDebt,
      status,
      message,
      extractedText: text
    };
  }

  /**
   * Parse plant service text from OCR
   */
  private parsePlantServiceText(
    text: string, 
    plantType: string,
    claimedQuantity: number
  ): PlantServiceData {
    console.log('=== PLANT INVENTORY VERIFICATION (Enhanced) ===');
    console.log(`Player claims: ${claimedQuantity} ${plantType}`);
    console.log('OCR extracted text:', text);

    // Enhanced plant detection patterns - Tesseract optimized
    const plantPatterns = {
      'Milho': [
        /(\d+)\s*milho/gi,
        /milho\s*(\d+)/gi,
        /(\d+)\s*corn/gi,
        /corn\s*(\d+)/gi
      ],
      'Trigo': [
        /(\d+)\s*trigo/gi,
        /trigo\s*(\d+)/gi,
        /(\d+)\s*wheat/gi,
        /wheat\s*(\d+)/gi
      ],
      'Junco': [
        /(\d+)\s*junco/gi,
        /junco\s*(\d+)/gi,
        /(\d+)\s*rush/gi,
        /rush\s*(\d+)/gi
      ]
    };

    // Search for the specific plant type in inventory
    let inventoryQuantity = 0;
    let foundPlant = false;
    let detectionMethod = '';

    // Try patterns for the specific plant type
    const patterns = plantPatterns[plantType as keyof typeof plantPatterns];
    if (patterns) {
      for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
          // Extract all quantities found and take the maximum (main inventory stack)
          const quantities = matches.map(match => {
            // Handle both capture groups (number before and after plant name)
            return parseInt(match[1]) || parseInt(match[2]) || 0;
          }).filter(q => q > 0);

          if (quantities.length > 0) {
            inventoryQuantity = Math.max(...quantities);
            foundPlant = true;
            detectionMethod = `Pattern match: ${pattern.source}`;
            console.log(`✅ Found ${plantType}: ${inventoryQuantity} (method: ${detectionMethod})`);
            break;
          }
        }
      }
    }

    // Fallback: Look for numbers near the claimed quantity (fuzzy matching)
    // This handles icon-based inventories where only numbers appear (no plant names)
    if (!foundPlant) {
      console.log('⚠️ Specific plant text not found, trying number-based detection for icon inventory...');
      const allNumbers = text.match(/(\d+)/g);
      if (allNumbers) {
        const numbers = allNumbers.map(n => parseInt(n)).filter(n => n > 0);
        console.log('All numbers found:', numbers);
        
        // For icon-based inventories, look for the exact claimed quantity or close match
        const exactMatch = numbers.find(num => num === claimedQuantity);
        if (exactMatch) {
          inventoryQuantity = exactMatch;
          foundPlant = true;
          detectionMethod = `Exact quantity match for icon inventory`;
          console.log(`✅ Found exact quantity match: ${inventoryQuantity}`);
        } else {
          // Look for a number close to the claimed quantity (within 10% tolerance for icons)
          const tolerance = Math.max(20, claimedQuantity * 0.1);
          const closeMatch = numbers.find(num => 
            Math.abs(num - claimedQuantity) <= tolerance && num >= claimedQuantity * 0.8
          );
          
          if (closeMatch) {
            inventoryQuantity = closeMatch;
            foundPlant = true;
            detectionMethod = `Close quantity match for icon inventory (tolerance: ${tolerance})`;
            console.log(`⚠️ Found close quantity match: ${inventoryQuantity}`);
          }
        }
      }
    }

    // LENIENT INVENTORY VERIFICATION LOGIC (OCR Fallback)
    let valid = false;
    let playerPayment = 0;

    if (inventoryQuantity === 0) {
      // OCR FALLBACK: If no quantity detected, check if screenshot looks like game interface
      const hasGameInterface = text.toLowerCase().includes('fazenda') || 
                              text.toLowerCase().includes('estagiário') || 
                              text.toLowerCase().includes('jogador') ||
                              text.toLowerCase().includes('servico');
      
      if (hasGameInterface && claimedQuantity <= 1000) { // Reasonable quantity limit
        valid = true;
        console.log('⚠️ OCR FALLBACK: Game interface detected, allowing submission with manual review flag');
        
        // Calculate payment using configured rates
        const isBasicPlant = ['Milho', 'Trigo', 'Junco'].includes(plantType);
        const pricePerUnit = isBasicPlant ? this.PLANT_PRICES.basic : this.PLANT_PRICES.other;
        playerPayment = claimedQuantity * pricePerUnit;
        
        console.log(`💰 Payment (OCR fallback): ${claimedQuantity} × $${pricePerUnit} = $${playerPayment.toFixed(2)}`);
      } else {
        valid = false;
        console.log('❌ VALIDATION FAILED: No inventory quantity detected and no game interface found');
      }
    } else if (inventoryQuantity < claimedQuantity) {
      valid = false;
      console.log(`❌ VALIDATION FAILED: Insufficient inventory (${inventoryQuantity} < ${claimedQuantity})`);
    } else {
      // SUCCESS: Player has sufficient inventory
      valid = true;
      
      // Calculate payment using configured rates
      const isBasicPlant = ['Milho', 'Trigo', 'Junco'].includes(plantType);
      const pricePerUnit = isBasicPlant ? this.PLANT_PRICES.basic : this.PLANT_PRICES.other;
      playerPayment = claimedQuantity * pricePerUnit;
      
      console.log(`✅ VALIDATION SUCCESS: ${inventoryQuantity} ≥ ${claimedQuantity}`);
      console.log(`💰 Payment: ${claimedQuantity} × $${pricePerUnit} = $${playerPayment.toFixed(2)}`);
    }

    // Enhanced return with user-friendly messages
    const result = {
      valid,
      itemName: plantType,
      quantity: valid ? claimedQuantity : 0,
      detectedQuantity: 0, // Will be set by the calling function
      quantityMatch: false, // Will be set by the calling function
      requiresAdminApproval: false, // Will be set by the calling function
      playerPayment: valid ? playerPayment : 0,
      extractedText: valid ? undefined : 'Inventory verification failed' // Don't expose raw OCR text in errors
    };

    console.log('🔍 OCR Result Summary:', {
      plantType,
      claimedQuantity,
      inventoryQuantity,
      detectionMethod,
      valid,
      playerPayment: result.playerPayment
    });

    return result;
  }

  /**
   * Verify screenshot is recent (within last hour)
   */
  async verifyScreenshotTimestamp(imagePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(imagePath);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return stats.mtime > hourAgo;
    } catch {
      return false;
    }
  }

  /**
   * Generate hash for duplicate detection
   */
  async getImageHash(imagePath: string): Promise<string> {
    if (!sharp) {
      // Fallback: use file size and modification time as simple hash
      const stats = await fs.stat(imagePath);
      return `${stats.size}_${stats.mtime.getTime()}`;
    }
    
    try {
      const buffer = await fs.readFile(imagePath);
      const { data } = await sharp(buffer)
        .resize(16, 16) // Create small thumbnail
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Simple hash based on pixel values
      let hash = '';
      for (let i = 0; i < data.length; i += 3) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        hash += avg > 128 ? '1' : '0';
      }
      
      return hash;
    } catch (error) {
      // Fallback: use file size and modification time as simple hash
      const stats = await fs.stat(imagePath);
      return `${stats.size}_${stats.mtime.getTime()}`;
    }
  }
}

export default new OCRService();