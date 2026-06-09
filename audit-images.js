const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const products = [
  { id: "havic-gamepad", name: "HAVIT HV-G92 Gamepad", image: "/assets/products/havit-hv-g92-gamepad.jpg" },
  { id: "ak-keyboard", name: "AK-900 Wired Keyboard", image: "/assets/products/ak-900-keyboard.jpg" },
  { id: "ips-monitor", name: "IPS LCD Gaming Monitor", image: "/assets/products/ips-monitor.jpg" },
  { id: "comfort-chair", name: "S-Series Comfort Chair", image: "/assets/products/comfort-chair.jpg" },
  { id: "north-coat", name: "The North Coat", image: "/assets/products/north-coat.jpg" },
  { id: "gucci-bag", name: "Gucci Duffle Bag", image: "/assets/products/gucci-bag.jpg" },
  { id: "rgb-cooler", name: "RGB Liquid CPU Cooler", image: "/assets/products/rgb-cooler.jpg" },
  { id: "bookshelf", name: "Small BookShelf", image: "/assets/products/bookshelf.jpg" },
  { id: "breed-dog-food", name: "Breed Dry Dog Food", image: "/assets/products/breed-dog-food.jpg" },
  { id: "canon-camera", name: "CANON EOS DSLR Camera", image: "/assets/products/canon-camera.jpg" },
  { id: "gaming-laptop", name: "ASUS FHD Gaming Laptop", image: "/assets/products/gaming-laptop.jpg" },
  { id: "curology-set", name: "Curology Product Set", image: "/assets/products/curology-set.jpg" },
  { id: "kids-car", name: "Kids Electric Car", image: "/assets/products/kids-car.jpg" },
  { id: "soccer-cleats", name: "Jr. Zoom Soccer Cleats", image: "/assets/products/soccer-cleats.jpg" },
  { id: "gamepad-black", name: "GP11 Shooter USB Gamepad", image: "/assets/products/gamepad-black.jpg" },
  { id: "satin-jacket", name: "Quilted Satin Jacket", image: "/assets/products/satin-jacket.jpg" }
];

const baseDir = path.join(__dirname, 'frontend', 'public');

console.log('Product Image Audit');
console.log('===================');
console.log(`| Product Name | Image Path | Dimensions | File Size |`);
console.log(`|--------------|------------|------------|-----------|`);

for (const product of products) {
  const imagePath = path.join(baseDir, product.image);
  let dimensions = 'N/A';
  let fileSize = 'N/A';

  try {
    const stats = fs.statSync(imagePath);
    fileSize = `${(stats.size / 1024).toFixed(2)} KB`;

    // Try to get dimensions using identify (ImageMagick)
    try {
      const output = execSync(`identify -format "%wx%h" "${imagePath}"`).toString().trim();
      dimensions = output;
    } catch (identifyError) {
      // If identify fails, try to get dimensions from the file using a different method?
      // We'll leave as N/A
      dimensions = 'Identify not available or failed';
    }
  } catch (error) {
    fileSize = 'File not found';
    dimensions = 'File not found';
  }

  console.log(`| ${product.name} | ${product.image} | ${dimensions} | ${fileSize} |`);
}

console.log('\nNote: Run this script from the root of the ecommerce project.');
console.log('Make sure ImageMagick is installed for dimension reporting.');