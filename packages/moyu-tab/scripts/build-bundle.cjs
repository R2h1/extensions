const esbuild = require('esbuild');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(ROOT, 'src');
const DIST = path.resolve(ROOT, 'dist');

const ENTRY_POINTS = [
  'background/sw.ts',
  'newtab/newtab.ts',
  'options/options.ts',
];

async function build() {
  console.log('Building 工位搭子 with esbuild...\n');

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
    });
  }

  console.log('\n✓ Build complete');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});