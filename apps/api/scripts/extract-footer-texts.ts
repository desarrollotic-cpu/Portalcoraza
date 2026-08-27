import * as fs from 'fs';
import * as path from 'path';

const outDir = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted');
const footerXml = path.join(outDir, 'word', 'footer1.xml');
const content = fs.readFileSync(footerXml, 'utf8');

// Match all <w:t> tags
const texts = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
console.log('All text nodes in footer:');
if (texts) {
  texts.forEach(t => console.log(' -> ' + t.replace(/<[^>]+>/g, '')));
} else {
  console.log('No text nodes found!');
}
