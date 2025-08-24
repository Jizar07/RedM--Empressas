import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
// import crypto from 'crypto';

interface PlantDetectionResult {
  plantType: string | null;
  quantity: number;
  confidence: number;
}

class PlantDetectionService {
  // private templateHashes: Map<string, string> = new Map();
  private templatesPath = path.join(process.cwd(), 'plant-templates');
  
  constructor() {
    this.initializeTemplates();
  }

  private async initializeTemplates() {
    try {
      // Create templates directory if it doesn't exist
      await fs.mkdir(this.templatesPath, { recursive: true });
      
      console.log('🌱 Plant detection service initialized');
    } catch (error) {
      console.error('Failed to initialize plant templates:', error);
    }
  }

  /**
   * Generate perceptual hash for an image region
   */
  // private async generateImageHash(imagePath: string): Promise<string> {
  //   try {
  //     // Resize to standard size and convert to grayscale for comparison
  //     const buffer = await sharp(imagePath)
  //       .resize(32, 32, { fit: 'fill' })
  //       .grayscale()
  //       .raw()
  //       .toBuffer();
  //     
  //     // Generate hash from pixel data
  //     return crypto.createHash('md5').update(buffer).digest('hex');
  //   } catch (error) {
  //     console.error('Error generating image hash:', error);
  //     return '';
  //   }
  // }

  /**
   * Compare image similarity using structural similarity
   */
  private async compareImages(img1Path: string, img2Path: string): Promise<number> {
    try {
      // Load and normalize both images
      const [img1, img2] = await Promise.all([
        sharp(img1Path).resize(64, 64).grayscale().raw().toBuffer(),
        sharp(img2Path).resize(64, 64).grayscale().raw().toBuffer()
      ]);

      // Calculate pixel-by-pixel similarity
      let similarity = 0;
      for (let i = 0; i < img1.length; i++) {
        similarity += 1 - Math.abs(img1[i] - img2[i]) / 255;
      }
      
      return (similarity / img1.length) * 100; // Return percentage
    } catch (error) {
      console.error('Error comparing images:', error);
      return 0;
    }
  }

  /**
   * Detect plant type from screenshot region
   */
  async detectPlantType(screenshotPath: string, cropRegion?: { x: number, y: number, width: number, height: number }): Promise<string | null> {
    try {
      let processedImage = screenshotPath;
      
      // If crop region provided, extract that area
      if (cropRegion) {
        const croppedPath = path.join(this.templatesPath, `temp_crop_${Date.now()}.png`);
        // await sharp(screenshotPath)
        //   .extract(cropRegion)
        //   .toFile(croppedPath);
        processedImage = croppedPath;
      }

      // Try to match against known templates
      const templates = [
        { name: 'Milho', path: path.join(this.templatesPath, 'milho.png') },
        { name: 'Trigo', path: path.join(this.templatesPath, 'trigo.png') },
        { name: 'Junco', path: path.join(this.templatesPath, 'junco.png') }
      ];

      let bestMatch = { name: null as string | null, confidence: 0 };

      for (const template of templates) {
        // Check if template exists
        try {
          await fs.access(template.path);
          const similarity = await this.compareImages(processedImage, template.path);
          
          if (similarity > bestMatch.confidence) {
            bestMatch = { name: template.name, confidence: similarity };
          }
        } catch {
          console.warn(`Template not found: ${template.path}`);
        }
      }

      // Clean up temporary file
      if (cropRegion && processedImage !== screenshotPath) {
        await fs.unlink(processedImage).catch(() => {});
      }

      // Return match if confidence is above threshold (70%)
      return bestMatch.confidence > 70 ? bestMatch.name : null;
      
    } catch (error) {
      console.error('Error detecting plant type:', error);
      return null;
    }
  }

  /**
   * Save template images for future matching
   */
  async saveTemplate(imagePath: string, plantType: string): Promise<void> {
    try {
      const templatePath = path.join(this.templatesPath, `${plantType.toLowerCase()}.png`);
      
      // Process and save template
      await sharp(imagePath)
        .resize(64, 64)
        .toFile(templatePath);
      
      console.log(`✅ Saved template for ${plantType}`);
    } catch (error) {
      console.error(`Failed to save template for ${plantType}:`, error);
    }
  }

  /**
   * Extract quantity from screenshot using OCR region
   */
  async extractQuantity(screenshotPath: string): Promise<number> {
    try {
      const Tesseract = require('tesseract.js');
      
      // Preprocess for better OCR
      const processedPath = path.join(this.templatesPath, `temp_ocr_${Date.now()}.png`);
      await sharp(screenshotPath)
        .grayscale()
        .threshold(128)
        .toFile(processedPath);
      
      // Run OCR
      const { data: { text } } = await Tesseract.recognize(processedPath, 'eng');
      
      // Clean up
      await fs.unlink(processedPath).catch(() => {});
      
      // Extract number followed by 'x'
      const match = text.match(/(\d+)x/i);
      return match ? parseInt(match[1]) : 0;
      
    } catch (error) {
      console.error('Error extracting quantity:', error);
      return 0;
    }
  }

  /**
   * Process full farm screenshot
   */
  async processFarmScreenshot(screenshotPath: string): Promise<PlantDetectionResult> {
    try {
      // First extract quantity
      const quantity = await this.extractQuantity(screenshotPath);
      
      // Then try to detect plant type
      const plantType = await this.detectPlantType(screenshotPath);
      
      return {
        plantType,
        quantity,
        confidence: plantType ? 100 : 0
      };
      
    } catch (error) {
      console.error('Error processing farm screenshot:', error);
      return {
        plantType: null,
        quantity: 0,
        confidence: 0
      };
    }
  }
}

export default new PlantDetectionService();