import * as fs from 'fs';
import * as path from 'path';

const dir = path.join(__dirname, '..', 'assets', 'membrete');
const files = fs.readdirSync(dir);

for (const f of files) {
  console.log(`- ${f} (${fs.statSync(path.join(dir, f)).size} bytes)`);
}
