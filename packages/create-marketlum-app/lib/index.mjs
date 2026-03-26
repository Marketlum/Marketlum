import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { getProjectName } from './prompts.mjs';
import { scaffold } from './scaffold.mjs';
import { printSuccess } from './messages.mjs';

export async function createApp() {
  const projectName = await getProjectName();
  const databaseName = projectName.replace(/-/g, '_');
  const targetDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0) {
      throw new Error(
        `Directory "${projectName}" is not empty. Please choose a different name or remove the existing directory.`,
      );
    }
  }

  const replacements = {
    '{{PROJECT_NAME}}': projectName,
    '{{DATABASE_NAME}}': databaseName,
    '{{MARKETLUM_VERSION}}': 'latest',
  };

  await scaffold(targetDir, replacements);

  // Create uploads/.gitkeep
  const uploadsDir = path.join(targetDir, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, '.gitkeep'), '');

  // Initialize git
  execSync('git init', { cwd: targetDir, stdio: 'ignore' });

  printSuccess(projectName);
}
