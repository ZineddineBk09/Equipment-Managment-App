import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const ICONS_DIR = path.join(process.cwd(), 'public');

// Ensure the public directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Icon sizes configuration
const ICON_SIZES = {
  favicon: [16, 32],
  apple: [57, 72, 114, 180],
  android: [192, 512],
  general: [32, 512]
};

async function generateIcons() {
  try {
    // Load the source image (you need to provide a high-resolution source image)
    const sourceImage = path.join(process.cwd(), 'assets', 'logo.png');
    
    // Generate favicon.ico (multi-size ico file)
    await sharp(sourceImage)
      .resize(32, 32)
      .toFile(path.join(ICONS_DIR, 'favicon.ico'));

    // Generate PNG icons
    for (const size of ICON_SIZES.general) {
      await sharp(sourceImage)
        .resize(size, size)
        .toFile(path.join(ICONS_DIR, `icon-${size}.png`));
    }

    // Generate Apple touch icons
    for (const size of ICON_SIZES.apple) {
      await sharp(sourceImage)
        .resize(size, size)
        .toFile(path.join(ICONS_DIR, `apple-icon-${size}x${size}.png`));
    }

    // Generate Android icons
    for (const size of ICON_SIZES.android) {
      await sharp(sourceImage)
        .resize(size, size)
        .toFile(path.join(ICONS_DIR, `android-chrome-${size}x${size}.png`));
    }

    // Generate Safari pinned tab SVG (black and white version)
    await sharp(sourceImage)
      .resize(512, 512)
      .toFile(path.join(ICONS_DIR, 'safari-pinned-tab.svg'));

    console.log('✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();