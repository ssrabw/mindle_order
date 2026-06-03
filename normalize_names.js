import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directoryPath = path.join(__dirname, 'public', 'Products');

try {
  const files = fs.readdirSync(directoryPath);
  let count = 0;
  
  files.forEach((file) => {
    const nfcName = file.normalize('NFC');
    if (file !== nfcName) {
      const oldPath = path.join(directoryPath, file);
      const newPath = path.join(directoryPath, nfcName);
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed: "${file}" -> "${nfcName}"`);
      count++;
    }
  });
  
  console.log(`Done! Normalized ${count} files to NFC.`);
} catch (err) {
  console.error('Error normalizing filenames:', err);
}
