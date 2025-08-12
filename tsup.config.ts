import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: process.env.NODE_ENV === 'production',
  treeshake: true,
  external: [],
  noExternal: [],
  globalName: 'WaitlistSDK',
  footer: {
    js: `if (typeof window !== 'undefined' && !window.WaitlistSDK) { window.WaitlistSDK = WaitlistSDK; }`,
  },
});
