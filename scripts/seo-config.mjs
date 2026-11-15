import { readFile, writeFile } from 'node:fs/promises';
const config = JSON.parse(await readFile('seo/config.json', 'utf8'));
await writeFile('src/seo-config.ts', 'export default ' + JSON.stringify(config, null, 2) + ';\n');
