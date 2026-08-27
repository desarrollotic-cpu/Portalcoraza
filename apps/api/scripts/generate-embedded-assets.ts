import * as fs from 'fs';
import * as path from 'path';

const mediaDir = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted', 'word', 'media');

const logoB64 = fs.readFileSync(path.join(mediaDir, 'image1.png')).toString('base64');
const iso9001B64 = fs.readFileSync(path.join(mediaDir, 'image3.png')).toString('base64');
const iso45001B64 = fs.readFileSync(path.join(mediaDir, 'image5.jpeg')).toString('base64');
const huellaB64 = fs.readFileSync(path.join(mediaDir, 'image8.png')).toString('base64');
const respSocialB64 = fs.readFileSync(path.join(mediaDir, 'image9.png')).toString('base64');
const bascB64 = fs.readFileSync(path.join(mediaDir, 'image12.png')).toString('base64');

const targetTs = path.join(__dirname, '..', 'src', 'modules', 'associates', 'membrete-assets.ts');

const tsContent = `// Base64 embedded assets for 100% reliable PDF generation matching HOJA MEMBRETE ACTUALIZADA 2025
export const MEMBRETE_LOGO_BASE64 = '${logoB64}';
export const MEMBRETE_ISO9001_BASE64 = '${iso9001B64}';
export const MEMBRETE_ISO45001_BASE64 = '${iso45001B64}';
export const MEMBRETE_HUELLA_BASE64 = '${huellaB64}';
export const MEMBRETE_RESPONSABILIDAD_BASE64 = '${respSocialB64}';
export const MEMBRETE_BASC_BASE64 = '${bascB64}';

export const getMembreteLogoBuffer = () => Buffer.from(MEMBRETE_LOGO_BASE64, 'base64');
export const getMembreteIso9001Buffer = () => Buffer.from(MEMBRETE_ISO9001_BASE64, 'base64');
export const getMembreteIso45001Buffer = () => Buffer.from(MEMBRETE_ISO45001_BASE64, 'base64');
export const getMembreteHuellaBuffer = () => Buffer.from(MEMBRETE_HUELLA_BASE64, 'base64');
export const getMembreteRespSocialBuffer = () => Buffer.from(MEMBRETE_RESPONSABILIDAD_BASE64, 'base64');
export const getMembreteBascBuffer = () => Buffer.from(MEMBRETE_BASC_BASE64, 'base64');
`;

fs.writeFileSync(targetTs, tsContent, 'utf8');
console.log('Successfully updated membrete-assets.ts with all certification buffers!');
