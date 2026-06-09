const https = require('https');
const fs = require('fs');
const path = require('path');

// Map of product IDs to search terms for Unsplash source
const productSearchTerms = {
  "havic-gamepad": "gamepad",
  "ak-keyboard": "keyboard",
  "ips-monitor": "computer monitor",
  "comfort-chair": "arm chair",
  "north-coat": "winter coat",
  "gucci-bag": "duffel bag",
  "rgb-cooler": "CPU cooler",
  "bookshelf": "bookshelf",
  "breed-dog-food": "dog food",
  "canon-camera": "DSLR camera",
  "gaming-laptop": "gaming laptop",
  "curology-set": "skincare set",
  "kids-car": "kids ride on car",
  "soccer-cleats": "soccer cleats",
  "gamepad-black": "black gamepad",
  "satin-jacket": "satin jacket"
};

// Map of product IDs to correct filenames
const filenameMap = {
  "havic-gamepad": "havit-hv-g92-gamepad.jpg",
  "ak-keyboard": "ak-900-keyboard.jpg",
  "ips-monitor": "ips-monitor.jpg",
  "comfort-chair": "comfort-chair.jpg",
  "north-coat": "north-coat.jpg",
  "gucci-bag": "gucci-bag.jpg",
  "rgb-cooler": "rgb-cooler.jpg",
  "bookshelf": "bookshelf.jpg",
  "breed-dog-food": "breed-dog-food.jpg",
  "canon-camera": "canon-camera.jpg",
  "gaming-laptop": "gaming-laptop.jpg",
  "curology-set": "curology-set.jpg",
  "kids-car": "kids-car.jpg",
  "soccer-cleats": "soccer-cleats.jpg",
  "gamepad-black": "gamepad-black.jpg",
  "satin-jacket": "satin-jacket.jpg"
};

const baseDir = path.join(__dirname, 'frontend', 'public', 'assets', 'products');

console.log('Starting image download from Unsplash source with correct filenames...');

for (const [productId, searchTerm] of Object.entries(productSearchTerms)) {
  const filename = filenameMap[productId];
  const filePath = path.join(baseDir, filename);
  const url = `https://source.unsplash.com/800x600/?${encodeURIComponent(searchTerm)}`;

  // Ensure the directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const file = fs.createWriteStream(filePath);
  https.get(url, (response) => {
    // Check if the response is an image
    if (response.statusCode !== 200 || !response.headers['content-type']?.startsWith('image/')) {
      console.error(`Invalid response for ${productId}: status=${response.statusCode}, content-type=${response.headers['content-type']}`);
      response.resume(); // consume the response to free up memory
      file.close();
      fs.unlink(filePath, () => {}); // delete the file
      return;
    }

    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log(`Downloaded image for ${productId} to ${filePath}`);
      });
    });
  }).on('error', (err) => {
    console.error(`Error downloading image for ${productId}: ${err.message}`);
    file.close();
    fs.unlink(filePath, () => {}); // delete the file
  });
}

console.log('Download complete.');