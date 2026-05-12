import pc from 'picocolors';

const LOGO = [
  '███╗   ███╗ █████╗ ██████╗ ██╗  ██╗███████╗████████╗██╗     ██╗   ██╗███╗   ███╗',
  '████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝██╔════╝╚══██╔══╝██║     ██║   ██║████╗ ████║',
  '██╔████╔██║███████║██████╔╝█████╔╝ █████╗     ██║   ██║     ██║   ██║██╔████╔██║',
  '██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗ ██╔══╝     ██║   ██║     ██║   ██║██║╚██╔╝██║',
  '██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗███████╗   ██║   ███████╗╚██████╔╝██║ ╚═╝ ██║',
  '╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝     ╚═╝',
];

export function printBanner() {
  console.log();
  for (const line of LOGO) {
    console.log(pc.green(line));
  }
  console.log();
  console.log(pc.dim('  A framework for building markets'));
  console.log();
}

export function printScaffolding(projectName, targetDir) {
  console.log(pc.bold(`  Creating ${pc.green(projectName)}`));
  console.log(pc.dim(`  in ${targetDir}`));
  console.log();
}

export function printSuccess(projectName) {
  console.log();
  console.log(pc.green(pc.bold(`  ✓ Project ${projectName} is ready.`)));
  console.log();
  console.log(pc.bold('  Next steps:'));
  console.log();
  console.log(`    ${pc.cyan(`cd ${projectName}`)}`);
  console.log(`    ${pc.cyan('cp .env.example .env')}      ${pc.dim('# review and adjust values')}`);
  console.log(`    ${pc.cyan('docker compose up -d')}      ${pc.dim('# start PostgreSQL')}`);
  console.log(`    ${pc.cyan('pnpm install')}`);
  console.log(`    ${pc.cyan('pnpm migration:run')}        ${pc.dim('# create database schema')}`);
  console.log(`    ${pc.cyan('pnpm seed:sample')}          ${pc.dim('# (optional) populate demo data')}`);
  console.log(`    ${pc.cyan('pnpm dev')}                  ${pc.dim('# API on :3001, web on :3000')}`);
  console.log();
  console.log(pc.dim('  Documentation: https://docs.marketlum.com'));
  console.log();
}
