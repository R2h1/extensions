/**
 * Pack a built extension's dist/ as a .zip file
 *
 * Usage: node scripts/pack-zip.cjs <package-name>
 * Example: node scripts/pack-zip.cjs website-tracker
 *
 * Output: releases/<package-name>-v<version>.zip
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGES = path.resolve(ROOT, 'packages');

const pkgName = process.argv[2];
if (!pkgName) {
  console.error('Usage: node scripts/pack-zip.cjs <package-name>');
  process.exit(1);
}

const pkgDir = path.resolve(PACKAGES, pkgName);
const distDir = path.resolve(pkgDir, 'dist');
const pkgJsonPath = path.resolve(pkgDir, 'package.json');

if (!fs.existsSync(distDir)) {
  console.error(`ERROR: dist/ not found at ${distDir}. Run the build first.`);
  process.exit(1);
}

if (!fs.existsSync(pkgJsonPath)) {
  console.error(`ERROR: package.json not found at ${pkgJsonPath}`);
  process.exit(1);
}

const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
const version = pkgJson.version || '0.0.0';

const releaseDir = path.resolve(ROOT, 'releases');
fs.mkdirSync(releaseDir, { recursive: true });

const zipName = `${pkgName}-v${version}.zip`;
const zipPath = path.resolve(releaseDir, zipName);

console.log(`Packaging ${pkgName} v${version} → releases/${zipName}`);

try {
  const isWin = process.platform === 'win32';

  if (isWin) {
    // Windows: use PowerShell Compress-Archive (built-in)
    execSync(
      `powershell -NoProfile -Command "& { Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force }"`,
      { stdio: 'pipe', timeout: 30000 },
    );
  } else {
    // macOS / Linux: use zip command
    execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, {
      stdio: 'pipe',
      timeout: 30000,
    });
  }

  const stats = fs.statSync(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✓ Packaged successfully! (${sizeMB} MB)`);
} catch (err) {
  console.error('Packaging failed:', err.message);
  process.exit(1);
}