import sharp from 'sharp';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const ICONS_DIR = join(process.cwd(), 'public');

// Type definitions
interface IconSizes {
  favicon: number[];
  apple: number[];
  android: number[];
  general: number[];
}

// Ensure the public directory exists
if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

// Icon sizes configuration
const ICON_SIZES: IconSizes = {
  favicon: [16, 32],
  apple: [57, 72, 114, 180],
  android: [192, 512],
  general: [32, 512]
};

async function generateIcons(): Promise<void> {
  try {
    const sourceImage = join(process.cwd(), 'assets', 'logo.png');
    
    // Check if source image exists
    if (!existsSync(sourceImage)) {
      throw new Error('Source image not found! Please add logo.png to the assets folder.');
    }

    // Generate favicon.ico
    await sharp(sourceImage)
      .resize(32, 32)
      .toFile(join(ICONS_DIR, 'favicon.ico'));

    // Generate PNG icons
    for (const size of ICON_SIZES.general) {
      await sharp(sourceImage)
        .resize(size, size)
        .toFile(join(ICONS_DIR, `icon-${size}.png`));
    }

    // Generate Apple touch icons
    for (const size of ICON_SIZES.apple) {
      await sharp(sourceImage)
        .resize(size, size)
        .toFile(join(ICONS_DIR, `apple-icon-${size}x${size}.png`));
    }

    // Generate Android icons
    for (const size of ICON_SIZES.android) {
      await sharp(sourceImage)
        .resize(size, size)
        .toFile(join(ICONS_DIR, `android-chrome-${size}x${size}.png`));
    }

    // Generate Safari pinned tab SVG
    await sharp(sourceImage)
      .resize(512, 512)
      .toFile(join(ICONS_DIR, 'safari-pinned-tab.svg'));

    console.log('✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();