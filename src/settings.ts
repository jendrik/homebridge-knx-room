import { createRequire } from 'node:module';

interface PackageMetadata {
  name: string;
  displayName: string;
  version: string;
}

const require = createRequire(import.meta.url);
const packageMetadata = require('../package.json') as PackageMetadata;

// Homebridge config.json platform alias.
export const PLATFORM_NAME = 'knx-room';
// Homebridge 2 registration package identifier; must match package.json name.
export const PLUGIN_NAME = packageMetadata.name;
export const PLUGIN_DISPLAY_NAME = packageMetadata.displayName;
export const PLUGIN_VERSION = packageMetadata.version;
