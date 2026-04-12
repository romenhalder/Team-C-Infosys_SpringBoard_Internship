import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../frontend/src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetReplacement = "import.meta.env.VITE_API_URL || 'http://localhost:8080'";

// Regex to find cases like: const API_URL = 'http://localhost:8080'; or const API = "http://localhost:8080";
const regexConst = /(const\s+(API_URL|API)\s*=\s*)(['"])http:\/\/localhost:8080\3(\s*;?)/g;

let updatedFilesCount = 0;

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content;

    // Replace const API_URL = 'http://localhost:8080'
    newContent = newContent.replace(regexConst, `$1${targetReplacement}$4`);

    // Handle fetch('http://localhost:8080/suppliers') in AddProduct.jsx
    if (newContent.includes("fetch('http://localhost:8080/suppliers')")) {
        // If there's no API_URL defined, let's inject it. Or just direct replace.
        newContent = newContent.replace(
            "fetch('http://localhost:8080/suppliers')", 
            "fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/suppliers`)"
        );
    }
    
    // Handle inline template `http://localhost:8080/uploads/...` in ProductList.jsx
    if (newContent.includes("src={`http://localhost:8080/uploads/${product.imageUrl}`}")) {
        newContent = newContent.replace(
            "src={`http://localhost:8080/uploads/${product.imageUrl}`}",
            "src={`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/uploads/${product.imageUrl}`}"
        );
    }

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Updated: ${filePath}`);
      updatedFilesCount++;
    }
  }
});

console.log(`\nReplacement complete! Updated ${updatedFilesCount} files.`);
