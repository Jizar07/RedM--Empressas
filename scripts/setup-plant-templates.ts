import PlantDetectionService from '../src/services/PlantDetectionService';

async function setupTemplates() {
  console.log('🌱 Setting up plant detection templates...');
  
  // Save the templates you provided
  const templates = [
    { 
      path: '/mnt/c/Users/jizar/OneDrive/Pictures/Screenshots/Screenshot 2025-08-23 211100.png',
      type: 'Milho'
    },
    {
      path: '/mnt/c/Users/jizar/OneDrive/Pictures/Screenshots/Screenshot 2025-08-23 211740.png',
      type: 'Trigo'
    },
    {
      path: '/mnt/c/Users/jizar/OneDrive/Pictures/Screenshots/Screenshot 2025-08-23 211651.png',
      type: 'Junco'
    }
  ];

  for (const template of templates) {
    await PlantDetectionService.saveTemplate(template.path, template.type);
    console.log(`✅ Saved ${template.type} template`);
  }

  console.log('🎉 All templates saved successfully!');
}

setupTemplates().catch(console.error);