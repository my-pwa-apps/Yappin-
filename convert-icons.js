// convert-icons.js
// A script to convert SVG logos to PNG icons in different sizes for PWA configuration

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Function to ensure directory exists
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, 'images', 'icons');

// Ensure the icon directory exists
ensureDirExists(iconDir);

// Convert the main logo to different sizes
iconSizes.forEach(size => {
  sharp(path.join(iconDir, 'logo.svg'))
    .resize(size, size)
    .png()
    .toFile(path.join(iconDir, `icon-${size}x${size}.png`))
    .then(() => console.log(`Created icon-${size}x${size}.png`))
    .catch(err => console.error(`Error creating icon-${size}x${size}.png:`, err));
});

// Create favicon.ico (16x16, 32x32, 48x48)
const faviconSizes = [16, 32, 48];

Promise.all(faviconSizes.map(size => {
  return sharp(path.join(iconDir, 'favicon.svg'))
    .resize(size, size)
    .png()
    .toBuffer();
})).then(buffers => {
  // You would typically use a package like 'ico-converter' here to create a multi-size .ico file
  // For simplicity, we'll just create individual PNGs
  buffers.forEach((buffer, index) => {
    const size = faviconSizes[index];
    fs.writeFileSync(path.join(iconDir, `favicon-${size}x${size}.png`), buffer);
    console.log(`Created favicon-${size}x${size}.png`);
  });
}).catch(err => console.error('Error creating favicon:', err));

console.log('Icon generation process completed!');
