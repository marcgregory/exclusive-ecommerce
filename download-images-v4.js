const https = require('https');
const fs = require('fs');
const path = require('path');

// Map of product IDs to image URLs (from Unsplash, free to use)
const imageMap = {
  "havic-gamepad": "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800", // Gamepad
  "ak-keyboard": "https://images.unsplash.com/photo-1587829581745-5814f8065f02?w=800", // Keyboard
  "ips-monitor": "https://images.unsplash.com/photo-1526401135550-6cdf3ef947fd?w=800", // Monitor
  "comfort-chair": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800", // Chair
  "north-coat": "https://images.unsplash.com/photo-1544966503-7cc9ac928d5c?w=800", // Coat
  "gucci-bag": "https://images.unsplash.com/photo-1584917865442-de7c34665f60?w=800", // Bag
  "rgb-cooler": "https://images.unsplash.com/photo-1602088113235-229c19f537db?w=800", // CPU Cooler
  "bookshelf": "https://images.unsplash.com/photo-1586929704717-ff4a1d6af5f3?w=800", // Bookshelf
  "breed-dog-food": "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800", // Dog Food
  "canon-camera": "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800", // DSLR Camera
  "gaming-laptop": "https://images.unsplash.com/photo-1603302576837-375c7b4fca74?w=800", // Gaming Laptop
  "curology-set": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800", // Skincare Set
  "kids-car": "https://images.unsplash.com/photo-1586350327732-63b8f0f0f8f0?w=800", // Kids Car
  "soccer-cleats": "https://images.unsplash.com/photo-1596326774405-64b6b6a2a9a2?w=800", // Soccer Cleats
  "gamepad-black": "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800", // Gamepad (black)
  "satin-jacket": "https://images.unsplash.com/photo-1591047239804-b2c6b2e1a8d3?w=800" // Satin Jacket
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

console.log('Starting image download from direct Unsplash URLs...');

for (const [productId, url] of Object.entries(imageMap)) {
  const filename = filenameMap[productId];
  const filePath = path.join(baseDir, filename);

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

console.log('Download complete. Please verify the images.');