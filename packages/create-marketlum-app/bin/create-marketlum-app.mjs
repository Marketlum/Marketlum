#!/usr/bin/env node
import { createApp } from '../lib/index.mjs';

createApp().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
