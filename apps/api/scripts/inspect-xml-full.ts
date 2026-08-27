import * as fs from 'fs';
import * as path from 'path';

const outDir = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted');
const headerXml = path.join(outDir, 'word', 'header1.xml');
const footerXml = path.join(outDir, 'word', 'footer1.xml');

console.log('=== FULL HEADER XML ===');
console.log(fs.readFileSync(headerXml, 'utf8'));

console.log('=== FULL FOOTER XML ===');
console.log(fs.readFileSync(footerXml, 'utf8'));
