import * as fs from 'fs';
import * as path from 'path';

// docx is a zip file, let's inspect with standard node or jszip / unzipper if available, or we can use adm-zip / child_process powershell Expand-Archive
import { execSync } from 'child_process';

const docxPath = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'HOJA MEMBRETE ACTUALIZADA 2025.docx');
const outDir = path.join(__dirname, '..', '..', '..', 'MENBRETE', 'extracted');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Docx path:', docxPath);

try {
  // Use PowerShell Expand-Archive
  const psCmd = `powershell -Command "Expand-Archive -Path '${docxPath}' -DestinationPath '${outDir}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  console.log('Extracted docx successfully to:', outDir);

  const mediaDir = path.join(outDir, 'word', 'media');
  if (fs.existsSync(mediaDir)) {
    const files = fs.readdirSync(mediaDir);
    console.log('Media files found in docx:', files);
  }
} catch (e: any) {
  console.error('Error extracting docx:', e.message);
}
