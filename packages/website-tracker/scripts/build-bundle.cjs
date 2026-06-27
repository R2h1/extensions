/**
 * esbuild config for TimeRank extension
 *
 * Bundles TypeScript entry points, resolves @extensions/shared,
 * outputs single files per entry (no bare module specifiers).
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(ROOT, 'src');
const DIST = path.resolve(ROOT, 'dist');

/** Resolve @extensions/shared to its dist directory */
const sharedDist = path.resolve(ROOT, '..', 'shared', 'dist');

const ENTRY_POINTS = [
  'background/service-worker.ts',
  'content/content-script.ts',
  'popup/popup.ts',
  'options/options.ts',
];

async function build() {
  console.log('Building TimeRank with esbuild...\n');

  // Ensure shared package is built
  if (!fs.existsSync(path.join(sharedDist, 'index.js'))) {
    console.error('ERROR: @extensions/shared not built. Run npm run build:shared first.');
    process.exit(1);
  }

  // Build all entry points
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
      // Map @extensions/shared to its compiled output
      alias: {
        '@extensions/shared': sharedDist,
      },
    });
  }

  console.log('\n✓ TypeScript bundled successfully');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});