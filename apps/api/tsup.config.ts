import { defineConfig } from 'tsup';

export default defineConfig({
    entry: { index: 'src/index.ts', seed: 'prisma/seed.ts' },
    format: ['esm'],
    target: 'node22',
    platform: 'node',
    clean: true,
    sourcemap: true,
    // shared — исходники TS в монорепо, вшиваем их в бандл
    noExternal: ['@volkoff/shared'],
});
