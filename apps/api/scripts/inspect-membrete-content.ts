import * as fs from 'fs';
import * as path from 'path';

const mediaDir = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted', 'word', 'media');
const files = fs.readdirSync(mediaDir);

for (const f of files) {
  const stat = fs.statSync(path.join(mediaDir, f));
  console.log(`Media: ${f}, Size: ${stat.size} bytes`);
}

const header1 = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted', 'word', 'header1.xml');
if (fs.existsSync(header1)) {
  const content = fs.readFileSync(header1, 'utf8');
  console.log('Header text stripped:', content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

const footer1 = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted', 'word', 'footer1.xml');
if (fs.existsSync(footer1)) {
  const content = fs.readFileSync(footer1, 'utf8');
  console.log('Footer text stripped:', content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

const docXml = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted', 'word', 'document.xml');
if (fs.existsSync(docXml)) {
  const content = fs.readFileSync(docXml, 'utf8');
  console.log('Doc text stripped:', content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300));
}
