import type { Config } from 'tailwindcss';
import uiPreset from '@marketlum/ui/tailwind-preset';

const config: Config = {
  presets: [uiPreset as Config],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@marketlum/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
