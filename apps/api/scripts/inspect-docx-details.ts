import * as fs from 'fs';
import * as path from 'path';

const outDir = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted');
const headerRels = path.join(outDir, 'word', '_rels', 'header1.xml.rels');
const footerRels = path.join(outDir, 'word', '_rels', 'footer1.xml.rels');

console.log('--- HEADER RELS ---');
if (fs.existsSync(headerRels)) console.log(fs.readFileSync(headerRels, 'utf8'));

console.log('--- FOOTER RELS ---');
if (fs.existsSync(footerRels)) console.log(fs.readFileSync(footerRels, 'utf8'));

const headerXml = path.join(outDir, 'word', 'header1.xml');
if (fs.existsSync(headerXml)) {
  const content = fs.readFileSync(headerXml, 'utf8');
  console.log('--- HEADER XML RAW (first 1000 chars) ---');
  console.log(content.slice(0, 1000));
}

const footerXml = path.join(outDir, 'word', 'footer1.xml');
if (fs.existsSync(footerXml)) {
  const content = fs.readFileSync(footerXml, 'utf8');
  console.log('--- FOOTER XML RAW (first 1000 chars) ---');
  console.log(content.slice(0, 1000));
}
