import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, '..', 'template');

export async function scaffold(targetDir, replacements) {
  copyDir(TEMPLATE_DIR, targetDir, replacements);
}

function copyDir(srcDir, destDir, replacements) {
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    let destName = entry.name;

    // Rename _foo → .foo (npm strips dotfiles on publish)
    if (destName.startsWith('_')) {
      destName = '.' + destName.slice(1);
    }

    // Strip .tmpl suffix
    const isTmpl = destName.endsWith('.tmpl');
    if (isTmpl) {
      destName = destName.slice(0, -5);
    }

    const destPath = path.join(destDir, destName);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, replacements);
    } else {
      copyFile(srcPath, destPath, isTmpl, replacements);
    }
  }
}

function copyFile(src, dest, applyReplacements, replacements) {
  if (applyReplacements) {
    let content = fs.readFileSync(src, 'utf-8');
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replaceAll(placeholder, value);
    }
    fs.writeFileSync(dest, content);
  } else {
    fs.copyFileSync(src, dest);
  }
}
