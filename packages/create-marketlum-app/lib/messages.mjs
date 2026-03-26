import pc from 'picocolors';

export function printSuccess(projectName) {
  console.log();
  console.log(pc.green(`Success! Created ${projectName}`));
  console.log();
  console.log('Next steps:');
  console.log();
  console.log(pc.cyan(`  cd ${projectName}`));
  console.log(pc.cyan('  cp .env.example .env'));
  console.log(pc.cyan('  docker compose up -d'));
  console.log(pc.cyan('  pnpm install'));
  console.log(pc.cyan('  pnpm migration:run'));
  console.log(pc.cyan('  pnpm seed'));
  console.log(pc.cyan('  pnpm dev'));
  console.log();
}
