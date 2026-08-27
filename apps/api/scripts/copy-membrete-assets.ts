import * as fs from 'fs';
import * as path from 'path';

const mediaDir = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted', 'word', 'media');
const targetWeb = path.join(__dirname, '..', '..', 'web', 'public', 'brand', 'membrete');
const targetApi = path.join(__dirname, '..', 'assets', 'membrete');

fs.mkdirSync(targetWeb, { recursive: true });
fs.mkdirSync(targetApi, { recursive: true });

const files = fs.readdirSync(mediaDir);
for (const f of files) {
  const src = path.join(mediaDir, f);
  fs.copyFileSync(src, path.join(targetWeb, f));
  fs.copyFileSync(src, path.join(targetApi, f));
}

console.log('Copied all membrete images to web/public/brand/membrete and api/assets/membrete');
