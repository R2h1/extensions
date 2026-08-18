const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(ROOT, 'src');
const DIST = path.resolve(ROOT, 'dist');

const ENTRY_POINTS = [
  'background/sw.ts',
  'newtab/newtab.ts',
  'newtab/boot.ts',
];

async function build() {
  console.log('Building 闲页 with esbuild...\n');

  // 每次构建前清空 dist，避免陈旧产物（旧 css/map 等）残留
  fs.rmSync(DIST, { recursive: true, force: true });

  for (const entry of ENTRY_POINTS) {
    const srcPath = path.join(SRC, entry);
    const outPath = path.join(DIST, entry.replace('.ts', '.js'));

    console.log(`  bundling: ${entry}`);

    await esbuild.build({
      entryPoints: [srcPath],
      outfile: outPath,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      minify: true,
    });
  }

  console.log('\n✓ Build complete');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});