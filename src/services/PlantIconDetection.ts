import { promises as fs } from 'fs';
import path from 'path';

let sharp: any = null;
try {
  sharp = require('sharp');
  console.log('✅ Sharp loaded successfully for plant detection');
} catch (error: any) {
  console.warn('⚠️ Sharp not available, plant detection disabled:', error?.message || 'Unknown error');
}

interface PlantMatch {
  plantType: string;
  confidence: number;
  quantity: number;
}

class PlantIconDetection {
  private templatesDir = path.join(process.cwd(), 'plant-templates');
  
  constructor() {
    this.initializeTemplates();
  }

  private async initializeTemplates() {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
      await this.saveTemplates();
      console.log('🌱 Plant icon detection initialized');
    } catch (error) {
      console.error('Failed to initialize plant templates:', error);
    }
  }

  private async saveTemplates() {
    // Save the provided plant icons as templates
    const templates = [
      {
        sourcePath: '/mnt/c/Users/jizar/OneDrive/Pictures/Screenshots/Screenshot 2025-08-23 211100.png',
        plantType: 'Milho',
        targetPath: path.join(this.templatesDir, 'milho.png')
      },
      {
        sourcePath: '/mnt/c/Users/jizar/OneDrive/Pictures/Screenshots/Screenshot 2025-08-23 211740.png', 
        plantType: 'Trigo',
        targetPath: path.join(this.templatesDir, 'trigo.png')
      },
      {
        sourcePath: '/mnt/c/Users/jizar/OneDrive/Pictures/Screenshots/Screenshot 2025-08-23 211651.png',
        plantType: 'Junco', 
        targetPath: path.join(this.templatesDir, 'junco.png')
      }
    ];

    for (const template of templates) {
      try {
        // Check if source exists and target doesn't exist
        await fs.access(template.sourcePath);
        
        try {
          await fs.access(template.targetPath);
          console.log(`Template already exists: ${template.plantType}`);
        } catch {
          // Target doesn't exist, copy it
          await sharp(template.sourcePath)
            .resize(64, 64)
            .png()
            .toFile(template.targetPath);
          console.log(`✅ Created template for ${template.plantType}`);
        }
      } catch (error) {
        console.warn(`Source template not found: ${template.sourcePath}`);
      }
    }
  }

  /**
   * Compare two images and return similarity percentage
   */
  private async compareImages(img1Buffer: Buffer, img2Buffer: Buffer): Promise<number> {
    if (!sharp) {
      console.warn('Sharp not available, cannot compare images');
      return 0;
    }
    
    try {
      // Normalize both images to same size and format
      const [processed1, processed2] = await Promise.all([
        sharp(img1Buffer).resize(64, 64).grayscale().raw().toBuffer(),
        sharp(img2Buffer).resize(64, 64).grayscale().raw().toBuffer()
      ]);

      // Calculate pixel similarity
      let totalDifference = 0;
      for (let i = 0; i < processed1.length; i++) {
        totalDifference += Math.abs(processed1[i] - processed2[i]);
      }

      // Convert to percentage similarity
      const maxDifference = processed1.length * 255;
      const similarity = 100 - (totalDifference / maxDifference * 100);
      
      return Math.max(0, similarity);
    } catch (error) {
      console.error('Error comparing images:', error);
      return 0;
    }
  }

  /**
   * Extract quantity from image using OCR
   */
  private async extractQuantityFromRegion(imageBuffer: Buffer): Promise<number> {
    if (!sharp) {
      console.warn('Sharp not available, cannot extract quantity');
      return 0;
    }
    
    try {
      const Tesseract = require('tesseract.js');
      
      // Enhance the image for better OCR
      const enhancedBuffer = await sharp(imageBuffer)
        .resize(200, 200)
        .sharpen()
        .threshold(128)
        .toBuffer();
      
      const { data: { text } } = await Tesseract.recognize(enhancedBuffer, 'eng', {
        logger: () => {} // Suppress OCR logging
      });
      
      // Look for quantity pattern
      const match = text.match(/(\d+)x/i);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Detect plant type and quantity from screenshot (player inventory only - left side)
   */
  async detectPlantFromScreenshot(screenshotPath: string): Promise<PlantMatch | null> {
    if (!sharp) {
      console.warn('Sharp not available, plant detection disabled');
      return null;
    }
    
    try {
      // First, crop to player inventory area (left side of screen)
      const { width, height } = await sharp(screenshotPath).metadata();
      if (!width || !height) {
        throw new Error('Could not get screenshot dimensions');
      }
      
      // Crop to left 40% of screen (player inventory area)
      const playerInventoryWidth = Math.floor(width * 0.4);
      const playerInventoryBuffer = await sharp(screenshotPath)
        .extract({
          left: 0,
          top: 0,
          width: playerInventoryWidth,
          height: height
        })
        .toBuffer();
      
      console.log(`🔍 Cropped to player inventory: ${playerInventoryWidth}x${height} (left 40% of screen)`);
      
      // Load all template images
      const templates = [
        { type: 'Milho', path: path.join(this.templatesDir, 'milho.png') },
        { type: 'Trigo', path: path.join(this.templatesDir, 'trigo.png') },
        { type: 'Junco', path: path.join(this.templatesDir, 'junco.png') }
      ];

      let bestMatch: PlantMatch | null = null;

      for (const template of templates) {
        try {
          const templateBuffer = await fs.readFile(template.path);
          const similarity = await this.compareImages(playerInventoryBuffer, templateBuffer);
          
          console.log(`🔍 ${template.type} similarity: ${similarity.toFixed(1)}% (player inventory only)`);
          
          if (similarity > 70 && (!bestMatch || similarity > bestMatch.confidence)) {
            // Extract quantity from the player inventory region
            const quantity = await this.extractQuantityFromRegion(playerInventoryBuffer);
            
            bestMatch = {
              plantType: template.type,
              confidence: similarity,
              quantity: quantity
            };
          }
        } catch (error) {
          console.warn(`Template not available: ${template.type}`);
        }
      }

      if (bestMatch) {
        console.log(`🌱 Best match: ${bestMatch.plantType} (${bestMatch.confidence.toFixed(1)}%) - Quantity: ${bestMatch.quantity}x`);
      } else {
        console.log('❌ No plant icon detected with sufficient confidence');
      }

      return bestMatch;
    } catch (error) {
      console.error('Error detecting plant from screenshot:', error);
      return null;
    }
  }

  /**
   * Verify if screenshot contains the expected plant and quantity
   */
  async verifyPlantSubmission(
    screenshotPath: string, 
    expectedPlant: string, 
    expectedQuantity: number
  ): Promise<{ 
    plantMatch: boolean; 
    quantityMatch: boolean; 
    detectedPlant?: string; 
    detectedQuantity?: number; 
    confidence?: number 
  }> {
    try {
      const detection = await this.detectPlantFromScreenshot(screenshotPath);
      
      if (!detection) {
        return {
          plantMatch: false,
          quantityMatch: false,
          detectedPlant: undefined,
          detectedQuantity: undefined,
          confidence: 0
        };
      }

      const plantMatch = detection.plantType.toLowerCase() === expectedPlant.toLowerCase();
      const quantityMatch = detection.quantity === expectedQuantity;

      console.log(`🔍 Verification Result:`);
      console.log(`  Expected: ${expectedPlant} x${expectedQuantity}`);
      console.log(`  Detected: ${detection.plantType} x${detection.quantity}`);
      console.log(`  Plant Match: ${plantMatch}`);
      console.log(`  Quantity Match: ${quantityMatch}`);

      return {
        plantMatch,
        quantityMatch,
        detectedPlant: detection.plantType,
        detectedQuantity: detection.quantity,
        confidence: detection.confidence
      };
    } catch (error) {
      console.error('Error verifying plant submission:', error);
      return {
        plantMatch: false,
        quantityMatch: false
      };
    }
  }
}

export default new PlantIconDetection();