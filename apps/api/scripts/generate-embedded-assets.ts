import * as fs from 'fs';
import * as path from 'path';

const logoPath = path.join(__dirname, '..', 'assets', 'membrete', 'image1.png');
const isoPath = path.join(__dirname, '..', 'assets', 'membrete', 'image3.png');
const huellaPath = path.join(__dirname, '..', 'assets', 'membrete', 'image8.png');

const logoB64 = fs.readFileSync(logoPath).toString('base64');
const isoB64 = fs.readFileSync(isoPath).toString('base64');
const huellaB64 = fs.readFileSync(huellaPath).toString('base64');

const targetTs = path.join(__dirname, '..', 'src', 'modules', 'associates', 'membrete-assets.ts');

const tsContent = `// Base64 embedded assets for 100% reliable PDF generation on any server/container
export const MEMBRETE_LOGO_BASE64 = '${logoB64}';
export const MEMBRETE_ISO_BASE64 = '${isoB64}';
export const MEMBRETE_HUELLA_BASE64 = '${huellaB64}';

export const getMembreteLogoBuffer = () => Buffer.from(MEMBRETE_LOGO_BASE64, 'base64');
export const getMembreteIsoBuffer = () => Buffer.from(MEMBRETE_ISO_BASE64, 'base64');
export const getMembreteHuellaBuffer = () => Buffer.from(MEMBRETE_HUELLA_BASE64, 'base64');
`;

fs.writeFileSync(targetTs, tsContent, 'utf8');
console.log('Successfully generated membrete-assets.ts with embedded buffers!');
