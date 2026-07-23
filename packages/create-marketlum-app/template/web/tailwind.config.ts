import type { Config } from 'tailwindcss';
import uiPreset from '@marketlum/ui/tailwind-preset';

const config: Config = {
  presets: [uiPreset as Config],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@marketlum/ui/src/**/*.{ts,tsx}',
    // Plugins ship their own web components; scan them so plugin-only
    // utility classes make it into the generated CSS.
    './node_modules/@marketlum/plugin-*/src/**/*.{ts,tsx}',
  ],
};

export default config;
