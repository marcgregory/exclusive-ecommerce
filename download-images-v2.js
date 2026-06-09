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

const baseDir = path.join(__dirname, 'frontend', 'public', 'assets', 'products');

console.log('Starting image download from Unsplash source...');

for (const [productId, searchTerm] of Object.entries(productSearchTerms)) {
  const filePath = path.join(baseDir, `${productId}.jpg`);
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