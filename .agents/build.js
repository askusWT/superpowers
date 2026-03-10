import { chmodSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SHEBANG = [
    '#!/bin/sh',
    '// 2>/dev/null; exec "$(command -v bun 2>/dev/null || echo node)" "$0" "$@"',
].join('\n');

const finalPath = join(__dirname, 'superpowers-agent');
const finalCode = [
    SHEBANG,
    "import './src/cli.js';",
    '',
].join('\n');

try {
    writeFileSync(finalPath, finalCode);
    chmodSync(finalPath, 0o755);

    console.log('✅ Build complete!');
    console.log(`   Output: ${finalPath}`);
    console.log('   Mode: source launcher');
} catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
}
