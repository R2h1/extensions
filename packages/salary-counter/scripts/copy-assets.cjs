/**
 * 复制静态资源到 dist/
 *
 * 只复制非 .ts 文件（html, json, css, png 等）
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const DIST = path.resolve(__dirname, '..', 'dist');

function copy(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copy(srcPath, destPath);
    } else if (stat.isFile()) {
      if (!entry.endsWith('.ts') && !entry.endsWith('.ts.map')) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  copied: ${entry}`);
      }
    }
  }
}

console.log('Copying static assets...');
copy(SRC, DIST);
console.log('Done.');